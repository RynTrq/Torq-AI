import { inngest } from "@/inngest/client";
import {
  getMessageById,
  updateMessageContent,
} from "@/lib/data/server";
import {
  processMessageEvent,
  type MessageEvent,
} from "./process-message-core";

export const processMessage = inngest.createFunction(
  {
    id: "process-message",
    cancelOn: [
      {
        event: "message/cancel",
        if: "event.data.messageId == async.data.messageId",
      },
    ],
    onFailure: async ({ event, step }) => {
      const { messageId, traceId } = event.data.event.data as MessageEvent;

      console.error("[torq-ai][message] inngest-on-failure", {
        messageId,
        traceId: traceId ?? null,
      });

      await step.run("update-message-on-failure", async () => {
        const existingMessage = await getMessageById(messageId);

        if (existingMessage?.status !== "processing") {
          return;
        }

        await updateMessageContent({
          messageId,
          content:
            "My apologies, I encountered an error while processing your request. Let me know if you need anything else!",
          errorMessage: [
            `Trace ID: ${traceId ?? "unknown"}`,
            "Stage: inngest-on-failure",
            "Detail: The hosted Inngest function failed before a final reply was written.",
          ].join("\n"),
        });
      });
    },
  },
  {
    event: "message/sent",
  },
  async ({ event, step }) => {
    return await processMessageEvent({
      eventData: event.data as MessageEvent,
      runner: {
        run: async (name, fn) => await step.run(name, async () => await fn()),
        sleep: async (name, duration) => await step.sleep(name, duration),
      },
    });
  }
);
