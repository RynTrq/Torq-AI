import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { inngest } from "@/inngest/client";
import { convex } from "@/lib/convex-client";
import {
  getInngestDevCommand,
  isLocalInngestDevServerAvailable,
  shouldCheckLocalInngestDevServer,
} from "@/lib/inngest/dev-server";
import {
  immediateMessageProcessingRunner,
  processMessageEvent,
} from "@/features/conversations/inngest/process-message-core";

import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

const requestSchema = z.object({
  conversationId: z.string(),
  message: z.string(),
  modelId: z.string().optional().nullable(),
});

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalKey = process.env.TORQ_AI_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not configured" },
      { status: 500 }
    );
  }

  const body = await request.json();
  const { conversationId, message, modelId } = requestSchema.parse(body);

  // Call convex mutation, query
  const conversation = await convex.query(api.system.getConversationById, {
    internalKey,
    conversationId: conversationId as Id<"conversations">,
  });

  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  const projectId = conversation.projectId;

  // Find all processing messages in this project
  const processingMessages = await convex.query(
    api.system.getProcessingMessages,
    {
      internalKey,
      projectId,
    }
  );

  if (processingMessages.length > 0) {
    // Cancel all processing messages
    await Promise.all(
      processingMessages.map(async (msg) => {
        await inngest.send({
          name: "message/cancel",
          data: {
            messageId: msg._id,
          },
        });

        await convex.mutation(api.system.updateMessageStatus, {
          internalKey,
          messageId: msg._id,
          status: "cancelled",
        });
      })
    );
  }

  // Create user message
  await convex.mutation(api.system.createMessage, {
    internalKey,
    conversationId: conversationId as Id<"conversations">,
    projectId,
    role: "user",
    content: message,
  });

  // Create assistant message placeholder with processing status
  const assistantMessageId = await convex.mutation(
    api.system.createMessage,
    {
      internalKey,
      conversationId: conversationId as Id<"conversations">,
      projectId,
      role: "assistant",
      content: "",
      status: "processing",
    }
  );

  if (shouldCheckLocalInngestDevServer()) {
    let warning: string | undefined;

    try {
      await processMessageEvent({
        eventData: {
          messageId: assistantMessageId,
          conversationId: conversationId as Id<"conversations">,
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

      const existingMessage = await convex.query(api.system.getMessageById, {
        internalKey,
        messageId: assistantMessageId,
      });

      if (existingMessage?.status === "processing") {
        await convex.mutation(api.system.updateMessageContent, {
          internalKey,
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
    const warning = `Your message was saved, but the local AI worker is offline. Start \`${devCommand}\`, then send the prompt again.`;

    await convex.mutation(api.system.updateMessageContent, {
      internalKey,
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

    await convex.mutation(api.system.updateMessageContent, {
      internalKey,
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
};
