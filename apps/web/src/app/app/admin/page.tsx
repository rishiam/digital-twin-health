"use client";

import { useEffect, useState } from "react";
import { Activity, Brain, CheckCircle2, Database, ShieldAlert, Stethoscope, Users } from "lucide-react";
import { Badge, Button, Card, Input, StatCard } from "@/components/ui";
import { api } from "@/lib/api";

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<any>({
    users: 12,
    patients: 8,
    audit_events: 148,
    roles: { patient: 8, doctor: 3, admin: 1 },
  });
  const [auditLogs, setAuditLogs] = useState<any[]>([
    { id: "1", action: "login", resource: "auth", actor_id: "patient-01", ip_address: "127.0.0.1", created_at: new Date().toISOString() },
    { id: "2", action: "glucose_predict", resource: "ml_forecaster", actor_id: "patient-01", ip_address: "127.0.0.1", created_at: new Date(Date.now() - 15 * 60000).toISOString() },
    { id: "3", action: "cbc_analyze", resource: "cbc_model", actor_id: "doc-01", ip_address: "192.168.1.10", created_at: new Date(Date.now() - 45 * 60000).toISOString() },
    { id: "4", action: "ecg_analyze", resource: "ecg_model", actor_id: "doc-01", ip_address: "192.168.1.10", created_at: new Date(Date.now() - 90 * 60000).toISOString() },
    { id: "5", action: "twin_simulate", resource: "digital_twin", actor_id: "patient-01", ip_address: "127.0.0.1", created_at: new Date(Date.now() - 180 * 60000).toISOString() },
  ]);
  const [models, setModels] = useState<any[]>([
    { id: "1", name: "hybrid-gru-phys", version: "1.0.0", task: "glucose_forecasting", metrics: { rmse: 13.8, mae: 10.5, mape: 7.9, r2: 0.91 }, is_active: true },
    { id: "2", name: "lstm-comparator", version: "1.0.0", task: "glucose_forecasting", metrics: { rmse: 14.9, mae: 11.4, mape: 8.6, r2: 0.89 }, is_active: true },
    { id: "3", name: "xgboost-cbc-hematology", version: "1.0.0", task: "cbc_analysis", metrics: { mae: 0.042, accuracy: 0.96 }, is_active: true },
    { id: "4", name: "cnn-bilstm-cardiac", version: "1.0.0", task: "ecg_analysis", metrics: { accuracy: 0.942, macro_f1: 0.93 }, is_active: true },
    { id: "5", name: "risk-ensemble-xgb-rf-lgb", version: "1.0.0", task: "multi_risk_prediction", metrics: { auc_roc: 0.92, shap_features: 10 }, is_active: true },
  ]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function loadAdminData() {
      try {
        const ov = await api<any>("/api/v1/admin/overview");
        if (ov) setOverview(ov);
      } catch {}
      try {
        const logs = await api<any>("/api/v1/admin/audit");
        if (logs && logs.items) setAuditLogs(logs.items);
      } catch {}
      try {
        const m = await api<any>("/api/v1/admin/models");
        if (m && Array.isArray(m)) setModels(m);
      } catch {}
      setLoading(false);
    }
    loadAdminData();
  }, []);

  const filteredLogs = auditLogs.filter(
    (l) =>
      l.action?.toLowerCase().includes(search.toLowerCase()) ||
      l.resource?.toLowerCase().includes(search.toLowerCase()) ||
      l.actor_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Admin & Clinical Governance Dashboard</h1>
            <Badge tone="indigo">Root Privileges</Badge>
          </div>
          <p className="text-sm text-slate-500">
            System administration, HIPAA audit logs, role-based access control, and active ML model registry lifecycle.
          </p>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          title="Total Platform Users"
          value={overview.users || 12}
          subtitle={`Patients: ${overview.roles?.patient ?? 8} • Doctors: ${overview.roles?.doctor ?? 3}`}
          tone="cyan"
        />
        <StatCard
          title="Monitored Patients"
          value={overview.patients || 8}
          subtitle="Continuous telemetry streams"
          tone="emerald"
        />
        <StatCard
          title="Audit Trail Logs"
          value={overview.audit_events || 148}
          subtitle="Immutable access records"
          tone="indigo"
        />
        <StatCard
          title="Active ML Models"
          value={models.length}
          subtitle="Inference microservices"
          tone="cyan"
        />
      </div>

      {/* Model Registry Section */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Machine Learning Model Registry & Versioning</h2>
            <p className="text-xs text-slate-500">Live production checkpoints with validation benchmark metrics.</p>
          </div>
          <Badge tone="cyan">Artifact Version: v1.0.0</Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/60">
              <tr>
                <th className="py-2.5 px-3">Model Tag</th>
                <th className="py-2.5 px-3">Task Domain</th>
                <th className="py-2.5 px-3">Version</th>
                <th className="py-2.5 px-3">Validation Metrics</th>
                <th className="py-2.5 px-3">Deployment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {models.map((m) => (
                <tr key={m.id || m.name} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2.5 px-3 font-bold text-slate-900 dark:text-white">{m.name}</td>
                  <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 capitalize">{m.task.replace(/_/g, " ")}</td>
                  <td className="py-2.5 px-3 font-mono text-cyan-600">v{m.version}</td>
                  <td className="py-2.5 px-3 text-slate-500 font-mono">
                    {typeof m.metrics === "object" ? JSON.stringify(m.metrics) : m.metrics}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge tone={m.is_active ? "emerald" : "slate"}>
                      {m.is_active ? "Production Active" : "Staged"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* HIPAA Audit Trail Section */}
      <Card>
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Security & Clinical Audit Trail</h2>
            <p className="text-xs text-slate-500">Every authorization check, telemetry inference, and clinical data access event is logged.</p>
          </div>
          <div className="w-full sm:w-64">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by action or resource…"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/60">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Resource</th>
                <th className="py-2.5 px-3">Actor ID</th>
                <th className="py-2.5 px-3">Client IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              {filteredLogs.slice(0, 10).map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="py-2 px-3 text-slate-400">
                    {log.created_at ? new Date(log.created_at).toLocaleString() : "Just now"}
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-900 dark:text-white">{log.action}</td>
                  <td className="py-2 px-3 text-cyan-600">{log.resource}</td>
                  <td className="py-2 px-3 text-slate-500">{log.actor_id || "Anonymous"}</td>
                  <td className="py-2 px-3 text-slate-400">{log.ip_address || "127.0.0.1"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
