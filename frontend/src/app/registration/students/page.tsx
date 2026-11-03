"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

type StudentRow = {
  student_id: number;
  student_number: string;
  full_name: string;
  email: string | null;
  is_active: boolean;
  class_name: string;
  enrollment_date: string;
  gender: string | null;
};

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("registration_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function StudentRegisterPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(pageNum: number, term: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(pageNum), limit: "20" });
      if (term) params.set("search", term);
      const res = await fetch(`${API}/registration/students?${params}`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStudents(data.students || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setTotalPages(data.total_pages || 1);
    } catch (e) {
      console.error(e);
      setError("Unable to load the student register. Check backend connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, "");
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Register</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            {total} student{total === 1 ? "" : "s"} on record
          </p>
        </div>
        <Link
          href="/registration/students/new"
          className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition"
        >
          + Register Student
        </Link>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(1, search.trim());
        }}
        className="mb-6 flex gap-2"
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or student number…"
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="submit"
          className="flex-1 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition"
        >
          Search
        </button>
      </form>

      {error && (
        <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="px-5 py-3">Student</th>
                <th className="px-5 py-3">Number</th>
                <th className="px-5 py-3">Class</th>
                <th className="px-5 py-3">Gender</th>
                <th className="px-5 py-3">Enrolled</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">Loading…</td>
                </tr>
              )}
              {!loading && students.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500">No students found.</td>
                </tr>
              )}
              {!loading &&
                students.map((s) => (
                  <tr key={s.student_id} className="border-b border-slate-100 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-900 dark:text-slate-100">{s.full_name}</p>
                      <p className="text-xs text-slate-500">{s.email}</p>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">{s.student_number}</td>
                    <td className="px-5 py-3">{s.class_name}</td>
                    <td className="px-5 py-3">{s.gender || "—"}</td>
                    <td className="px-5 py-3 text-slate-500">{new Date(s.enrollment_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          s.is_active
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400"
                        }`}
                      >
                        {s.is_active ? "Active" : "Disabled"}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-700 px-5 py-3 text-sm">
            <button
              disabled={page <= 1}
              onClick={() => load(page - 1, search.trim())}
              className="rounded-lg px-3 py-1.5 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => load(page + 1, search.trim())}
              className="rounded-lg px-3 py-1.5 font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
