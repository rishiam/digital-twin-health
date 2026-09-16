"use client";

import { useState } from "react";
import { AlertTriangle, ChevronRight, Gauge, Layers, Play, Shield, Sparkles } from "lucide-react";
import { Badge, Button, Card, Input, ProgressBar, StatCard } from "@/components/ui";
import { RiskBars, ShapBars } from "@/components/charts";
import { api } from "@/lib/api";

export default function RiskAnalysisPage() {
  const [analyzing, setAnalyzing] = useState(false);
  const [form, setForm] = useState({
    age: 46,
    bmi: 27.8,
    hba1c: 7.4,
    mean_glucose: 148.0,
    time_below_range: 0.032,
    time_above_range: 0.254,
    glucose_cv: 0.31,
    systolic_bp: 128,
    ldl: 118,
    activity_hours: 3.5,
  });

  const [results, setResults] = useState<any>({
    scores: {
      hypoglycemia_risk: 0.12,
      hyperglycemia_risk: 0.44,
      hospitalization_risk: 0.18,
      cardiovascular_risk: 0.35,
      complication_risk: 0.38,
    },
    overall_level: "moderate",
    feature_importance: {
      time_above_range: 0.24,
      hba1c: 0.21,
      mean_glucose: 0.18,
      glucose_cv: 0.12,
      time_below_range: 0.09,
      systolic_bp: 0.07,
      age: 0.04,
      ldl: 0.03,
      bmi: 0.01,
      activity_hours: 0.01,
    },
    shap_explanations: [
      { feature: "time_above_range", impact: 0.14 },
      { feature: "hba1c", impact: 0.11 },
      { feature: "mean_glucose", impact: 0.08 },
      { feature: "glucose_cv", impact: 0.06 },
      { feature: "activity_hours", impact: -0.05 },
      { feature: "time_below_range", impact: 0.03 },
      { feature: "systolic_bp", impact: 0.03 },
      { feature: "bmi", impact: 0.02 },
      { feature: "ldl", impact: 0.02 },
      { feature: "age", impact: 0.01 },
    ],
    model_version: "risk-ensemble-1.0.0",
  });

  async function handlePredict() {
    setAnalyzing(true);
    try {
      const res = await api<any>("/api/v1/risk/predict", {
        method: "POST",
        body: JSON.stringify(form),
      });
      if (res && res.scores) {
        setResults(res);
      }
    } catch {
      // Local fallback
    } finally {
      setAnalyzing(false);
    }
  }

  const scores = results?.scores || {};
  const level = results?.overall_level || "moderate";

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Multi-Disease Risk Prediction & SHAP Explanations</h1>
            <Badge tone="cyan">XGBoost + Random Forest + LightGBM</Badge>
          </div>
          <p className="text-sm text-slate-500">
            Tri-model ensemble forecasting hypoglycemia, hyperglycemia, hospitalization, cardiovascular, and complication probabilities.
          </p>
        </div>
        <Button onClick={handlePredict} disabled={analyzing}>
          <Play size={16} /> {analyzing ? "Computing Ensembles…" : "Recalculate Risk Engine"}
        </Button>
      </div>

      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard
          title="Hypoglycemia"
          value={`${Math.round((scores.hypoglycemia_risk || 0) * 100)}%`}
          subtitle="TBR < 4% target"
          tone={scores.hypoglycemia_risk > 0.3 ? "rose" : "emerald"}
        />
        <StatCard
          title="Hyperglycemia"
          value={`${Math.round((scores.hyperglycemia_risk || 0) * 100)}%`}
          subtitle="TAR > 25% excursion"
          tone={scores.hyperglycemia_risk > 0.4 ? "amber" : "emerald"}
        />
        <StatCard
          title="Hospitalization"
          value={`${Math.round((scores.hospitalization_risk || 0) * 100)}%`}
          subtitle="30-day acute admission"
          tone={scores.hospitalization_risk > 0.25 ? "rose" : "emerald"}
        />
        <StatCard
          title="Cardiovascular (CVD)"
          value={`${Math.round((scores.cardiovascular_risk || 0) * 100)}%`}
          subtitle="10-year composite event"
          tone={scores.cardiovascular_risk > 0.35 ? "amber" : "emerald"}
        />
        <StatCard
          title="Complications"
          value={`${Math.round((scores.complication_risk || 0) * 100)}%`}
          subtitle="Micro & macrovascular"
          tone={scores.complication_risk > 0.4 ? "rose" : "indigo"}
        />
      </div>

      {/* SHAP Explanation Waterfall & Risk Breakdown Bar Chart */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">SHAP Feature Attribution (Explanations)</h2>
              <p className="text-xs text-slate-500">Red features elevate risk; Green features mitigate/protect against risk.</p>
            </div>
            <Badge tone="cyan">SHAP v0.46</Badge>
          </div>
          <ShapBars explanations={results.shap_explanations || []} />
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Clinical Risk Breakdown</h2>
              <p className="text-xs text-slate-500">Overall Patient Stratification: <strong className="capitalize text-cyan-600">{level}</strong></p>
            </div>
            <Badge tone={level === "critical" ? "rose" : level === "high" ? "amber" : "cyan"}>
              {level.toUpperCase()}
            </Badge>
          </div>
          <RiskBars scores={scores} />
        </Card>
      </div>

      {/* Live Input Factor Tuning Controls */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">Telemetry & Clinical Risk Predictor Factors</h3>
            <p className="text-xs text-slate-500">Adjust clinical markers to examine real-time changes in the SHAP explanation profile.</p>
          </div>
          <Button onClick={handlePredict} disabled={analyzing}>
            <Sparkles size={16} /> Update & Recalculate
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">HbA1c (%)</label>
            <Input
              type="number"
              step="0.1"
              value={form.hba1c}
              onChange={(e) => setForm({ ...form, hba1c: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Mean Glucose (mg/dL)</label>
            <Input
              type="number"
              step="1"
              value={form.mean_glucose}
              onChange={(e) => setForm({ ...form, mean_glucose: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Time Below Range (TBR)</label>
            <Input
              type="number"
              step="0.01"
              value={form.time_below_range}
              onChange={(e) => setForm({ ...form, time_below_range: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Time Above Range (TAR)</label>
            <Input
              type="number"
              step="0.01"
              value={form.time_above_range}
              onChange={(e) => setForm({ ...form, time_above_range: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Glucose CV (Variability)</label>
            <Input
              type="number"
              step="0.01"
              value={form.glucose_cv}
              onChange={(e) => setForm({ ...form, glucose_cv: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Systolic BP (mmHg)</label>
            <Input
              type="number"
              value={form.systolic_bp}
              onChange={(e) => setForm({ ...form, systolic_bp: parseInt(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">LDL Cholesterol (mg/dL)</label>
            <Input
              type="number"
              value={form.ldl}
              onChange={(e) => setForm({ ...form, ldl: parseInt(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Body Mass Index (BMI)</label>
            <Input
              type="number"
              step="0.1"
              value={form.bmi}
              onChange={(e) => setForm({ ...form, bmi: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Physical Activity (hrs/wk)</label>
            <Input
              type="number"
              step="0.5"
              value={form.activity_hours}
              onChange={(e) => setForm({ ...form, activity_hours: parseFloat(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Patient Age (years)</label>
            <Input
              type="number"
              value={form.age}
              onChange={(e) => setForm({ ...form, age: parseInt(e.target.value) || 0 })}
              className="mt-1"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
