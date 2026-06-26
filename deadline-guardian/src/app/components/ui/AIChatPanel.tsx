"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { MessageSquareCode, X, Send, Loader2, Sparkles, BrainCircuit } from "lucide-react";
import { getAIChatResponse } from "@/lib/gemini";
import { Task } from "@/types/task";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AIChatPanelProps {
  tasks: Task[];
}

export default function AIChatPanel({ tasks }: AIChatPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hello! I am NeverLate AI, your operational coach. I have full context of your task list. How can I help you organize your day?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Safely mount on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const quickPrompts = [
    "What should I work on first?",
    "Can I finish everything today?",
    "Create a study plan for tomorrow.",
    "Break down my portfolio project.",
  ];

  // Strictly strip non-serializable fields (like Firestore Timestamps) while satisfying the Task interface
  const sanitizeTasks = (taskList: Task[]): Task[] => {
    return taskList.map((t) => ({
      id: t.id || "",
      userId: t.userId || "",
      title: t.title || "Untitled",
      description: t.description || "",
      priority: t.priority || "Medium",
      status: t.status || "To Do",
      deadline: t.deadline || "",
      createdAt: null as any, // Safely satisfies the required TypeScript property
    }));
  };

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: Message = { role: "user", content: textToSend };
    const updatedMessages = [...messages, userMessage];
    
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    try {
      const cleanTasks = sanitizeTasks(tasks);
      const response = await getAIChatResponse(updatedMessages, cleanTasks);
      setMessages([...updatedMessages, { role: "assistant", content: response }]);
    } catch (error) {
      console.error(error);
      setMessages([...updatedMessages, { role: "assistant", content: "Sorry, I had trouble reaching the AI network. Please verify your OpenRouter key." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Floating Action Button - Locked strictly to bottom-right of viewport */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          zIndex: 99999
        }}
        className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer relative group"
        title="Consult NeverLate AI"
      >
        <span className="absolute inset-0 rounded-full bg-indigo-500 animate-ping opacity-25 group-hover:opacity-0 transition-opacity"></span>
        <BrainCircuit size={24} />
      </button>

      {/* Slide-Over Chat Panel */}
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <div 
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 100000
            }}
            className="bg-slate-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Chat Drawer container */}
          <div 
            style={{
              position: "fixed",
              top: 0,
              bottom: 0,
              right: 0,
              zIndex: 100001
            }}
            className="w-80 sm:w-96 bg-white dark:bg-slate-900 border-l border-slate-100 dark:border-slate-800 shadow-2xl flex flex-col justify-between transition-all duration-300"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <div className="flex items-center gap-2">
                <BrainCircuit className="text-indigo-600" size={18} />
                <span className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">NeverLate AI Copilot</span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              {messages.map((msg, index) => {
                const isAI = msg.role === "assistant";
                return (
                  <div key={index} className={`flex ${isAI ? "justify-start" : "justify-end"}`}>
                    <div className={`p-3 rounded-2xl max-w-[85%] text-xs sm:text-sm shadow-sm leading-relaxed ${
                      isAI 
                        ? "bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-700/50" 
                        : "bg-indigo-600 text-white"
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              
              {/* Typing Loader Indicator */}
              {loading && (
                <div className="flex justify-start">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center gap-2 text-xs">
                    <Loader2 size={12} className="animate-spin text-indigo-500" />
                    <span>NeverLate is writing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions & Input Bottom Area */}
            <div className="p-4 border-t border-slate-50 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-950/10 space-y-3">
              {/* Prompts (Hidden when busy) */}
              {!loading && messages.length <= 2 && (
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Quick Action Evaluators</span>
                  <div className="grid grid-cols-1 gap-1.5">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleSendMessage(prompt)}
                        className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-left hover:border-indigo-500 dark:hover:border-indigo-800 hover:text-indigo-600 transition-colors w-full cursor-pointer shadow-sm"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat Text Input */}
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
                className="relative flex items-center"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a custom organizational question..."
                  disabled={loading}
                  className="w-full pl-3 pr-10 py-2.5 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim()}
                  className="absolute right-2 p-1.5 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 disabled:opacity-30 cursor-pointer"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </>,
    document.body
  );
}