import { z } from "zod";
import { NextResponse } from "next/server";
import {
  adjectives,
  animals,
  colors,
  uniqueNamesGenerator,
} from "unique-names-generator";

import { DEFAULT_CONVERSATION_TITLE } from "@/features/conversations/constants";
import {
  immediateMessageProcessingRunner,
  processMessageEvent,
} from "@/features/conversations/inngest/process-message-core";
import { requireUser } from "@/lib/auth";
import {
  createMessage,
  createProjectWithConversation,
  getMessageById,
  updateMessageContent,
} from "@/lib/data/server";
import { inngest } from "@/inngest/client";
import {
  getInngestDevCommand,
  isLocalInngestDevServerAvailable,
  shouldCheckLocalInngestDevServer,
} from "@/lib/inngest/dev-server";

const requestSchema = z.object({
  modelId: z.string().optional().nullable(),
  prompt: z.string().min(1),
});

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message.replace(/^Uncaught Error:\s*/, "");
  }

  return "The initial AI build could not complete.";
};

export async function POST(request: Request) {
  let userId: string;

  try {
    const user = await requireUser();
    userId = user.id;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { modelId, prompt } = requestSchema.parse(body);

  const projectName = uniqueNamesGenerator({
    dictionaries: [adjectives, animals, colors],
    separator: "-",
    length: 3,
  });

  const { projectId, conversationId } = await createProjectWithConversation({
    ownerId: userId,
    projectName,
    conversationTitle: DEFAULT_CONVERSATION_TITLE,
  });

  await createMessage({
    conversationId,
    projectId,
    role: "user",
    content: prompt,
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
          message: prompt,
          modelId,
        },
        runner: immediateMessageProcessingRunner,
      });
    } catch (error) {
      warning =
        "The workspace was created, but the initial AI build could not complete. Open the project to see the first assistant reply for details.";

      console.error("Failed to process project bootstrap inline", error);

      const existingMessage = await getMessageById(assistantMessageId);

      if (existingMessage?.status === "processing") {
        await updateMessageContent({
          messageId: assistantMessageId,
          content:
            `Your workspace is ready, but the initial AI build could not complete.\n\n${getErrorMessage(error)}`,
        });
      }
    }

    return NextResponse.json({ projectId, queued: false, warning });
  }

  const localWorkerAvailable = await isLocalInngestDevServerAvailable();

  if (!localWorkerAvailable) {
    const devCommand = getInngestDevCommand();
    const warning =
      `The workspace was created, but the local AI worker is offline. Start \`${devCommand}\`, then send another prompt from inside the project.`;

    await updateMessageContent({
      messageId: assistantMessageId,
      content:
        `Your workspace is ready, but the local AI worker is not running. Start \`${devCommand}\` in another terminal, then continue from inside the project.`,
    });

    return NextResponse.json({ projectId, queued: false, warning });
  }

  let queued = true;
  let warning: string | undefined;

  try {
    await inngest.send({
      name: "message/sent",
      data: {
        messageId: assistantMessageId,
        conversationId,
        projectId,
        message: prompt,
        modelId,
      },
    });
  } catch (error) {
    queued = false;
    warning =
      "The workspace was created, but the AI build handoff could not start. You can still open the project and continue from there.";

    console.error("Failed to enqueue project bootstrap", error);

    await updateMessageContent({
      messageId: assistantMessageId,
      content:
        "Your workspace is ready, but the AI bootstrap could not start automatically. Open the project and send another prompt once the background worker is available.",
    });
  }

  return NextResponse.json({ projectId, queued, warning });
}
