"use server"; // Tells Next.js to execute this file safely on the server side only

import OpenAI from "openai";
import { 
  Task, 
  PrioritizationResponse, 
  TaskBreakdownResponse, 
  DailyScheduleResponse, 
  AIReminder, 
  AIAnalyticsInsights 
} from "../types/task";

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// You can swap this with any model from openrouter.ai/models
// e.g., "google/gemini-2.5-flash", "deepseek/deepseek-chat", "meta-llama/llama-3.1-8b-instruct"
const MODEL_NAME = "openai/gpt-4o-mini";

// Initialize OpenAI client configured for OpenRouter
const getOpenRouterClient = () => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  // Safe debugging logs
  console.log("Checking environment variables...");
  console.log("Is OPENROUTER_API_KEY defined?:", !!apiKey);

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY_MISSING");
  }
  return new OpenAI({
    apiKey: apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Deadline Guardian",
    }
  });
};
// Generic Text Response Helper
export const getGeminiResponse = async (prompt: string) => {
  const openai = getOpenRouterClient();
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [{ role: "user", content: prompt }],
      });
      return response.choices[0].message.content || "";
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) throw error;
      await sleep(2000 * attempt);
    }
  }

  throw new Error("OPENROUTER_REQUEST_FAILED");
};

// Generic Helper to handle Structured JSON Outputs
const getJSONResponse = async (prompt: string, schema: any, temperature = 0.2) => {
  const openai = getOpenRouterClient();
  const maxRetries = 3;

  const promptWithSchema = `
    ${prompt}

    IMPORTANT: You must return a valid JSON object strictly matching this structural schema:
    ${JSON.stringify(schema, null, 2)}
  `;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model: MODEL_NAME,
        messages: [
          { role: "system", content: "You are a helpful assistant designed to output strictly structured JSON data." },
          { role: "user", content: promptWithSchema }
        ],
        response_format: { type: "json_object" },
        temperature: temperature,
      });

      const text = response.choices[0].message.content;
      if (!text) {
        throw new Error("Empty response received");
      }

      return JSON.parse(text);
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error);
      if (attempt === maxRetries) throw error;
      await sleep(2000 * attempt);
    }
  }

  throw new Error("OPENROUTER_JSON_REQUEST_FAILED");
};

// --- PRIORITIZATION IMPLEMENTATION ---

const responseSchema = {
  type: "object",
  properties: {
    rankedTasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          rank: { type: "integer" },
          reasoning: { type: "string" }
        },
        required: ["id", "rank", "reasoning"]
      }
    },
    risks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          riskType: { type: "string", enum: ["HIGH", "MEDIUM"] },
          description: { type: "string" }
        },
        required: ["taskId", "riskType", "description"]
      }
    }
  },
  required: ["rankedTasks", "risks"]
};

export const prioritizeTasksWithAI = async (tasks: Task[]): Promise<PrioritizationResponse> => {
  const currentDate = new Date().toISOString().split("T")[0];
  const prompt = `
    You are a project management assistant. Evaluate and prioritize the following list of tasks.
    
    Rules:
    - Focus heavily on 'To Do' and 'In Progress' tasks.
    - Rank priority based on deadlines and initial importance levels ('High', 'Medium', 'Low').
    - Keep 'Completed' tasks ranked at the absolute bottom or filter them accordingly.
    - Highlight risks (such as overdue items, or 'High' priority tasks left in 'To Do' state).

    Current Date: ${currentDate}
    Tasks Data: ${JSON.stringify(tasks)}
  `;

  return await getJSONResponse(prompt, responseSchema, 0.1) as PrioritizationResponse;
};


// --- TASK BREAKDOWN SYSTEM IMPLEMENTATION ---

const breakdownSchema = {
  type: "object",
  properties: {
    milestones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" }
        },
        required: ["title", "description"]
      }
    },
    subtasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          title: { type: "string" },
          estimatedHours: { type: "number" },
          order: { type: "integer" }
        },
        required: ["id", "title", "estimatedHours", "order"]
      }
    }
  },
  required: ["milestones", "subtasks"]
};

export const breakdownTaskWithAI = async (
  title: string,
  description: string
): Promise<TaskBreakdownResponse> => {
  const prompt = `
    You are an expert developer and workflow planner. Deconstruct the following task into milestones and individual actionable subtasks.
    
    Task Title: ${title}
    Task Description: ${description || "No description provided."}

    Determine a logical chronology for execution, estimate realistic effort in hours for each subtask, and establish significant high-level milestones.
  `;

  return await getJSONResponse(prompt, breakdownSchema, 0.2) as TaskBreakdownResponse;
};


// --- DAILY PLANNER SCHEMA DEFINITION ---

const scheduleSchema = {
  type: "object",
  properties: {
    schedule: {
      type: "array",
      items: {
        type: "object",
        properties: {
          timeSlot: { type: "string" },
          taskTitle: { type: "string" },
          type: { type: "string", enum: ["focus", "break", "administrative"] },
          durationMinutes: { type: "integer" },
          recommendation: { type: "string" }
        },
        required: ["timeSlot", "taskTitle", "type", "durationMinutes"]
      }
    },
    overloadAlert: {
      type: "object",
      properties: {
        isOverloaded: { type: "boolean" },
        details: { type: "string" }
      },
      required: ["isOverloaded", "details"]
    },
    summary: {
      type: "string"
    }
  },
  required: ["schedule", "overloadAlert", "summary"]
};

export const generateDailyScheduleWithAI = async (
  tasks: Task[],
  availableHours: number,
  startTime: string
): Promise<DailyScheduleResponse> => {
  const currentDate = new Date().toISOString().split("T")[0];
  const prompt = `
    You are a professional performance coach and daily planner. Construct a realistic, healthy daily work schedule.
    
    Inputs:
    - Available Working Hours today: ${availableHours} hours
    - Desired Workday Start Time: ${startTime}
    - Current Date: ${currentDate}
    - Tasks list: ${JSON.stringify(tasks)}

    Scheduling Guidelines:
    1. Organize tasks chronologically, starting the workday exactly at the specified start time: ${startTime}.
    2. Convert this start time (usually 24h format like "14:30") to standard 12-hour AM/PM format (e.g. "02:30 PM") when generating schedule blocks.
    3. Only plan tasks with statuses "To Do" or "In Progress". Skip "Completed" tasks.
    4. Allocate dedicated focused work blocks (ideally 60 to 120 minutes) for important/urgent tasks.
    5. Insert short rest/recharging breaks (10-30 minutes) between major work blocks.
    6. Flag an overload condition in "overloadAlert" if the active workload realistically cannot fit within the user's available working hours, explaining which tasks had to be deferred.
  `;

  return await getJSONResponse(prompt, scheduleSchema, 0.2) as DailyScheduleResponse;
};


// --- REMINDER ENGINE SCHEMA DEFINITION ---

const reminderSchema = {
  type: "object",
  properties: {
    reminders: {
      type: "array",
      items: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          title: { type: "string" },
          message: { type: "string" },
          urgencyScore: { type: "integer" },
          type: { type: "string", enum: ["motivational", "actionable", "warning"] }
        },
        required: ["taskId", "title", "message", "urgencyScore", "type"]
      }
    }
  },
  required: ["reminders"]
};

export const generateRemindersWithAI = async (
  tasks: Task[]
): Promise<AIReminder[]> => {
  const currentDate = new Date().toISOString().split("T")[0];
  const prompt = `
    You are an proactive operational assistant. Generate highly specific, context-aware reminders for active tasks.
    Do not output generic alerts like "Task X is due". Instead, customize them based on real factors.

    Inputs:
    - Current Date: ${currentDate}
    - Tasks list: ${JSON.stringify(tasks)}

    Alert Directives:
    1. Process only 'To Do' or 'In Progress' tasks.
    2. Analyze description complexity and deadline proximity to determine a 1-10 Urgency Score.
    3. Generate notifications based on these types:
       - 'warning': For tasks with overdue or imminent deadlines (due within 1-3 days). Be direct and warning-oriented.
       - 'actionable': For complex tasks. Break down the next immediate sub-step the user should take today.
       - 'motivational': For tasks starting soon or lacking focus. Provide encouraging, supportive framing.
  `;

  const parsed = await getJSONResponse(prompt, reminderSchema, 0.3);
  return parsed.reminders as AIReminder[];
};


// --- PRODUCTIVITY ANALYTICS SCHEMA DEFINITION ---

const insightsSchema = {
  type: "object",
  properties: {
    productivityScore: { type: "integer" },
    summary: { type: "string" },
    strengths: {
      type: "array",
      items: { type: "string" }
    },
    improvementAreas: {
      type: "array",
      items: { type: "string" }
    }
  },
  required: ["productivityScore", "summary", "strengths", "improvementAreas"]
};

export const generateProductivityInsightsWithAI = async (
  tasks: Task[]
): Promise<AIAnalyticsInsights> => {
  const currentDate = new Date().toISOString().split("T")[0];
  const prompt = `
    You are an expert executive operations coach. Analyze the user's task workspace metrics below.
    
    Inputs:
    - Current Date: ${currentDate}
    - User's Task List: ${JSON.stringify(tasks)}

    Analysis Guidelines:
    1. Assess completion rate (Completed vs To Do vs In Progress).
    2. Review the distribution of priorities ('High', 'Medium', 'Low') across active vs completed tasks.
    3. Evaluate deadline pressure: identify tasks that are overdue or nearing deadlines.
    4. Provide constructive, professional strengths and actionable recommendations to help them plan more effectively.
  `;

  return await getJSONResponse(prompt, insightsSchema, 0.2) as AIAnalyticsInsights;
};
// --- AI CHAT COPILOT IMPLEMENTATION ---

export const getAIChatResponse = async (
  messages: { role: "user" | "assistant"; content: string }[],
  tasks: Task[]
): Promise<string> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY_MISSING");
  }

  const openai = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "Deadline Guardian",
    }
  });

  const currentDate = new Date().toISOString().split("T")[0];
  const activeTasks = tasks.filter(t => t.status !== "Completed");

  const systemPrompt = `
    You are Guardian AI, a professional operational coach and performance advisor.
    You have direct access to the user's active tasks list and current calendar date.

    Current Date: ${currentDate}
    User's Active Tasks: ${JSON.stringify(activeTasks)}

    Guidelines:
    1. Always be highly specific, action-oriented, and refer to their actual task titles when answering questions like "What should I work on first?" or "Can I finish everything today?".
    2. Keep your answers concise, practical, and under 3-4 sentences when possible to maintain readability in a chat drawer.
    3. Do not make up tasks that don't exist. If they ask to break down a project, use their current tasks or guide them through creating subtasks.
  `;

  try {
    const response = await openai.chat.completions.create({
      model: MODEL_NAME, // uses "openai/gpt-4o-mini"
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      temperature: 0.3,
    });

    return response.choices[0].message.content || "I couldn't process that request.";
  } catch (error: any) {
    console.error("AI Chat completion failed:", error);
    throw new Error("CHAT_FAILED");
  }
};