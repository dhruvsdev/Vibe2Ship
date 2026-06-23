import { Menu, ShieldAlert, Bell } from "lucide-react";

export default function MobileNav() {
  return (
    <div className="md:hidden flex items-center justify-between p-4 border-b bg-white sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <ShieldAlert className="text-indigo-600 w-6 h-6" />
        <span className="font-bold">Guardian</span>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 text-slate-600">
          <Bell size={20} />
        </button>
        <button className="p-2 text-slate-600">
          <Menu size={24} />
        </button>
      </div>
    </div>
  );
}