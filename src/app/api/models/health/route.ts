import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { DEFAULT_AI_MODEL_ID } from "@/lib/ai/model-catalog";
import { isModelAvailable } from "@/lib/ai/model-health";
import { getAllAIModelHealth } from "@/lib/ai/model-health-server";

export async function GET() {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const healthByModelId = await getAllAIModelHealth();
  const availableModelIds = Object.values(healthByModelId)
    .filter((health) => isModelAvailable(health))
    .map((health) => health.modelId);

  return NextResponse.json({
    availableModelIds,
    defaultModelId: availableModelIds[0] ?? DEFAULT_AI_MODEL_ID,
    healthByModelId,
  });
}
