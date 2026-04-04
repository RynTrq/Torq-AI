import { z } from "zod";
import { NextResponse } from "next/server";

import { requireOwnedProject } from "@/lib/data/authz";
import {
  getUserGithubAccessToken,
  updateProjectExportStatus,
} from "@/lib/data/server";
import { inngest } from "@/inngest/client";

const requestSchema = z.object({
  projectId: z.string(),
  repoName: z.string().min(1).max(100),
  visibility: z.enum(["public", "private"]).default("private"),
  description: z.string().max(350).optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const { projectId, repoName, visibility, description } = requestSchema.parse(body);

  let userId: string;

  try {
    const { user } = await requireOwnedProject(projectId);
    userId = user.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 404 },
    );
  }

  const githubToken = await getUserGithubAccessToken(userId);

  if (!githubToken) {
    return NextResponse.json(
      { error: "GitHub not connected. Please connect your GitHub account and try again." },
      { status: 400 },
    );
  }

  await updateProjectExportStatus({
    projectId,
    status: "exporting",
    error: undefined,
    repoUrl: undefined,
  });

  try {
    const event = await inngest.send({
      name: "github/export.repo",
      data: {
        projectId,
        repoName,
        visibility,
        description,
        githubToken,
      },
    });

    return NextResponse.json({
      success: true,
      projectId,
      eventId: event.ids[0],
    });
  } catch (error) {
    await updateProjectExportStatus({
      projectId,
      status: "failed",
      error:
        error instanceof Error
          ? error.message
          : "Unable to start the GitHub export.",
      repoUrl: undefined,
    });

    return NextResponse.json(
      { error: "Unable to start the GitHub export." },
      { status: 500 },
    );
  }
}
