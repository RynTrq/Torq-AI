import { z } from "zod";
import { createTool } from "@inngest/agent-kit";

import { getFileById } from "@/lib/data/server";

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
          const results: { id: string; name: string; content: string }[] = [];

          for (const fileId of fileIds) {
            const file = await getFileById(fileId);

            if (file && file.projectId === projectId && file.content) {
              results.push({
                id: file._id,
                name: file.name,
                content: file.content,
              });
            }
          }

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
