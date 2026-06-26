"use client";
import { useState } from "react";
// Added "Status" to the imports below
import { Task, Priority, Status } from "@/types/task";
import { Clock, Trash2, Edit3, Check } from "lucide-react";
import { deleteTask, updateTask } from "@/lib/firestore";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onRefresh: () => void;
  onComplete?: (taskId: string) => void;
}

export default function TaskCard({ task, onEdit, onRefresh, onComplete }: TaskCardProps) {
  const [isExiting, setIsExiting] = useState(false);

  // 1. Safety Check: If task is missing, don't crash the app
  if (!task) return null;

  // 2. Fallback: If priority is missing in database, default to "Medium"
  const priority: Priority = task.priority || "Medium";

  // Polished light & dark mode styles for priority badges
  const priorityStyles = {
    High: "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-900/30",
    Medium: "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
    Low: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
  };

  const isCompleted = task.status === "Completed";

  const handleDelete = async () => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await deleteTask(task.id!);
        onRefresh();
      } catch (error) {
        alert("Failed to delete task");
      }
    }
  };

  const handleToggleComplete = async () => {
    if (onComplete) {
      onComplete(task.id!);
      return;
    }

    setIsExiting(true);
    setTimeout(async () => {
      try {
        // Corrected "Todo" to "To Do" and explicitly typed as Status
        const newStatus: Status = isCompleted ? "To Do" : "Completed";
        await updateTask(task.id!, { status: newStatus });
        onRefresh();
      } catch (error) {
        alert("Failed to update task status");
        setIsExiting(false);
      }
    }, 300);
  };

  return (
    <div 
      className={`bg-white dark:bg-slate-900/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md group
        transition-all duration-300 ease-in-out
        ${isCompleted ? "opacity-75" : ""}
        ${isExiting ? "opacity-0 scale-95 -translate-y-4 pointer-events-none" : "opacity-100 scale-100 translate-y-0"}`}
    >
      <div className="flex justify-between items-start mb-4">
        <span className={`text-[10px] font-bold px-2 py-1 rounded-md border uppercase tracking-wider ${priorityStyles[priority]}`}>
          {priority}
        </span>
        
        <div className="flex gap-1 items-center">
          {/* Always Visible Complete/Tick Button */}
          <button 
            onClick={handleToggleComplete} 
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isCompleted 
                ? "text-emerald-600 dark:text-emerald-450 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/40" 
                : "text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
            }`}
            title={isCompleted ? "Mark as Incomplete" : "Mark as Completed"}
          >
            <Check size={16} />
          </button>

          {/* Hover-only Action Buttons */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button 
              onClick={() => onEdit(task)} 
              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors cursor-pointer"
              title="Edit Task"
            >
              <Edit3 size={16} />
            </button>
            <button 
              onClick={handleDelete} 
              className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-450 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
              title="Delete Task"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>

      <h3 className={`font-bold text-slate-800 dark:text-slate-100 mb-1 line-clamp-1 ${isCompleted ? "line-through text-slate-400 dark:text-slate-500" : ""}`}>
        {task.title || "Untitled Task"}
      </h3>
      <p className={`text-sm text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 h-10 ${isCompleted ? "text-slate-400 dark:text-slate-500" : ""}`}>
        {task.description || "No description provided."}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800/50">
        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Clock size={14} className="text-indigo-500" />
          <span className="text-xs font-bold">{task.deadline || "No Date"}</span>
        </div>
        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
          {task.status || "Todo"}
        </div>
      </div>
    </div>
  );
}