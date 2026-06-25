import { NextResponse } from "next/server";
import { getUserTasks } from "@/lib/firestore";
import { Task } from "@/types/task";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");

  if (!uid) {
    return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
  }

  try {
    const tasks = await getUserTasks(uid);
    const localToday = new Date().toLocaleDateString("en-CA");

    // Filter tasks: incomplete High priority OR overdue/due today
    const urgentTasks = tasks.filter((t) => {
      if (t.status === "Completed") return false;
      if (t.priority === "High") return true;
      return t.deadline && t.deadline <= localToday;
    });

    // Return only basic details for widget efficiency
    const formatted = urgentTasks.map((t) => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      deadline: t.deadline
    }));

    // Allow local widget fetching by enabling CORS
    return NextResponse.json(formatted, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET",
      }
    });
  } catch (error) {
    console.error("Widget API Error:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}