"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Activity, ArrowRight, Brain, Cpu, Database, HeartPulse, MessageSquare, Play, Shield, SlidersHorizontal, Sparkles, Waves } from "lucide-react";
import { Badge, Button } from "@/components/ui";

const pillars = [
  {
    icon: Brain,
    title: "Hybrid Digital Twin",
    badge: "Physiology + GRU",
    body: "Bergman minimal model differential equations fused with deep Gated Recurrent Units for personalized glycemic metabolism.",
  },
  {
    icon: Activity,
    title: "Multi-Horizon Glucose Prediction",
    badge: "30m to 6h",
    body: "Primary GRU vs secondary LSTM model benchmarking across 6 forecast horizons with RMSE, MAE, MAPE, and R² scores.",
  },
  {
    icon: Waves,
    title: "CBC Hematology Intelligence",
    badge: "XGBoost",
    body: "10-parameter blood panel evaluation quantifying anemia, leukocytic infection, bleeding risk, and systemic inflammation.",
  },
  {
    icon: HeartPulse,
    title: "ECG Arrhythmia Classifier",
    badge: "1D CNN + BiLSTM",
    body: "Real-time Lead II cardiac rhythm analysis detecting Afib, bradycardia, tachycardia, long QT, and ST elevation/depression.",
  },
  {
    icon: Shield,
    title: "Multi-Disease Risk & SHAP",
    badge: "Ensemble AI",
    body: "Tri-model ensemble (XGBoost, Random Forest, LightGBM) with visual SHAP feature attributions detailing risk drivers.",
  },
  {
    icon: SlidersHorizontal,
    title: "What-If Treatment Simulation",
    badge: "Interactive ODE",
    body: "Perturb insulin, carbohydrates, exercise bouts, and SGLT2/GLP-1 therapies to simulate trajectories before prescription.",
  },
  {
    icon: MessageSquare,
    title: "AI Clinical Assistant",
    badge: "Grounded RAG",
    body: "Retrieval-augmented conversational agent citing ADA, AHA, and WHO clinical consensus guidelines with telemetry context.",
  },
  {
    icon: Database,
    title: "Supabase & Audit Governance",
    badge: "PostgreSQL RLS",
    body: "18 relational tables, Row-Level Security, immutable HIPAA audit logging, and automated CI/CD for global cloud deployment.",
  },
];

export default function LandingPage() {
  return (
    <div className="grid-bg min-h-screen">
      {/* Header Navigation */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-600 text-white shadow-soft">DT</span>
          DigiTwin Health
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-semibold text-slate-600 hover:text-cyan-600 dark:text-slate-300">
            Sign In
          </Link>
          <Link href="/login">
            <Button>Launch Clinical Demo</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-12">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50/80 px-3 py-1 text-xs font-semibold text-cyan-800 dark:border-cyan-900/60 dark:bg-cyan-950/40 dark:text-cyan-200">
            <Sparkles size={13} className="text-cyan-600" /> Production AI-Powered Digital Twin Healthcare Platform
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl md:text-7xl">
            Personalized metabolic care,{" "}
            <span className="bg-gradient-to-r from-cyan-600 to-indigo-600 bg-clip-text text-transparent">
              simulated before prescribed.
            </span>
          </h1>
          <p className="mt-6 max-w-3xl text-lg text-slate-600 dark:text-slate-300">
            A production-grade digital twin architecture uniting continuous glucose monitoring (CGM), physiological minimal models, deep recurrent sequence networks (GRU/LSTM), 1D CNN+BiLSTM cardiac analytics, and what-if treatment simulation.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link href="/login">
              <Button className="px-6 py-3 text-base">
                <Play size={16} /> Open Clinical Workspace
              </Button>
            </Link>
            <Link href="/signup">
              <Button variant="outline" className="px-6 py-3 text-base">
                Create Patient Account
              </Button>
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-1">✓ Next.js 15 App Router</span>
            <span className="flex items-center gap-1">✓ FastAPI Python 3.12</span>
            <span className="flex items-center gap-1">✓ Supabase PostgreSQL</span>
            <span className="flex items-center gap-1">✓ Auto CI/CD Vercel & Railway</span>
          </div>
        </motion.div>

        {/* Feature Pillars Grid */}
        <div className="mt-20">
          <div className="mb-8 flex flex-col justify-between md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-cyan-700">Clinical AI Stack</p>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
                End-to-End Precision Health Intelligence
              </h2>
            </div>
            <p className="mt-2 text-xs text-slate-500 md:mt-0 max-w-md">
              Engineered for real-world clinical decision support, final-year AIML capstone defense, and commercial SaaS validation.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-2xl border border-slate-200/90 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:border-cyan-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400">
                      <Icon size={20} />
                    </div>
                    <Badge tone="cyan">{p.badge}</Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white">{p.title}</h3>
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{p.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Deployment Footnote Banner */}
        <div className="mt-16 rounded-2xl border border-slate-200 bg-slate-50/70 p-6 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Ready for Global Production Deployment</p>
              <p className="text-xs text-slate-500">Frontend auto-deployed to Vercel • Backend API auto-deployed to Railway • PostgreSQL on Supabase.</p>
            </div>
            <Link href="/login">
              <Button className="text-xs whitespace-nowrap">
                Explore Demo Roles <ArrowRight size={14} />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
