"use client";

import { createContext, useContext } from "react";

const BACKEND_URL = "http://localhost:5000";

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
