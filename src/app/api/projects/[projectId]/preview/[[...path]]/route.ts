import { NextResponse } from "next/server";

import { requireOwnedProject } from "@/lib/data/authz";
import { listProjectFiles } from "@/lib/data/server";
import { getMimeType } from "@/lib/project-files";
import { buildProjectFilePathMaps } from "@/lib/project-file-paths";

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

  const files = await listProjectFiles(projectId, { includeContent: true });
  const requestedPath = path.join("/");
  const { filesByPath } = buildProjectFilePathMaps(files);
  const file = filesByPath.get(requestedPath);

  if (!file || file.type !== "file") {
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
