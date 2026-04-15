"use client";

import { useState } from "react";
import ky, { HTTPError } from "ky";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";

import { Id } from "@/lib/data/app-types";
import { getSelectedModelId } from "@/features/ai/store/use-model-store";

interface NewProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewProjectDialog = ({
  open,
  onOpenChange,
}: NewProjectDialogProps) => {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const getErrorMessage = async (error: unknown) => {
    if (error instanceof HTTPError) {
      try {
        const body = await error.response.json<{ error?: string }>();
        if (body.error) {
          return body.error;
        }
      } catch {
        // Fall through to the generic message below.
      }
    }

    if (error instanceof Error && error.message) {
      return error.message.replace(/^Uncaught Error:\s*/, "");
    }

    return "Unable to create project";
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    if (!message.text) return;
    const modelId = getSelectedModelId();

    setIsSubmitting(true);

    try {
      const { projectId, warning } = await ky
        .post("/api/projects/create-with-prompt", {
          json: {
            modelId,
            prompt: message.text.trim(),
          },
        })
        .json<{ projectId: Id<"projects">; warning?: string }>();

      toast.success("Project created");
      if (warning) {
        toast.warning(warning);
      }
      onOpenChange(false);
      setInput("");
      router.push(`/projects/${projectId}`);
    } catch (error) {
      toast.error(await getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        showCloseButton={false}
        className="sm:max-w-2xl border-panel-border bg-panel p-0 backdrop-blur-xl"
      >
        <DialogHeader className="border-b border-panel-border px-6 py-5 text-left">
          <DialogTitle className="text-2xl font-semibold tracking-[-0.03em]">
            What should Torq-AI build for you?
          </DialogTitle>
          <DialogDescription>
            Describe the product, feature, or prototype you want. Torq-AI will
            scaffold the first version and open the workspace for you.
          </DialogDescription>
        </DialogHeader>
        <PromptInput onSubmit={handleSubmit} className="border-none! overflow-hidden">
          <PromptInputBody>
            <PromptInputTextarea
              placeholder="Ask Torq-AI to build..."
              onChange={(e) => setInput(e.target.value)}
              value={input}
              disabled={isSubmitting}
            />
          </PromptInputBody>
          <PromptInputFooter>
             <PromptInputTools />
             <PromptInputSubmit disabled={!input || isSubmitting} />
          </PromptInputFooter>
        </PromptInput>
      </DialogContent>
    </Dialog>
  );
};
