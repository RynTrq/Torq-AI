import { z } from "zod";
import { NextResponse } from "next/server";

import { inngest } from "@/inngest/client";
import { requireOwnedProject } from "@/lib/data/authz";
import { updateProjectExportStatus } from "@/lib/data/server";

const requestSchema = z.object({
  projectId: z.string(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const { projectId } = requestSchema.parse(body);

  try {
    await requireOwnedProject(projectId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 404 },
    );
  }

  const event = await inngest.send({
    name: "github/export.cancel",
    data: {
      projectId,
    },
  });

  await updateProjectExportStatus({
    projectId,
    status: "cancelled",
    error: undefined,
    repoUrl: undefined,
  });

  return NextResponse.json({
    success: true,
    projectId,
    eventId: event.ids[0],
  });
}
