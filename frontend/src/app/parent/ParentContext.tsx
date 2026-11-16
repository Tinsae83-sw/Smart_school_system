"use client";

import { createContext, useContext } from "react";

const DEFAULT_BACKEND_URL = "https://smart-school-system-1-kevh.onrender.com";
export const BACKEND_URL = (process.env.NEXT_PUBLIC_API_BASE || DEFAULT_BACKEND_URL)
  .replace(/\/api\/?$/, "")
  .replace(/\/+$/, "");

export function resolveBackendUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${BACKEND_URL}${normalizedPath.startsWith("/api") ? normalizedPath : `/api${normalizedPath}`}`;
}

type ParentContextType = {
  token: string;
  profile: any;
  children: any[];
  selectedChildId: number | null;
  setSelectedChildId: (id: number | null) => void;
  selectedChild: any;
  authFetch: (path: string, options?: RequestInit) => Promise<any>;
  logout: () => void;
  refreshProfile: () => void;
};

const defaultContext: ParentContextType = {
  token: "",
  profile: null,
  children: [],
  selectedChildId: null,
  setSelectedChildId: () => {},
  selectedChild: null,
  authFetch: async () => {},
  logout: () => {},
  refreshProfile: () => {},
};

export const ParentContext = createContext<ParentContextType>(defaultContext);

export function useParent() {
  return useContext(ParentContext);
}

export function authHeaders(token: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export { BACKEND_URL };
