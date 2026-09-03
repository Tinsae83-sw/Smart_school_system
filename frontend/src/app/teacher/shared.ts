import { clearAuth } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export async function authFetch(url: string, options: RequestInit = {}, token: string) {
  const response = await fetch(`${BACKEND_URL}${url}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuth('TEACHER');
      window.location.href = "/login";
      throw new Error("Unauthorized");
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
