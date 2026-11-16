import { getAuthenticatedRole, getToken } from './auth';

export const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "https://smart-school-system-1-kevh.onrender.com/api")
  .replace(/\/+$/, "");
export const SIC_API_BASE = API_BASE.endsWith("/sic")
  ? API_BASE
  : `${API_BASE}/sic`;
export const PRINCIPAL_API_BASE = API_BASE.endsWith("/principal")
  ? API_BASE
  : `${API_BASE}/principal`;
export const PTSA_API_BASE = API_BASE.endsWith("/ptsa")
  ? API_BASE
  : `${API_BASE}/ptsa`;
export const DEPARTMENT_HEAD_API_BASE = `${API_BASE}/department-head`;
export const ADMIN_API_BASE = `${API_BASE}/admin`;
export const VP_ACADEMIC_API_BASE = `${API_BASE}/vp-academic`;
export const VP_ADMINISTRATION_API_BASE = API_BASE.endsWith("/vp-administration")
  ? API_BASE
  : `${API_BASE}/vp-administration`;

/**
 * Get authentication token from localStorage
 */
function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('vp_admin_token');
  }
  return null;
}

/**
 * Create API headers with authentication
 */
function createHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

/**
 * Generic API fetch wrapper with authentication
 */
async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `${API_BASE}${endpoint}`;
  const headers = createHeaders();
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  };
  
  return fetch(url, config);
}

/**
 * VP Administration API helper
 */
export const vpAdminApi = {
  get: (endpoint: string) => apiFetch(`/vp-administration${endpoint}`, { method: 'GET' }),
  post: (endpoint: string, data: any) => apiFetch(`/vp-administration${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: (endpoint: string, data: any) => apiFetch(`/vp-administration${endpoint}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (endpoint: string) => apiFetch(`/vp-administration${endpoint}`, { method: 'DELETE' }),
  request: (method: string, endpoint: string, data?: any) => {
    const config: RequestInit = { method: method.toUpperCase() };
    if (data) {
      config.body = JSON.stringify(data);
    }
    return apiFetch(`/vp-administration${endpoint}`, config);
  },
};

function financeApiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const activeRole = getAuthenticatedRole();
  const role = activeRole === 'FINANCIAL_OFFICER' ? activeRole : 'VP_ADMINISTRATION';
  const token = getToken(role);
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_BASE}/finance${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}

export const financeApi = {
  get: (endpoint: string) => financeApiFetch(endpoint, { method: 'GET' }),
  post: (endpoint: string, data: unknown) => financeApiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
};

function adminApiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const activeRole = getAuthenticatedRole();
  const token = activeRole === 'ADMIN' || activeRole === 'SUPER_ADMIN' ? getToken(activeRole) : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${ADMIN_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });
}

/**
 * Administrator (registrar) API helper
 */
export const adminApi = {
  get: (endpoint: string) => adminApiFetch(endpoint, { method: 'GET' }),
  post: (endpoint: string, data?: unknown) => adminApiFetch(endpoint, {
    method: 'POST',
    body: data === undefined ? undefined : JSON.stringify(data),
  }),
  patch: (endpoint: string, data: unknown) => adminApiFetch(endpoint, {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
};

/**
 * VP Academic API helper
 */
export const vpAcademicApi = {
  get: (endpoint: string) => apiFetch(`/vp-academic${endpoint}`, { method: 'GET' }),
  post: (endpoint: string, data: any) => apiFetch(`/vp-academic${endpoint}`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: (endpoint: string, data: any) => apiFetch(`/vp-academic${endpoint}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (endpoint: string) => apiFetch(`/vp-academic${endpoint}`, { method: 'DELETE' }),
  request: (method: string, endpoint: string, data?: any) => {
    const config: RequestInit = { method: method.toUpperCase() };
    if (data) {
      config.body = JSON.stringify(data);
    }
    return apiFetch(`/vp-academic${endpoint}`, config);
  },
};

export default apiFetch;
