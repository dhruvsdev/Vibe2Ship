import { NextResponse } from "next/server";
import { getGeminiResponse } from "@/lib/gemini";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function GET() {
  // 🔥 DEBUG ROUTE: check available models
  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const result = await genAI.listModels();

    return NextResponse.json({
      models: result.models.map((m) => m.name),
    });

  } catch (error: any) {
    console.error("MODEL LIST ERROR:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    // 1. Check API key early
    if (!process.env.GEMINI_API_KEY) {
      console.error("SERVER ERROR: GEMINI_API_KEY missing");
      return NextResponse.json(
        { error: "Server misconfigured: missing API key" },
        { status: 500 }
      );
    }

    // 2. Parse request safely
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { prompt } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required and must be a string" },
        { status: 400 }
      );
    }

    // 3. Call Gemini safely
    const aiResponse = await getGeminiResponse(prompt);

    return NextResponse.json({
      success: true,
      text: aiResponse,
    });

  } catch (error: any) {
    console.error("CRITICAL ROUTE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "AI service failed",
      },
      { status: 500 }
    );
  }
}