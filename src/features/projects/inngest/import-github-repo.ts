import { Octokit } from "octokit";
import { isBinaryFile } from "isbinaryfile";
import { NonRetriableError } from "inngest";

import { inngest } from "@/inngest/client";
import {
  clearProjectFiles,
  createBinaryFile,
  createFile,
  createFolder,
  updateProjectImportStatus,
} from "@/lib/data/server";
import { getMimeType } from "@/lib/project-files";

interface ImportGithubRepoEvent {
  owner: string;
  repo: string;
  projectId: string;
  githubToken: string;
}

export const importGithubRepo = inngest.createFunction(
  {
    id: "import-github-repo",
    onFailure: async ({ event, step, error }) => {
      const { projectId } = event.data.event.data as ImportGithubRepoEvent;

      await step.run("set-failed-status", async () => {
        await updateProjectImportStatus({
          projectId,
          status: "failed",
          error:
            error instanceof Error
              ? error.message
              : "Unable to import this GitHub repository.",
        });
      });
    },
  },
  { event: "github/import.repo" },
  async ({ event, step }) => {
    const { owner, repo, projectId, githubToken } =
      event.data as ImportGithubRepoEvent;

    const octokit = new Octokit({ auth: githubToken });

    await step.run("cleanup-project", async () => {
      await clearProjectFiles(projectId);
    });

    const repository = await step.run("fetch-repo-metadata", async () => {
      const { data } = await octokit.rest.repos.get({
        owner,
        repo,
      });

      return data;
    });

    const tree = await step.run("fetch-repo-tree", async () => {
      const { data } = await octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: repository.default_branch,
        recursive: "1",
      });

      return data;
    });

    const folders = tree.tree
      .filter((item) => item.type === "tree" && item.path)
      .sort((a, b) => {
        const aDepth = a.path ? a.path.split("/").length : 0;
        const bDepth = b.path ? b.path.split("/").length : 0;

        return aDepth - bDepth;
      });

    const folderIdMap = await step.run("create-folders", async () => {
      const map: Record<string, string> = {};

      for (const folder of folders) {
        if (!folder.path) {
          continue;
        }

        const pathParts = folder.path.split("/");
        const name = pathParts.pop()!;
        const parentPath = pathParts.join("/");
        const parentId = parentPath ? map[parentPath] : undefined;

        const createdFolder = await createFolder({
          projectId,
          name,
          parentId,
        });

        map[folder.path] = createdFolder._id;
      }

      return map;
    });

    const allFiles = tree.tree.filter(
      (item) => item.type === "blob" && item.path && item.sha,
    );

    const importFailures = await step.run("create-files", async () => {
      const failures: string[] = [];

      for (const file of allFiles) {
        if (!file.path || !file.sha) {
          continue;
        }

        try {
          const { data: blob } = await octokit.rest.git.getBlob({
            owner,
            repo,
            file_sha: file.sha,
          });

          const buffer = Buffer.from(blob.content, "base64");
          const binary = await isBinaryFile(buffer);
          const pathParts = file.path.split("/");
          const name = pathParts.pop()!;
          const parentPath = pathParts.join("/");
          const parentId = parentPath ? folderIdMap[parentPath] : undefined;

          if (binary) {
            const mimeType = getMimeType(name);
            const dataUrl = `data:${mimeType};base64,${buffer.toString("base64")}`;

            await createBinaryFile({
              projectId,
              name,
              dataUrl,
              mimeType,
              parentId,
            });
          } else {
            await createFile({
              projectId,
              name,
              content: buffer.toString("utf-8"),
              parentId,
            });
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown import error";
          failures.push(`${file.path}: ${message}`);
          console.error(`Failed to import file: ${file.path}`, error);
        }
      }

      return failures;
    });

    if (importFailures.length > 0) {
      throw new NonRetriableError(
        `Imported with ${importFailures.length} file error(s): ${importFailures.slice(0, 5).join("; ")}`,
      );
    }

    await step.run("set-completed-status", async () => {
      await updateProjectImportStatus({
        projectId,
        status: "completed",
        error: undefined,
      });
    });

    return { success: true, projectId };
  },
);
