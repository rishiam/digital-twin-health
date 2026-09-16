"use client";

import { useEffect, useState } from "react";
import { Bell, Check, Database, Moon, Save, Server, Shield, Sun, User } from "lucide-react";
import { Badge, Button, Card, Input } from "@/components/ui";
import { getUser } from "@/lib/api";

export default function SettingsPage() {
  const [user, setUser] = useState<any>({
    full_name: "Jordan Hale",
    email: "patient@digitwin.health",
    role: "patient",
  });
  const [dark, setDark] = useState(false);
  const [saved, setSaved] = useState(false);

  const [hypoThreshold, setHypoThreshold] = useState(70);
  const [severeHypoThreshold, setSevereHypoThreshold] = useState(54);
  const [hyperThreshold, setHyperThreshold] = useState(180);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);

  useEffect(() => {
    const u = getUser();
    if (u) setUser(u);
    const isDark = localStorage.getItem("digitwin_theme") === "dark";
    setDark(isDark);
  }, []);

  function toggleTheme(next: boolean) {
    setDark(next);
    localStorage.setItem("digitwin_theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Platform & Clinical Settings</h1>
        <p className="text-sm text-slate-500">
          Configure clinical telemetry alerts, user profile parameters, theme preferences, and connected cloud infrastructure.
        </p>
      </div>

      {/* Account Info */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 text-white font-bold text-lg">
            <User size={24} />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white">{user.full_name || "Jordan Hale"}</h3>
            <p className="text-xs text-slate-500">{user.email || "patient@digitwin.health"}</p>
            <div className="mt-1 flex gap-2">
              <Badge tone="cyan">Role: {user.role?.toUpperCase() || "PATIENT"}</Badge>
              <Badge tone="emerald">Supabase Auth Active</Badge>
            </div>
          </div>
        </div>
      </Card>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Clinical Alert Thresholds */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Continuous Glucose Telemetry Thresholds</h3>
              <p className="text-xs text-slate-500">Define the glycemic boundaries that trigger emergency notifications and what-if alerts.</p>
            </div>
            <Shield size={18} className="text-cyan-600" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Hypoglycemia Alert (mg/dL)</label>
              <Input
                type="number"
                value={hypoThreshold}
                onChange={(e) => setHypoThreshold(parseInt(e.target.value) || 70)}
                className="mt-1"
              />
              <p className="text-[11px] text-slate-400">Default: 70 mg/dL</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Severe Hypoglycemia (mg/dL)</label>
              <Input
                type="number"
                value={severeHypoThreshold}
                onChange={(e) => setSevereHypoThreshold(parseInt(e.target.value) || 54)}
                className="mt-1"
              />
              <p className="text-[11px] text-slate-400">Default: 54 mg/dL</p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Hyperglycemia Alert (mg/dL)</label>
              <Input
                type="number"
                value={hyperThreshold}
                onChange={(e) => setHyperThreshold(parseInt(e.target.value) || 180)}
                className="mt-1"
              />
              <p className="text-[11px] text-slate-400">Default: 180 mg/dL</p>
            </div>
          </div>
        </Card>

        {/* Display and Theme Preferences */}
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Interface & Visual Theme</h3>
              <p className="text-xs text-slate-500">Toggle between professional light clinical view and low-light dark mode.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => toggleTheme(false)}
              className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold transition ${
                !dark
                  ? "border-cyan-500 bg-cyan-50 text-cyan-800"
                  : "border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400"
              }`}
            >
              <Sun size={16} /> Light Clinical Mode
            </button>
            <button
              type="button"
              onClick={() => toggleTheme(true)}
              className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold transition ${
                dark
                  ? "border-cyan-500 bg-cyan-950 text-cyan-200"
                  : "border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-400"
              }`}
            >
              <Moon size={16} /> Dark Monitoring Mode
            </button>
          </div>
        </Card>

        {/* Connected Cloud Infrastructure */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Connected SaaS Cloud Infrastructure</h3>
            <Server size={18} className="text-cyan-600" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 dark:text-white block">FastAPI Backend (Railway)</strong>
                <span className="text-slate-400">https://digitwin-api.up.railway.app</span>
              </div>
              <Badge tone="emerald">Connected</Badge>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 dark:text-white block">PostgreSQL (Supabase)</strong>
                <span className="text-slate-400">db.supabase.co • 18 Relational Tables</span>
              </div>
              <Badge tone="emerald">RLS Active</Badge>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 dark:text-white block">Supabase Storage</strong>
                <span className="text-slate-400">Bucket: digitwin-uploads</span>
              </div>
              <Badge tone="emerald">Ready</Badge>
            </div>

            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800 flex items-center justify-between">
              <div>
                <strong className="text-slate-900 dark:text-white block">Sentry Monitoring</strong>
                <span className="text-slate-400">Telemetry error & APM tracing</span>
              </div>
              <Badge tone="cyan">Enabled</Badge>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          {saved ? (
            <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600">
              <Check size={16} /> Preferences successfully updated.
            </span>
          ) : (
            <span className="text-xs text-slate-400">All configurations applied immediately.</span>
          )}
          <Button type="submit">
            <Save size={15} /> Save Platform Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
