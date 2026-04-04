import { z } from "zod";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  createProject,
  getUserGithubAccessToken,
  updateProjectImportStatus,
} from "@/lib/data/server";
import { inngest } from "@/inngest/client";

const requestSchema = z.object({
  url: z.url(),
});

function parseGitHubUrl(url: string) {
  const parsedUrl = new URL(url);
  const host = parsedUrl.hostname.replace(/^www\./, "");

  if (host !== "github.com") {
    throw new Error("Invalid GitHub URL");
  }

  const [owner, repo] = parsedUrl.pathname
    .split("/")
    .filter(Boolean)
    .slice(0, 2);

  if (!owner || !repo) {
    throw new Error("Invalid GitHub URL");
  }

  return { owner, repo: repo.replace(/\.git$/, "") };
}

export async function POST(request: Request) {
  let userId: string;

  try {
    const user = await requireUser();
    userId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { url } = requestSchema.parse(body);

  const { owner, repo } = parseGitHubUrl(url);
  const githubToken = await getUserGithubAccessToken(userId);

  if (!githubToken) {
    return NextResponse.json(
      { error: "GitHub not connected. Please connect your GitHub account and try again." },
      { status: 400 },
    );
  }

  const project = await createProject(userId, repo);
  const projectId = project._id;

  await updateProjectImportStatus({
    projectId,
    status: "importing",
    error: undefined,
  });

  try {
    const event = await inngest.send({
      name: "github/import.repo",
      data: {
        owner,
        repo,
        projectId,
        githubToken,
      },
    });

    return NextResponse.json({
      success: true,
      projectId,
      eventId: event.ids[0],
    });
  } catch (error) {
    await updateProjectImportStatus({
      projectId,
      status: "failed",
      error:
        error instanceof Error
          ? error.message
          : "Unable to start the GitHub import.",
    });

    return NextResponse.json(
      { error: "Unable to start the GitHub import." },
      { status: 500 },
    );
  }
}
