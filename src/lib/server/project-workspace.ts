import "server-only";

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import { Doc, Id } from "../../../convex/_generated/dataModel";

export type ProjectFileWithUrl = Doc<"files"> & {
  storageUrl: string | null;
};

export interface MaterializedProjectWorkspace {
  rootDir: string;
  filesByPath: Map<string, ProjectFileWithUrl>;
  filePathsById: Map<Id<"files">, string>;
}

const getRelativePath = (
  file: ProjectFileWithUrl,
  filesMap: Map<Id<"files">, ProjectFileWithUrl>,
) => {
  const parts = [file.name];
  let parentId = file.parentId;

  while (parentId) {
    const parent = filesMap.get(parentId);
    if (!parent) {
      break;
    }

    parts.unshift(parent.name);
    parentId = parent.parentId;
  }

  return parts.join("/");
};

export const buildProjectFileMaps = (files: ProjectFileWithUrl[]) => {
  const filesMap = new Map<Id<"files">, ProjectFileWithUrl>();
  const filesByPath = new Map<string, ProjectFileWithUrl>();
  const filePathsById = new Map<Id<"files">, string>();

  files.forEach((file) => filesMap.set(file._id, file));

  for (const file of files) {
    const relativePath = getRelativePath(file, filesMap);
    filesByPath.set(relativePath, file);
    filePathsById.set(file._id, relativePath);
  }

  return { filesByPath, filePathsById };
};

export const materializeProjectWorkspace = async (
  projectId: Id<"projects">,
  files: ProjectFileWithUrl[],
): Promise<MaterializedProjectWorkspace> => {
  const rootDir = await mkdtemp(join(tmpdir(), `torq-ai-${projectId}-`));
  const { filesByPath, filePathsById } = buildProjectFileMaps(files);

  const directories = [...filesByPath.entries()]
    .filter(([, file]) => file.type === "folder")
    .map(([relativePath]) => relativePath)
    .sort((left, right) => left.split("/").length - right.split("/").length);

  for (const directory of directories) {
    await mkdir(join(rootDir, directory), { recursive: true });
  }

  for (const [relativePath, file] of filesByPath) {
    if (file.type !== "file") {
      continue;
    }

    const fullPath = join(rootDir, relativePath);
    await mkdir(dirname(fullPath), { recursive: true });

    if (file.content !== undefined) {
      await writeFile(fullPath, file.content, "utf8");
      continue;
    }

    if (!file.storageUrl) {
      continue;
    }

    const response = await fetch(file.storageUrl);
    if (!response.ok) {
      throw new Error(`Unable to fetch binary file for ${relativePath}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(fullPath, buffer);
  }

  return { rootDir, filesByPath, filePathsById };
};

export const cleanupMaterializedWorkspace = async (rootDir: string) => {
  await rm(rootDir, { recursive: true, force: true });
};
