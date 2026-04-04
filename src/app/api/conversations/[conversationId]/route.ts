import { NextResponse } from "next/server";

import { requireOwnedConversation } from "@/lib/data/authz";
import { getConversationById } from "@/lib/data/server";
import { toErrorResponse } from "@/lib/api/error-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await params;
    await requireOwnedConversation(conversationId);
    const conversation = await getConversationById(conversationId);

    return NextResponse.json(conversation);
  } catch (error) {
    return toErrorResponse(error, "Unable to load conversation");
  }
}
