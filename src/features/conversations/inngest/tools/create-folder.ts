import { z } from "zod";
import { createTool } from "@inngest/agent-kit";

import { createFolder, getFileById } from "@/lib/data/server";

interface CreateFolderToolOptions {
  projectId: string;
}

const paramsSchema = z.object({
  name: z.string().min(1, "Folder name is required"),
  parentId: z.string(),
});

export const createCreateFolderTool = ({
  projectId,
}: CreateFolderToolOptions) => {
  return createTool({
    name: "createFolder",
    description: "Create a new folder in the project",
    parameters: z.object({
      name: z.string().describe("The name of the folder to create"),
      parentId: z
        .string()
        .describe(
          "The ID (not name!) of the parent folder from listFiles, or empty string for root level"
        ),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { name, parentId } = parsed.data;

      try {
        return await toolStep?.run("create-folder", async () => {
          if (parentId) {
            const parentFolder = await getFileById(parentId);
            if (!parentFolder) {
              return `Error: Parent folder with ID "${parentId}" not found. Use listFiles to get valid folder IDs.`;
            }
            if (parentFolder.projectId !== projectId) {
              return `Error: Parent folder "${parentId}" does not belong to this project.`;
            }
            if (parentFolder.type !== "folder") {
              return `Error: The ID "${parentId}" is a file, not a folder. Use a folder ID as parentId.`;
            }
            if (!parentFolder) {
              return `Error: Invalid parentId "${parentId}". Use listFiles to get valid folder IDs, or use empty string for root level.`;
            }
          }

          const folder = await createFolder({
            projectId,
            name,
            parentId: parentId || undefined,
          });

          return `Folder "${folder.name}" created with ID: ${folder._id}`;
        });
      } catch (error) {
        return `Error creating folder: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
};
