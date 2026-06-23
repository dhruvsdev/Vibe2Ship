import { 
  LayoutDashboard, 
  Calendar, 
  CheckCircle2, 
  Settings, 
  ShieldAlert, 
  Clock 
} from "lucide-react";
import Link from "next/link";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Clock, label: "Urgent", href: "#" },
  { icon: Calendar, label: "Calendar", href: "#" },
  { icon: CheckCircle2, label: "Completed", href: "#" },
  { icon: Settings, label: "Settings", href: "#" },
];

export default function Sidebar() {
  return (
    <div className="h-full bg-slate-900 text-white p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-10 px-2">
        <ShieldAlert className="text-indigo-400 w-8 h-8" />
        <h1 className="text-xl font-bold tracking-tight">Guardian</h1>
      </div>

      <nav className="space-y-1 flex-1">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 transition-colors text-slate-300 hover:text-white"
          >
            <item.icon size={20} />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-auto p-4 bg-slate-800 rounded-xl">
        <p className="text-xs text-slate-400 uppercase font-bold mb-2">Plan</p>
        <p className="text-sm font-medium">Pro Account</p>
        <div className="w-full bg-slate-700 h-1.5 mt-2 rounded-full overflow-hidden">
          <div className="bg-indigo-500 h-full w-3/4"></div>
        </div>
      </div>
    </div>
  );
}