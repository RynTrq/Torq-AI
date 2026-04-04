import { z } from "zod";
import { NextResponse } from "next/server";

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

  await updateProjectExportStatus({
    projectId,
    status: undefined,
    repoUrl: undefined,
    error: undefined,
  });

  return NextResponse.json({
    success: true,
    projectId,
  });
}
