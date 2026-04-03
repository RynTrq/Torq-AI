import ky from "ky";
import { Octokit } from "octokit";
import { NonRetriableError } from "inngest";

import { convex } from "@/lib/convex-client";
import { inngest } from "@/inngest/client";

import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";

interface ExportToGithubEvent {
  projectId: Id<"projects">;
  repoName: string;
  visibility: "public" | "private";
  description?: string;
  githubToken: string;
};

type FileWithUrl = Doc<"files"> & {
  storageUrl: string | null;
};

export const exportToGithub = inngest.createFunction(
  {
    id: "export-to-github",
    cancelOn: [
      {
        event: "github/export.cancel",
        if: "event.data.projectId == async.data.projectId"
      },
    ],
    onFailure: async ({ event, step, error }) => {
      const internalKey = process.env.TORQ_AI_CONVEX_INTERNAL_KEY;
      if (!internalKey) return;

      const { projectId } = event.data.event.data as ExportToGithubEvent;

      await step.run("set-failed-status", async () => {
        await convex.mutation(api.system.updateExportStatus, {
          internalKey,
          projectId,
          status: "failed",
          error:
            error instanceof Error
              ? error.message
              : "Unable to export this project to GitHub.",
        });
      });
    }
  },
  {
    event: "github/export.repo"
  },
  async ({ event, step }) => {
    const {
      projectId,
      repoName,
      visibility,
      description,
      githubToken,
    } = event.data as ExportToGithubEvent;

    const internalKey = process.env.TORQ_AI_CONVEX_INTERNAL_KEY;
    if (!internalKey) {
      throw new NonRetriableError("TORQ_AI_CONVEX_INTERNAL_KEY is not configured");
    };

    // Set status to exporting
    await step.run("set-exporting-status", async () => {
      await convex.mutation(api.system.updateExportStatus, {
        internalKey,
        projectId,
        status: "exporting",
        error: undefined,
        repoUrl: undefined,
      });
    });

    const octokit = new Octokit({ auth: githubToken });

    // Create the new repository with auto_init to have an initial commit
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

    // Fetch all project files with storage URLs
    const files = await step.run("fetch-project-files", async () => {
      return (await convex.query(api.system.getProjectFilesWithUrls, {
        internalKey,
        projectId,
      })) as FileWithUrl[];
    });

    // Build a map of file IDs to their full paths
    const buildFilePaths = (files: FileWithUrl[]) => {
      const fileMap = new Map<Id<"files">, FileWithUrl>();
      files.forEach((f) => fileMap.set(f._id, f));

      const getFullPath = (file: FileWithUrl): string => {
        if (!file.parentId) {
          return file.name;
        }

        const parent = fileMap.get(file.parentId);

        if (!parent) {
          return file.name;
        }

        return `${getFullPath(parent)}/${file.name}`;
      };

      const paths: Record<string, FileWithUrl> = {};
      files.forEach((file) => {
        paths[getFullPath(file)] = file;
      });

      return paths;
    };

    const filePaths = buildFilePaths(files);

    // Filter to only actual files (not folders)
    const fileEntries = Object.entries(filePaths).filter(
      ([, file]) => file.type === "file"
    );

    if (fileEntries.length === 0) {
      throw new NonRetriableError("No files to export");
    }

    // Create blobs for each file
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
          // Text file
          content = file.content;
        } else if (file.storageUrl) {
          // Binary file - fetch and base64 encode
          const response = await ky.get(file.storageUrl);
          const buffer = Buffer.from(await response.arrayBuffer());
          content = buffer.toString("base64");
          encoding = "base64";
        } else {
          // Skip files with no content
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

    // Create the tree
    const { data: tree } = await step.run("create-tree", async () => {
      return await octokit.rest.git.createTree({
        owner: repo.owner.login,
        repo: repoName,
        tree: treeItems,
      });
    });

    // Create the commit with the initial commit as parent
    const { data: commit } = await step.run("create-commit", async () => {
      return await octokit.rest.git.createCommit({
        owner: repo.owner.login,
        repo: repoName,
        message: "Initial commit from Torq-AI",
        tree: tree.sha,
        parents: [initialCommitSha],
      });
    });

    // Update the main branch reference to point to our new commit
    await step.run("update-branch-ref", async () => {
      return await octokit.rest.git.updateRef({
        owner: repo.owner.login,
        repo: repoName,
        ref: `heads/${defaultBranch}`,
        sha: commit.sha,
        force: true,
      });
    });

    // Set status to completed with repo URL
    await step.run("set-completed-status", async () => {
      await convex.mutation(api.system.updateExportStatus, {
        internalKey,
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
  }
);
