"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { GraduationCap, UserRound, Users, UserX, UserPlus, Link2, ChevronRight } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { adminTranslations } from "@/translations/admin";
import { AdminUser, ROLE_BADGE_STYLES, DEFAULT_ROLE_BADGE_STYLE, cardClass, formatRole, readError } from "./shared";

export default function AdminDashboardPage() {
  const { language } = useLanguage();
  const t = adminTranslations[language];
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await adminApi.get("/users");
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
    }
    load();
  }, [t.requestFailed]);

  const countByRole = (role: string) => users.filter((u) => u.role === role).length;

  const stats = [
    { label: t.totalStudents, value: countByRole("STUDENT"), icon: GraduationCap, color: "orange" },
    { label: t.totalTeachers, value: countByRole("TEACHER"), icon: Users, color: "teal" },
    { label: t.totalParents, value: countByRole("PARENT"), icon: UserRound, color: "blue" },
    { label: t.inactiveAccounts, value: users.filter((u) => !u.is_active).length, icon: UserX, color: "rose" },
  ];

  const statColors: Record<string, { text: string; bg: string }> = {
    orange: { text: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30" },
    teal: { text: "text-teal-600 dark:text-teal-400", bg: "bg-teal-100 dark:bg-teal-900/30" },
    blue: { text: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100 dark:bg-blue-900/30" },
    rose: { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-900/30" },
  };

  const quickActions = [
    { label: t.registerStudent, href: "/admin/register?role=STUDENT", icon: GraduationCap },
    { label: t.registerTeacher, href: "/admin/register?role=TEACHER", icon: Users },
    { label: t.registerParent, href: "/admin/register?role=PARENT", icon: UserPlus },
    { label: t.linkParentToStudent, href: "/admin/link-parent", icon: Link2 },
    { label: t.manageAccounts, href: "/admin/users", icon: UserRound },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.dashboardTitle}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.dashboardSubtitle}</p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colors = statColors[stat.color];
          return (
            <div key={stat.label} className={`${cardClass} p-6`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
                  <p className={`text-2xl font-bold mt-1 ${colors.text}`}>{loading ? "—" : stat.value}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${colors.bg}`}>
                  <Icon className={`h-6 w-6 ${colors.text}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className={`${cardClass} p-6`}>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t.quickActions}</h2>
          <div className="space-y-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-900/30 hover:text-teal-700 dark:hover:text-teal-300 transition-colors"
                >
                  <Icon className="h-5 w-5 text-teal-600 dark:text-teal-400" strokeWidth={1.5} />
                  <span className="flex-1">{action.label}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </Link>
              );
            })}
          </div>
        </div>

        <div className={`${cardClass} overflow-hidden lg:col-span-2`}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.recentRegistrations}</h2>
            <Link href="/admin/users" className="text-sm font-medium text-teal-600 dark:text-teal-400 hover:underline">{t.viewAll}</Link>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 dark:border-teal-400 border-t-transparent" />
            </div>
          ) : users.length === 0 ? (
            <p className="p-12 text-center text-sm text-slate-400 dark:text-slate-500">{t.noUsersFound}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    <th className="px-6 py-3">{t.name}</th>
                    <th className="px-6 py-3">{t.role}</th>
                    <th className="px-6 py-3">{t.registered}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {users.slice(0, 6).map((user) => (
                    <tr key={user.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{user.full_name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                      </td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_BADGE_STYLES[user.role] || DEFAULT_ROLE_BADGE_STYLE}`}>
                          {formatRole(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-sm text-slate-600 dark:text-slate-400">{new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
