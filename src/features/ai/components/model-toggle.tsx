"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckIcon, ChevronDownIcon, CpuIcon } from "lucide-react";

import {
  AI_PROVIDER_LABELS,
  AI_PROVIDER_ORDER,
  getAIModelDefinition,
  getAIModelsByProvider,
} from "@/lib/ai/model-catalog";
import { getModelHealthLabel, isModelAvailable } from "@/lib/ai/model-health";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorSeparator,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";

import { useModelStore } from "../store/use-model-store";
import { useModelHealth } from "../hooks/use-model-health";

export const ModelToggle = ({ className }: { className?: string }) => {
  const [open, setOpen] = useState(false);
  const selectedModelId = useModelStore((state) => state.selectedModelId);
  const setSelectedModelId = useModelStore((state) => state.setSelectedModelId);
  const { firstAvailableModelId, healthByModelId, isLoading } = useModelHealth();
  const autoSwitchRef = useRef<string | null>(null);

  const selectedModel = useMemo(
    () => getAIModelDefinition(selectedModelId),
    [selectedModelId],
  );
  const selectedModelHealth = healthByModelId?.[selectedModelId];

  useEffect(() => {
    if (!firstAvailableModelId || !healthByModelId) {
      return;
    }

    if (isModelAvailable(healthByModelId[selectedModelId])) {
      return;
    }

    if (autoSwitchRef.current === `${selectedModelId}:${firstAvailableModelId}`) {
      return;
    }

    setSelectedModelId(firstAvailableModelId);
    autoSwitchRef.current = `${selectedModelId}:${firstAvailableModelId}`;
    toast.info(
      `${selectedModel.label} is unavailable right now. Switched Torq-AI to ${getAIModelDefinition(firstAvailableModelId).label}.`,
    );
  }, [firstAvailableModelId, healthByModelId, selectedModel, selectedModelId, setSelectedModelId]);

  return (
    <ModelSelector open={open} onOpenChange={setOpen}>
      <ModelSelectorTrigger asChild>
        <Button
          className={cn(
            "h-9 max-w-[220px] rounded-full border-panel-border bg-panel-elevated px-3 text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.1)] hover:bg-panel",
            className,
          )}
          variant="outline"
        >
          <CpuIcon className="size-4 text-vscode-blue" />
          <ModelSelectorLogo
            provider={selectedModel.provider}
            className="size-3.5 dark:invert-0"
          />
          <span className="truncate text-sm font-medium">
            {selectedModel.label}
          </span>
          {selectedModelHealth && !isModelAvailable(selectedModelHealth) ? (
            <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-600">
              {getModelHealthLabel(selectedModelHealth)}
            </span>
          ) : null}
          <ChevronDownIcon className="size-4 text-muted-foreground" />
        </Button>
      </ModelSelectorTrigger>
      <ModelSelectorContent className="overflow-hidden border-panel-border bg-panel p-0 shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:max-w-lg">
        <div className="border-b border-panel-border px-4 py-4">
          <p className="text-xs font-semibold tracking-[0.22em] text-vscode-blue uppercase">
            Model routing
          </p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.03em]">
            Choose the brain behind Torq-AI
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            This selection drives project bootstrap, chat replies, quick edit,
            and inline code suggestions.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {isLoading
              ? "Checking provider health..."
              : `${healthByModelId ? Object.values(healthByModelId).filter((health) => health.status === "available").length : 0} of ${AI_PROVIDER_ORDER.flatMap((provider) => getAIModelsByProvider(provider)).length} models are currently available.`}
          </p>
        </div>
        <ModelSelectorInput placeholder="Search models..." />
        <ModelSelectorList className="max-h-[420px]">
          <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
          {AI_PROVIDER_ORDER.map((provider, index) => {
            const models = getAIModelsByProvider(provider);

            return (
              <div key={provider}>
                {index > 0 ? <ModelSelectorSeparator /> : null}
                <ModelSelectorGroup heading={AI_PROVIDER_LABELS[provider]}>
                  {models.map((model) => {
                    const isSelected = model.id === selectedModel.id;
                    const health = healthByModelId?.[model.id];
                    const available = isModelAvailable(health);

                    return (
                      <ModelSelectorItem
                        disabled={Boolean(health) && !available}
                        key={model.id}
                        onSelect={() => {
                          if (health && !available) {
                            return;
                          }

                          setSelectedModelId(model.id);
                          setOpen(false);
                        }}
                        value={`${model.label} ${model.provider} ${model.tagline}`}
                        className={cn(
                          "items-start gap-3 px-3 py-3",
                          health && !available ? "opacity-60" : "",
                        )}
                      >
                        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-panel-border bg-panel-elevated">
                          <ModelSelectorLogo
                            provider={model.provider}
                            className="size-4 dark:invert-0"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <ModelSelectorName className="font-medium">
                              {model.label}
                            </ModelSelectorName>
                            {health ? (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                                  available
                                    ? "bg-vscode-green/10 text-vscode-green"
                                    : "bg-amber-500/12 text-amber-600",
                                )}
                              >
                                {getModelHealthLabel(health)}
                              </span>
                            ) : null}
                            {isSelected ? (
                              <CheckIcon className="size-4 text-vscode-green" />
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {model.tagline}
                          </p>
                          {health?.detail && !available ? (
                            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                              {health.detail}
                            </p>
                          ) : null}
                        </div>
                      </ModelSelectorItem>
                    );
                  })}
                </ModelSelectorGroup>
              </div>
            );
          })}
        </ModelSelectorList>
      </ModelSelectorContent>
    </ModelSelector>
  );
};
