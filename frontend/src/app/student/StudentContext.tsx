"use client";

import { createContext, useContext } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

type StudentContextType = {
  token: string;
  profile: any;
  authFetch: (path: string, options?: RequestInit) => Promise<any>;
  logout: () => void;
  refreshProfile: () => void;
};

const defaultContext: StudentContextType = {
  token: "",
  profile: null,
  authFetch: async (path: string, options?: RequestInit) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const stored = typeof window !== "undefined" ? localStorage.getItem("student_token") : null;
    if (stored) headers.Authorization = `Bearer ${stored}`;
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...options,
      headers,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || "Request failed");
    }
    return response.json();
  },
  logout: () => {},
  refreshProfile: () => {},
};

export const StudentContext = createContext<StudentContextType>(defaultContext);

export function useStudent() {
  return useContext(StudentContext);
}

export function authHeaders(token: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export { BACKEND_URL };
