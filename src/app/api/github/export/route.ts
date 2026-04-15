import { z } from "zod";
import { NextResponse } from "next/server";

import { requireOwnedProject } from "@/lib/data/authz";
import {
  getUserGithubAccessToken,
  updateProjectExportStatus,
} from "@/lib/data/server";
import { toErrorResponse } from "@/lib/api/error-response";
import { inngest } from "@/inngest/client";

const requestSchema = z.object({
  projectId: z.string(),
  repoName: z.string().min(1).max(100),
  visibility: z.enum(["public", "private"]).default("private"),
  description: z.string().max(350).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, repoName, visibility, description } = requestSchema.parse(
      body,
    );

    const { user } = await requireOwnedProject(projectId);
    const userId = user.id;
    const githubToken = await getUserGithubAccessToken(userId);

    if (!githubToken) {
      return NextResponse.json(
        {
          error:
            "GitHub not connected. Please connect your GitHub account and try again.",
        },
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
  } catch (error) {
    return toErrorResponse(error, "Unable to start the GitHub export");
  }
}
