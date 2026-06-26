export const dynamic = "force-dynamic"; // Tells Next.js not to pre-render this route at build-time

import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "API_KEY_MISSING" }, { status: 400 });
  }

  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: "Missing prompt parameter" }, { status: 400 });
    }

    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "NeverLate",
      }
    });

    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional task assistant. Generate strictly the requested task description text only with no introduction." },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
    });

    const generatedText = response.choices[0].message.content || "";
    return NextResponse.json({ text: generatedText });
  } catch (error: any) {
    console.error("AI Assist API Error:", error);
    return NextResponse.json({ error: "AI_GENERATION_FAILED", details: error.message }, { status: 500 });
  }
}