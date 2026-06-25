"use client";

import { 
  LayoutDashboard, 
  Calendar, 
  CheckCircle2, 
  Settings, 
  ShieldAlert, 
  Clock, 
  LogIn, 
  LogOut,
  Loader2,
  Sun,
  Moon
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useState } from "react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: Clock, label: "Urgent", href: "/?filter=urgent" },
  { icon: Calendar, label: "Calendar", href: "/?filter=calendar" },
  { icon: CheckCircle2, label: "Completed", href: "/?filter=completed" },
  { icon: Settings, label: "Settings", href: "/?filter=settings" },
];

export default function Sidebar() {
  const { user, signInWithGoogle, logOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleSignIn = async () => {
    setIsAuthLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error("Sign in failed", error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  return (
    <div className="h-full bg-slate-900 text-white p-6 flex flex-col border-r border-slate-800">
      {/* Rebranded Logo */}
      <div className="flex items-center justify-between mb-10 px-2">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <ShieldAlert className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">NeverLate</h1>
        </div>

        {/* Theme Toggle Button */}
        <button 
          onClick={toggleTheme}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="space-y-1 flex-1">
        {menuItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-slate-800 transition-all text-slate-400 hover:text-white group"
          >
            <item.icon size={20} className="group-hover:text-indigo-400 transition-colors" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Bottom Auth Section */}
      <div className="mt-auto pt-6 border-t border-slate-800 space-y-4">
        {user ? (
          <>
            <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
              <div className="flex justify-between items-center mb-2">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Current Plan</p>
                <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-bold">PRO</span>
              </div>
              <p className="text-sm font-medium mb-2 text-slate-200">Task Capacity</p>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: '70%' }}
                ></div>
              </div>
            </div>

            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3 overflow-hidden">
                {user.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="User" 
                    className="w-9 h-9 rounded-full border-2 border-indigo-500/30" 
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center">
                    <ShieldAlert size={16} />
                  </div>
                )}
                <div className="overflow-hidden">
                  <p className="text-sm font-bold truncate text-slate-100">{user.displayName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                </div>
              </div>
            </div>

            <button 
              onClick={() => logOut()}
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors text-sm font-medium"
            >
              <LogOut size={18} />
              <span>Sign Out</span>
            </button>
          </>
        ) : (
          <button 
            disabled={isAuthLoading}
            onClick={handleSignIn}
            className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-bold transition-all shadow-lg shadow-indigo-900/20"
          >
            {isAuthLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <LogIn size={20} />
            )}
            {isAuthLoading ? "Opening Google..." : "Sign in with Google"}
          </button>
        )}
      </div>
    </div>
  );
}