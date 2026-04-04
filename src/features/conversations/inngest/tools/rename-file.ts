import { z } from "zod";
import { createTool } from "@inngest/agent-kit";

import { getFileById, renameFile } from "@/lib/data/server";

interface RenameFileToolOptions {
  projectId: string;
}

const paramsSchema = z.object({
  fileId: z.string().min(1, "File ID is required"),
  newName: z.string().min(1, "New name is required"),
});

export const createRenameFileTool = ({
  projectId,
}: RenameFileToolOptions) => {
  return createTool({
    name: "renameFile",
    description: "Rename a file or folder",
    parameters: z.object({
      fileId: z.string().describe("The ID of the file or folder to rename"),
      newName: z.string().describe("The new name for the file or folder"),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { fileId, newName } = parsed.data;

      const file = await getFileById(fileId);

      if (!file) {
        return `Error: File with ID "${fileId}" not found. Use listFiles to get valid file IDs.`;
      }

      if (file.projectId !== projectId) {
        return `Error: File with ID "${fileId}" does not belong to this project.`;
      }

      try {
        return await toolStep?.run("rename-file", async () => {
          await renameFile({
            fileId,
            newName,
          });

          return `Renamed "${file.name}" to "${newName}" successfully`;
        });
      } catch (error) {
        return `Error renaming file: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
};
