import { NextResponse } from "next/server";

import { getProviderEnvKeys } from "@/lib/ai/provider-env";

const requiredEnvKeys = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "NEXTAUTH_URL",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
] as const;

const aiProviderChecks = [
  {
    label: "openrouter",
    envKeys: getProviderEnvKeys("openrouter"),
  },
  {
    label: "groq",
    envKeys: getProviderEnvKeys("groq"),
  },
  {
    label: "xai",
    envKeys: getProviderEnvKeys("xai"),
  },
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
  const configuredAiProviders = aiProviderChecks
    .filter(({ envKeys }) => envKeys.some((key) => Boolean(process.env[key]?.trim())))
    .map(({ label }) => label);
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
