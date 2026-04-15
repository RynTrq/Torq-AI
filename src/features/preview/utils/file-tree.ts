import { FileSystemTree } from "@webcontainer/api";

import { Doc, Id } from "@/lib/data/app-types";
import {
  buildProjectFilePathMaps,
  getProjectPathParts,
} from "@/lib/project-file-paths";

type FileDoc = Doc<"files">;

/**
 * Convert flat project files to a nested FileSystemTree for WebContainer
 */
export const buildFileTree = (files: FileDoc[]): FileSystemTree => {
  const tree: FileSystemTree = {};
  const { filesById } = buildProjectFilePathMaps(files);

  for (const file of files) {
    const pathParts = getProjectPathParts(file, filesById);
    let current = tree;

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      const isLast = i === pathParts.length - 1;

      if (isLast) {
        if (file.type === "folder") {
          current[part] = { directory: {} };
        } else if (!file.storageId && file.content !== undefined) {
          current[part] = { file: { contents: file.content } };
        }
      } else {
        if (!current[part]) {
          current[part] = { directory: {} };
        }
        const node = current[part];
        if ("directory" in node) {
          current = node.directory;
        }
      }
    }
  }

  return tree;
};

/**
 * Get full path for a file by traversing parent chain
 */
export const getFilePath = (
  file: FileDoc,
  filesMap: Map<Id<"files">, FileDoc>
): string => {
  return getProjectPathParts(file, filesMap).join("/");
};
