"use client";

import { useState } from "react";
import { 
  Menu, 
  ShieldAlert, 
  Bell, 
  X, 
  Sun, 
  Moon,
  LayoutDashboard,
  Clock,
  Calendar as CalendarIcon,
  CheckCircle2,
  Settings,
  LogOut
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Clock, label: "Urgent", href: "/?filter=urgent" },
  { icon: CalendarIcon, label: "Calendar", href: "/?filter=calendar" },
  { icon: CheckCircle2, label: "Completed", href: "/?filter=completed" },
  { icon: Settings, label: "Settings", href: "/?filter=settings" },
];

export default function MobileNav() {
  const { theme, toggleTheme } = useTheme();
  const { user, logOut } = useAuth();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <>
      <div className="md:hidden flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-955 sticky top-0 z-50 transition-colors duration-250">
        {/* Rebranded Logo */}
        <div className="flex items-center gap-2 text-slate-900 dark:text-white">
          <ShieldAlert className="text-indigo-600 w-6 h-6" />
          <span className="font-bold">NeverLate</span>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
            title={theme === "light" ? "Dark Mode" : "Light Mode"}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors relative cursor-pointer"
            title="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-600 rounded-full"></span>
          </button>

          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-lg transition-colors cursor-pointer"
            title="Open Navigation"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {showNotifications && (
        <div className="md:hidden absolute top-16 right-4 w-72 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-xl z-50">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-50 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Alert Center</h4>
            <button 
              onClick={() => setShowNotifications(false)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white text-xs cursor-pointer"
            >
              Clear
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 py-2 leading-relaxed">
            All daily notifications are synchronized with your sidebar metrics. Use the AI reminders panel on your main dashboard for active advice blocks.
          </p>
        </div>
      )}

      {isDrawerOpen && (
        <>
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          <div className="fixed inset-y-0 right-0 w-72 bg-slate-900 text-white p-6 z-50 shadow-2xl flex flex-col transition-transform duration-300">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldAlert className="text-indigo-500 w-5 h-5" />
                <span className="font-bold text-sm">Navigation</span>
              </div>
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="space-y-1 flex-1">
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setIsDrawerOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 transition-all text-slate-400 hover:text-white group"
                >
                  <item.icon size={18} className="group-hover:text-indigo-400 transition-colors" />
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              ))}
            </nav>

            {user && (
              <div className="pt-6 border-t border-slate-800 space-y-4">
                <div className="flex items-center gap-3 overflow-hidden px-1">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="User" 
                      className="w-8 h-8 rounded-full border border-indigo-500/30" 
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center">
                      <ShieldAlert size={14} />
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold truncate text-slate-100">{user.displayName}</p>
                    <p className="text-[9px] text-slate-500 truncate">{user.email}</p>
                  </div>
                </div>

                <button 
                  onClick={() => { logOut(); setIsDrawerOpen(false); }}
                  className="flex w-full items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors text-xs font-medium cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}