import ky, { HTTPError } from "ky";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  CopyIcon, 
  HistoryIcon, 
  LoaderIcon, 
  PlusIcon
} from "lucide-react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions,
  MessageAction,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Button } from "@/components/ui/button";

import {
  useConversation,
  useConversations,
  useCreateConversation,
  useMessages,
} from "../hooks/use-conversations";
import {
  getSelectedModelId,
} from "@/features/ai/store/use-model-store";

import { Id } from "@/lib/data/app-types";
import { DEFAULT_CONVERSATION_TITLE } from "../constants";
import { PastConversationsDialog } from "./past-conversations-dialog";

interface ConversationSidebarProps {
  projectId: Id<"projects">;
};

const PROCESSING_STALE_AFTER_MS = 30_000;

const getErrorMessage = async (error: unknown, fallback: string) => {
  if (error instanceof HTTPError) {
    try {
      const body = await error.response.json<{ error?: string }>();
      if (body.error) {
        return body.error;
      }
    } catch {
      // Fall back to the default message below.
    }
  }

  if (error instanceof Error && error.message) {
    return error.message.replace(/^Uncaught Error:\s*/, "");
  }

  return fallback;
};

export const ConversationSidebar = ({
  projectId,
}: ConversationSidebarProps) => {
  const [input, setInput] = useState("");
  const [
    selectedConversationId,
    setSelectedConversationId,
  ] = useState<Id<"conversations"> | null>(null);
  const [
    pastConversationsOpen,
    setPastConversationsOpen
  ] = useState(false);
  const queryClient = useQueryClient();
  const [now, setNow] = useState(() => Date.now());

  const createConversation = useCreateConversation();
  const conversations = useConversations(projectId);

  const activeConversationId =
    selectedConversationId ?? conversations?.[0]?._id ?? null;

  const activeConversation = useConversation(activeConversationId);
  const conversationMessages = useMessages(activeConversationId);

  // Check if any message is currently processing
  const isProcessing = conversationMessages?.some(
    (msg) => msg.status === "processing"
  );

  useEffect(() => {
    if (!isProcessing) {
      return;
    }

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 5_000);

    return () => {
      window.clearInterval(interval);
    };
  }, [isProcessing]);

  const handleCancel = async () => {
    try {
      await ky.post("/api/messages/cancel", {
        json: { projectId },
      });
      await queryClient.invalidateQueries({
        queryKey: ["messages"],
      });
    } catch (error) {
      toast.error(await getErrorMessage(error, "Unable to cancel request"));
    }
  };

  const handleCreateConversation = async () => {
    try {
      const newConversationId = await createConversation({
        projectId,
        title: DEFAULT_CONVERSATION_TITLE,
      });
      setSelectedConversationId(newConversationId);
      return newConversationId;
    } catch {
      toast.error("Unable to create new conversation");
      return null;
    }
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const trimmedMessage = message.text.trim();
    const modelId = getSelectedModelId();

    // If processing and no new message, this is just a stop function
    if (isProcessing && !trimmedMessage) {
      await handleCancel();
      setInput("");
      return;
    }

    if (!trimmedMessage) {
      return;
    }

    let conversationId = activeConversationId;

    if (!conversationId) {
      conversationId = await handleCreateConversation();
      if (!conversationId) {
        return;
      }
    }

    // Trigger Inngest function via API
    try {
      const response = await ky.post("/api/messages", {
        json: {
          conversationId,
          message: trimmedMessage,
          modelId,
        },
      }).json<{ warning?: string }>();

      await queryClient.invalidateQueries({
        queryKey: ["messages", conversationId],
      });
      await queryClient.invalidateQueries({
        queryKey: ["conversations", projectId],
      });

      if (response.warning) {
        toast.warning(response.warning);
      }
      setInput("");
    } catch (error) {
      toast.error(await getErrorMessage(error, "Message failed to send"));
    }
  };

  return (
    <>
      <PastConversationsDialog
        projectId={projectId}
        open={pastConversationsOpen}
        onOpenChange={setPastConversationsOpen}
        onSelect={setSelectedConversationId}
      />
      <div className="flex h-full flex-col bg-workspace-sidebar">
        <div className="flex h-10 items-center justify-between border-b border-[color:var(--workspace-border)] bg-workspace-panel px-3">
          <div className="truncate text-sm font-medium">
            {activeConversation?.title ?? DEFAULT_CONVERSATION_TITLE}
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon-xs"
              variant="highlight"
              onClick={() => setPastConversationsOpen(true)}
            >
              <HistoryIcon className="size-3.5" />
            </Button>
            <Button
              size="icon-xs"
              variant="highlight"
              onClick={handleCreateConversation}
            >
              <PlusIcon className="size-3.5" />
            </Button>
          </div>
        </div>
        <Conversation className="flex-1">
          <ConversationContent>
            {conversationMessages?.map((message, messageIndex) => (
              <Message
                key={message._id}
                from={message.role}
              >
                <MessageContent>
                  {message.status === "processing" ? (
                    <div className="space-y-2 text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <LoaderIcon className="size-4 animate-spin" />
                        <span>Thinking...</span>
                      </div>
                      {now - message._creationTime >
                        PROCESSING_STALE_AFTER_MS && (
                        <p className="max-w-[22rem] text-xs leading-relaxed text-amber-700 dark:text-amber-300">
                          This request is taking longer than expected. Stop it
                          and retry, or switch to another model and send it
                          again.
                        </p>
                      )}
                    </div>
                  ) : message.status === "cancelled" ? (
                    <span className="text-muted-foreground italic">
                      Request cancelled
                    </span>
                  ) : (
                    <MessageResponse>{message.content}</MessageResponse>
                  )}
                </MessageContent>
                {message.role === "assistant" &&
                  message.status === "completed" &&
                  messageIndex === (conversationMessages?.length ?? 0) - 1 && (
                    <MessageActions>
                      <MessageAction
                        onClick={() => {
                          navigator.clipboard.writeText(message.content)
                        }}
                        label="Copy"
                      >
                        <CopyIcon className="size-3" />
                      </MessageAction>
                    </MessageActions>
                  )
                }
              </Message>
            ))}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
        <div className="border-t border-[color:var(--workspace-border)] bg-workspace-panel p-3">
          <PromptInput 
            onSubmit={handleSubmit}
            className="mt-2"
          >
            <PromptInputBody>
              <PromptInputTextarea
                placeholder="Ask Torq-AI anything..."
                onChange={(e) => setInput(e.target.value)}
                value={input}
                disabled={isProcessing}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit
                disabled={isProcessing ? false : !input}
                status={isProcessing ? "streaming" : undefined}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </>
  );
};
