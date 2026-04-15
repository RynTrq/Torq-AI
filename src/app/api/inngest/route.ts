import { serve } from "inngest/next";

import { inngest } from "@/inngest/client";
import { processMessage } from "@/features/conversations/inngest/process-message";
import { importGithubRepo } from "@/features/projects/inngest/import-github-repo";
import { exportToGithub } from "@/features/projects/inngest/export-to-github";

const serveHost = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : process.env.NEXTAUTH_URL?.trim() || undefined;

const handlers = serve({
  client: inngest,
  functions: [
    processMessage,
    importGithubRepo,
    exportToGithub,
  ],
  serveHost,
  servePath: "/api/inngest",
});

const logInngestRequest = (method: string, request: Request) => {
  console.info("[torq-ai][inngest-api] request", {
    contentLength: request.headers.get("content-length"),
    hasSignature:
      Boolean(request.headers.get("x-inngest-signature")) ||
      Boolean(request.headers.get("signature")),
    method,
    url: request.url,
    userAgent: request.headers.get("user-agent"),
  });
};

const logInngestResponse = async (
  method: string,
  request: Request,
  response: Response,
  startedAt: number,
) => {
  console.info("[torq-ai][inngest-api] response", {
    durationMs: Date.now() - startedAt,
    method,
    ok: response.ok,
    status: response.status,
    url: request.url,
  });

  return response;
};

const withInngestLogging =
  <TArgs extends unknown[]>(
    method: "GET" | "POST" | "PUT",
    handler: (...args: TArgs) => Response | Promise<Response>,
  ) =>
  async (...args: TArgs) => {
    const request = args[0] as Request;
    const startedAt = Date.now();

    logInngestRequest(method, request);

    try {
      const response = await handler(...args);
      return await logInngestResponse(method, request, response, startedAt);
    } catch (error) {
      console.error("[torq-ai][inngest-api] error", {
        durationMs: Date.now() - startedAt,
        error,
        method,
        url: request.url,
      });
      throw error;
    }
  };

export const GET = withInngestLogging("GET", handlers.GET);
export const POST = withInngestLogging("POST", handlers.POST);
export const PUT = withInngestLogging("PUT", handlers.PUT);
