"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getUserTasks } from "@/lib/firestore";
import { Task, PrioritizationResponse, TaskBreakdownResponse, DailyScheduleResponse, AIReminder } from "@/types/task";
import { prioritizeTasksWithAI, breakdownTaskWithAI, generateDailyScheduleWithAI, generateRemindersWithAI } from "@/lib/gemini";
import TaskCard from "./TaskCard"; // Sibling import
import Modal from "./ui/Modal"; // Import from nested ui folder
import TaskForm from "./TaskForm"; // Sibling import
import { Plus, Search, Loader2, ClipboardList, Sparkles, AlertTriangle, ListChecks, Clock, CheckCircle, CalendarDays, Coffee, BookOpen, BellRing, Flame, X, Settings, Sparkle } from "lucide-react";

const getBrowserLocalTime = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

interface DashBoardViewProps {
  filter: "all" | "urgent" | "calendar" | "completed" | "settings";
}

export default function DashBoardView({ filter }: DashBoardViewProps) {
  const { user } = useAuth();
  const activeFilter = filter; // Controlled directly by Next.js file-routing prop

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Tab/View Navigation States (Only shown in 'all' view)
  const [viewMode, setViewMode] = useState<"standard" | "ai" | "planner">("standard");

  // Global AI Error State
  const [aiError, setAiError] = useState<string | null>(null);

  // AI Intelligent Reminder States
  const [reminders, setReminders] = useState<AIReminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  // AI Prioritization States
  const [aiResult, setAiResult] = useState<PrioritizationResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // AI Task Breakdown States
  const [selectedBreakdownTask, setSelectedBreakdownTask] = useState<Task | null>(null);
  const [breakdownData, setBreakdownData] = useState<TaskBreakdownResponse | null>(null);
  const [breakdownLoading, setBreakdownLoading] = useState(false);
  const [breakdownError, setBreakdownError] = useState<string | null>(null);
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);

  // AI Daily Planner States
  const [availableHours, setAvailableHours] = useState<number>(8);
  const [startTime, setStartTime] = useState<string>("09:00");
  const [plannerResult, setPlannerResult] = useState<DailyScheduleResponse | null>(null);
  const [plannerLoading, setPlannerLoading] = useState(false);
  const [plannerError, setPlannerError] = useState<string | null>(null);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    setStartTime(getBrowserLocalTime());
  }, []);

  const fetchTasks = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getUserTasks(user.uid);
      const activeTasks = data || [];
      setTasks(activeTasks); 

      if (activeTasks.length > 0) {
        fetchAIReminders(activeTasks);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const handleAIErrorMapping = (error: any, fallbackMessage: string): string => {
    if (error?.message === "AI_LIMIT_EXCEEDED" || error?.message?.includes("quota")) {
      return "You have reached your daily free-tier API limit for the Gemini model (20 requests/day). Please wait a few minutes, or verify your billing options/API plan inside Google AI Studio.";
    }
    return fallbackMessage;
  };

  const fetchAIReminders = async (taskList: Task[]) => {
    setRemindersLoading(true);
    try {
      const sanitizedTasks = taskList.map((t) => ({
        id: t.id,
        userId: t.userId,
        title: t.title,
        description: t.description,
        priority: t.priority,
        status: t.status,
        deadline: t.deadline,
        createdAt: null
      }));
      const results = await generateRemindersWithAI(sanitizedTasks);
      setReminders(results || []);
    } catch (error) {
      console.error("Failed to fetch AI reminders:", error);
    } finally {
      setRemindersLoading(false);
    }
  };

  // Trigger AI prioritization
  const handleAIPrioritize = async () => {
    if (tasks.length === 0) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const sanitizedTasks: Task[] = tasks.map((task) => ({
        id: task.id,
        userId: task.userId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        deadline: task.deadline,
        createdAt: null, 
      }));

      const result = await prioritizeTasksWithAI(sanitizedTasks);
      setAiResult(result);
      setViewMode("ai");
    } catch (error: any) {
      console.error("AI Prioritization failed:", error);
      setAiError(handleAIErrorMapping(error, "AI Prioritization request failed."));
    } finally {
      setAiLoading(false);
    }
  };

  // Trigger AI Daily Planner Generation
  const handleGenerateDailyPlanner = async (overrideStartTime?: string) => {
    if (tasks.length === 0) return;
    setPlannerLoading(true);
    setPlannerError(null);
    setAiError(null);
    try {
      const sanitizedTasks: Task[] = tasks.map((task) => ({
        id: task.id,
        userId: task.userId,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: task.status,
        deadline: task.deadline,
        createdAt: null, 
      }));

      const targetStartTime = overrideStartTime || startTime || "09:00";
      const result = await generateDailyScheduleWithAI(sanitizedTasks, availableHours, targetStartTime);
      setPlannerResult(result);
      setViewMode("planner");
    } catch (error: any) {
      console.error("AI Planner Generation failed:", error);
      setPlannerError(handleAIErrorMapping(error, "Failed to organize your day. Please try again."));
    } finally {
      setPlannerLoading(false);
    }
  };

  // Trigger AI task breakdown modal & fetch data
  const handleBreakdownRequest = async (task: Task) => {
    setSelectedBreakdownTask(task);
    setBreakdownData(null);
    setBreakdownError(null);
    setBreakdownLoading(true);
    setIsBreakdownModalOpen(true);

    try {
      const result = await breakdownTaskWithAI(task.title, task.description || "");
      setBreakdownData(result);
    } catch (error: any) {
      console.error("Task breakdown request failed:", error);
      setBreakdownError(handleAIErrorMapping(error, "Could not generate task breakdown. Please try again."));
    } finally {
      setBreakdownLoading(false);
    }
  };

  const handleDismissReminder = (taskId: string) => {
    setReminders((prev) => prev.filter((r) => r.taskId !== taskId));
  };

  // SIDEBAR INTELLIGENT ROUTER / FILTER ENGINE
  const getSidebarFilteredTasks = (): Task[] => {
    const searchFiltered = tasks.filter((t) => {
      const title = t.title || "";
      return title.toLowerCase().includes(search.toLowerCase());
    });

    switch (activeFilter) {
      case "urgent":
        // Urgent Tab: Only pending High priority deadlines
        return searchFiltered.filter((t) => t.priority === "High" && t.status !== "Completed");
      case "completed":
        // Completed Tab: Completed tasks
        return searchFiltered.filter((t) => t.status === "Completed");
      case "calendar":
        // Calendar View: Standard pending tasks (to be sorted below chronologically)
        return searchFiltered.filter((t) => t.status !== "Completed");
      default:
        // Standard / All Views
        return searchFiltered;
    }
  };

  const sidebarFilteredTasks = getSidebarFilteredTasks();

  // Sorting calculation based on selected View Mode (Standard, AI, Chronological Calendar)
  const displayedTasks = (() => {
    if (activeFilter === "calendar") {
      // Sort chronologically closest to today
      return [...sidebarFilteredTasks].sort(
        (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
      );
    }

    if (viewMode === "ai" && aiResult && activeFilter === "all") {
      return [...sidebarFilteredTasks]
        .map((task) => {
          const aiItem = aiResult.rankedTasks.find((item) => item.id === task.id);
          return {
            ...task,
            aiRank: aiItem ? aiItem.rank : undefined,
            aiReasoning: aiItem ? aiItem.reasoning : undefined,
          };
        })
        .sort((a, b) => {
          if (a.aiRank !== undefined && b.aiRank !== undefined) {
            return a.aiRank - b.aiRank;
          }
          return 0;
        });
    }
    return sidebarFilteredTasks;
  })();

  // Logged out state
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
        <div className="bg-indigo-50 p-4 rounded-full mb-6">
          <ClipboardList className="text-indigo-600 w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Secure Your Productivity</h2>
        <p className="text-slate-500 max-w-sm">
          Welcome to Deadline Guardian. Please sign in using the sidebar to start managing your deadlines securely.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header & Search Section (Hidden on Settings View) */}
      {activeFilter !== "settings" && (
        <div className="flex flex-col md:flex-row gap-4 mb-10 items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {activeFilter === "urgent" 
                ? "Urgent Deadlines" 
                : activeFilter === "completed" 
                ? "Completed Tasks" 
                : activeFilter === "calendar"
                ? "Schedule Calendar"
                : "My Deadlines"}
            </h1>
            <p className="text-slate-500 text-sm">
              You have {sidebarFilteredTasks.length} tasks matching your criteria.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                placeholder="Search tasks..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {activeFilter === "all" && (
              <button
                onClick={handleAIPrioritize}
                disabled={aiLoading || tasks.length === 0}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-95 shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                {aiLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Sparkles size={20} />
                )}
                AI Prioritize
              </button>
            )}
            
            <button
              onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all active:scale-95"
            >
              <Plus size={20} />
              New Task
            </button>
          </div>
        </div>
      )}

      {/* Global API Error Display Bar */}
      {aiError && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl mb-8 flex items-start gap-3">
          <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-sm">AI Service Quota Alert</h4>
            <p className="text-xs text-rose-700 mt-1 leading-relaxed">{aiError}</p>
          </div>
        </div>
      )}

      {/* AI Smart Assistant Intelligent Reminders Section */}
      {reminders.length > 0 && activeFilter !== "settings" && (
        <div className="mb-8">
          <div className="flex items-center gap-1.5 mb-2.5">
            <BellRing className="text-indigo-600 animate-pulse" size={16} />
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">AI Daily Reminders</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {reminders.map((reminder) => {
              const isWarning = reminder.type === "warning";
              const isActionable = reminder.type === "actionable";
              
              return (
                <div 
                  key={reminder.taskId} 
                  className={`relative p-3 rounded-xl border flex flex-col justify-between transition-all shadow-sm ${
                    isWarning 
                      ? "bg-rose-50/90 border-rose-200" 
                      : isActionable 
                      ? "bg-indigo-50/80 border-indigo-200" 
                      : "bg-amber-50/60 border-amber-200"
                  }`}
                >
                  <button 
                    onClick={() => handleDismissReminder(reminder.taskId)}
                    className="absolute top-2.5 right-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100/40"
                  >
                    <X size={12} />
                  </button>
                  
                  <div className="space-y-1 pr-3">
                    <div className="flex items-center gap-1.5">
                      {isWarning ? (
                        <Flame className="text-rose-600 shrink-0" size={13} />
                      ) : isActionable ? (
                        <CheckCircle className="text-indigo-600 shrink-0" size={13} />
                      ) : (
                        <Sparkles className="text-amber-600 shrink-0" size={13} />
                      )}
                      <h4 className="font-bold text-slate-900 text-xs leading-tight">{reminder.title}</h4>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-normal pr-1">{reminder.message}</p>
                  </div>

                  <div className="mt-2.5 pt-2 flex items-center justify-between border-t border-slate-200/40">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                      {reminder.type}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                      reminder.urgencyScore >= 8 
                        ? "bg-rose-100/80 text-rose-800" 
                        : reminder.urgencyScore >= 5 
                        ? "bg-amber-100/80 text-amber-800" 
                        : "bg-slate-100/80 text-slate-600"
                    }`}>
                      Urgency {reminder.urgencyScore}/10
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* View Toggle Tabs (Only shown on primary Dashboard view) */}
      {activeFilter === "all" && (
        <div className="flex border-b border-slate-200 mb-6 gap-6 overflow-x-auto whitespace-nowrap">
          <button
            className={`pb-3 font-semibold text-sm transition-all ${
              viewMode === "standard"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => setViewMode("standard")}
          >
            Standard View
          </button>
          
          {aiResult && (
            <button
              className={`pb-3 font-semibold text-sm flex items-center gap-2 transition-all ${
                viewMode === "ai"
                  ? "border-b-2 border-violet-600 text-violet-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => setViewMode("ai")}
            >
              <Sparkles size={16} />
              AI Prioritized View
            </button>
          )}

          <button
            className={`pb-3 font-semibold text-sm flex items-center gap-2 transition-all ${
              viewMode === "planner"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-slate-500 hover:text-slate-800"
            }`}
            onClick={() => {
              if (!plannerResult) {
                const currentLocalTime = getBrowserLocalTime();
                setStartTime(currentLocalTime);
                handleGenerateDailyPlanner(currentLocalTime);
              } else {
                setViewMode("planner");
              }
            }}
          >
            <CalendarDays size={16} />
            AI Daily Planner
          </button>
        </div>
      )}

      {/* Daily Planner Control Center */}
      {viewMode === "planner" && activeFilter === "all" && (
        <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CalendarDays className="text-emerald-600" size={18} />
              Customize Today's Schedule Options
            </h3>
            <p className="text-xs text-slate-500">Determine your start time and focus hours available today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-xs text-slate-400 font-bold">Start Time:</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="outline-none font-bold text-slate-800 text-sm text-center"
              />
            </div>

            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
              <Clock size={16} className="text-slate-400" />
              <input
                type="number"
                min={1}
                max={24}
                value={availableHours}
                onChange={(e) => setAvailableHours(Number(e.target.value))}
                className="w-10 outline-none font-bold text-slate-800 text-sm text-center"
              />
              <span className="text-xs text-slate-400 font-semibold">Hours</span>
            </div>

            <button
              onClick={() => handleGenerateDailyPlanner()}
              disabled={plannerLoading}
              className="bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2"
            >
              {plannerLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Generate Schedule
            </button>
          </div>
        </div>
      )}

      {/* Daily Planner Render Timeline */}
      {viewMode === "planner" && activeFilter === "all" && (
        <div>
          {plannerLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="animate-spin text-emerald-600 mb-4" size={40} />
              <p className="text-slate-500 font-medium">Curating daily flow, allocation and rest breaks...</p>
            </div>
          ) : plannerError ? (
            <div className="bg-red-50 text-red-600 border border-red-200 p-4 rounded-xl text-center">
              <AlertTriangle className="mx-auto mb-2" />
              <p>{plannerError}</p>
            </div>
          ) : plannerResult ? (
            <div className="space-y-8">
              <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-2xl">
                <h4 className="font-bold text-emerald-900 text-sm mb-1">Today's Focus Outlook</h4>
                <p className="text-xs sm:text-sm text-emerald-800 leading-relaxed">{plannerResult.summary}</p>
              </div>

              {plannerResult.overloadAlert?.isOverloaded && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3 items-start">
                  <AlertTriangle className="text-amber-800 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">Task Backlog Overload Detected</h4>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">{plannerResult.overloadAlert.details}</p>
                  </div>
                </div>
              )}

              <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6">
                {plannerResult.schedule.map((block, idx) => {
                  const isBreak = block.type === "break";
                  const isFocus = block.type === "focus";
                  
                  return (
                    <div key={idx} className="relative group">
                      <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 bg-white transition-all ${
                        isBreak ? "border-amber-400" : isFocus ? "border-emerald-500" : "border-indigo-400"
                      }`} />

                      <div className={`p-4 rounded-2xl border transition-all ${
                        isBreak 
                          ? "bg-amber-50/20 border-amber-100" 
                          : isFocus 
                          ? "bg-emerald-50/10 border-emerald-100/60" 
                          : "bg-indigo-50/10 border-indigo-100/60"
                      }`}>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isBreak ? (
                              <Coffee className="text-amber-600 shrink-0" size={16} />
                            ) : isFocus ? (
                              <Sparkles className="text-emerald-600 shrink-0" size={16} />
                            ) : (
                              <BookOpen className="text-indigo-600 shrink-0" size={16} />
                            )}
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                              {block.timeSlot} ({block.durationMinutes} mins)
                            </span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 w-max ${
                            isBreak 
                              ? "bg-amber-100 text-amber-800" 
                              : isFocus 
                              ? "bg-emerald-100 text-emerald-800" 
                              : "bg-indigo-100 text-indigo-800"
                          }`}>
                            {block.type}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm sm:text-base mt-2">{block.taskTitle}</h4>
                        {block.recommendation && (
                          <p className="text-xs text-slate-500 mt-1 leading-relaxed italic">
                            💡 {block.recommendation}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400">
              <CalendarDays className="mx-auto mb-3" size={40} />
              <p className="font-medium">No schedule mapped yet. Hit "Generate Schedule" to start.</p>
            </div>
          )}
        </div>
      )}

      {/* Settings View Layout */}
      {activeFilter === "settings" && (
        <div className="max-w-2xl bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-5 mb-6">
            <Settings className="text-indigo-600" size={28} />
            <div>
              <h2 className="text-xl font-bold text-slate-900">Guardian Workspace Settings</h2>
              <p className="text-slate-500 text-xs">Configure your secure backup vault and dashboard behavior.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Secure Owner UID</label>
              <input 
                disabled 
                value={user?.uid || ""} 
                className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-slate-500 outline-none select-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400 tracking-wider">Registered Email</label>
              <input 
                disabled 
                value={user?.email || "Anonymous"} 
                className="w-full bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-slate-500 outline-none select-all" 
              />
            </div>
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/60 flex gap-3 items-start">
              <Sparkle className="text-indigo-600 mt-0.5 shrink-0 animate-spin" size={18} />
              <p className="text-xs text-indigo-800 leading-relaxed">
                <span className="font-bold">Pro Active Guard Status: Enabled.</span> Your task lists, reminders, and schedules are secured by end-to-end Firebase protocols. Gemini-driven AI services evaluate deadline metrics asynchronously.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Task List Rendering (Dashboard / Urgent / Calendar / Completed views) */}
      {viewMode !== "planner" && activeFilter !== "settings" && (
        loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
            <p className="text-slate-500 font-medium">Loading your guardian vault...</p>
          </div>
        ) : displayedTasks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedTasks.map((task) => {
              const t = task as Task & { aiRank?: number; aiReasoning?: string };
              return (
                <div key={task.id} className="relative flex flex-col h-full bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all">
                  {/* AI Rank Badge Header */}
                  {viewMode === "ai" && t.aiRank !== undefined && activeFilter === "all" && (
                    <div className="absolute -top-3 left-4 z-10 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md flex items-center gap-1">
                      <Sparkles size={12} />
                      Rank #{t.aiRank}
                    </div>
                  )}
                  
                  <div className={`flex flex-col h-full justify-between ${viewMode === "ai" ? "pt-2" : ""}`}>
                    <TaskCard 
                      task={task} 
                      onEdit={(t) => { setEditingTask(t); setIsModalOpen(true); }}
                      onRefresh={fetchTasks}
                    />

                    <div className="mt-4 pt-4 border-t border-slate-50 flex flex-col gap-2">
                      <button
                        onClick={() => handleBreakdownRequest(task)}
                        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 py-2 rounded-lg transition-all"
                      >
                        <ListChecks size={14} />
                        AI Breakdown
                      </button>

                      {viewMode === "ai" && t.aiReasoning && activeFilter === "all" && (
                        <div className="mt-2 bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs text-slate-600 italic">
                          <span className="font-bold text-slate-700 not-italic block mb-0.5">AI Reason:</span>
                          {t.aiReasoning}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-slate-200 rounded-3xl py-20 text-center">
            <p className="text-slate-400 font-medium">
              {search 
                ? "No tasks match your search." 
                : activeFilter === "urgent" 
                ? "Excellent! No urgent pending tasks on your list."
                : activeFilter === "completed"
                ? "No completed tasks yet. Finish your first task to see it here!"
                : activeFilter === "calendar"
                ? "No schedule items. Your calendar list is clear!"
                : "Your task list is empty. Start by adding a new one!"}
            </p>
            {!search && activeFilter === "all" && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-indigo-600 font-bold hover:underline"
              >
                Create your first task →
              </button>
            )}
          </div>
        )
      )}

      {/* Task Modal (Add/Edit) */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingTask ? "Update Deadline" : "Protect New Deadline"}
      >
        <TaskForm 
          initialData={editingTask || undefined} 
          onSuccess={() => { setIsModalOpen(false); fetchTasks(); }} 
        />
      </Modal>

      {/* AI Task Breakdown Modal */}
      <Modal
        isOpen={isBreakdownModalOpen}
        onClose={() => setIsBreakdownModalOpen(false)}
        title={`AI Breakdown: ${selectedBreakdownTask?.title || "Task"}`}
      >
        {breakdownLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="animate-spin text-indigo-600 mb-3" size={32} />
            <p className="text-slate-500 text-sm font-medium">Drafting milestones and subtasks...</p>
          </div>
        ) : breakdownError ? (
          <div className="text-center py-6 text-red-600 text-sm">
            <AlertTriangle className="mx-auto mb-2" size={32} />
            <p>{breakdownError}</p>
          </div>
        ) : breakdownData ? (
          <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2 scrollbar-thin">
            {breakdownData.milestones.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Milestones</h4>
                <div className="space-y-2">
                  {breakdownData.milestones.map((milestone, idx) => (
                    <div key={idx} className="flex gap-3 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="bg-indigo-50 text-indigo-600 rounded-lg p-1.5 flex items-center justify-center mt-0.5 shrink-0">
                        <CheckCircle size={14} />
                      </div>
                      <div>
                        <h5 className="font-semibold text-slate-800 text-xs sm:text-sm">{milestone.title}</h5>
                        <p className="text-xs text-slate-500 mt-0.5">{milestone.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {breakdownData.subtasks.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Chronological Subtasks</h4>
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden bg-white">
                  {breakdownData.subtasks
                    .sort((a, b) => a.order - b.order)
                    .map((subtask) => (
                      <div key={subtask.id} className="flex items-center justify-between p-3 hover:bg-slate-50/50">
                        <div className="flex items-center gap-3 pr-2">
                          <span className="text-xs font-bold text-slate-400 w-5 text-left">#{subtask.order}</span>
                          <span className="text-xs sm:text-sm text-slate-700 font-medium leading-tight">{subtask.title}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 bg-slate-50 px-2 py-1 rounded-md text-[10px] sm:text-xs shrink-0">
                          <Clock size={11} />
                          <span>{subtask.estimatedHours} hrs</span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

