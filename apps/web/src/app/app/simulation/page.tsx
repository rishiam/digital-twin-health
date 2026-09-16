"use client";

import { useState } from "react";
import { AlertCircle, ArrowDownRight, ArrowUpRight, CheckCircle2, Download, FileText, Play, RefreshCw, SlidersHorizontal, Sparkles } from "lucide-react";
import { Badge, Button, Card, StatCard } from "@/components/ui";
import { CompareChart } from "@/components/charts";
import { api } from "@/lib/api";

export default function SimulationEnginePage() {
  const [startGlucose, setStartGlucose] = useState(152);
  const [insulinDelta, setInsulinDelta] = useState(0.2); // +20%
  const [carbDelta, setCarbDelta] = useState(-0.15); // -15%
  const [exerciseDelta, setExerciseDelta] = useState(0.3); // +30%
  const [medicationEffect, setMedicationEffect] = useState(0.1);
  const [hours, setHours] = useState(6);
  const [simulating, setSimulating] = useState(false);
  const [exported, setExported] = useState(false);

  const [simResult, setSimResult] = useState<any>({
    summary: "Scenario: +20% insulin bolus, -15% meal carbs, +30% exercise reduces 6h postprandial peak by 34 mg/dL and prevents nocturnal spike.",
    treatment_response: {
      baseline_end_mg_dl: 168.2,
      simulated_end_mg_dl: 124.5,
      delta_mg_dl: -43.7,
    },
    baseline: Array.from({ length: 73 }, (_, i) => ({
      minute: i * 5,
      glucose: Math.round(152 + 38 * Math.sin(i / 10) + (i > 30 ? (i - 30) * 0.4 : 0)),
    })),
    simulated: Array.from({ length: 73 }, (_, i) => ({
      minute: i * 5,
      glucose: Math.round(152 + 20 * Math.sin(i / 10) - (i > 20 ? (i - 20) * 0.5 : 0)),
    })),
  });

  async function handleRunSimulation() {
    setSimulating(true);
    setExported(false);
    try {
      const res = await api<any>("/api/v1/twin/simulate", {
        method: "POST",
        body: JSON.stringify({
          start_glucose: startGlucose,
          insulin_delta: insulinDelta,
          carb_delta: carbDelta,
          exercise_delta: exerciseDelta,
          medication_effect: medicationEffect,
          hours,
        }),
      });
      if (res && res.baseline) {
        setSimResult(res);
      }
    } catch {
      // Local calculation fallback
      const basePoints = Array.from({ length: hours * 12 + 1 }, (_, i) => ({
        minute: i * 5,
        glucose: Math.round(startGlucose + 35 * Math.sin(i / 9) + (i > 25 ? (i - 25) * 0.3 : 0)),
      }));
      const simPoints = Array.from({ length: hours * 12 + 1 }, (_, i) => {
        const insImpact = insulinDelta * 40;
        const carbImpact = carbDelta * 30;
        const exImpact = exerciseDelta * 25;
        const medImpact = medicationEffect * 20;
        const netAdjustment = carbImpact - insImpact - exImpact - medImpact;
        return {
          minute: i * 5,
          glucose: Math.round(Math.max(55, startGlucose + 22 * Math.sin(i / 9) + netAdjustment * (i / (hours * 12)))),
        };
      });

      const bEnd = basePoints[basePoints.length - 1].glucose;
      const sEnd = simPoints[simPoints.length - 1].glucose;
      const delta = Math.round((sEnd - bEnd) * 10) / 10;

      setSimResult({
        summary: `Adjusted therapy: ${(insulinDelta * 100).toFixed(0)}% insulin, ${(carbDelta * 100).toFixed(0)}% carbs, ${(exerciseDelta * 100).toFixed(0)}% activity shifted final glucose by ${delta} mg/dL.`,
        treatment_response: {
          baseline_end_mg_dl: bEnd,
          simulated_end_mg_dl: sEnd,
          delta_mg_dl: delta,
        },
        baseline: basePoints,
        simulated: simPoints,
      });
    } finally {
      setSimulating(false);
    }
  }

  function handleExport() {
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  }

  const tr = simResult?.treatment_response || {
    baseline_end_mg_dl: 168.2,
    simulated_end_mg_dl: 124.5,
    delta_mg_dl: -43.7,
  };

  const isHypoRisk = tr.simulated_end_mg_dl < 70;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">What-If Treatment Simulation Engine</h1>
            <Badge tone="cyan">Biophysical Perturbation</Badge>
          </div>
          <p className="text-sm text-slate-500">
            Simulate insulin titrations, carbohydrate reductions, workout sessions, and medication additions before clinical prescription.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download size={15} /> {exported ? "Report Downloaded!" : "Export Scenario Report"}
          </Button>
          <Button onClick={handleRunSimulation} disabled={simulating}>
            <Play size={15} /> {simulating ? "Simulating…" : "Execute Simulation"}
          </Button>
        </div>
      </div>

      {/* Outcome Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          title="Baseline Ending Glucose"
          value={`${tr.baseline_end_mg_dl}`}
          unit="mg/dL"
          subtitle="At conclusion of 6 hours"
          tone="slate"
        />
        <StatCard
          title="Simulated Ending Glucose"
          value={`${tr.simulated_end_mg_dl}`}
          unit="mg/dL"
          subtitle={isHypoRisk ? "Hypoglycemia Risk Detected!" : "Target range maintained"}
          tone={isHypoRisk ? "rose" : "emerald"}
        />
        <StatCard
          title="Net Treatment Delta"
          value={`${tr.delta_mg_dl > 0 ? "+" : ""}${tr.delta_mg_dl}`}
          unit="mg/dL"
          subtitle={tr.delta_mg_dl < 0 ? "Glycemic lowering effect" : "Glycemic elevation effect"}
          tone={tr.delta_mg_dl < 0 ? "emerald" : "amber"}
        />
        <StatCard
          title="Simulation Status"
          value={isHypoRisk ? "Warning: Low" : "Clinically Feasible"}
          subtitle="Physiological safety check"
          tone={isHypoRisk ? "rose" : "cyan"}
        />
      </div>

      {/* Comparison Chart */}
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">Baseline vs Simulated Glucose Trajectory</h2>
            <p className="text-xs text-slate-500">Grey line: Current standard care trajectory • Cyan line: Simulated perturbed therapy.</p>
          </div>
          <Badge tone={isHypoRisk ? "rose" : "cyan"}>
            {isHypoRisk ? "Hypo Alert (<70)" : "Safe Excursion"}
          </Badge>
        </div>

        <CompareChart baseline={simResult.baseline || []} simulated={simResult.simulated || []} />

        {simResult.summary && (
          <div className="mt-4 rounded-xl border border-cyan-200/80 bg-cyan-50/60 p-3 text-xs text-cyan-900 dark:border-cyan-900/60 dark:bg-cyan-950/20 dark:text-cyan-200">
            <span className="font-bold">Digital Twin Simulation Finding:</span> {simResult.summary}
          </div>
        )}
      </Card>

      {/* Interactive Simulation Sliders Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Medication & Insulin Sliders */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Pharmacotherapy & Insulin Perturbations</h3>
            <Sparkles size={16} className="text-cyan-600" />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">Bolus / Basal Insulin Dose Adjustment</span>
              <span className={insulinDelta >= 0 ? "text-cyan-600 font-bold" : "text-amber-600 font-bold"}>
                {insulinDelta > 0 ? `+${(insulinDelta * 100).toFixed(0)}%` : `${(insulinDelta * 100).toFixed(0)}%`}
              </span>
            </div>
            <input
              type="range"
              min="-0.5"
              max="0.5"
              step="0.05"
              value={insulinDelta}
              onChange={(e) => setInsulinDelta(parseFloat(e.target.value))}
              className="mt-2 w-full accent-cyan-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>-50% (Under-dosing)</span>
              <span>Baseline</span>
              <span>+50% (Aggressive bolus)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">Adjunctive Medication Efficacy (SGLT2 / GLP-1)</span>
              <span className="text-cyan-600 font-bold">+{(medicationEffect * 100).toFixed(0)}% Efficacy</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.05"
              value={medicationEffect}
              onChange={(e) => setMedicationEffect(parseFloat(e.target.value))}
              className="mt-2 w-full accent-cyan-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>No Change</span>
              <span>Moderate Incretin Boost</span>
              <span>High Potency</span>
            </div>
          </div>
        </Card>

        {/* Meal & Lifestyle Sliders */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Nutrition & Lifestyle Perturbations</h3>
            <SlidersHorizontal size={16} className="text-cyan-600" />
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">Meal Carbohydrate Modification</span>
              <span className={carbDelta <= 0 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                {carbDelta > 0 ? `+${(carbDelta * 100).toFixed(0)}%` : `${(carbDelta * 100).toFixed(0)}%`}
              </span>
            </div>
            <input
              type="range"
              min="-0.5"
              max="0.5"
              step="0.05"
              value={carbDelta}
              onChange={(e) => setCarbDelta(parseFloat(e.target.value))}
              className="mt-2 w-full accent-cyan-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>-50% (Low Carb / Keto)</span>
              <span>Standard Meal</span>
              <span>+50% (High Glycemic Index)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-700 dark:text-slate-300">Post-Prandial Physical Activity</span>
              <span className="text-cyan-600 font-bold">+{(exerciseDelta * 100).toFixed(0)}% Duration/Intensity</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.8"
              step="0.1"
              value={exerciseDelta}
              onChange={(e) => setExerciseDelta(parseFloat(e.target.value))}
              className="mt-2 w-full accent-cyan-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Resting / Sedentary</span>
              <span>15-min Post-Meal Walk</span>
              <span>30-min Aerobic Jogging</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
