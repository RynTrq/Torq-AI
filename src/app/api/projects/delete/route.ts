import { z } from "zod";
import { NextResponse } from "next/server";

import { inngest } from "@/inngest/client";
import { toErrorResponse } from "@/lib/api/error-response";
import { requireOwnedProject } from "@/lib/data/authz";
import {
  deleteProject,
  listProcessingMessages,
  updateMessageStatus,
} from "@/lib/data/server";

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

  return 400;
};

const cancelActiveProjectRuns = async (projectId: string) => {
  const processingMessages = await listProcessingMessages(projectId);

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

      await updateMessageStatus({
        messageId: message._id,
        status: "cancelled",
      });
    }),
  );

  return true;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId } = requestSchema.parse(body);
    const { user } = await requireOwnedProject(projectId);

    await cancelActiveProjectRuns(projectId);
    await deleteProject({
      ownerId: user.id,
      projectId,
    });

    return NextResponse.json({ success: true, projectId });
  } catch (error) {
    if (
      error instanceof Error &&
      /Unexpected end of JSON input|JSON/i.test(error.message)
    ) {
      return toErrorResponse(error, "Invalid project delete payload");
    }

    const message =
      error instanceof Error
        ? error.message.replace(/^Uncaught Error:\s*/, "")
        : "Unable to delete project";

    return NextResponse.json(
      { error: message },
      { status: getStatusCode(message) },
    );
  }
}
