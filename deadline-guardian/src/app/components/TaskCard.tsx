import { Clock, AlertCircle } from "lucide-react";

interface TaskProps {
  title: string;
  deadline: string;
  priority: "High" | "Medium" | "Low";
  category: string;
}

export default function TaskCard({ title, deadline, priority, category }: TaskProps) {
  const priorityStyles = {
    High: "bg-red-50 text-red-700 border-red-100",
    Medium: "bg-amber-50 text-amber-700 border-amber-100",
    Low: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${priorityStyles[priority]}`}>
          {priority}
        </span>
        <span className="text-xs font-medium text-slate-400">{category}</span>
      </div>
      
      <h3 className="font-semibold text-slate-800 mb-4 line-clamp-1">{title}</h3>
      
      <div className="flex items-center justify-between pt-4 border-t border-slate-50">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock size={14} />
          <span className="text-xs font-medium">{deadline}</span>
        </div>
        <button className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-lg transition-colors">
          <AlertCircle size={18} />
        </button>
      </div>
    </div>
  );
}