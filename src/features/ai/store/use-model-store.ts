"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import {
  DEFAULT_AI_MODEL_ID,
  getAIModelDefinition,
  type AIModelId,
} from "@/lib/ai/model-catalog";

interface ModelStoreState {
  selectedModelId: AIModelId;
  setSelectedModelId: (modelId: AIModelId) => void;
}

export const useModelStore = create<ModelStoreState>()(
  persist(
    (set) => ({
      selectedModelId: DEFAULT_AI_MODEL_ID,
      setSelectedModelId: (modelId) =>
        set({
          selectedModelId: getAIModelDefinition(modelId).id,
        }),
    }),
    {
      name: "torq-ai-model",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export const getSelectedModelId = () => useModelStore.getState().selectedModelId;
