import { generateText } from "ai";
import { inngest } from "./client";
import { getFirecrawlClient } from "@/lib/firecrawl";
import { getHealthySdkModel } from "@/lib/ai/model-server";

const URL_REGEX = /https?:\/\/[^\s]+/g;

export const demoGenerate = inngest.createFunction(
  { id: "demo-generate" },
  { event: "demo/generate" },
  async ({ event, step }) => {
    const { prompt } = event.data as { prompt: string; };
    const firecrawl = getFirecrawlClient();

    const urls = await step.run("exctract-urls", async () => {
      return prompt.match(URL_REGEX) ?? [];
    }) as string[];

    const scrapedContent = await step.run("scrape-urls", async () => {
      if (!firecrawl || urls.length === 0) {
        return "";
      }

      const results = await Promise.all(
        urls.map(async (url) => {
          const result = await firecrawl.scrape(
            url,
            { formats: ["markdown"] },
          );
          return result.markdown ?? null;
        })
      );
      return results.filter(Boolean).join("\n\n");
    });

    const finalPrompt = scrapedContent
      ? `Context:\n${scrapedContent}\n\nQuestion: ${prompt}`
      : prompt;

    await step.run("generate-text", async () => {
      const { model } = await getHealthySdkModel();

      return await generateText({
        model,
        prompt: finalPrompt,
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        },
      });
    })
  },
);

export const demoError = inngest.createFunction(
  { id: "demo-error" },
  { event: "demo/error" },
  async ({ step }) => {
    await step.run("fail", async () => {
      throw new Error("Inngest error: Background job failed!");
    });
  }
);
