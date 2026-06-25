import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import Sidebar from "./components/Sidebar";
import MobileNav from "./components/MobileNav";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NeverLate", // Rebranded
  description: "Secure your productivity",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300`}>
        <ThemeProvider>
          <AuthProvider>
            <div className="flex min-h-screen">
              {/* Desktop Sidebar */}
              <div className="hidden md:flex w-64 flex-col fixed inset-y-0">
                <Sidebar />
              </div>
              
              {/* Main Content Area */}
              <main className="flex-1 md:pl-64 flex flex-col">
                <MobileNav />
                <div className="p-6 md:p-10">
                  {children}
                </div>
              </main>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}