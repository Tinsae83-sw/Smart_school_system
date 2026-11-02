"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

type DashboardData = {
  total_students: number;
  new_this_year: number;
  new_this_month: number;
  classes: number;
  by_class: Array<{ class_name: string; students: number }>;
  recent_registrations: Array<{
    student_id: number;
    student_number: string;
    full_name: string;
    email: string | null;
    is_active: boolean;
    class_name: string;
    enrollment_date: string;
  }>;
};

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("registration_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function RegistrationDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${API}/registration/dashboard`, { headers: authHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        setData(await res.json());
      } catch (e) {
        console.error(e);
        setError("Unable to load registration dashboard. Check backend connection.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = [
    { label: "Total Students", value: data?.total_students ?? 0, color: "bg-navy-50 dark:bg-navy-900/30 text-navy-600 dark:text-navy-400" },
    { label: "New This Year", value: data?.new_this_year ?? 0, color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
    { label: "New This Month", value: data?.new_this_month ?? 0, color: "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" },
    { label: "Classes", value: data?.classes ?? 0, color: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Registration Office</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Enrol new students and manage the student register.
          </p>
        </div>
        <Link
          href="/registration/students/new"
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition"
        >
          + Register Student
        </Link>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{s.label}</p>
            <p className={`mt-2 inline-flex items-center justify-center rounded-xl px-3 py-2 text-2xl font-bold ${s.color}`}>
              {loading ? "…" : s.value}
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Recent Registrations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <th className="px-5 py-3">Student</th>
                  <th className="px-5 py-3">Number</th>
                  <th className="px-5 py-3">Class</th>
                  <th className="px-5 py-3">Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={4} className="px-5 py-6 text-slate-500">Loading…</td></tr>
                )}
                {!loading && (data?.recent_registrations.length ?? 0) === 0 && (
                  <tr><td colSpan={4} className="px-5 py-6 text-slate-500">No students registered yet.</td></tr>
                )}
                {!loading &&
                  data?.recent_registrations.map((s) => (
                    <tr key={s.student_id} className="border-t border-slate-100 dark:border-slate-700">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{s.full_name}</p>
                        <p className="text-xs text-slate-500">{s.email}</p>
                      </td>
                      <td className="px-5 py-3 font-mono text-xs">{s.student_number}</td>
                      <td className="px-5 py-3">{s.class_name}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {new Date(s.enrollment_date).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="border-b border-slate-200 dark:border-slate-700 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Students per Class</h2>
          </div>
          <div className="p-5 space-y-3">
            {loading && <p className="text-sm text-slate-500">Loading…</p>}
            {!loading && (data?.by_class.length ?? 0) === 0 && (
              <p className="text-sm text-slate-500">No classes yet.</p>
            )}
            {data?.by_class.map((c) => {
              const max = Math.max(...(data?.by_class.map((x) => x.students) || [1]), 1);
              return (
                <div key={c.class_name}>
                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300">
                    <span>{c.class_name}</span>
                    <span className="font-semibold">{c.students}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className="h-2 rounded-full bg-teal-500"
                      style={{ width: `${Math.round((c.students / max) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
