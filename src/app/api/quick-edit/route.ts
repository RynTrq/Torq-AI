import { z } from "zod";
import { generateText, Output } from "ai";
import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth";
import { getHealthySdkModel } from "@/lib/ai/model-server";
import { getFirecrawlClient } from "@/lib/firecrawl";

const quickEditRequestSchema = z.object({
  fullCode: z.string().optional().default(""),
  instruction: z.string().trim().min(1, "Instruction is required"),
  modelId: z.string().optional().nullable(),
  selectedCode: z.string().min(1, "Selected code is required"),
});

const quickEditResponseSchema = z.object({
  editedCode: z
    .string()
    .describe(
      "The edited version of the selected code based on the instruction",
    ),
});

const URL_REGEX = /https?:\/\/[^\s)>\]]+/g;

const QUICK_EDIT_PROMPT = `You are a code editing assistant. Edit the selected code based on the user's instruction.

<context>
<selected_code>
{selectedCode}
</selected_code>
<full_code_context>
{fullCode}
</full_code_context>
</context>

{documentation}

<instruction>
{instruction}
</instruction>

<instructions>
Return ONLY the edited version of the selected code.
Maintain the same indentation level as the original.
Do not include any explanations or comments unless requested.
If the instruction is unclear or cannot be applied, return the original code unchanged.
</instructions>`;

export async function POST(request: Request) {
  try {
    await requireUser();

    const body = await request.json();
    const { selectedCode, fullCode, instruction, modelId } =
      quickEditRequestSchema.parse(body);

    const urls: string[] = instruction.match(URL_REGEX) || [];
    let documentationContext = "";
    const firecrawl = getFirecrawlClient();

    if (urls.length > 0 && firecrawl) {
      const scrapedResults = await Promise.all(
        urls.map(async (url) => {
          try {
            const result = await firecrawl.scrape(url, {
              formats: ["markdown"],
            });

            if (result.markdown) {
              return `<doc url="${url}">\n${result.markdown}\n</doc>`;
            }

            return null;
          } catch {
            return null;
          }
        }),
      );

      const validResults = scrapedResults.filter(Boolean);

      if (validResults.length > 0) {
        documentationContext = `<documentation>\n${validResults.join("\n\n")}\n</documentation>`;
      }
    }

    const { model } = await getHealthySdkModel(modelId);

    const prompt = QUICK_EDIT_PROMPT
      .replace("{selectedCode}", selectedCode)
      .replace("{fullCode}", fullCode || "")
      .replace("{instruction}", instruction)
      .replace("{documentation}", documentationContext);

    const { output } = await generateText({
      model,
      output: Output.object({ schema: quickEditResponseSchema }),
      prompt,
    });

    return NextResponse.json({ editedCode: output.editedCode });
  } catch (error) {
    console.error("Edit error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: "Failed to generate edit" },
      { status: 500 },
    );
  }
}
