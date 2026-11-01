import { clearAuth } from "@/lib/auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export class ApiError extends Error {
  status: number;
  statusText: string;

  constructor(message: string, status: number, statusText: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.statusText = statusText;
  }
}

export interface Toast {
  text: string;
  type: "success" | "error" | "info";
}

/**
 * Unified auth fetch for all teacher API calls.
 * Handles 401 → redirect to login automatically.
 * Supports all HTTP methods (GET, POST, PUT, DELETE) and multipart/form-data uploads.
 */
export async function authFetch<T = any>(
  url: string,
  options: RequestInit = {},
  token: string
): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
  };

  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url}`;

  const response = await fetch(fullUrl, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuth("TEACHER");
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new ApiError("Unauthorized — session expired", 401, "Unauthorized");
  }

  if (!response.ok) {
    let errorMessage = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errBody = await response.json();
      if (errBody?.details && Array.isArray(errBody.details)) {
        errorMessage = errBody.details.join(" | ");
      } else {
        errorMessage = errBody?.error || errBody?.message || errorMessage;
      }
    } catch {
      // response body not JSON — keep default message
    }
    throw new ApiError(errorMessage, response.status, response.statusText);
  }

  // Handle empty responses (e.g., 204 No Content)
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    return null as T;
  }

  return response.json();
}

// Convenient helper wrappers on authFetch
authFetch.get = <T = any>(url: string, token: string, options: RequestInit = {}) =>
  authFetch<T>(url, { ...options, method: "GET" }, token);

authFetch.post = <T = any>(url: string, body: any, token: string, options: RequestInit = {}) =>
  authFetch<T>(
    url,
    {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : JSON.stringify(body),
    },
    token
  );

authFetch.put = <T = any>(url: string, body: any, token: string, options: RequestInit = {}) =>
  authFetch<T>(
    url,
    {
      ...options,
      method: "PUT",
      body: body instanceof FormData ? body : JSON.stringify(body),
    },
    token
  );

authFetch.delete = <T = any>(url: string, token: string, options: RequestInit = {}) =>
  authFetch<T>(url, { ...options, method: "DELETE" }, token);

authFetch.upload = <T = any>(url: string, formData: FormData, token: string, options: RequestInit = {}) =>
  authFetch<T>(url, { ...options, method: "POST", body: formData }, token);

/**
 * Format a Date object or ISO string to YYYY-MM-DD
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString().split("T")[0];
}

/**
 * Format a date for display (e.g., "Oct 29, 2026")
 */
export function formatDisplayDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date/time for display (e.g., "Oct 29, 2026, 10:30 AM")
 */
export function formatDisplayDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Check if a date string is today or in the past
 */
export function isPastDate(dateStr: string): boolean {
  return new Date(dateStr) < new Date();
}

/**
 * Compute letter grade from a numeric score and max score
 */
export function computeLetterGrade(score: number, maxScore: number = 100): string {
  if (maxScore <= 0) return "F";
  const pct = (score / maxScore) * 100;
  if (pct >= 90) return "A";
  if (pct >= 80) return "B";
  if (pct >= 70) return "C";
  if (pct >= 60) return "D";
  return "F";
}

/**
 * Toast notification helper — returns a short-lived message object
 */
export function makeToast(
  text: string,
  type: "success" | "error" | "info" = "info"
): Toast {
  return { text, type };
}
