"use client";

import { API_URL } from "./utils";

const TOKEN_KEY = "digitwin_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(data: { access_token: string; role: string; full_name: string; email: string; patient_id?: string | null }) {
  localStorage.setItem(TOKEN_KEY, data.access_token);
  localStorage.setItem("digitwin_user", JSON.stringify(data));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("digitwin_user");
}

export function getUser() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("digitwin_user");
  return raw ? JSON.parse(raw) : null;
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export const mockDashboard = {
  patient_id: "demo",
  profile: { age: 46, weight_kg: 78.4, hba1c: 7.4, diabetes_type: "type2", bmi: 27.8 },
  kpis: {
    current_glucose: 142,
    mean_glucose: 148.2,
    time_in_range: 71.4,
    time_below_range: 3.2,
    time_above_range: 25.4,
    gmi: 6.85,
  },
  cgm: Array.from({ length: 72 }, (_, i) => ({
    t: new Date(Date.now() - (71 - i) * 20 * 60000).toISOString(),
    glucose: Math.round(120 + 30 * Math.sin(i / 8) + (i % 11 === 0 ? 35 : 0)),
    trend: "flat",
  })),
  alerts: [
    { id: "1", severity: "moderate", title: "Post-prandial excursion", message: "Glucose rose above 180 mg/dL after lunch." },
  ],
  recommendations: [
    { id: "1", title: "Flatten the lunch spike", body: "Walk 10 minutes after meals and pair carbs with protein.", priority: "high" },
  ],
};
