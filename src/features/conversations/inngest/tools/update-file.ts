import { z } from "zod";
import { createTool } from "@inngest/agent-kit";

import { getFileById, updateFileContent } from "@/lib/data/server";

interface UpdateFileToolOptions {
  projectId: string;
}

const paramsSchema = z.object({
  fileId: z.string().min(1, "File ID is required"),
  content: z.string(),
});

export const createUpdateFileTool = ({
  projectId,
}: UpdateFileToolOptions) => {
  return createTool({
    name: "updateFile",
    description: "Update the content of an existing file",
    parameters: z.object({
      fileId: z.string().describe("The ID of the file to update"),
      content: z.string().describe("The new content for the file"),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { fileId, content } = parsed.data;

      const file = await getFileById(fileId);

      if (!file) {
        return `Error: File with ID "${fileId}" not found. Use listFiles to get valid file IDs.`;
      }

      if (file.projectId !== projectId) {
        return `Error: File with ID "${fileId}" does not belong to this project.`;
      }

      if (file.type === "folder") {
        return `Error: "${fileId}" is a folder, not a file. You can only update file contents.`;
      }

      try {
        return await toolStep?.run("update-file", async () => {
          await updateFileContent({
            fileId,
            content,
          });

          return `File "${file.name}" updated successfully`;
        });
      } catch (error) {
        return `Error update file: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
};
