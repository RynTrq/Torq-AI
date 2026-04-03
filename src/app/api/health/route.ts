import { NextResponse } from "next/server";

const requiredEnvKeys = [
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
  "CLERK_JWT_ISSUER_DOMAIN",
  "NEXT_PUBLIC_CONVEX_URL",
  "TORQ_AI_CONVEX_INTERNAL_KEY",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
] as const;

const aiProviderEnvKeys = [
  "ANTHROPIC_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GEMINI_API_KEY",
  "OPENAI_API_KEY",
] as const;

export async function GET() {
  const missing = requiredEnvKeys.filter((key) => !process.env[key]?.trim());
  const configuredAiProviders = aiProviderEnvKeys.filter((key) =>
    Boolean(process.env[key]?.trim()),
  );

  return NextResponse.json(
    {
      ok: missing.length === 0 && configuredAiProviders.length > 0,
      service: "torq-ai",
      timestamp: new Date().toISOString(),
      missing,
      configuredAiProviders,
    },
    {
      status: missing.length === 0 && configuredAiProviders.length > 0 ? 200 : 503,
    },
  );
}
