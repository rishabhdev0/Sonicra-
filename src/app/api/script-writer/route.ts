import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { SCRIPT_FORMATS } from "@/features/script-writer/data/formats";
import { TEXT_MAX_LENGTH } from "@/features/text-to-speech/data/constants";
import { env } from "@/lib/env";
import { enforceRateLimit, RateLimitExceededError } from "@/lib/rate-limit";

const scriptRequestSchema = z.object({
  format: z.string().min(1).max(40),
  details: z.string().trim().min(10).max(4_000),
});

const groqResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({ content: z.string() }),
    }),
  ).min(1),
});

export async function POST(req: NextRequest) {
  const { userId, orgId } = await auth();
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await enforceRateLimit({
      scope: orgId,
      action: "script-writer",
      limit: 10,
      windowMs: 60_000,
    });
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json(
        { error: "Too many script requests" },
        {
          status: 429,
          headers: { "Retry-After": String(error.retryAfterSeconds) },
        },
      );
    }
    throw error;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = scriptRequestSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { format, details } = validation.data;

  const scriptFormat = SCRIPT_FORMATS.find((f) => f.id === format);
  if (!scriptFormat) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const prompt = scriptFormat.prompt(details);

  let response: Response;
  try {
    response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a professional scriptwriter. Write clean, engaging scripts that sound natural when read aloud. Never include stage directions, speaker labels, or markdown formatting. Return only spoken words and keep the result under ${TEXT_MAX_LENGTH} characters.`,
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    return NextResponse.json({ error: "Script service timed out" }, { status: 504 });
  }

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to generate script" }, { status: 500 });
  }

  const parsed = groqResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid response from script service" }, { status: 502 });
  }

  const script = parsed.data.choices[0].message.content.trim();
  if (!script || script.length > TEXT_MAX_LENGTH) {
    return NextResponse.json({ error: "Generated script exceeded the supported length" }, { status: 502 });
  }

  return NextResponse.json({ script });
}
