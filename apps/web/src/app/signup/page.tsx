"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setSession } from "@/lib/api";
import { Button, Card, Input, Select } from "@/components/ui";

export default function SignupPage() {
  const router = useRouter();
  const [full_name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<any>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({ full_name, email, password, role }),
      });
      setSession(data);
      router.push("/app");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-md">
        <div className="flex items-center gap-2 mb-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-cyan-600 text-white font-bold text-sm">DT</span>
          <span className="font-bold text-lg text-slate-900 dark:text-white">DigiTwin Health</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Create your clinical account</h1>
        <p className="mt-1 text-xs text-slate-500">Sign up to provision your personalized physiological digital twin.</p>
        
        <form onSubmit={submit} className="mt-6 space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
            <Input value={full_name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Jordan Hale" required className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.com" type="email" required className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Password (minimum 8 characters)</label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" type="password" required className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Account Role</label>
            <Select value={role} onChange={(e) => setRole(e.target.value)} className="mt-1">
              <option value="patient">Patient (Personal Digital Twin)</option>
              <option value="doctor">Doctor / Clinician (Care Team)</option>
            </Select>
          </div>

          {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
          <Button disabled={loading} className="w-full mt-2">
            {loading ? "Provisioning Twin…" : "Create Account & Start"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-cyan-600 hover:text-cyan-700">
            Sign in here
          </Link>
        </p>
      </Card>
    </div>
  );
}
