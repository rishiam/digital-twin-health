"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  Brain,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  SlidersHorizontal,
  Stethoscope,
  UserRound,
  Waves,
} from "lucide-react";
import { clearSession, getUser } from "@/lib/api";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/profile", label: "Patient Profile", icon: UserRound },
  { href: "/app/twin", label: "Digital Twin", icon: Brain },
  { href: "/app/glucose", label: "Glucose Prediction", icon: Activity },
  { href: "/app/cbc", label: "CBC Analysis", icon: Waves },
  { href: "/app/ecg", label: "ECG Analysis", icon: HeartPulse },
  { href: "/app/risk", label: "Risk Analysis", icon: Shield },
  { href: "/app/simulation", label: "Simulation", icon: SlidersHorizontal },
  { href: "/app/assistant", label: "AI Assistant", icon: MessageSquare },
  { href: "/app/reports", label: "Reports", icon: FileText },
  { href: "/app/settings", label: "Settings", icon: Settings },
  { href: "/app/admin", label: "Admin", icon: Stethoscope },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [name, setName] = useState("Clinician");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (u?.full_name) setName(u.full_name);
    const saved = localStorage.getItem("digitwin_theme") === "dark";
    setDark(saved);
    document.documentElement.classList.toggle("dark", saved);
  }, []);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:block">
        <Link href="/app" className="mb-6 flex items-center gap-2 px-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-600 text-white">DT</div>
          <div>
            <p className="text-sm font-bold">DigiTwin Health</p>
            <p className="text-xs text-slate-500">Digital twin care</p>
          </div>
        </Link>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const active = path === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href as any}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
                  active && "bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-100"
                )}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <p className="text-sm text-slate-500">Welcome back, {name}</p>
          <div className="flex items-center gap-2">
            <button
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-slate-700"
              onClick={() => {
                const next = !dark;
                setDark(next);
                localStorage.setItem("digitwin_theme", next ? "dark" : "light");
                document.documentElement.classList.toggle("dark", next);
              }}
            >
              {dark ? "Light mode" : "Dark mode"}
            </button>
            <button
              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-rose-600"
              onClick={() => {
                clearSession();
                router.push("/login");
              }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
