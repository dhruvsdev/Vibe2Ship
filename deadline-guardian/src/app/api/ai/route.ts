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

    // Initialize OpenAI client configured for OpenRouter
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: "https://openrouter.ai/api/v1",
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "NeverLate",
      }
    });

    // Use gpt-4o-mini for extremely fast and budget-friendly description generation
    const response = await openai.chat.completions.create({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a professional task assistant. Generate strictly the requested task description text only with no introduction." },
        { role: "user", content: prompt }
      ],
      temperature: 0.5,
    });

    const generatedText = response.choices[0].message.content || "";
    
    // Return in the exact JSON format expected by TaskForm.tsx
    return NextResponse.json({ text: generatedText });
  } catch (error: any) {
    console.error("AI Assist API Error:", error);
    return NextResponse.json({ error: "AI_GENERATION_FAILED", details: error.message }, { status: 500 });
  }
}