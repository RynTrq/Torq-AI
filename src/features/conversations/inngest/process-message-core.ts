import { createAgent, createNetwork } from "@inngest/agent-kit";
import { NonRetriableError } from "inngest";

import type { ConversationRecord, MessageRecord } from "@/lib/data/types";
import {
  getConversationById,
  listRecentMessages,
  updateConversationTitle,
  updateMessageContent,
} from "@/lib/data/server";
import {
  CODING_AGENT_SYSTEM_PROMPT,
  TITLE_GENERATOR_SYSTEM_PROMPT,
} from "./constants";
import { DEFAULT_CONVERSATION_TITLE } from "../constants";
import { createReadFilesTool } from "./tools/read-files";
import { createListFilesTool } from "./tools/list-files";
import { createUpdateFileTool } from "./tools/update-file";
import { createCreateFilesTool } from "./tools/create-files";
import { createCreateFolderTool } from "./tools/create-folder";
import { createRenameFileTool } from "./tools/rename-file";
import { createDeleteFilesTool } from "./tools/delete-files";
import { createScrapeUrlsTool } from "./tools/scrape-urls";
import {
  getAgentKitModelByDefinition,
  getHealthyCandidateAIModels,
} from "@/lib/ai/model-server";

export interface MessageEvent {
  messageId: string;
  conversationId: string;
  projectId: string;
  message: string;
  modelId?: string | null;
}

export interface MessageProcessingRunner {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<unknown>;
  sleep: (name: string, duration: string) => Promise<void>;
}

export const immediateMessageProcessingRunner: MessageProcessingRunner = {
  run: async (_name, fn) => await fn(),
  sleep: async () => {},
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown AI error";
};

const sanitizeModelError = (error: unknown) => {
  const message = getErrorMessage(error);

  return message.length > 220
    ? `${message.slice(0, 217).trimEnd()}...`
    : message;
};

export const processMessageEvent = async ({
  eventData,
  runner,
}: {
  eventData: MessageEvent;
  runner: MessageProcessingRunner;
}) => {
  const {
    messageId,
    conversationId,
    projectId,
    message,
    modelId,
  } = eventData;

  await runner.sleep("wait-for-db-sync", "1s");

  const conversation = await runner.run("get-conversation", async () => {
    return await getConversationById(conversationId);
  }) as ConversationRecord | null;

  if (!conversation) {
    throw new NonRetriableError("Conversation not found");
  }

  const recentMessages = await runner.run("get-recent-messages", async () => {
    return await listRecentMessages({
      conversationId,
      limit: 10,
    });
  }) as MessageRecord[];

  let systemPrompt = CODING_AGENT_SYSTEM_PROMPT;

  const contextMessages = recentMessages.filter(
    (msg) => msg._id !== messageId && msg.content.trim() !== "",
  );

  if (contextMessages.length > 0) {
    const historyText = contextMessages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join("\n\n");

    systemPrompt += `\n\n## Previous Conversation (for context only - do NOT repeat these responses):\n${historyText}\n\n## Current Request:\nRespond ONLY to the user's new message below. Do not repeat or reference your previous responses.`;
  }

  const candidateModels = await getHealthyCandidateAIModels(modelId);

  if (candidateModels.length === 0) {
    throw new NonRetriableError(
      "No healthy AI model is currently available. Add or top up provider credits, or make sure at least one configured model is healthy.",
    );
  }

  const shouldGenerateTitle =
    conversation.title === DEFAULT_CONVERSATION_TITLE;
  let titleGenerated = !shouldGenerateTitle;
  const attemptedModels: string[] = [];
  let lastError: unknown;

  for (const candidateModel of candidateModels) {
    attemptedModels.push(candidateModel.label);

    try {
      const titleModel = getAgentKitModelByDefinition(candidateModel, {
        max_tokens: 64,
        temperature: 0,
      });
      const codingModel = getAgentKitModelByDefinition(candidateModel, {
        max_tokens: 16000,
        temperature: 0.3,
      });

      if (!titleGenerated) {
        const titleAgent = createAgent({
          name: "title-generator",
          system: TITLE_GENERATOR_SYSTEM_PROMPT,
          model: titleModel.model,
        });

        const { output } = await titleAgent.run(message);

        const titleTextMessage = output.find(
          (entry) => entry.type === "text" && entry.role === "assistant",
        );

        if (titleTextMessage?.type === "text") {
          const title =
            typeof titleTextMessage.content === "string"
              ? titleTextMessage.content.trim()
              : titleTextMessage.content
                  .map((contentPart) => contentPart.text)
                  .join("")
                  .trim();

          if (title) {
            await runner.run("update-conversation-title", async () => {
              await updateConversationTitle({
                conversationId,
                title,
              });
            });

            titleGenerated = true;
          }
        }
      }

      const codingAgent = createAgent({
        name: "torq-ai",
        description: "The Torq-AI coding agent",
        system: systemPrompt,
        model: codingModel.model,
        tools: [
          createListFilesTool({ projectId }),
          createReadFilesTool({ projectId }),
          createUpdateFileTool({ projectId }),
          createCreateFilesTool({ projectId }),
          createCreateFolderTool({ projectId }),
          createRenameFileTool({ projectId }),
          createDeleteFilesTool({ projectId }),
          createScrapeUrlsTool(),
        ],
      });

      const network = createNetwork({
        name: "torq-ai-network",
        agents: [codingAgent],
        maxIter: 20,
        router: ({ network }) => {
          const lastResult = network.state.results.at(-1);
          const hasTextResponse = lastResult?.output.some(
            (entry) => entry.type === "text" && entry.role === "assistant",
          );
          const hasToolCalls = lastResult?.output.some(
            (entry) => entry.type === "tool_call",
          );

          if (hasTextResponse && !hasToolCalls) {
            return undefined;
          }

          return codingAgent;
        },
      });

      const result = await network.run(message);
      const lastResult = result.state.results.at(-1);
      const textMessage = lastResult?.output.find(
        (entry) => entry.type === "text" && entry.role === "assistant",
      );

      let assistantResponse =
        "I processed your request. Let me know if you need anything else!";

      if (textMessage?.type === "text") {
        assistantResponse =
          typeof textMessage.content === "string"
            ? textMessage.content
            : textMessage.content.map((contentPart) => contentPart.text).join("");
      }

      if (modelId && candidateModel.id !== modelId) {
        assistantResponse =
          `Requested model unavailable, continued with ${candidateModel.label}.\n\n${assistantResponse}`;
      }

      await runner.run("update-assistant-message", async () => {
        await updateMessageContent({
          messageId,
          content: assistantResponse,
        });
      });

      return {
        success: true,
        conversationId,
        messageId,
        modelId: candidateModel.id,
      };
    } catch (error) {
      lastError = error;
      console.error(
        `AI model ${candidateModel.id} failed during message processing`,
        error,
      );
    }
  }

  const attemptedModelList = attemptedModels.join(", ");
  const failureMessage =
    `I couldn't complete this request with the available AI models (${attemptedModelList}). ` +
    `Last error: ${sanitizeModelError(lastError)}. Please try another model or retry in a moment.`;

  await runner.run("update-assistant-message-error", async () => {
    await updateMessageContent({
      messageId,
      content: failureMessage,
    });
  });

  throw new NonRetriableError(failureMessage);
};
