"use client";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { addTask, updateTask } from "@/lib/firestore";
import { Task, Priority, Status } from "@/types/task";
import { Loader2, Sparkles } from "lucide-react";

interface TaskFormProps {
  initialData?: Task;
  onSuccess: () => void;
}

export default function TaskForm({ initialData, onSuccess }: TaskFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    priority: (initialData?.priority || "Medium") as Priority,
    status: (initialData?.status || "To Do") as Status,
    deadline: initialData?.deadline || "",
  });

  const handleAiAssist = async () => {
    if (!formData.title) {
      alert("Please enter a title first so the Guardian AI knows what to write about!");
      return;
    }

    setIsAiLoading(true);
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: `Write a 2-sentence professional description for a task titled: "${formData.title}"` 
        }),
      });

      const data = await response.json();
      
      if (data.error) throw new Error(data.error);

      const cleanedText = data.text.trim().replace(/^"|"$/g, '');
      setFormData(prev => ({ ...prev, description: cleanedText }));
    } catch (error: any) {
      console.error("AI Assist Error:", error);
      alert("AI is currently unavailable: " + error.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      if (initialData?.id) {
        await updateTask(initialData.id, formData);
      } else {
        await addTask({ ...formData, userId: user.uid });
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error saving task:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-2">
      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Task Title</label>
        <input
          required
          className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
          placeholder="e.g., Design Landing Page"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">Description</label>
          
          {/* AI ASSIST BUTTON */}
          <button 
            type="button"
            onClick={handleAiAssist}
            disabled={isAiLoading || !formData.title}
            className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 disabled:text-slate-300 dark:disabled:text-slate-700 transition-colors cursor-pointer"
          >
            {isAiLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {isAiLoading ? "Guardian is Thinking..." : "AI Assist"}
          </button>
        </div>
        
        <textarea
          className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all h-28 resize-none shadow-sm"
          placeholder="What are the details of this deadline?"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Priority</label>
          <select
            className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as Priority })}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Deadline Date</label>
          <input
            type="date"
            required
            className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm [color-scheme:light] dark:[color-scheme:dark]"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mt-4 shadow-lg shadow-indigo-100 dark:shadow-none disabled:opacity-70 active:scale-95 cursor-pointer"
      >
        {loading && <Loader2 size={18} className="animate-spin" />}
        {initialData ? "Update Deadline" : "Secure Deadline"}
      </button>
    </form>
  );
}