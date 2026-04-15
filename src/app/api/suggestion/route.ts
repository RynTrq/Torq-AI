import { generateText, Output } from "ai";
import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUser } from "@/lib/auth";
import { getResponsiveSdkModel } from "@/lib/ai/model-server";

const suggestionSchema = z.object({
  suggestion: z
    .string()
    .describe(
      "The code to insert at cursor, or empty string if no completion needed",
    ),
});

const SUGGESTION_PROMPT = `You are a code suggestion assistant.

<context>
<file_name>{fileName}</file_name>
<previous_lines>
{previousLines}
</previous_lines>
<current_line number="{lineNumber}">{currentLine}</current_line>
<before_cursor>{textBeforeCursor}</before_cursor>
<after_cursor>{textAfterCursor}</after_cursor>
<next_lines>
{nextLines}
</next_lines>
<full_code>
{code}
</full_code>
</context>

<instructions>
Follow these steps IN ORDER:

1. First, look at next_lines. If next_lines contains ANY code, check if it continues from where the cursor is. If it does, return empty string immediately - the code is already written.

2. Check if before_cursor ends with a complete statement (;, }, )). If yes, return empty string.

3. Only if steps 1 and 2 don't apply: suggest what should be typed at the cursor position, using context from full_code.

Your suggestion is inserted immediately after the cursor, so never suggest code that's already in the file.
</instructions>`;

export async function POST(request: Request) {
  try {
    await requireUser();

    const requestSchema = z.object({
      code: z.string().min(1, "Code is required"),
      currentLine: z.string(),
      fileName: z.string().default(""),
      lineNumber: z.number().int().nonnegative(),
      modelId: z.string().optional().nullable(),
      nextLines: z.string().optional().default(""),
      previousLines: z.string().optional().default(""),
      textAfterCursor: z.string().default(""),
      textBeforeCursor: z.string().default(""),
    });

    const body = await request.json();
    const {
      fileName,
      code,
      currentLine,
      previousLines,
      textBeforeCursor,
      textAfterCursor,
      nextLines,
      lineNumber,
      modelId,
    } = requestSchema.parse(body);

    const { model } = getResponsiveSdkModel(modelId);

    const prompt = SUGGESTION_PROMPT
      .replace("{fileName}", fileName)
      .replace("{code}", code)
      .replace("{currentLine}", currentLine)
      .replace("{previousLines}", previousLines || "")
      .replace("{textBeforeCursor}", textBeforeCursor)
      .replace("{textAfterCursor}", textAfterCursor)
      .replace("{nextLines}", nextLines || "")
      .replace("{lineNumber}", lineNumber.toString());

    const { output } = await generateText({
      model,
      output: Output.object({ schema: suggestionSchema }),
      prompt,
    });

    return NextResponse.json({ suggestion: output.suggestion });
  } catch (error) {
    console.error("Suggestion error: ", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    if (
      error instanceof Error &&
      (
        error.message.includes("No AI provider is configured") ||
        error.name.toLowerCase().includes("timeout") ||
        error.message.toLowerCase().includes("timeout") ||
        error.message.toLowerCase().includes("timed out") ||
        error.message.toLowerCase().includes("rate limit") ||
        error.message.toLowerCase().includes("overloaded") ||
        error.message.toLowerCase().includes("temporarily unavailable") ||
        error.message.toLowerCase().includes("service unavailable") ||
        error.message.toLowerCase().includes("internal server error") ||
        error.message.toLowerCase().includes("bad gateway") ||
        error.message.toLowerCase().includes("quota") ||
        error.message.toLowerCase().includes("credit") ||
        error.message.toLowerCase().includes("billing") ||
        error.message.toLowerCase().includes("api key") ||
        error.message.toLowerCase().includes("authentication")
      )
    ) {
      return NextResponse.json({ suggestion: "" });
    }

    return NextResponse.json(
      { error: "Failed to generate suggestion" },
      { status: 500 },
    );
  }
}
