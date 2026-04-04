import { z } from "zod";
import { NextResponse } from "next/server";

import { requireOwnedProject } from "@/lib/data/authz";
import {
  createConversation,
  listConversationsByProject,
} from "@/lib/data/server";
import { toErrorResponse } from "@/lib/api/error-response";

const createConversationSchema = z.object({
  title: z.string().trim().min(1, "Conversation title is required"),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    await requireOwnedProject(projectId);
    const conversations = await listConversationsByProject(projectId);

    return NextResponse.json(conversations);
  } catch (error) {
    return toErrorResponse(error, "Unable to load conversations");
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
    const { title } = createConversationSchema.parse(body);
    const conversation = await createConversation({
      projectId,
      title,
    });

    return NextResponse.json(conversation);
  } catch (error) {
    return toErrorResponse(error, "Unable to create conversation");
  }
}
