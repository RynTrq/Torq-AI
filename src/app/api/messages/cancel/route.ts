import { z } from "zod";
import { NextResponse } from "next/server";

import { inngest } from "@/inngest/client";
import { requireOwnedProject } from "@/lib/data/authz";
import { listProcessingMessages, updateMessageStatus } from "@/lib/data/server";

const requestSchema = z.object({
  projectId: z.string(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const { projectId } = requestSchema.parse(body);

  try {
    await requireOwnedProject(projectId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unauthorized";

    return NextResponse.json(
      { error: message },
      { status: message === "Unauthorized" ? 401 : 404 },
    );
  }

  const processingMessages = await listProcessingMessages(projectId);

  if (processingMessages.length === 0) {
    return NextResponse.json({ success: true, cancelled: false });
  }

  const cancelledIds = await Promise.all(
    processingMessages.map(async (processingMessage) => {
      try {
        await inngest.send({
          name: "message/cancel",
          data: {
            messageId: processingMessage._id,
          },
        });
      } catch (error) {
        console.warn("Unable to dispatch message cancellation", error);
      }

      await updateMessageStatus({
        messageId: processingMessage._id,
        status: "cancelled",
      });

      return processingMessage._id;
    }),
  );

  return NextResponse.json({
    success: true,
    cancelled: true,
    messageIds: cancelledIds,
  });
}
