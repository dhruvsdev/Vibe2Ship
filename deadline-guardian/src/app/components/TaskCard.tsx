"use client";
import { Task, Priority } from "@/types/task";
import { Clock, Trash2, Edit3 } from "lucide-react";
import { deleteTask } from "@/lib/firestore";

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onRefresh: () => void;
}

export default function TaskCard({ task, onEdit, onRefresh }: TaskCardProps) {
  // 1. Safety Check: If task is missing, don't crash the app
  if (!task) return null;

  // 2. Fallback: If priority is missing in database, default to "Medium"
  const priority: Priority = task.priority || "Medium";

  const priorityStyles = {
    High: "bg-red-50 text-red-700 border-red-100",
    Medium: "bg-amber-50 text-amber-700 border-amber-100",
    Low: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

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

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        {/* Using the safe 'priority' variable here */}
        <span className={`text-[10px] font-bold px-2 py-1 rounded-md border uppercase tracking-wider ${priorityStyles[priority]}`}>
          {priority}
        </span>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onEdit(task)} 
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <Edit3 size={16} />
          </button>
          <button 
            onClick={handleDelete} 
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <h3 className="font-bold text-slate-800 mb-1 line-clamp-1">
        {task.title || "Untitled Task"}
      </h3>
      <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">
        {task.description || "No description provided."}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock size={14} className="text-indigo-500" />
          <span className="text-xs font-bold">{task.deadline || "No Date"}</span>
        </div>
        <div className="text-[10px] font-bold text-slate-400 uppercase">
          {task.status || "Todo"}
        </div>
      </div>
    </div>
  );
}