import { NextResponse } from "next/server";

import { requireOwnedProject } from "@/lib/data/authz";
import { listProjectFiles } from "@/lib/data/server";
import { getMimeType } from "@/lib/project-files";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; path?: string[] }>;
  },
) {
  const { projectId, path = [] } = await params;

  try {
    await requireOwnedProject(projectId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";
    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 404 },
    );
  }

  const files = await listProjectFiles(projectId);
  const requestedPath = path.join("/");

  const file = files.find((candidate) => {
    if (candidate.type !== "file") {
      return false;
    }

    const parts = [candidate.name];
    let parentId = candidate.parentId;

    while (parentId) {
      const parent = files.find((item) => item._id === parentId);
      if (!parent) {
        break;
      }

      parts.unshift(parent.name);
      parentId = parent.parentId;
    }

    return parts.join("/") === requestedPath;
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": getMimeType(file.name),
    "Cache-Control": "no-store",
  });

  if (file.content !== undefined) {
    return new Response(file.content, { headers });
  }

  if (!file.storageUrl) {
    return NextResponse.json({ error: "Preview unavailable" }, { status: 404 });
  }

  const response = await fetch(file.storageUrl);
  if (!response.ok) {
    return NextResponse.json(
      { error: "Unable to load file preview" },
      { status: 502 },
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return new Response(buffer, { headers });
}
