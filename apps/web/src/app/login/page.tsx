"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setSession } from "@/lib/api";
import { Button, Card, Input } from "@/components/ui";
import Link from "next/link";

const demos = [
  { email: "patient@digitwin.health", label: "Patient" },
  { email: "doctor@digitwin.health", label: "Doctor" },
  { email: "admin@digitwin.health", label: "Admin" },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("patient@digitwin.health");
  const [password, setPassword] = useState("Demo1234!");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await api<any>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      setSession(data);
      router.push("/app");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-slate-100 p-4 dark:bg-slate-950">
      <Card className="w-full max-w-md">
        <h1 className="text-xl font-bold">Sign in to DigiTwin</h1>
        <p className="mt-1 text-sm text-slate-500">Use a demo role or your account. Password for demos: Demo1234!</p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
          <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password" />
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <Button disabled={loading} className="w-full">
            {loading ? "Signing in…" : "Continue"}
          </Button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          {demos.map((d) => (
            <button key={d.email} className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800" onClick={() => setEmail(d.email)}>
              {d.label}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-slate-500">
          No account? <Link href="/signup" className="text-cyan-700">Create one</Link>
        </p>
      </Card>
    </div>
  );
}
