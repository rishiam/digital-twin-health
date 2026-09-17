import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getApiUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return "http://localhost:8000";
  let url = raw.trim();
  if (url.startsWith("/") || url.startsWith("http://") || url.startsWith("https://")) {
    return url.replace(/\/+$/, "");
  }
  return `https://${url}`.replace(/\/+$/, "");
}

export const API_URL = getApiUrl();
