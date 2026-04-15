import { z } from "zod";
import { createTool } from "@inngest/agent-kit";

import { getFilesByIds } from "@/lib/data/server";

interface ReadFilesToolOptions {
  projectId: string;
}

const paramsSchema = z.object({
  fileIds: z
    .array(z.string().min(1, "File ID cannot be empty"))
    .min(1, "Provide at least one file ID"),
});

export const createReadFilesTool = ({ projectId }: ReadFilesToolOptions) => {
  return createTool({
    name: "readFiles",
    description: "Read the content of files from the project. Returns file contents.",
    parameters: z.object({
      fileIds: z.array(z.string()).describe("Array of file IDs to read"),
    }),
    handler: async (params, { step: toolStep }) => {
      const parsed = paramsSchema.safeParse(params);
      if (!parsed.success) {
        return `Error: ${parsed.error.issues[0].message}`;
      }

      const { fileIds } = parsed.data;

      try {
        return await toolStep?.run("read-files", async () => {
          const files = await getFilesByIds(fileIds, { includeContent: true });
          const results = files
            .filter(
              (file) =>
                file.projectId === projectId &&
                file.type === "file" &&
                typeof file.content === "string",
            )
            .map((file) => ({
              id: file._id,
              name: file.name,
              content: file.content as string,
            }));

          if (results.length === 0) {
            return "Error: No files found with provided IDs. Use listFiles to get valid fileIDs.";
          }

          return JSON.stringify(results);
        });
      } catch (error) {
        return `Error reading files: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
};
