import TaskCard from "./components/TaskCard";
import { Plus, Filter } from "lucide-react";

export default function Dashboard() {
  const tasks = [
    { title: "Finalize Project Proposal", deadline: "Today, 5:00 PM", priority: "High" as const, category: "Work" },
    { title: "Quarterly Review Deck", deadline: "Tomorrow", priority: "Medium" as const, category: "Marketing" },
    { title: "Update Security Plugins", deadline: "Oct 24", priority: "Low" as const, category: "Dev" },
    { title: "Client Onboarding Call", deadline: "Today, 2:00 PM", priority: "High" as const, category: "Sales" },
    { title: "Fix Homepage UI Bug", deadline: "Friday", priority: "Medium" as const, category: "Dev" },
    { title: "Weekly Grocery Run", deadline: "Saturday", priority: "Low" as const, category: "Personal" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Guardian Dashboard</h1>
          <p className="text-slate-500 text-sm">Welcome back! You have {tasks.length} active tasks.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium hover:bg-slate-50 transition-colors">
            <Filter size={16} />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-shadow shadow-lg shadow-indigo-200">
            <Plus size={16} />
            New Task
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-indigo-600 p-6 rounded-2xl text-white">
          <p className="text-indigo-100 text-sm font-medium">Critical Deadlines</p>
          <p className="text-3xl font-bold mt-1">03</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">Tasks in Progress</p>
          <p className="text-3xl font-bold mt-1 text-slate-900">12</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">Completed Today</p>
          <p className="text-3xl font-bold mt-1 text-slate-900">08</p>
        </div>
      </div>

      {/* Tasks Grid */}
      <h2 className="text-lg font-semibold mb-4 text-slate-800">Upcoming Deadlines</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task, index) => (
          <TaskCard key={index} {...task} />
        ))}
      </div>
    </div>
  );
}