"use client";

import { useState, useEffect, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext"; 
import { getUserTasks, updateTask } from "@/lib/firestore";
import { Task, PrioritizationResponse, TaskBreakdownResponse, DailyScheduleResponse, AIReminder, AIAnalyticsInsights } from "@/types/task";
import { 
  prioritizeTasksWithAI, 
  breakdownTaskWithAI, 
  generateDailyScheduleWithAI, 
  generateRemindersWithAI,
  generateProductivityInsightsWithAI 
} from "@/lib/gemini";
import TaskCard from "./components/TaskCard"; 
import Modal from "./components/ui/Modal";
import TaskForm from "./components/TaskForm";
import AIChatPanel from "./components/ui/AIChatPanel";
import { useSearchParams } from "next/navigation";
import { Plus, Search, Loader2, ClipboardList, Sparkles, AlertTriangle, ListChecks, Clock, CheckCircle, CalendarDays, Coffee, BookOpen, BellRing, Flame, X, ShieldAlert, Settings, Sparkle, BrainCircuit, Check, TrendingUp } from "lucide-react";

const getBrowserLocalTime = (): string => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

// Wrap the main Dashboard inside a Suspense Boundary as useSearchParams() requires client-side hydration
export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="text-slate-500 font-medium">Loading your NeverLate vault...</p>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { theme } = useTheme(); 
  const searchParams = useSearchParams();
  const activeFilter = searchParams.get("filter") || "all"; // all, urgent, calendar, completed, settings

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

  // AI Productivity Analytics States
  const [analyticsResult, setAnalyticsResult] = useState<AIAnalyticsInsights | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Archive States
  const [showArchive, setShowArchive] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Tracking tasks that are currently animating out
  const [exitingTasks, setExitingTasks] = useState<string[]>([]);

  useEffect(() => {
    setStartTime(getBrowserLocalTime());
  }, []);

  // Safe client-side timezone-proof serializer
  const sanitizeTasksForAI = (taskList: Task[]): Task[] => {
    return taskList.map((t) => ({
      id: t.id,
      userId: t.userId,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      deadline: t.deadline,
      createdAt: null // strip Firestore complex classes safely
    }));
  };

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
      const sanitizedTasks = sanitizeTasksForAI(taskList);
      const results = await generateRemindersWithAI(sanitizedTasks);
      setReminders(results || []);
    } catch (error) {
      console.error("Failed to fetch AI reminders:", error);
    } finally {
      setRemindersLoading(false);
    }
  };

  // Fetch AI Productivity Insights
  const handleFetchAIAnalytics = async () => {
    if (tasks.length === 0) return;
    setAnalyticsLoading(true);
    setAnalyticsError(null);
    try {
      const sanitizedTasks = sanitizeTasksForAI(tasks);
      const result = await generateProductivityInsightsWithAI(sanitizedTasks);
      setAnalyticsResult(result);
    } catch (error: any) {
      console.error("AI Analytics Insights failed:", error);
      setAnalyticsError(handleAIErrorMapping(error, "Failed to load AI productivity metrics."));
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Automatically trigger AI analytics on mount or task update
  useEffect(() => {
    if (tasks.length > 0 && !analyticsResult && !analyticsLoading) {
      handleFetchAIAnalytics();
    }
  }, [tasks]);

  // Trigger AI prioritization
  const handleAIPrioritize = async () => {
    if (tasks.length === 0) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const sanitizedTasks = sanitizeTasksForAI(tasks);
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
      const sanitizedTasks = sanitizeTasksForAI(tasks);
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

  // Upgraded toggle completion handler supporting strict added-today unchecking
  const handleToggleCompleteTask = async (taskId: string) => {
    const targetTask = tasks.find((t) => t.id === taskId);
    if (!targetTask) return;

    const isCurrentlyCompleted = targetTask.status === "Completed";
    
    // Safety restriction: limit Completed-tab unchecking strictly to tasks added today
    if (isCurrentlyCompleted && activeFilter === "completed") {
      const localToday = getLocalTodayString();
      
      let isAddedToday = false;
      if (targetTask.createdAt && typeof targetTask.createdAt === "object") {
        const seconds = (targetTask.createdAt as any).seconds;
        if (seconds) {
          const createdDate = new Date(seconds * 1000);
          const createdDateStr = createdDate.toLocaleDateString("en-CA");
          isAddedToday = createdDateStr === localToday;
        }
      }

      if (!isAddedToday) {
        alert("Only tasks added today can be unchecked back to the active dashboard.");
        return;
      }
    }

    const newStatus = isCurrentlyCompleted ? "To Do" : "Completed";

    setExitingTasks((prev) => [...prev, taskId]);
    setTimeout(async () => {
      try {
        await updateTask(taskId, { status: newStatus });
        fetchTasks();
      } catch (error) {
        console.error("Failed to toggle task status:", error);
        alert("Failed to update task status");
      } finally {
        setExitingTasks((prev) => prev.filter((id) => id !== taskId));
      }
    }, 300);
  };

  // Timezone-proof local today string helper ("YYYY-MM-DD")
  const getLocalTodayString = (): string => {
    return new Date().toLocaleDateString("en-CA");
  };

  // Segregate completed tasks based on 3-day and 7-day limits
  const getCompletedSubgroups = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    threeDaysAgo.setHours(0, 0, 0, 0);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const completedTasks = tasks.filter((t) => t.status === "Completed");
    
    const searchFiltered = completedTasks.filter((t) => {
      const title = t.title || "";
      return title.toLowerCase().includes(search.toLowerCase());
    });

    const recent = searchFiltered.filter((t) => {
      if (!t.deadline) return true; // fallback if no date
      const d = new Date(t.deadline);
      d.setHours(0, 0, 0, 0);
      return d >= threeDaysAgo;
    });

    const archived = searchFiltered.filter((t) => {
      if (!t.deadline) return false;
      const d = new Date(t.deadline);
      d.setHours(0, 0, 0, 0);
      return d >= sevenDaysAgo && d < threeDaysAgo;
    });

    return { recent, archived };
  };

  const { recent: recentCompleted, archived: archivedCompleted } = getCompletedSubgroups();

  // SIDEBAR INTELLIGENT ROUTER / FILTER ENGINE
  const getSidebarFilteredTasks = (): Task[] => {
    const searchFiltered = tasks.filter((t) => {
      const title = t.title || "";
      return title.toLowerCase().includes(search.toLowerCase());
    });

    const localToday = getLocalTodayString();

    switch (activeFilter) {
      case "urgent":
        // Urgent Tab: Pending High priority tasks OR tasks due today/overdue (Timezone Proofed)
        return searchFiltered.filter((t) => {
          if (t.status === "Completed") return false;
          if (t.priority === "High") return true;
          return t.deadline && t.deadline <= localToday;
        });
      case "completed":
        // Only return completed tasks from the past 3 days to display as standard cards
        return recentCompleted;
      case "calendar":
        return searchFiltered.filter((t) => t.status !== "Completed");
      default:
        // Standard / All Views: Only show active tasks (Completed tasks vanish from here)
        return searchFiltered.filter((t) => t.status !== "Completed");
    }
  };

  const sidebarFilteredTasks = getSidebarFilteredTasks();

  // Dynamic Workspace Statistics Calculations
  const totalTasksCount = tasks.length;
  const completedTasksCount = tasks.filter((t) => t.status === "Completed").length;
  const pendingTasksCount = tasks.filter((t) => t.status !== "Completed").length;
  
  // Detect missed/overdue task deadlines (Timezone Proofed)
  const overdueTasksCount = tasks.filter((t) => {
    if (t.status === "Completed" || !t.deadline) return false;
    return t.deadline < getLocalTodayString();
  }).length;

  // Workspace completion ratio fallback (Productivity Score)
  const productivityScore = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Sorting calculation based on selected View Mode (Standard, AI, Chronological Calendar)
  const displayedTasks = (() => {
    if (activeFilter === "calendar") {
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

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center px-4">
        <div className="bg-indigo-50 p-4 rounded-full mb-6">
          <ClipboardList className="text-indigo-600 w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Secure Your Productivity</h2>
        {/* Rebranded login welcome text */}
        <p className="text-slate-500 max-w-sm">
          Welcome to NeverLate. Please sign in using the sidebar to start managing your deadlines securely.
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
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">
              {activeFilter === "urgent" 
                ? "Urgent Deadlines" 
                : activeFilter === "completed" 
                ? "Completed Tasks" 
                : activeFilter === "calendar"
                ? "Schedule Calendar"
                : "My Deadlines"}
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm transition-colors">
              You have {sidebarFilteredTasks.length} tasks matching your criteria.
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" size={18} />
              <input
                placeholder="Search tasks..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {activeFilter === "all" && (
              <button
                onClick={handleAIPrioritize}
                disabled={aiLoading || tasks.length === 0}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:opacity-95 shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
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
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-95 cursor-pointer"
            >
              <Plus size={20} />
              New Task
            </button>
          </div>
        </div>
      )}

      {/* Global API Error Display Bar */}
      {aiError && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-200 p-4 rounded-2xl mb-8 flex items-start gap-3">
          <AlertTriangle className="text-rose-600 shrink-0 mt-0.5" size={20} />
          <div>
            <h4 className="font-bold text-sm">AI Service Quota Alert</h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">{aiError}</p>
          </div>
        </div>
      )}

      {/* COMPACT: AI-Driven Operational Coach & Analytics Panel (Rendered only on main Dashboard) */}
      {activeFilter === "all" && tasks.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          
          {/* Column 1 & 2: Dynamic AI Coach Insights (Streamlined vertical padding) */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
            {analyticsLoading ? (
              <div className="flex flex-col items-center justify-center py-8 h-full">
                <Loader2 className="animate-spin text-indigo-600 mb-2" size={28} />
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Consulting Guardian AI Operational Coach...</p>
              </div>
            ) : analyticsError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-red-500 text-xs h-full">
                <AlertTriangle className="mb-1" size={24} />
                <p>{analyticsError}</p>
                <button 
                  onClick={handleFetchAIAnalytics}
                  className="mt-2 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] hover:underline cursor-pointer"
                >
                  Retry Analysis
                </button>
              </div>
            ) : analyticsResult ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-1.5">
                    <BrainCircuit className="text-indigo-600" size={18} />
                    <h3 className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">AI Executive Coach Insights</h3>
                  </div>
                  <button 
                    onClick={handleFetchAIAnalytics}
                    className="flex items-center gap-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    <Sparkles size={11} />
                    Consult Coach
                  </button>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-355 leading-relaxed italic">
                  "{analyticsResult.summary}"
                </p>
                
                {/* AI Assessment Bullet Points (Tight grid layout) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-50 dark:border-slate-800/40">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-500">Core Strengths</span>
                    <ul className="space-y-1">
                      {analyticsResult.strengths.slice(0, 2).map((strength, index) => (
                        <li key={index} className="flex gap-1.5 items-start text-[11px] text-slate-500 dark:text-slate-400">
                          <Check className="text-emerald-500 shrink-0 mt-0.5" size={10} />
                          <span>{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500">Improvement Tips</span>
                    <ul className="space-y-1">
                      {analyticsResult.improvementAreas.slice(0, 2).map((tip, index) => (
                        <li key={index} className="flex gap-1.5 items-start text-[11px] text-slate-500 dark:text-slate-400">
                          <AlertTriangle className="text-amber-555 shrink-0 mt-0.5" size={10} />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center h-full">
                <BrainCircuit className="text-slate-300 dark:text-slate-600 mb-2" size={32} />
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs">Consult your AI Coach</h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-455 max-w-xs mt-1 leading-relaxed">Let Guardian AI evaluate your pending load, schedule pressures, and work velocity.</p>
                <button 
                  onClick={handleFetchAIAnalytics}
                  className="mt-3 bg-indigo-600 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl hover:bg-indigo-700 transition-all shadow-md dark:shadow-none cursor-pointer"
                >
                  Generate Evaluation
                </button>
              </div>
            )}
          </div>

          {/* Column 3: Stats Cards Summary Block */}
          <div className="flex flex-col gap-3">
            {/* AI Productivity Score Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm flex items-center justify-between flex-1">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">AI Productivity Score</span>
                <h4 className="text-2xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                  {analyticsResult ? `${analyticsResult.productivityScore}%` : `${productivityScore}%`}
                </h4>
                <p className="text-[9px] text-slate-500 dark:text-slate-400">Calculated by priority workload</p>
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-xl shrink-0">
                <TrendingUp size={20} />
              </div>
            </div>

            {/* Local Stats Combo Row */}
            <div className="grid grid-cols-2 gap-3 flex-1">
              {/* Completed Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm flex flex-col justify-between">
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Resolved</span>
                <h4 className="text-xl font-extrabold text-slate-800 dark:text-white mt-0.5">{completedTasksCount}</h4>
                <p className="text-[8px] text-slate-500 dark:text-slate-400">Met deadlines</p>
              </div>
              {/* Missed Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-3.5 rounded-2xl shadow-sm flex flex-col justify-between">
                <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Overdue</span>
                <h4 className={`text-xl font-extrabold mt-0.5 ${overdueTasksCount > 0 ? "text-rose-600 dark:text-rose-455" : "text-slate-800 dark:text-white"}`}>
                  {overdueTasksCount}
                </h4>
                <p className="text-[8px] text-slate-500 dark:text-slate-400 font-medium">Missed deadlines</p>
              </div>
            </div>
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
            className={`pb-3 font-semibold text-sm transition-all cursor-pointer ${
              viewMode === "standard"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
            onClick={() => setViewMode("standard")}
          >
            Standard View
          </button>
          
          {aiResult && (
            <button
              className={`pb-3 font-semibold text-sm transition-all cursor-pointer ${
                viewMode === "ai"
                  ? "border-b-2 border-violet-600 text-violet-600"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
              onClick={() => setViewMode("ai")}
            >
              <Sparkles size={16} />
              AI Prioritized View
            </button>
          )}

          <button
            className={`pb-3 font-semibold text-sm transition-all cursor-pointer ${
              viewMode === "planner"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
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
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-2xl mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <CalendarDays className="text-emerald-600" size={18} />
              Customize Today's Schedule Options
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Determine your start time and focus hours available today.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
              <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">Start Time:</span>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="outline-none bg-transparent font-bold text-slate-800 dark:text-white text-sm text-center"
              />
            </div>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 shadow-sm">
              <Clock size={16} className="text-slate-400 dark:text-slate-500" />
              <input
                type="number"
                min={1}
                max={24}
                value={availableHours}
                onChange={(e) => setAvailableHours(Number(e.target.value))}
                className="w-10 bg-transparent outline-none font-bold text-slate-800 dark:text-white text-sm text-center"
              />
              <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Hours</span>
            </div>

            <button
              onClick={() => handleGenerateDailyPlanner()}
              disabled={plannerLoading}
              className="bg-emerald-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-emerald-700 transition-all flex items-center gap-2 cursor-pointer"
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
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-455 text-sm mb-1">
                <h4 className="font-bold text-emerald-900 dark:text-emerald-455 text-sm mb-1">Today's Focus Outlook</h4>
                <p className="text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">{plannerResult.summary}</p>
              </div>

              {plannerResult.overloadAlert?.isOverloaded && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-4 flex gap-3 items-start">
                  <AlertTriangle className="text-amber-800 dark:text-amber-450 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900 dark:text-amber-300">Task Backlog Overload Detected</h4>
                    <p className="text-xs text-amber-700 dark:text-amber-450 mt-1 leading-relaxed">{plannerResult.overloadAlert.details}</p>
                  </div>
                </div>
              )}

              <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-4 pl-6 space-y-6">
                {plannerResult.schedule.map((block, idx) => {
                  const isBreak = block.type === "break";
                  const isFocus = block.type === "focus";
                  
                  return (
                    <div key={idx} className="relative group">
                      <span className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 bg-white dark:bg-slate-955 transition-all ${
                        isBreak ? "border-amber-400" : isFocus ? "border-emerald-500" : "border-indigo-400"
                      }`} />

                      <div className={`p-4 rounded-2xl border transition-all ${
                        isBreak 
                          ? "bg-amber-50/20 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30" 
                          : isFocus 
                          ? "bg-emerald-50/10 dark:bg-emerald-950/5 border-emerald-100/60 dark:border-emerald-900/20" 
                          : "bg-indigo-50/10 dark:bg-indigo-950/5 border-indigo-100/60 dark:border-indigo-900/20"
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
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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
                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm sm:text-base mt-2">{block.taskTitle}</h4>
                        {block.recommendation && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed italic">
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
            <div className="text-center py-20 text-slate-400 dark:text-slate-600">
              <CalendarDays className="mx-auto mb-3" size={40} />
              <p className="font-medium">No schedule mapped yet. Hit "Generate Schedule" to start.</p>
            </div>
          )}
        </div>
      )}

      {/* Settings View Layout */}
      {activeFilter === "settings" && (
        <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
            <Settings className="text-indigo-600" size={28} />
            <div>
              {/* Rebranded settings heading */}
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">NeverLate Workspace Settings</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs">Configure your secure backup vault and dashboard behavior.</p>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Secure Owner UID</label>
              <input 
                disabled 
                value={user?.uid || ""} 
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3 rounded-xl text-xs text-slate-500 dark:text-slate-400 outline-none select-all" 
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Registered Email</label>
              <input 
                disabled 
                value={user?.email || "Anonymous"} 
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3 rounded-xl text-xs text-slate-500 dark:text-slate-400 outline-none select-all" 
              />
            </div>
            <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/60 dark:border-indigo-900/30 flex gap-3 items-start">
              <Sparkle className="text-indigo-600 mt-0.5 shrink-0 animate-spin" size={18} />
              <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                {/* Rebranded active guard description */}
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
            <p className="text-slate-500 font-medium">Loading your NeverLate vault...</p>
          </div>
        ) : displayedTasks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedTasks.map((task) => {
              const t = task as Task & { aiRank?: number; aiReasoning?: string };
              const isExiting = exitingTasks.includes(task.id!);

              return (
                <div 
                  key={task.id} 
                  className={`relative flex flex-col h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm hover:shadow-md 
                    transition-all duration-300 ease-in-out origin-center
                    ${isExiting ? "opacity-0 scale-95 -translate-y-4 pointer-events-none" : "opacity-100 scale-100 translate-y-0"}`}
                >
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
                      onComplete={handleToggleCompleteTask} // Passes complete handler down
                    />

                    <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 flex flex-col gap-2">
                      <button
                        onClick={() => handleBreakdownRequest(task)}
                        style={{
                          backgroundColor: theme === "dark" ? "#1e293b" : "#f1f5f9", // Dark: slate-800 | Light: slate-100
                          color: theme === "dark" ? "#94a3b8" : "#475569"            // Dark: slate-400 | Light: slate-600
                        }}
                        className="flex items-center justify-center gap-1.5 text-xs font-semibold hover:opacity-90 py-2 rounded-lg transition-all cursor-pointer w-full"
                      >
                        <ListChecks size={14} />
                        AI Breakdown
                      </button>

                      {viewMode === "ai" && t.aiReasoning && activeFilter === "all" && (
                        <div className="mt-2 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 p-3 rounded-xl text-xs text-slate-600 dark:text-slate-400 italic">
                          <span className="font-bold text-slate-700 dark:text-slate-300 not-italic block mb-0.5">AI Reason:</span>
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
          <div className="bg-white dark:bg-slate-900/40 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl py-20 text-center">
            <p className="text-slate-400 dark:text-slate-500 font-medium">
              {search 
                ? "No tasks match your search." 
                : activeFilter === "urgent" 
                ? "Excellent! No urgent pending tasks on your list."
                : activeFilter === "completed"
                ? "No completed tasks yet. Finish your first task to see it here!"
                : "Your task list is empty. Start by adding a new one!"}
            </p>
            {!search && activeFilter === "all" && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                Create your first task →
              </button>
            )}
          </div>
        )
      )}

      {/* Archive Section - Only shown on Completed View */}
      {activeFilter === "completed" && archivedCompleted.length > 0 && (
        <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setShowArchive(!showArchive)}
            className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs transition-all cursor-pointer shadow-sm"
          >
            <Clock size={14} />
            {showArchive ? "Hide Archived Tasks (Past Week)" : `View Archived Tasks (${archivedCompleted.length})`}
          </button>

          {showArchive && (
            <div className="mt-6 max-w-3xl mx-auto space-y-3">
              {archivedCompleted.map((task) => (
                <div 
                  key={task.id} 
                  className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 overflow-hidden pr-4">
                    <CheckCircle className="text-emerald-500 shrink-0" size={18} />
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate line-through opacity-75">{task.title}</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{task.description || "No description."}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {task.priority}
                    </span>
                    <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">{task.deadline}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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

      {/* NEW: Guardian AI Floating Copilot Chat Panel */}
      <AIChatPanel tasks={tasks} /> 
    </div>
  );
}