import { z } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { convex } from "@/lib/convex-client";
import { inngest } from "@/inngest/client";

import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

const requestSchema = z.object({
  projectId: z.string(),
});

const getStatusCode = (message: string) => {
  if (/Unauthorized/i.test(message)) {
    return 403;
  }

  if (/not found/i.test(message)) {
    return 404;
  }

  if (/syncing backend functions/i.test(message)) {
    return 503;
  }

  return 400;
};

const cancelActiveProjectRuns = async ({
  internalKey,
  projectId,
}: {
  internalKey: string;
  projectId: Id<"projects">;
}) => {
  const processingMessages = await convex.query(
    api.system.getProcessingMessages,
    {
      internalKey,
      projectId,
    },
  );

  if (processingMessages.length === 0) {
    return false;
  }

  await Promise.all(
    processingMessages.map(async (message) => {
      try {
        await inngest.send({
          name: "message/cancel",
          data: {
            messageId: message._id,
          },
        });
      } catch (error) {
        console.warn("Unable to dispatch message cancellation", error);
      }

      await convex.mutation(api.system.updateMessageStatus, {
        internalKey,
        messageId: message._id,
        status: "cancelled",
      });
    }),
  );

  return true;
};

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const internalKey = process.env.TORQ_AI_CONVEX_INTERNAL_KEY;

  if (!internalKey) {
    return NextResponse.json(
      { error: "Internal key not configured" },
      { status: 500 },
    );
  }

  const body = await request.json();
  const { projectId } = requestSchema.parse(body);
  const projectIdValue = projectId as Id<"projects">;

  try {
    await cancelActiveProjectRuns({
      internalKey,
      projectId: projectIdValue,
    });

    await convex.mutation(api.system.deleteProject, {
      internalKey,
      ownerId: userId,
      projectId: projectIdValue,
    });

    return NextResponse.json({ success: true, projectId });
  } catch (error) {
    const rawMessage =
      error instanceof Error ? error.message.replace(/^Uncaught Error:\s*/, "") : "Unable to delete project";

    const message = rawMessage.includes("Could not find public function")
      ? "Torq-AI is still syncing backend functions. Restart `npm run dev`, wait for Convex to finish syncing, then try again."
      : rawMessage;

    return NextResponse.json(
      { error: message },
      { status: getStatusCode(message) },
    );
  }
}
