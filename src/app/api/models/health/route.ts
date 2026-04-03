import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { DEFAULT_AI_MODEL_ID } from "@/lib/ai/model-catalog";
import { getAllAIModelHealth } from "@/lib/ai/model-health-server";
import { isModelAvailable } from "@/lib/ai/model-health";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
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
