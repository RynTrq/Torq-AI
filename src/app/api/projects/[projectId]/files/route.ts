import { z } from "zod";
import { NextResponse } from "next/server";

import { requireOwnedProject } from "@/lib/data/authz";
import {
  createFile,
  createFolder,
  listProjectFiles,
} from "@/lib/data/server";
import { toErrorResponse } from "@/lib/api/error-response";

const createProjectFileSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("file"),
    name: z.string().trim().min(1, "File name is required"),
    content: z.string().default(""),
    parentId: z.string().optional(),
  }),
  z.object({
    type: z.literal("folder"),
    name: z.string().trim().min(1, "Folder name is required"),
    parentId: z.string().optional(),
  }),
]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    await requireOwnedProject(projectId);
    const files = await listProjectFiles(projectId);

    return NextResponse.json(files);
  } catch (error) {
    return toErrorResponse(error, "Unable to load project files");
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    await requireOwnedProject(projectId);
    const body = await request.json();
    const payload = createProjectFileSchema.parse(body);

    if (payload.type === "folder") {
      const folder = await createFolder({
        projectId,
        parentId: payload.parentId,
        name: payload.name,
      });

      return NextResponse.json(folder);
    }

    const file = await createFile({
      projectId,
      parentId: payload.parentId,
      name: payload.name,
      content: payload.content,
    });

    return NextResponse.json(file);
  } catch (error) {
    return toErrorResponse(error, "Unable to create project item");
  }
}
