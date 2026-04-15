"use client";

import { useEffect, useMemo, useState } from "react";

import { AI_MODEL_IDS, type AIModelId } from "@/lib/ai/model-catalog";
import { type AIModelHealth } from "@/lib/ai/model-health";

interface ModelHealthResponse {
  availableModelIds: AIModelId[];
  defaultModelId: AIModelId;
  healthByModelId: Record<AIModelId, AIModelHealth>;
}

const MODEL_HEALTH_CACHE_TTL_MS = 60_000;

let cachedModelHealth: {
  data: ModelHealthResponse;
  fetchedAt: number;
} | null = null;

export const useModelHealth = () => {
  const [data, setData] = useState<ModelHealthResponse | null>(
    cachedModelHealth &&
      Date.now() - cachedModelHealth.fetchedAt < MODEL_HEALTH_CACHE_TTL_MS
      ? cachedModelHealth.data
      : null,
  );
  const [isLoading, setIsLoading] = useState(data === null);

  useEffect(() => {
    if (
      cachedModelHealth &&
      Date.now() - cachedModelHealth.fetchedAt < MODEL_HEALTH_CACHE_TTL_MS
    ) {
      setData(cachedModelHealth.data);
      setIsLoading(false);
      return;
    }

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
        cachedModelHealth = {
          data: nextData,
          fetchedAt: Date.now(),
        };
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
