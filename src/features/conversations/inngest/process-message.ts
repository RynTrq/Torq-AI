import { inngest } from "@/inngest/client";
import { convex } from "@/lib/convex-client";
import { api } from "../../../../convex/_generated/api";
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
      const { messageId } = event.data.event.data as MessageEvent;
      const internalKey = process.env.TORQ_AI_CONVEX_INTERNAL_KEY;

      // Update the message with error content
      if (internalKey) {
        await step.run("update-message-on-failure", async () => {
          const existingMessage = await convex.query(api.system.getMessageById, {
            internalKey,
            messageId,
          });

          if (existingMessage?.status !== "processing") {
            return;
          }

          await convex.mutation(api.system.updateMessageContent, {
            internalKey,
            messageId,
            content:
              "My apologies, I encountered an error while processing your request. Let me know if you need anything else!",
          });
        });
      }
    }
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
