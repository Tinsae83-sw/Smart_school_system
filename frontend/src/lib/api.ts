const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

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

export default apiFetch;
