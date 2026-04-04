import { NextResponse } from "next/server";

import { requireOwnedProject } from "@/lib/data/authz";
import { getFolderContents } from "@/lib/data/server";
import { toErrorResponse } from "@/lib/api/error-response";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    await requireOwnedProject(projectId);
    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId") ?? undefined;

    const files = await getFolderContents({
      projectId,
      parentId,
    });

    return NextResponse.json(files);
  } catch (error) {
    return toErrorResponse(error, "Unable to load folder contents");
  }
}
