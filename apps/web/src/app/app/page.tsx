"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, AlertTriangle, ArrowRight, Brain, CheckCircle2, HeartPulse, RefreshCw, Shield, SlidersHorizontal, Sparkles, Waves } from "lucide-react";
import { api, mockDashboard } from "@/lib/api";
import { Badge, Button, Card, StatCard } from "@/components/ui";
import { GlucoseChart } from "@/components/charts";

export default function DashboardPage() {
  const [data, setData] = useState<any>(mockDashboard);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function loadData() {
    try {
      const res = await api<any>("/api/v1/dashboard");
      if (res && res.kpis) {
        setData(res);
      }
    } catch {
      // Graceful fallback to rich mock data if backend not connected yet
      setData(mockDashboard);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const kpis = data?.kpis || mockDashboard.kpis;
  const profile = data?.profile || mockDashboard.profile;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Clinical Metabolic Dashboard</h1>
            <Badge tone="cyan">Digital Twin Synced</Badge>
          </div>
          <p className="text-sm text-slate-500">
            Real-time continuous glucose telemetry, personalized predictive horizons, and risk surveillance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs"
            onClick={() => {
              setRefreshing(true);
              loadData();
            }}
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh Telemetry
          </Button>
          <Link href="/app/simulation">
            <Button className="text-xs">
              <SlidersHorizontal size={14} /> Run What-If Simulation
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          title="Current Glucose"
          value={kpis.current_glucose}
          unit="mg/dL"
          subtitle={kpis.current_glucose > 180 ? "Above target" : kpis.current_glucose < 70 ? "Below target" : "In target range"}
          tone={kpis.current_glucose > 180 ? "amber" : kpis.current_glucose < 70 ? "rose" : "emerald"}
        />
        <StatCard
          title="Time in Range"
          value={`${kpis.time_in_range}%`}
          subtitle="Target: > 70%"
          tone={kpis.time_in_range >= 70 ? "emerald" : "amber"}
        />
        <StatCard
          title="Mean Glucose"
          value={kpis.mean_glucose}
          unit="mg/dL"
          subtitle="24-hour average"
          tone="cyan"
        />
        <StatCard
          title="GMI / Est. A1c"
          value={`${kpis.gmi}%`}
          subtitle={`Clinical A1c: ${profile.hba1c ?? 7.4}%`}
          tone={kpis.gmi > 7.5 ? "amber" : "emerald"}
        />
        <StatCard
          title="Time Below (TBR)"
          value={`${kpis.time_below_range}%`}
          subtitle="Target: < 4%"
          tone={kpis.time_below_range > 4 ? "rose" : "emerald"}
        />
        <StatCard
          title="Time Above (TAR)"
          value={`${kpis.time_above_range}%`}
          subtitle="Target: < 25%"
          tone={kpis.time_above_range > 25 ? "amber" : "emerald"}
        />
      </div>

      {/* Main CGM Chart + Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Continuous Glucose Monitor (24h)</h2>
              <p className="text-xs text-slate-500">Target Range: 70–180 mg/dL (shaded consensus bounds)</p>
            </div>
            <Link href="/app/glucose" className="inline-flex items-center gap-1 text-xs font-semibold text-cyan-600 hover:text-cyan-700">
              Multi-horizon forecasts <ArrowRight size={13} />
            </Link>
          </div>
          <GlucoseChart data={data?.cgm || mockDashboard.cgm} />
        </Card>

        {/* Clinical Alerts & Active Recommendations */}
        <div className="space-y-4">
          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                <AlertTriangle size={16} className="text-amber-500" /> Active Clinical Alerts
              </h3>
              <span className="text-xs text-slate-500">{data?.alerts?.length || 0} active</span>
            </div>
            <div className="space-y-2.5">
              {(data?.alerts && data.alerts.length > 0) ? (
                data.alerts.map((a: any) => (
                  <div key={a.id} className="rounded-xl border border-amber-200/60 bg-amber-50/50 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-amber-900 dark:text-amber-200">{a.title}</p>
                      <Badge tone={a.severity === "critical" ? "rose" : "amber"}>{a.severity}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{a.message}</p>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800">
                  <CheckCircle2 size={16} className="text-emerald-500" /> All parameters within safe margins.
                </div>
              )}
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                <Sparkles size={16} className="text-cyan-600" /> AI Recommendations
              </h3>
              <Badge tone="cyan">Evidence-based</Badge>
            </div>
            <div className="space-y-2.5">
              {(data?.recommendations || mockDashboard.recommendations).map((r: any) => (
                <div key={r.id || r.title} className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{r.title}</p>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{r.body}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Module Quick Shortcuts Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/app/twin" className="group">
          <Card className="h-full border-slate-200 transition-all hover:border-cyan-500 hover:shadow-md dark:border-slate-800">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400">
              <Brain size={20} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-cyan-600 dark:text-white">Hybrid Digital Twin</h4>
            <p className="mt-1 text-xs text-slate-500">Physiological ODE + GRU neural mapping with personalized insulin sensitivity.</p>
          </Card>
        </Link>

        <Link href="/app/cbc" className="group">
          <Card className="h-full border-slate-200 transition-all hover:border-cyan-500 hover:shadow-md dark:border-slate-800">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <Waves size={20} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 dark:text-white">CBC Analysis</h4>
            <p className="mt-1 text-xs text-slate-500">XGBoost evaluation for anemia, infection lineage, bleeding, and systemic inflammation.</p>
          </Card>
        </Link>

        <Link href="/app/ecg" className="group">
          <Card className="h-full border-slate-200 transition-all hover:border-cyan-500 hover:shadow-md dark:border-slate-800">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400">
              <HeartPulse size={20} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-rose-600 dark:text-white">ECG Analysis</h4>
            <p className="mt-1 text-xs text-slate-500">1D CNN + BiLSTM arrhythmia detection: Afib, QT prolongation, and ST deviation.</p>
          </Card>
        </Link>

        <Link href="/app/risk" className="group">
          <Card className="h-full border-slate-200 transition-all hover:border-cyan-500 hover:shadow-md dark:border-slate-800">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              <Shield size={20} />
            </div>
            <h4 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 dark:text-white">Risk Prediction & SHAP</h4>
            <p className="mt-1 text-xs text-slate-500">Tree ensembles (XGB, RF, LGB) with feature attribution explaining top risk drivers.</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
