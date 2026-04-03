"use client";

import { useEffect, useMemo, useState } from "react";

import { AI_MODEL_IDS, type AIModelId } from "@/lib/ai/model-catalog";
import { type AIModelHealth } from "@/lib/ai/model-health";

interface ModelHealthResponse {
  availableModelIds: AIModelId[];
  defaultModelId: AIModelId;
  healthByModelId: Record<AIModelId, AIModelHealth>;
}

export const useModelHealth = () => {
  const [data, setData] = useState<ModelHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const response = await fetch("/api/models/health", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to load model health");
        }

        const nextData = (await response.json()) as ModelHealthResponse;
        setData(nextData);
      } catch {
        // Ignore client-side health fetch errors and keep the selector usable.
      } finally {
        setIsLoading(false);
      }
    };

    void load();

    return () => controller.abort();
  }, []);

  const firstAvailableModelId = useMemo(
    () => data?.availableModelIds[0] ?? null,
    [data],
  );

  const healthByModelId = useMemo(
    () => data?.healthByModelId ?? null,
    [data],
  );

  const unavailableModelIds = useMemo(() => {
    if (!healthByModelId) {
      return [];
    }

    return AI_MODEL_IDS.filter(
      (modelId) => healthByModelId[modelId]?.status !== "available",
    );
  }, [healthByModelId]);

  return {
    firstAvailableModelId,
    healthByModelId,
    isLoading,
    unavailableModelIds,
  };
};
