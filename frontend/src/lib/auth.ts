/**
 * Authentication utilities for role-based access control
 */

export type UserRole = 
  | 'STUDENT'
  | 'TEACHER'
  | 'PARENT'
  | 'PRINCIPAL'
  | 'VP_ACADEMIC'
  | 'VP_ADMINISTRATION'
  | 'DEPARTMENT_HEAD'
  | 'PTSA_REPRESENTATIVE'
  | 'SIC_MEMBER'
  | 'ADMIN';

export interface AuthConfig {
  tokenKey: string;
  userKey: string;
  loginPath: string;
  dashboardPath: string;
}

export const AUTH_CONFIGS: Record<UserRole, AuthConfig> = {
  STUDENT: {
    tokenKey: 'student_token',
    userKey: 'student_name',
    loginPath: '/student/login',
    dashboardPath: '/student',
  },
  TEACHER: {
    tokenKey: 'teacher_token',
    userKey: 'teacher_name',
    loginPath: '/login',
    dashboardPath: '/teacher',
  },
  PARENT: {
    tokenKey: 'parent_token',
    userKey: 'parent_name',
    loginPath: '/parent/login',
    dashboardPath: '/parent',
  },
  PRINCIPAL: {
    tokenKey: 'principal_token',
    userKey: 'principal_user',
    loginPath: '/principal/login',
    dashboardPath: '/principal',
  },
  VP_ACADEMIC: {
    tokenKey: 'vp_academic_token',
    userKey: 'vp_academic_user',
    loginPath: '/vp-academic/login',
    dashboardPath: '/vp-academic',
  },
  VP_ADMINISTRATION: {
    tokenKey: 'vp_admin_token',
    userKey: 'vp_admin_user',
    loginPath: '/vp-administration/login',
    dashboardPath: '/vp-administration',
  },
  DEPARTMENT_HEAD: {
    tokenKey: 'dept_head_token',
    userKey: 'dept_head_user',
    loginPath: '/department-head/login',
    dashboardPath: '/department-head',
  },
  PTSA_REPRESENTATIVE: {
    tokenKey: 'ptsa_rep_token',
    userKey: 'ptsa_rep_user',
    loginPath: '/ptsa-representative/login',
    dashboardPath: '/ptsa-representative',
  },
  SIC_MEMBER: {
    tokenKey: 'sic_member_token',
    userKey: 'sic_member_user',
    loginPath: '/sic-member/login',
    dashboardPath: '/sic-member',
  },
  ADMIN: {
    tokenKey: 'admin_token',
    userKey: 'admin_user',
    loginPath: '/admin/login',
    dashboardPath: '/admin',
  },
};

/**
 * Read auth data from both localStorage and sessionStorage for a specific role.
 */
function getStorageValue(key: string): string | null {
  if (typeof window === 'undefined') return null;

  const fromLocal = window.localStorage.getItem(key);
  if (fromLocal) return fromLocal;

  return window.sessionStorage.getItem(key);
}

function setStorageValue(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, value);
  window.sessionStorage.setItem(key, value);
}

function removeStorageValue(key: string): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}

/**
 * Get authentication token from storage for a specific role
 */
export function getToken(role: UserRole): string | null {
  const config = AUTH_CONFIGS[role];
  return getStorageValue(config.tokenKey);
}

/**
 * Get user data from storage for a specific role
 */
export function getUser(role: UserRole): any {
  if (typeof window === 'undefined') return null;
  const config = AUTH_CONFIGS[role];
  const userStr = getStorageValue(config.userKey);
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return userStr; // Return as string if not JSON
  }
}

/**
 * Check if user is authenticated for a specific role
 */
export function isAuthenticated(role: UserRole): boolean {
  return getToken(role) !== null;
}

/**
 * Get the first authenticated role from localStorage
 */
export function getAuthenticatedRole(): UserRole | null {
  for (const role of Object.keys(AUTH_CONFIGS) as UserRole[]) {
    if (isAuthenticated(role)) {
      return role;
    }
  }
  return null;
}

/**
 * Clear authentication data for a specific role
 */
export function clearAuth(role: UserRole): void {
  if (typeof window === 'undefined') return;
  const config = AUTH_CONFIGS[role];
  removeStorageValue(config.tokenKey);
  removeStorageValue(config.userKey);
}

/**
 * Store authentication data for a specific role
 */
export function setAuth(role: UserRole, token: string, user: any): void {
  if (typeof window === 'undefined') return;
  
  // Clear all existing auth data before setting new auth
  clearAllAuth();
  
  const config = AUTH_CONFIGS[role];
  setStorageValue(config.tokenKey, token);
  if (typeof user === 'object') {
    setStorageValue(config.userKey, JSON.stringify(user));
  } else {
    setStorageValue(config.userKey, user);
  }
}

/**
 * Clear all authentication data for all roles
 */
export function clearAllAuth(): void {
  if (typeof window === 'undefined') return;
  Object.values(AUTH_CONFIGS).forEach(config => {
    removeStorageValue(config.tokenKey);
    removeStorageValue(config.userKey);
  });
}

/**
 * Get redirect path based on authenticated role
 */
export function getRedirectPath(): string {
  const role = getAuthenticatedRole();
  if (!role) return '/login';
  return AUTH_CONFIGS[role].dashboardPath;
}
