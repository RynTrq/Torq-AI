import { NextResponse } from "next/server";

import { requireOwnedFile } from "@/lib/data/authz";
import { getFilePath } from "@/lib/data/server";
import { toErrorResponse } from "@/lib/api/error-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await params;
    await requireOwnedFile(fileId);
    const path = await getFilePath(fileId);

    return NextResponse.json(path);
  } catch (error) {
    return toErrorResponse(error, "Unable to load file path");
  }
}
