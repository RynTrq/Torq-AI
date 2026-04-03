import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { convex } from "@/lib/convex-client";
import { getMimeType } from "@/lib/project-files";

import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; path?: string[] }>;
  },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, path = [] } = await params;
  const internalKey = process.env.TORQ_AI_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not configured" },
      { status: 500 },
    );
  }

  const project = await convex.query(api.system.getProjectById, {
    internalKey,
    projectId: projectId as Id<"projects">,
  });

  if (!project || project.ownerId !== userId) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const files = await convex.query(api.system.getProjectFilesWithUrls, {
    internalKey,
    projectId: projectId as Id<"projects">,
  });

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
