"use client";

import React, { useCallback, useEffect, useState } from "react";
import { KeyRound, Power } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { adminTranslations } from "@/translations/admin";
import { AdminUser, ROLE_BADGE_STYLES, DEFAULT_ROLE_BADGE_STYLE, cardClass, formatRole, readError, userDetails } from "../shared";

const ROLE_FILTERS = [
  "STUDENT",
  "TEACHER",
  "PARENT",
  "PRINCIPAL",
  "VP_ACADEMIC",
  "VP_ADMINISTRATION",
  "DEPARTMENT_HEAD",
  "PTSA_REPRESENTATIVE",
  "SIC_MEMBER",
  "FINANCIAL_OFFICER",
  "ADMIN",
  "SUPER_ADMIN",
];

const filterClass =
  "rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 focus:border-teal-500 focus:outline-none";

export default function AdminUsersPage() {
  const { language } = useLanguage();
  const t = adminTranslations[language];
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [resetResult, setResetResult] = useState<{ name: string; password: string } | null>(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      const query = params.toString();
      const res = await adminApi.get(`/users${query ? `?${query}` : ""}`);
      if (!res.ok) {
        setError(await readError(res, t.requestFailed));
        return;
      }
      setUsers(await res.json());
    } catch {
      setError(t.requestFailed);
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, t.requestFailed]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  async function toggleStatus(user: AdminUser) {
    setBusyUserId(user.user_id);
    setError("");
    try {
      const res = await adminApi.patch(`/users/${user.user_id}/status`, { is_active: !user.is_active });
      if (!res.ok) {
        setError(await readError(res, t.requestFailed));
        return;
      }
      setUsers((prev) => prev.map((u) => (u.user_id === user.user_id ? { ...u, is_active: !u.is_active } : u)));
    } catch {
      setError(t.requestFailed);
    } finally {
      setBusyUserId(null);
    }
  }

  async function resetPassword(user: AdminUser) {
    if (!window.confirm(`${t.confirmResetPassword}\n${user.full_name} (${user.email})`)) return;
    setBusyUserId(user.user_id);
    setError("");
    try {
      const res = await adminApi.post(`/users/${user.user_id}/reset-password`);
      if (!res.ok) {
        setError(await readError(res, t.requestFailed));
        return;
      }
      const data = await res.json();
      setResetResult({ name: user.full_name, password: data.password });
    } catch {
      setError(t.requestFailed);
    } finally {
      setBusyUserId(null);
    }
  }

  const query = search.trim().toLowerCase();
  const filteredUsers = query
    ? users.filter((u) =>
        [u.full_name, u.email, u.student_number, u.teacher_employee_id]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query))
      )
    : users;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.usersTitle}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.usersSubtitle}</p>
      </div>

      {resetResult && (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          <span>
            {t.newPasswordFor} <strong>{resetResult.name}</strong>: <code className="font-mono font-semibold">{resetResult.password}</code>
          </span>
          <button onClick={() => setResetResult(null)} className="ml-auto text-xs font-semibold underline">{t.dismiss}</button>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div>
      )}

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder={t.searchUsers}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className={filterClass}>
          <option value="">{t.allRoles}</option>
          {ROLE_FILTERS.map((r) => <option key={r} value={r}>{formatRole(r)}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={filterClass}>
          <option value="">{t.allStatuses}</option>
          <option value="active">{t.active}</option>
          <option value="inactive">{t.inactive}</option>
        </select>
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 dark:border-teal-400 border-t-transparent" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="p-12 text-center text-sm text-slate-400 dark:text-slate-500">{t.noUsersFound}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                  <th className="px-6 py-4">{t.name}</th>
                  <th className="px-6 py-4">{t.role}</th>
                  <th className="px-6 py-4">{t.details}</th>
                  <th className="px-6 py-4">{t.status}</th>
                  <th className="px-6 py-4">{t.registered}</th>
                  <th className="px-6 py-4 text-right">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-slate-900 dark:text-white">{user.full_name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE_STYLES[user.role] || DEFAULT_ROLE_BADGE_STYLE}`}>
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{userDetails(user) || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        user.is_active
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
                      }`}>
                        {user.is_active ? t.active : t.inactive}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{new Date(user.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => toggleStatus(user)}
                          disabled={busyUserId === user.user_id}
                          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                            user.is_active
                              ? "border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/30"
                              : "border-emerald-200 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                          }`}
                        >
                          <Power className="h-3.5 w-3.5" />
                          {user.is_active ? t.deactivate : t.activate}
                        </button>
                        <button
                          onClick={() => resetPassword(user)}
                          disabled={busyUserId === user.user_id}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          {t.resetPassword}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
