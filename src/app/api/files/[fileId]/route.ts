import { z } from "zod";
import { NextResponse } from "next/server";

import { requireOwnedFile } from "@/lib/data/authz";
import {
  deleteFile,
  getFileById,
  renameFile,
  updateFileContent,
} from "@/lib/data/server";
import { toErrorResponse } from "@/lib/api/error-response";

const updateFileSchema = z.object({
  content: z.string().optional(),
  newName: z.string().trim().min(1).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await params;
    await requireOwnedFile(fileId);
    const file = await getFileById(fileId);

    return NextResponse.json(file);
  } catch (error) {
    return toErrorResponse(error, "Unable to load file");
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await params;
    await requireOwnedFile(fileId);
    const body = await request.json();
    const { content, newName } = updateFileSchema.parse(body);

    if (typeof content === "string") {
      const file = await updateFileContent({ fileId, content });
      return NextResponse.json(file);
    }

    if (typeof newName === "string") {
      const file = await renameFile({ fileId, newName });
      return NextResponse.json(file);
    }

    return NextResponse.json(
      { error: "No valid file update payload provided" },
      { status: 400 },
    );
  } catch (error) {
    return toErrorResponse(error, "Unable to update file");
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await params;
    await requireOwnedFile(fileId);
    await deleteFile(fileId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, "Unable to delete file");
  }
}
