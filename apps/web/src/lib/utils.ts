import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PRODUCTION_API_URL = "https://digital-twin-health-production.up.railway.app";

function getApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) {
    if (typeof window !== "undefined" && window.location.hostname === "localhost") {
      return "http://localhost:8000";
    }
    return PRODUCTION_API_URL;
  }
  let url = raw.trim();
  if (url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://")) {
    return url.replace(/\/+$/, "");
  }
  return `https://${url}`.replace(/\/+$/, "");
}

export const API_URL = getApiUrl();
