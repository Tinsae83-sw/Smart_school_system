export type AdminUser = {
  user_id: number;
  full_name: string;
  email: string;
  phone_number?: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
  teacher_employee_id?: string | null;
  teacher_department?: string | null;
  student_number?: string | null;
  current_class_name?: string | null;
  parent_relationship?: string | null;
};

export const ROLE_BADGE_STYLES: Record<string, string> = {
  STUDENT: "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  TEACHER: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300",
  PARENT: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

export const DEFAULT_ROLE_BADGE_STYLE = "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300";

export function formatRole(role: string): string {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function userDetails(user: AdminUser): string {
  if (user.role === "STUDENT") {
    return [user.student_number, user.current_class_name].filter(Boolean).join(" · ");
  }
  if (user.role === "TEACHER") {
    return [user.teacher_employee_id, user.teacher_department].filter(Boolean).join(" · ");
  }
  if (user.role === "PARENT") {
    return user.parent_relationship || "";
  }
  return "";
}

export async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json();
    return payload.error || payload.message || fallback;
  } catch {
    return fallback;
  }
}

export const inputClass =
  "mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500";

export const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";

export const cardClass =
  "rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700";
