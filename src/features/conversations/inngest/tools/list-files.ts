import { z } from "zod";
import { createTool } from "@inngest/agent-kit";

import { listProjectFiles } from "@/lib/data/server";

interface ListFilesToolOptions {
  projectId: string;
}

const buildPathMap = (
  files: Array<{
    _id: string;
    name: string;
    parentId?: string;
  }>,
) => {
  const byId = new Map(files.map((file) => [file._id, file]));
  const pathById = new Map<string, string>();

  const getPath = (fileId: string): string => {
    const cached = pathById.get(fileId);
    if (cached) {
      return cached;
    }

    const file = byId.get(fileId);
    if (!file) {
      return "";
    }

    const parentPath = file.parentId ? getPath(file.parentId) : "";
    const path = parentPath ? `${parentPath}/${file.name}` : file.name;
    pathById.set(fileId, path);
    return path;
  };

  for (const file of files) {
    getPath(file._id);
  }

  return pathById;
};

export const createListFilesTool = ({
  projectId,
}: ListFilesToolOptions) => {
  return createTool({
    name: "listFiles",
    description:
      "List all files and folders in the project. Returns names, IDs, types, and parentId for each item. Items with parentId: null are at root level. Use the parentId to understand the folder structure - items with the same parentId are in the same folder.",
    parameters: z.object({}),
    handler: async (_, { step: toolStep }) => {
      try {
        return await toolStep?.run("list-files", async () => {
          const files = await listProjectFiles(projectId);
          const pathById = buildPathMap(files);

          const sorted = files.sort((a, b) => {
            if (a.type !== b.type) {
              return a.type === "folder" ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
          });

          const fileList = sorted.map((f) => ({
            id: f._id,
            name: f.name,
            type: f.type,
            parentId: f.parentId ?? null,
            path: pathById.get(f._id) ?? f.name,
          }));

          return JSON.stringify(fileList);
        });
      } catch (error) {
        return `Error listing files: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
};
