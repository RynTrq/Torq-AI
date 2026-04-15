import ky from "ky";
import { Octokit } from "octokit";
import { NonRetriableError } from "inngest";

import { inngest } from "@/inngest/client";
import { listProjectFiles, updateProjectExportStatus } from "@/lib/data/server";
import type { ProjectFileRecord } from "@/lib/data/types";
import { buildProjectFilePathMaps } from "@/lib/project-file-paths";

interface ExportToGithubEvent {
  projectId: string;
  repoName: string;
  visibility: "public" | "private";
  description?: string;
  githubToken: string;
}

type FileWithUrl = ProjectFileRecord;

export const exportToGithub = inngest.createFunction(
  {
    id: "export-to-github",
    cancelOn: [
      {
        event: "github/export.cancel",
        if: "event.data.projectId == async.data.projectId",
      },
    ],
    onFailure: async ({ event, step, error }) => {
      const { projectId } = event.data.event.data as ExportToGithubEvent;

      await step.run("set-failed-status", async () => {
        await updateProjectExportStatus({
          projectId,
          status: "failed",
          error:
            error instanceof Error
              ? error.message
              : "Unable to export this project to GitHub.",
        });
      });
    },
  },
  {
    event: "github/export.repo",
  },
  async ({ event, step }) => {
    const {
      projectId,
      repoName,
      visibility,
      description,
      githubToken,
    } = event.data as ExportToGithubEvent;

    await step.run("set-exporting-status", async () => {
      await updateProjectExportStatus({
        projectId,
        status: "exporting",
        error: undefined,
        repoUrl: undefined,
      });
    });

    const octokit = new Octokit({ auth: githubToken });

    const { data: repo } = await step.run("create-repo", async () => {
      return await octokit.rest.repos.createForAuthenticatedUser({
        name: repoName,
        description: description || "Exported from Torq-AI",
        private: visibility === "private",
        auto_init: true,
      });
    });

    const defaultBranch = repo.default_branch || "main";
    let initialCommitSha: string | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        initialCommitSha = await step.run(`get-initial-commit-${attempt + 1}`, async () => {
          const { data: ref } = await octokit.rest.git.getRef({
            owner: repo.owner.login,
            repo: repoName,
            ref: `heads/${defaultBranch}`,
          });

          return ref.object.sha;
        }) as string;
        break;
      } catch (error) {
        if (attempt === 4) {
          throw error;
        }

        await step.sleep(`wait-for-repo-init-${attempt + 1}`, "2s");
      }
    }

    if (!initialCommitSha) {
      throw new NonRetriableError(
        "GitHub did not finish initializing the repository in time",
      );
    }

    const files = await step.run("fetch-project-files", async () => {
      return await listProjectFiles(projectId, { includeContent: true });
    }) as FileWithUrl[];

    const { filesByPath } = buildProjectFilePathMaps(files);
    const fileEntries = [...filesByPath.entries()].filter(
      ([, file]) => file.type === "file",
    );

    if (fileEntries.length === 0) {
      throw new NonRetriableError("No files to export");
    }

    const treeItems = await step.run("create-blobs", async () => {
      const items: {
        path: string;
        mode: "100644";
        type: "blob";
        sha: string;
      }[] = [];

      for (const [path, file] of fileEntries) {
        let content: string;
        let encoding: "utf-8" | "base64" = "utf-8";

        if (file.content !== undefined) {
          content = file.content;
        } else if (file.storageUrl) {
          const response = await ky.get(file.storageUrl);
          const buffer = Buffer.from(await response.arrayBuffer());
          content = buffer.toString("base64");
          encoding = "base64";
        } else {
          continue;
        }

        const { data: blob } = await octokit.rest.git.createBlob({
          owner: repo.owner.login,
          repo: repoName,
          content,
          encoding,
        });

        items.push({
          path,
          mode: "100644",
          type: "blob",
          sha: blob.sha,
        });
      }

      return items;
    });

    if (treeItems.length === 0) {
      throw new NonRetriableError("Failed to create any file blobs");
    }

    const { data: tree } = await step.run("create-tree", async () => {
      return await octokit.rest.git.createTree({
        owner: repo.owner.login,
        repo: repoName,
        tree: treeItems,
      });
    });

    const { data: commit } = await step.run("create-commit", async () => {
      return await octokit.rest.git.createCommit({
        owner: repo.owner.login,
        repo: repoName,
        message: "Initial commit from Torq-AI",
        tree: tree.sha,
        parents: [initialCommitSha],
      });
    });

    await step.run("update-branch-ref", async () => {
      return await octokit.rest.git.updateRef({
        owner: repo.owner.login,
        repo: repoName,
        ref: `heads/${defaultBranch}`,
        sha: commit.sha,
        force: true,
      });
    });

    await step.run("set-completed-status", async () => {
      await updateProjectExportStatus({
        projectId,
        status: "completed",
        repoUrl: repo.html_url,
        error: undefined,
      });
    });

    return {
      success: true,
      repoUrl: repo.html_url,
      filesExported: treeItems.length,
    };
  },
);
