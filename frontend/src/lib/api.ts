import { getToken } from "./auth";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export interface ApiFetchOptions extends RequestInit {
  token?: string | null;
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { token, ...rest } = options;
  const headers = new Headers(rest.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (rest.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const url = path.startsWith("http://") || path.startsWith("https://")
    ? path
    : `${API_BASE}${path}`;

  const res = await fetch(url, { ...rest, headers });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) message = data.error;
    } catch {
      /* ignore body parse errors */
    }
    throw new Error(message);
  }

  return res.json();
}

export function tokenFor(role: Parameters<typeof getToken>[0]) {
  return getToken(role);
}

export function createRoleApi(role: Parameters<typeof getToken>[0], basePath: string) {
  return {
    get: (path: string, options: ApiFetchOptions = {}) =>
      apiFetch(`${basePath}${path}`, { ...options, token: getToken(role) }),
    post: (path: string, body?: unknown, options: ApiFetchOptions = {}) =>
      apiFetch(`${basePath}${path}`, {
        ...options,
        token: getToken(role),
        method: "POST",
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
    put: (path: string, body?: unknown, options: ApiFetchOptions = {}) =>
      apiFetch(`${basePath}${path}`, {
        ...options,
        token: getToken(role),
        method: "PUT",
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
    patch: (path: string, body?: unknown, options: ApiFetchOptions = {}) =>
      apiFetch(`${basePath}${path}`, {
        ...options,
        token: getToken(role),
        method: "PATCH",
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      }),
    delete: (path: string, options: ApiFetchOptions = {}) =>
      apiFetch(`${basePath}${path}`, { ...options, token: getToken(role), method: "DELETE" }),
    request: (method: string, path: string, body?: unknown) => {
      const m = String(method).toUpperCase();
      const opts: ApiFetchOptions = { token: getToken(role), method: m };
      if (body !== undefined) opts.body = JSON.stringify(body);
      return apiFetch(`${basePath}${path}`, opts);
    },
  };
}

export const vpAdminApi = createRoleApi("VP_ADMINISTRATION", "/api/vp-administration");

export function authFetchFor(role: Parameters<typeof getToken>[0]) {
  return (path: string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const token = getToken(role);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const fullUrl = path.startsWith("http") ? path : `${API_BASE}${path}`;
    return fetch(fullUrl, { ...init, headers });
  };
}