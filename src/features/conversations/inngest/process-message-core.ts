import { createAgent, createNetwork } from "@inngest/agent-kit";
import { NonRetriableError } from "inngest";

import type { ConversationRecord, MessageRecord } from "@/lib/data/types";
import {
  getConversationById,
  listRecentMessages,
  updateConversationTitle,
  updateMessageContent,
  updateMessageDebugInfo,
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
  getCandidateAIModels,
} from "@/lib/ai/model-server";

export interface MessageEvent {
  messageId: string;
  conversationId: string;
  projectId: string;
  message: string;
  modelId?: string | null;
  traceId?: string | null;
}

export interface MessageProcessingRunner {
  run: <T>(name: string, fn: () => Promise<T>) => Promise<unknown>;
  sleep: (name: string, duration: string) => Promise<void>;
}

export const immediateMessageProcessingRunner: MessageProcessingRunner = {
  run: async (_name, fn) => await fn(),
  sleep: async () => {},
};

const MESSAGE_RUN_TIMEOUT_MS = 45_000;
const MAX_REQUESTED_MODEL_ATTEMPTS = 3;
const MAX_AUTOMATIC_MODEL_ATTEMPTS = 4;
const SIMPLE_CHAT_MAX_LENGTH = 80;
const SIMPLE_CHAT_REGEX =
  /^(hi|hey|hello|yo|sup|thanks|thank you|ok|okay|cool|nice|good morning|good afternoon|good evening)[!. ]*$/i;
const PROJECT_ACTION_REGEX =
  /\b(create|update|edit|modify|rewrite|refactor|rename|delete|remove|read|list|open|fix|implement)\b/i;
const PROJECT_TARGET_REGEX =
  /\b(file|folder|project|codebase|repository|repo|src\/|\.ts\b|\.tsx\b|\.js\b|\.jsx\b|\.py\b|\.java\b|\.cpp\b|\.c\b|\.html\b|\.css\b|\.json\b|\.md\b)\b/i;

const logMessageProcessing = (
  event: string,
  details: Record<string, unknown>,
) => {
  console.info(`[torq-ai][message] ${event}`, details);
};

const buildDebugLine = ({
  traceId,
  stage,
  detail,
}: {
  traceId?: string | null;
  stage: string;
  detail?: string;
}) =>
  [
    `Trace ID: ${traceId ?? "unknown"}`,
    `Stage: ${stage}`,
    detail ? `Detail: ${detail}` : null,
  ]
    .filter(Boolean)
    .join("\n");

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

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

export const isSimpleChatMessage = (message: string) => {
  const trimmed = message.trim();

  return (
    trimmed.length > 0 &&
    trimmed.length <= SIMPLE_CHAT_MAX_LENGTH &&
    SIMPLE_CHAT_REGEX.test(trimmed)
  );
};

export const shouldUseToolNetwork = (message: string) =>
  PROJECT_ACTION_REGEX.test(message) && PROJECT_TARGET_REGEX.test(message);

const limitCandidateModels = (
  candidateModels: ReturnType<typeof getCandidateAIModels>,
  requestedModelId?: string | null,
) => {
  const maxAttempts = requestedModelId
    ? MAX_REQUESTED_MODEL_ATTEMPTS
    : MAX_AUTOMATIC_MODEL_ATTEMPTS;

  return candidateModels.slice(0, maxAttempts);
};

const PROMPT_HISTORY_LIMIT = 6;
const PROMPT_MESSAGE_CHARACTER_LIMIT = 2_000;

const toPromptSnippet = (content: string) => {
  const trimmed = content.trim().replace(/\s+/g, " ");

  if (trimmed.length <= PROMPT_MESSAGE_CHARACTER_LIMIT) {
    return trimmed;
  }

  return `${trimmed.slice(0, PROMPT_MESSAGE_CHARACTER_LIMIT - 3).trimEnd()}...`;
};

const buildConversationContext = (
  recentMessages: MessageRecord[],
  currentMessageId: string,
) => {
  const contextMessages = recentMessages
    .filter((msg) => msg._id !== currentMessageId && msg.content.trim() !== "")
    .slice(-PROMPT_HISTORY_LIMIT);

  if (contextMessages.length === 0) {
    return "";
  }

  const historyText = contextMessages
    .map((msg) => `${msg.role.toUpperCase()}: ${toPromptSnippet(msg.content)}`)
    .join("\n\n");

  return `\n\n<conversation_context>\nUse this recent exchange for context, but answer only the latest user request. Do not repeat prior responses.\n\n${historyText}\n</conversation_context>`;
};

const persistDebugStage = async ({
  detail,
  messageId,
  runner,
  stage,
  traceId,
}: {
  detail?: string;
  messageId: string;
  runner: MessageProcessingRunner;
  stage: string;
  traceId?: string | null;
}) => {
  const slug = (detail ?? "status")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "status";

  await runner.run(`debug-${stage}-${slug}`, async () => {
    await updateMessageDebugInfo({
      messageId,
      errorMessage: buildDebugLine({
        traceId,
        stage,
        detail,
      }),
    });
  });
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
    traceId,
  } = eventData;

  logMessageProcessing("start", {
    conversationId,
    messageId,
    messageLength: message.trim().length,
    projectId,
    requestedModelId: modelId ?? null,
    traceId: traceId ?? null,
  });

  await persistDebugStage({
    messageId,
    runner,
    stage: "worker-started",
    traceId,
  });

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

  const systemPrompt =
    CODING_AGENT_SYSTEM_PROMPT + buildConversationContext(recentMessages, messageId);

  const candidateModels = limitCandidateModels(
    getCandidateAIModels(modelId),
    modelId,
  );
  const simpleChat = isSimpleChatMessage(message);
  const useToolNetwork = shouldUseToolNetwork(message);

  logMessageProcessing("resolved-routing", {
    candidateModelIds: candidateModels.map((candidateModel) => candidateModel.id),
    conversationId,
    messageId,
    mode: simpleChat
      ? "simple-chat"
      : useToolNetwork
        ? "coding-agent"
        : "coding-chat",
    projectId,
    requestedModelId: modelId ?? null,
    traceId: traceId ?? null,
  });

  await persistDebugStage({
    detail: `Mode ${simpleChat ? "simple-chat" : useToolNetwork ? "coding-agent" : "coding-chat"} with ${candidateModels.length} candidate models`,
    messageId,
    runner,
    stage: "routing-resolved",
    traceId,
  });

  logMessageProcessing("candidate-models", {
    candidateModelLabels: candidateModels.map((candidateModel) => candidateModel.label),
    conversationId,
    messageId,
    projectId,
    traceId: traceId ?? null,
  });

  if (candidateModels.length === 0) {
    throw new NonRetriableError(
      "No configured AI model is currently available. Add a provider API key or restore provider access, then try again.",
    );
  }

  const shouldGenerateTitle =
    conversation.title === DEFAULT_CONVERSATION_TITLE;
  let titleGenerated = !shouldGenerateTitle;
  const attemptedModels: string[] = [];
  let lastError: unknown;

  for (const candidateModel of candidateModels) {
    attemptedModels.push(candidateModel.label);
    const startedAt = Date.now();

    try {
      await persistDebugStage({
        detail: `${candidateModel.label} (${candidateModel.id})`,
        messageId,
        runner,
        stage: "model-attempt",
        traceId,
      });

      logMessageProcessing("model-attempt", {
        conversationId,
        messageId,
        mode: simpleChat
          ? "simple-chat"
          : useToolNetwork
            ? "coding-agent"
            : "coding-chat",
        provider: candidateModel.provider,
        requestedModelId: modelId ?? null,
        resolvedModelId: candidateModel.id,
        traceId: traceId ?? null,
      });

      const titleModel = getAgentKitModelByDefinition(candidateModel, {
        max_tokens: 64,
        temperature: 0,
      });
      const codingModel = getAgentKitModelByDefinition(candidateModel, {
        max_tokens: simpleChat ? 512 : useToolNetwork ? 6000 : 3000,
        temperature: simpleChat ? 0.4 : 0.2,
      });

      let assistantResponse =
        "I processed your request. Let me know if you need anything else!";

      if (simpleChat) {
        const chatAgent = createAgent({
          name: "torq-ai-chat",
          description: "A fast conversational assistant for simple chat turns",
          system:
            "You are Torq-AI. Reply briefly, naturally, and helpfully to the user's message. Keep it under 2 sentences unless they ask for more.",
          model: codingModel.model,
        });

        const result = await withTimeout(
          chatAgent.run(message),
          MESSAGE_RUN_TIMEOUT_MS,
          `Timed out after ${MESSAGE_RUN_TIMEOUT_MS}ms while generating a chat reply.`,
        );
        const textMessage = result.output.find(
          (entry) => entry.type === "text" && entry.role === "assistant",
        );

        if (textMessage?.type === "text") {
          assistantResponse =
            typeof textMessage.content === "string"
              ? textMessage.content
              : textMessage.content.map((contentPart) => contentPart.text).join("");
        }
      } else if (useToolNetwork) {
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
          maxIter: 12,
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

        const result = await withTimeout(
          network.run(message),
          MESSAGE_RUN_TIMEOUT_MS,
          `Timed out after ${MESSAGE_RUN_TIMEOUT_MS}ms while processing the request.`,
        );
        const lastResult = result.state.results.at(-1);
        const textMessage = lastResult?.output.find(
          (entry) => entry.type === "text" && entry.role === "assistant",
        );

        if (textMessage?.type === "text") {
          assistantResponse =
            typeof textMessage.content === "string"
              ? textMessage.content
              : textMessage.content.map((contentPart) => contentPart.text).join("");
        }
      } else {
        const codingChatAgent = createAgent({
          name: "torq-ai-coding-chat",
          description: "A direct coding assistant for problem solving and explanations",
          system:
            `${systemPrompt}\n\nAnswer the user's request directly. Do not assume you must edit project files unless they explicitly ask for file or project changes.`,
          model: codingModel.model,
        });

        const result = await withTimeout(
          codingChatAgent.run(message),
          MESSAGE_RUN_TIMEOUT_MS,
          `Timed out after ${MESSAGE_RUN_TIMEOUT_MS}ms while generating a coding reply.`,
        );
        const textMessage = result.output.find(
          (entry) => entry.type === "text" && entry.role === "assistant",
        );

        if (textMessage?.type === "text") {
          assistantResponse =
            typeof textMessage.content === "string"
              ? textMessage.content
              : textMessage.content.map((contentPart) => contentPart.text).join("");
        }
      }

      if (modelId && candidateModel.id !== modelId) {
        assistantResponse =
          `Requested model unavailable, continued with ${candidateModel.label}.\n\n${assistantResponse}`;
      }

      await runner.run("update-assistant-message", async () => {
        await updateMessageContent({
          messageId,
          content: assistantResponse,
          modelId: candidateModel.id,
          errorMessage: null,
        });
      });

      await persistDebugStage({
        detail: `Completed with ${candidateModel.id}`,
        messageId,
        runner,
        stage: "assistant-response-written",
        traceId,
      });

      logMessageProcessing("model-success", {
        assistantResponseLength: assistantResponse.length,
        conversationId,
        durationMs: Date.now() - startedAt,
        messageId,
        requestedModelId: modelId ?? null,
        resolvedModelId: candidateModel.id,
        traceId: traceId ?? null,
        usedFallback: Boolean(modelId && candidateModel.id !== modelId),
      });

      if (!titleGenerated) {
        const titleAgent = createAgent({
          name: "title-generator",
          system: TITLE_GENERATOR_SYSTEM_PROMPT,
          model: titleModel.model,
        });

        try {
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
        } catch (titleError) {
          console.warn("Unable to generate conversation title", titleError);
        }
      }

      return {
        success: true,
        conversationId,
        messageId,
        modelId: candidateModel.id,
      };
    } catch (error) {
      lastError = error;
      await persistDebugStage({
        detail: `${candidateModel.id}: ${sanitizeModelError(error)}`,
        messageId,
        runner,
        stage: "model-failure",
        traceId,
      });
      logMessageProcessing("model-failure", {
        conversationId,
        durationMs: Date.now() - startedAt,
        error: sanitizeModelError(error),
        messageId,
        requestedModelId: modelId ?? null,
        resolvedModelId: candidateModel.id,
        traceId: traceId ?? null,
      });
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
        errorMessage: buildDebugLine({
          traceId,
          stage: "all-models-failed",
          detail: sanitizeModelError(lastError),
        }),
      });
    });

  logMessageProcessing("all-models-failed", {
    attemptedModels,
    conversationId,
    finalError: sanitizeModelError(lastError),
    messageId,
    requestedModelId: modelId ?? null,
    traceId: traceId ?? null,
  });

  throw new NonRetriableError(failureMessage);
};
