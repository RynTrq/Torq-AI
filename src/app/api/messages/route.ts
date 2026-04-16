import { z } from "zod";
import { NextResponse } from "next/server";

import { inngest } from "@/inngest/client";
import { toErrorResponse } from "@/lib/api/error-response";
import { requireOwnedConversation } from "@/lib/data/authz";
import {
  createMessage,
  getMessageById,
  listProcessingMessagesForConversation,
  updateMessageContent,
  updateMessageDebugInfo,
  updateMessageStatus,
} from "@/lib/data/server";
import {
  getInngestDevCommand,
} from "@/lib/inngest/dev-server";
import {
  immediateMessageProcessingRunner,
  processMessageEvent,
} from "@/features/conversations/inngest/process-message-core";
import {
  isSimpleChatMessage,
  shouldUseToolNetwork,
} from "@/features/conversations/inngest/message-routing";

const requestSchema = z.object({
  conversationId: z.string(),
  message: z.string().trim().min(1, "Message is required").max(20_000),
  modelId: z.string().optional().nullable(),
});

const buildDebugLine = ({
  traceId,
  stage,
  detail,
}: {
  traceId: string;
  stage: string;
  detail?: string;
}) =>
  [
    `Trace ID: ${traceId}`,
    `Stage: ${stage}`,
    detail ? `Detail: ${detail}` : null,
  ]
    .filter(Boolean)
    .join("\n");

const logMessagesApi = (event: string, details: Record<string, unknown>) => {
  console.info(`[torq-ai][messages-api] ${event}`, details);
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { conversationId, message, modelId } = requestSchema.parse(body);
    const traceId = crypto.randomUUID();

    let conversation: Awaited<ReturnType<typeof requireOwnedConversation>>["conversation"];

    try {
      ({ conversation } = await requireOwnedConversation(conversationId));
    } catch (error) {
      const messageText = error instanceof Error ? error.message : "Unauthorized";

      return NextResponse.json(
        { error: messageText },
        { status: messageText === "Unauthorized" ? 401 : 404 },
      );
    }

    const projectId = conversation.projectId;
    logMessagesApi("received", {
      conversationId,
      messageLength: message.length,
      modelId: modelId ?? null,
      projectId,
      traceId,
    });
    const processingMessages = await listProcessingMessagesForConversation(conversationId);

    logMessagesApi("processing-messages", {
      conversationId,
      count: processingMessages.length,
      messageIds: processingMessages.map((processingMessage) => processingMessage._id),
      traceId,
    });

    if (processingMessages.length > 0) {
      await Promise.all(
        processingMessages.map(async (processingMessage) => {
          logMessagesApi("cancelling-processing-message", {
            conversationId,
            processingMessageId: processingMessage._id,
            traceId,
          });
          await inngest.send({
            name: "message/cancel",
            data: {
              messageId: processingMessage._id,
            },
          });

          await updateMessageStatus({
            messageId: processingMessage._id,
            status: "cancelled",
          });
        }),
      );
    }

    await createMessage({
      conversationId,
      projectId,
      role: "user",
      content: message,
    });

    const assistantMessage = await createMessage({
      conversationId,
      projectId,
      role: "assistant",
      content: "",
      status: "processing",
      modelId: modelId ?? undefined,
    });
    const assistantMessageId = assistantMessage._id;

    await updateMessageDebugInfo({
      messageId: assistantMessageId,
      errorMessage: buildDebugLine({
        traceId,
        stage: "assistant-message-created",
        detail: `Selected model ${modelId ?? "auto"}`,
      }),
    });

    const useToolQueue = shouldUseToolNetwork(message);
    const simpleChat = isSimpleChatMessage(message);
    const shouldProcessInline = true;

    logMessagesApi("execution-strategy", {
      conversationId,
      messageId: assistantMessageId,
      mode: shouldProcessInline
        ? simpleChat
          ? "inline-simple-chat"
          : useToolQueue
            ? "inline-dev"
            : "inline-coding-chat"
        : "queued-coding-agent",
      projectId,
      requestedModelId: modelId ?? null,
      traceId,
      usesToolNetwork: useToolQueue,
    });

    logMessagesApi("created-assistant-message", {
      assistantMessageId,
      conversationId,
      modelId: modelId ?? null,
      projectId,
      traceId,
    });

    if (shouldProcessInline) {
      let warning: string | undefined;

      try {
        await processMessageEvent({
          eventData: {
            messageId: assistantMessageId,
            conversationId,
            projectId,
            message,
            modelId,
            traceId,
          },
          runner: immediateMessageProcessingRunner,
        });
      } catch (error) {
        warning =
          "Torq-AI hit an error while processing your message. Check the latest assistant reply for details.";

        console.error("[torq-ai][messages-api] failed-inline-processing", {
          assistantMessageId,
          conversationId,
          error,
          traceId,
        });

        const existingMessage = await getMessageById(assistantMessageId);

        if (existingMessage?.status === "processing") {
          await updateMessageContent({
            messageId: assistantMessageId,
            content:
              "I ran into an unexpected error while processing your message. Please retry in a moment.",
            errorMessage: buildDebugLine({
              traceId,
              stage: "inline-processing-failed",
              detail: error instanceof Error ? error.message : "Unknown error",
            }),
          });
        }
      }

      return NextResponse.json({
        success: true,
        messageId: assistantMessageId,
        queued: false,
        mode: simpleChat
          ? "inline-simple-chat"
          : useToolQueue
            ? "inline-dev"
            : "inline-coding-chat",
        traceId,
        warning,
      });
    }

    const devCommand = getInngestDevCommand();
    await updateMessageDebugInfo({
      messageId: assistantMessageId,
      errorMessage: buildDebugLine({
        traceId,
        stage: "unexpected-routing-fallback",
        detail: `Inline processing expected. Local dev command: ${devCommand}`,
      }),
    });

    return NextResponse.json({
      success: true,
      messageId: assistantMessageId,
      queued: false,
      mode: "inline-fallback",
      traceId,
      warning: "Message processing used the inline fallback path.",
    });
  } catch (error) {
    return toErrorResponse(error, "Unable to send message");
  }
}
