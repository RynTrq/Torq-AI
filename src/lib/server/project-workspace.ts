import "server-only";

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";

import type { ProjectFileRecord } from "@/lib/data/types";
import { buildProjectFilePathMaps } from "@/lib/project-file-paths";

export type ProjectFileWithUrl = ProjectFileRecord;

export interface MaterializedProjectWorkspace {
  rootDir: string;
  filesByPath: Map<string, ProjectFileWithUrl>;
  filePathsById: Map<string, string>;
}

export const buildProjectFileMaps = (files: ProjectFileWithUrl[]) => {
  const { filesByPath, filePathsById } = buildProjectFilePathMaps(files);

  return { filesByPath, filePathsById };
};

export const materializeProjectWorkspace = async (
  projectId: string,
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
