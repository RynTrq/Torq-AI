import { z } from "zod";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import {
  createProject,
  getUserGithubAccessToken,
  updateProjectImportStatus,
} from "@/lib/data/server";
import { toErrorResponse } from "@/lib/api/error-response";
import { parseGitHubRepositoryUrl } from "@/lib/github";
import { inngest } from "@/inngest/client";

const requestSchema = z.object({
  url: z.string().trim().min(1, "GitHub repository URL is required"),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const userId = user.id;
    const body = await request.json();
    const { url } = requestSchema.parse(body);

    const { owner, repo } = parseGitHubRepositoryUrl(url);
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
  } catch (error) {
    return toErrorResponse(error, "Unable to start the GitHub import");
  }
}
