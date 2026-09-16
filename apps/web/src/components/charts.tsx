"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  ReferenceLine,
  Area,
  AreaChart,
} from "recharts";

export function GlucoseChart({ data }: { data: { t: string; glucose: number }[] }) {
  const rows = data.map((d, i) => ({
    i,
    label: new Date(d.t).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    glucose: d.glucose,
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <AreaChart data={rows}>
          <defs>
            <linearGradient id="glucoseGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0891b2" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#0891b2" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
          <XAxis dataKey="label" minTickGap={32} tick={{ fontSize: 11 }} />
          <YAxis domain={[50, 260]} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          <ReferenceLine y={180} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: "High (180)", fill: "#f59e0b", fontSize: 10 }} />
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" label={{ value: "Low (70)", fill: "#ef4444", fontSize: 10 }} />
          <Area type="monotone" dataKey="glucose" stroke="#0891b2" strokeWidth={2.5} fillOpacity={1} fill="url(#glucoseGrad)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MultiForecastChart({
  forecasts,
}: {
  forecasts: {
    horizon_minutes: number;
    hybrid_mg_dl: number;
    gru_mg_dl: number;
    lstm_mg_dl: number;
    physiological_mg_dl?: number;
    lower_bound?: number;
    upper_bound?: number;
  }[];
}) {
  const data = forecasts.map((f) => ({
    horizon: `+${f.horizon_minutes >= 60 ? f.horizon_minutes / 60 + "h" : f.horizon_minutes + "m"}`,
    Hybrid: f.hybrid_mg_dl,
    GRU: f.gru_mg_dl,
    LSTM: f.lstm_mg_dl,
    Physiological: f.physiological_mg_dl,
    Lower: f.lower_bound,
    Upper: f.upper_bound,
  }));
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
          <XAxis dataKey="horizon" tick={{ fontSize: 12 }} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          <Legend />
          <ReferenceLine y={180} stroke="#f59e0b" strokeDasharray="3 3" />
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="Hybrid" stroke="#0891b2" strokeWidth={3} dot={{ r: 4 }} />
          <Line type="monotone" dataKey="GRU" stroke="#6366f1" strokeWidth={2} strokeDasharray="4 4" dot={false} />
          <Line type="monotone" dataKey="LSTM" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="2 2" dot={false} />
          <Line type="monotone" dataKey="Physiological" stroke="#10b981" strokeWidth={1.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CompareChart({
  baseline,
  simulated,
}: {
  baseline: { minute: number; glucose: number }[];
  simulated: { minute: number; glucose: number }[];
}) {
  const rows = baseline.map((b, i) => ({
    time: `${Math.floor(b.minute / 60)}h ${b.minute % 60}m`,
    Baseline: b.glucose,
    Simulated: simulated[i]?.glucose,
  }));
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={rows}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
          <XAxis dataKey="time" minTickGap={30} tick={{ fontSize: 11 }} />
          <YAxis domain={[40, 300]} tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          <Legend />
          <ReferenceLine y={180} stroke="#f59e0b" strokeDasharray="3 3" />
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="Baseline" stroke="#94a3b8" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="Simulated" stroke="#0891b2" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RiskBars({ scores }: { scores: Record<string, number> }) {
  const data = Object.entries(scores).map(([name, value]) => ({
    name: name.replace(/_risk|_score/g, "").replace(/_/g, " "),
    value: Math.round(value * 100),
  }));
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 40, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
          <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
          <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={110} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} formatter={(val) => [`${val}%`, "Risk Level"]} />
          <Bar dataKey="value" fill="#0891b2" radius={[0, 6, 6, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ShapBars({ explanations }: { explanations: { feature: string; impact: number }[] }) {
  const data = explanations.map((e) => ({
    feature: e.feature.replace(/_/g, " "),
    impact: Math.round(e.impact * 1000) / 10,
    fill: e.impact >= 0 ? "#ef4444" : "#10b981",
  }));
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 30, right: 30 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} label={{ value: "SHAP Impact (Δ Risk %)", position: "insideBottom", offset: -5, fontSize: 11 }} />
          <YAxis dataKey="feature" type="category" tick={{ fontSize: 11 }} width={120} />
          <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
          <ReferenceLine x={0} stroke="#64748b" />
          <Bar dataKey="impact" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function EcgWaveformChart({ waveform }: { waveform: { time_ms: number; voltage_mv: number }[] }) {
  return (
    <div className="h-48 w-full rounded-xl bg-slate-950 p-2 text-emerald-400">
      <ResponsiveContainer>
        <LineChart data={waveform}>
          <CartesianGrid stroke="#1e293b" strokeDasharray="2 2" opacity={0.6} />
          <XAxis dataKey="time_ms" hide />
          <YAxis domain={[-0.8, 2.0]} hide />
          <Tooltip
            contentStyle={{ backgroundColor: "#020617", borderColor: "#334155", color: "#34d399", fontSize: 11 }}
            formatter={(v: any) => [`${v} mV`, "Lead II"]}
          />
          <Line type="monotone" dataKey="voltage_mv" stroke="#34d399" strokeWidth={1.8} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
