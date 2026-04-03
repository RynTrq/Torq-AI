import "server-only";

const DEFAULT_DEV_SERVER_URL = "http://localhost:8288/";
const DEV_SERVER_HEALTH_PATH = "/dev";
const DEV_SERVER_TIMEOUT_MS = 1200;

const normalizeUrl = (value?: string) => {
  const rawValue = value?.trim();

  if (!rawValue) {
    return DEFAULT_DEV_SERVER_URL;
  }

  try {
    return new URL(rawValue).toString();
  } catch {
    return new URL(`http://${rawValue}`).toString();
  }
};

export const getInngestDevCommand = () => "npm run dev";

export const shouldCheckLocalInngestDevServer = () => {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  // If hosted Inngest credentials are configured, let the normal enqueue path handle it.
  return !process.env.INNGEST_EVENT_KEY?.trim() && !process.env.INNGEST_SIGNING_KEY?.trim();
};

export const isLocalInngestDevServerAvailable = async () => {
  if (!shouldCheckLocalInngestDevServer()) {
    return true;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEV_SERVER_TIMEOUT_MS);

  try {
    const baseUrl = normalizeUrl(
      process.env.INNGEST_DEV ?? process.env.INNGEST_BASE_URL,
    );

    const response = await fetch(
      new URL(DEV_SERVER_HEALTH_PATH, baseUrl).toString(),
      {
        cache: "no-store",
        signal: controller.signal,
      },
    );

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
};
