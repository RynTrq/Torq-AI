import { NextResponse } from "next/server";

const requiredEnvKeys = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "NEXTAUTH_URL",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
] as const;

const aiProviderEnvKeys = [
  "ANTHROPIC_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GEMINI_API_KEY",
  "OPENAI_API_KEY",
  "GROQ_API_KEY",
  "XAI_API_KEY",
] as const;

const optionalIntegrationEnvKeys = [
  "DIRECT_URL",
  "GITHUB_ID",
  "GITHUB_SECRET",
  "FIRECRAWL_API_KEY",
  "SENTRY_DSN",
] as const;

export async function GET() {
  const missing = requiredEnvKeys.filter((key) => !process.env[key]?.trim());
  const configuredAiProviders = aiProviderEnvKeys.filter((key) =>
    Boolean(process.env[key]?.trim()),
  );
  const optionalMissing = optionalIntegrationEnvKeys.filter(
    (key) => !process.env[key]?.trim(),
  );

  return NextResponse.json(
    {
      ok: missing.length === 0 && configuredAiProviders.length > 0,
      status:
        missing.length === 0 && configuredAiProviders.length > 0
          ? "ready"
          : "degraded",
      service: "torq-ai",
      timestamp: new Date().toISOString(),
      missing,
      optionalMissing,
      configuredAiProviders,
    },
    {
      status: missing.length === 0 && configuredAiProviders.length > 0 ? 200 : 503,
    },
  );
}
