import { z } from "zod";
import { NextResponse } from "next/server";

import { inngest } from "@/inngest/client";
import { requireOwnedConversation } from "@/lib/data/authz";
import {
  createMessage,
  getMessageById,
  listProcessingMessages,
  updateMessageContent,
  updateMessageStatus,
} from "@/lib/data/server";
import {
  getInngestDevCommand,
  isLocalInngestDevServerAvailable,
  shouldCheckLocalInngestDevServer,
} from "@/lib/inngest/dev-server";
import {
  immediateMessageProcessingRunner,
  processMessageEvent,
} from "@/features/conversations/inngest/process-message-core";

const requestSchema = z.object({
  conversationId: z.string(),
  message: z.string(),
  modelId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const { conversationId, message, modelId } = requestSchema.parse(body);

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
  const processingMessages = await listProcessingMessages(projectId);

  if (processingMessages.length > 0) {
    await Promise.all(
      processingMessages.map(async (processingMessage) => {
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

  if (shouldCheckLocalInngestDevServer()) {
    let warning: string | undefined;

    try {
      await processMessageEvent({
        eventData: {
          messageId: assistantMessageId,
          conversationId,
          projectId,
          message,
          modelId,
        },
        runner: immediateMessageProcessingRunner,
      });
    } catch (error) {
      warning =
        "Torq-AI hit an error while processing your message. Check the latest assistant reply for details.";

      console.error("Failed to process message inline", error);

      const existingMessage = await getMessageById(assistantMessageId);

      if (existingMessage?.status === "processing") {
        await updateMessageContent({
          messageId: assistantMessageId,
          content:
            "I ran into an unexpected error while processing your message. Please retry in a moment.",
        });
      }
    }

    return NextResponse.json({
      success: true,
      messageId: assistantMessageId,
      queued: false,
      warning,
    });
  }

  const localWorkerAvailable = await isLocalInngestDevServerAvailable();

  if (!localWorkerAvailable) {
    const devCommand = getInngestDevCommand();
    const warning =
      `Your message was saved, but the local AI worker is offline. Start \`${devCommand}\`, then send the prompt again.`;

    await updateMessageContent({
      messageId: assistantMessageId,
      content:
        `I saved your message, but the local AI worker is not running. Start \`${devCommand}\` in another terminal, then resend your prompt.`,
    });

    return NextResponse.json({
      success: true,
      messageId: assistantMessageId,
      queued: false,
      warning,
    });
  }

  let queued = true;
  let warning: string | undefined;
  let eventId: string | undefined;

  try {
    const event = await inngest.send({
      name: "message/sent",
      data: {
        messageId: assistantMessageId,
        conversationId,
        projectId,
        message,
        modelId,
      },
    });

    eventId = event.ids[0];
  } catch (error) {
    queued = false;
    warning =
      "Your message was saved, but the AI processor could not start. Try again in a moment.";

    console.error("Failed to enqueue message processing", error);

    await updateMessageContent({
      messageId: assistantMessageId,
      content:
        "I saved your message, but the AI processor is unavailable right now. Please try again in a moment.",
    });
  }

  return NextResponse.json({
    success: true,
    eventId,
    messageId: assistantMessageId,
    queued,
    warning,
  });
}
