"use server"; // Tells Next.js to execute this file safely on the server side only

import { GoogleGenerativeAI } from "@google/generative-ai";
import { Task, PrioritizationResponse, TaskBreakdownResponse, DailyScheduleResponse } from "../types/task";

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const getGeminiResponse = async (prompt: string) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
  });

  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error: any) {
      console.error(`Attempt ${attempt} failed:`, error);

      const is503 =
        error?.message?.includes("503") ||
        error?.message?.includes("high demand");

      if (!is503 || attempt === maxRetries) {
        throw error;
      }

      await sleep(2000 * attempt);
    }
  }

  throw new Error("GEMINI_REQUEST_FAILED");
};

// --- PRIORITIZATION IMPLEMENTATION ---

const responseSchema = {
  type: "object",
  properties: {
    rankedTasks: {
      type: "array",
      description: "List of tasks prioritized by urgency and status. Place 'Completed' tasks at the end.",
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
      description: "Potential schedule or risk warnings detected.",
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
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: responseSchema as any,
      temperature: 0.1,
    }
  });

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

  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      if (!responseText) {
        throw new Error("Empty response received");
      }

      return JSON.parse(responseText) as PrioritizationResponse;
    } catch (error: any) {
      console.error(`Prioritization attempt ${attempt} failed:`, error);

      const is503 =
        error?.message?.includes("503") ||
        error?.message?.includes("high demand");

      if (!is503 || attempt === maxRetries) {
        throw error;
      }

      await sleep(2000 * attempt);
    }
  }

  throw new Error("PRIORITIZATION_REQUEST_FAILED");
};


// --- TASK BREAKDOWN SYSTEM IMPLEMENTATION ---

const breakdownSchema = {
  type: "object",
  properties: {
    milestones: {
      type: "array",
      description: "Significant progress points or phases to complete the overall task.",
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
      description: "Individual actionable steps, organized in a logical chronological order of implementation.",
      items: {
        type: "object",
        properties: {
          id: { type: "string", description: "Short unique identifier like sub-1, sub-2" },
          title: { type: "string" },
          estimatedHours: { type: "number", description: "Estimated active effort required in hours." },
          order: { type: "integer", description: "Sequential order of execution (starting at 1)" }
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
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: breakdownSchema as any,
      temperature: 0.2,
    }
  });

  const prompt = `
    You are an expert developer and workflow planner. Deconstruct the following task into milestones and individual actionable subtasks.
    
    Task Title: ${title}
    Task Description: ${description || "No description provided."}

    Determine a logical chronology for execution, estimate realistic effort in hours for each subtask, and establish significant high-level milestones.
  `;

  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      if (!responseText) {
        throw new Error("Empty breakdown response");
      }

      return JSON.parse(responseText) as TaskBreakdownResponse;
    } catch (error: any) {
      console.error(`Breakdown attempt ${attempt} failed:`, error);

      const is503 = error?.message?.includes("503") || error?.message?.includes("high demand");
      if (!is503 || attempt === maxRetries) {
        throw error;
      }

      await sleep(2000 * attempt);
    }
  }

  throw new Error("TASK_BREAKDOWN_FAILED");
};


// --- DAILY PLANNER SCHEMA DEFINITION ---

const scheduleSchema = {
  type: "object",
  properties: {
    schedule: {
      type: "array",
      description: "Chronological daily schedule blocks containing focus periods and regular breaks.",
      items: {
        type: "object",
        properties: {
          timeSlot: { type: "string", description: "Format: HH:MM AM/PM - HH:MM AM/PM" },
          taskTitle: { type: "string", description: "The specific task title, or label like 'Rest Break' / 'Lunch Break'." },
          type: { type: "string", enum: ["focus", "break", "administrative"] },
          durationMinutes: { type: "integer" },
          recommendation: { type: "string", description: "Advice on how to approach this block (optional)." }
        },
        required: ["timeSlot", "taskTitle", "type", "durationMinutes"]
      }
    },
    overloadAlert: {
      type: "object",
      properties: {
        isOverloaded: { type: "boolean" },
        details: { type: "string", description: "A warning detail if the total high-priority task volume exceeds available hours." }
      },
      required: ["isOverloaded", "details"]
    },
    summary: {
      type: "string",
      description: "Brief summary explaining the plan layout and why it was structured this way."
    }
  },
  required: ["schedule", "overloadAlert", "summary"]
};

export const generateDailyScheduleWithAI = async (
  tasks: Task[],
  availableHours: number,
  startTime: string // e.g., "14:30" or "09:00"
): Promise<DailyScheduleResponse> => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: scheduleSchema as any,
      temperature: 0.2,
    }
  });

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
    2. Convert this start time (usually 24h format like "14:30") to standard standard 12-hour AM/PM format (e.g. "02:30 PM") when generating schedule blocks.
    3. Only plan tasks with statuses "To Do" or "In Progress". Skip "Completed" tasks.
    4. Allocate dedicated focused work blocks (ideally 60 to 120 minutes) for important/urgent tasks.
    5. Insert short rest/recharging breaks (10-30 minutes) between major work blocks.
    6. Flag an overload condition in "overloadAlert" if the active workload realistically cannot fit within the user's available working hours, explaining which tasks had to be deferred.
  `;

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      if (!responseText) {
        throw new Error("Empty planner response");
      }

      return JSON.parse(responseText) as DailyScheduleResponse;
    } catch (error: any) {
      console.error(`Planner attempt ${attempt} failed:`, error);
      const is503 = error?.message?.includes("503") || error?.message?.includes("high demand");
      if (!is503 || attempt === maxRetries) throw error;
      await sleep(2000 * attempt);
    }
  }

  throw new Error("DAILY_PLANNER_FAILED");
};
// --- REMINDER ENGINE SCHEMA DEFINITION ---

const reminderSchema = {
  type: "object",
  properties: {
    reminders: {
      type: "array",
      description: "List of highly targeted task notifications categorized by type and urgency.",
      items: {
        type: "object",
        properties: {
          taskId: { type: "string" },
          title: { type: "string", description: "Catchy, direct, and clear header." },
          message: { type: "string", description: "Direct motivational text, step-by-step guidance, or urgent warnings." },
          urgencyScore: { type: "integer", description: "Score from 1 (lowest) to 10 (highest urgency)." },
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
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: reminderSchema as any,
      temperature: 0.3,
    }
  });

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

  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      if (!responseText) {
        throw new Error("Empty reminder engine response");
      }

      const parsed = JSON.parse(responseText);
      return parsed.reminders as AIReminder[];
    } catch (error: any) {
      console.error(`Reminder Engine attempt ${attempt} failed:`, error);

      const isQuota = error?.message?.includes("429") || error?.message?.includes("quota");
      if (isQuota) {
        throw new Error("AI_LIMIT_EXCEEDED");
      }

      const is503 = error?.message?.includes("503") || error?.message?.includes("high demand");
      if (!is503 || attempt === maxRetries) throw error;
      await sleep(2000 * attempt);
    }
  }

  throw new Error("REMINDER_ENGINE_FAILED");
};