import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { SCRIPT_FORMATS } from "@/features/script-writer/data/formats";

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { format, details } = await req.json();

  const scriptFormat = SCRIPT_FORMATS.find((f) => f.id === format);
  if (!scriptFormat) {
    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  }

  const prompt = scriptFormat.prompt(details);

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: "You are a professional scriptwriter. Write clean, engaging scripts that sound natural when read aloud. Never include stage directions, speaker labels, or markdown formatting. Just the pure spoken words.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Failed to generate script" }, { status: 500 });
  }

  const data = await response.json();
  const script = data.choices[0]?.message?.content?.trim() ?? "";

  return NextResponse.json({ script });
}