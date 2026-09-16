import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "outline" | "danger" }) {
  const variants = {
    primary: "bg-cyan-600 text-white hover:bg-cyan-700 shadow-sm",
    secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700",
    outline: "border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800",
    danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-sm",
  };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition dark:border-slate-800 dark:bg-slate-900", className)}>
      {children}
    </div>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none ring-cyan-500 transition focus:border-cyan-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100",
        className
      )}
      {...props}
    />
  );
}

export function Badge({ children, tone = "cyan" }: { children: React.ReactNode; tone?: "cyan" | "amber" | "rose" | "emerald" | "slate" | "indigo" }) {
  const map = {
    cyan: "bg-cyan-50 text-cyan-800 border-cyan-200/60 dark:bg-cyan-950/70 dark:text-cyan-200 dark:border-cyan-800",
    amber: "bg-amber-50 text-amber-800 border-amber-200/60 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-800",
    rose: "bg-rose-50 text-rose-800 border-rose-200/60 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-800",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200/60 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-800",
    slate: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
    indigo: "bg-indigo-50 text-indigo-800 border-indigo-200/60 dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-800",
  };
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", map[tone])}>{children}</span>;
}

export function StatCard({
  title,
  value,
  unit,
  subtitle,
  tone = "cyan",
}: {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  tone?: "cyan" | "emerald" | "amber" | "rose" | "indigo" | "slate";
}) {
  const ringMap = {
    cyan: "border-l-4 border-l-cyan-500",
    emerald: "border-l-4 border-l-emerald-500",
    amber: "border-l-4 border-l-amber-500",
    rose: "border-l-4 border-l-rose-500",
    indigo: "border-l-4 border-l-indigo-500",
    slate: "border-l-4 border-l-slate-400",
  };
  return (
    <Card className={cn("flex flex-col justify-between", ringMap[tone])}>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <div className="my-2 flex items-baseline gap-1.5">
        <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</span>
        {unit && <span className="text-sm font-medium text-slate-500">{unit}</span>}
      </div>
      {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </Card>
  );
}

export function ProgressBar({ value, max = 100, tone = "cyan" }: { value: number; max?: number; tone?: "cyan" | "emerald" | "amber" | "rose" }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const colorMap = {
    cyan: "bg-cyan-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
      <div className={cn("h-full transition-all duration-300", colorMap[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}
