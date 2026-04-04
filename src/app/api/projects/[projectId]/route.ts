import { z } from "zod";
import { NextResponse } from "next/server";

import { requireOwnedProject } from "@/lib/data/authz";
import {
  getProjectById,
  renameProject,
  updateProjectSettings,
} from "@/lib/data/server";
import { toErrorResponse } from "@/lib/api/error-response";
import type { ProjectSettings } from "@/lib/data/types";

const updateProjectSchema = z.object({
  name: z.string().trim().min(1).optional(),
  settings: z
    .object({
      installCommand: z.string().optional(),
      devCommand: z.string().optional(),
      runCommand: z.string().optional(),
    })
    .optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { user } = await requireOwnedProject(projectId);
    const project = await getProjectById(user.id, projectId);

    return NextResponse.json(project);
  } catch (error) {
    return toErrorResponse(error, "Unable to load project");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const { user } = await requireOwnedProject(projectId);
    const body = await request.json();
    const { name, settings } = updateProjectSchema.parse(body);

    if (typeof name === "string") {
      const project = await renameProject({
        ownerId: user.id,
        id: projectId,
        name,
      });
      return NextResponse.json(project);
    }

    if (settings) {
      const project = await updateProjectSettings({
        ownerId: user.id,
        id: projectId,
        settings: settings as ProjectSettings,
      });
      return NextResponse.json(project);
    }

    return NextResponse.json(
      { error: "No valid update payload provided" },
      { status: 400 },
    );
  } catch (error) {
    return toErrorResponse(error, "Unable to update project");
  }
}
