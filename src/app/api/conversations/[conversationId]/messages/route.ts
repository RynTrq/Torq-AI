import { NextResponse } from "next/server";

import { requireOwnedConversation } from "@/lib/data/authz";
import {
  listMessages,
  resolveStaleProcessingMessagesForConversation,
} from "@/lib/data/server";
import { toErrorResponse } from "@/lib/api/error-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await params;
    await requireOwnedConversation(conversationId);
    const staleMessages =
      await resolveStaleProcessingMessagesForConversation(conversationId);

    if (staleMessages.length > 0) {
      console.warn("[torq-ai][messages-api] resolved stale processing messages", {
        conversationId,
        messageIds: staleMessages.map((message) => message._id),
      });
    }

    const messages = await listMessages(conversationId);

    return NextResponse.json(messages);
  } catch (error) {
    return toErrorResponse(error, "Unable to load messages");
  }
}
