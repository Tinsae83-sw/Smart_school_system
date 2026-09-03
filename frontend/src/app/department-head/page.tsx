"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/department-head";
const api = authFetchFor("DEPARTMENT_HEAD");

type DashboardMetrics = {
  total_teachers: number;
  total_students: number;
  pending_lesson_plans: number;
  department_performance: number;
  upcoming_evaluations: number;
  resource_requests: number;
};

type TeacherItem = {
  teacher_id: number;
  full_name: string;
  subjects: string[];
  performance_score: number;
  status: string;
};

type LessonPlanItem = {
  plan_id: number;
  teacher_name: string;
  subject: string;
  status: string;
  submitted_date: string;
};

function formatNumber(value: number | undefined) {
  if (value === undefined || value === null) return "0";
  return value.toLocaleString();
}

export default function DepartmentHeadDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [dashboardRes, teachersRes, lessonPlansRes] = await Promise.all([
        api(`${API_BASE}/dashboard`),
        api(`${API_BASE}/teachers`),
        api(`${API_BASE}/lesson-plans`),
      ]);

      if (!dashboardRes.ok || !teachersRes.ok || !lessonPlansRes.ok) {
        throw new Error("Unable to fetch Department Head data.");
      }

      const [dashboardData, teachersData, lessonPlansData] = await Promise.all([
        dashboardRes.json(),
        teachersRes.json(),
        lessonPlansRes.json(),
      ]);

      setMetrics(dashboardData);
      setTeachers(teachersData.teachers || []);
      setLessonPlans(lessonPlansData);
    } catch (error) {
      console.error(error);
      setStatusMessage("Unable to load Department Head dashboard. Check backend connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const statCards = [
    { label: "Total Teachers", value: metrics?.total_teachers ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>, color: "bg-amber-50 text-amber-600" },
    { label: "Total Students", value: metrics?.total_students ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg>, color: "bg-sky-50 text-sky-600" },
    { label: "Pending Lesson Plans", value: metrics?.pending_lesson_plans ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.642A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>, color: "bg-emerald-50 text-emerald-600" },
    { label: "Dept. Performance", value: metrics?.department_performance ? `${metrics.department_performance}%` : "0%", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" /></svg>, color: "bg-purple-50 text-purple-600" },
    { label: "Upcoming Evaluations", value: metrics?.upcoming_evaluations ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: "bg-indigo-50 text-indigo-600" },
    { label: "Resource Requests", value: metrics?.resource_requests ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25m-17.25 0a2.25 2.25 0 012.25-2.25h12.75a2.25 2.25 0 012.25 2.25m-2.25 0h.008v.008h-.008V7.5z" /></svg>, color: "bg-rose-50 text-rose-600" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Department Head Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back. Here is your department overview.</p>
      </div>

      {statusMessage && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{statusMessage}</div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                {card.icon}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{typeof card.value === 'number' ? formatNumber(card.value) : card.value}</p>
                <p className="text-xs text-slate-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Department Teachers</h2>
                <p className="text-sm text-slate-500">Manage teaching staff</p>
              </div>
              <Link href="/department-head/teachers" className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition">
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Subjects</th>
                    <th className="pb-3 pr-4">Performance</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.slice(0, 6).map((teacher) => (
                    <tr key={teacher.teacher_id}>
                      <td className="py-3 pr-4 text-sm font-medium text-slate-900">{teacher.full_name}</td>
                      <td className="py-3 pr-4 text-sm text-slate-500">{teacher.subjects.slice(0, 2).join(", ")}{teacher.subjects.length > 2 ? "..." : ""}</td>
                      <td className="py-3 pr-4 text-sm text-slate-500">{teacher.performance_score}%</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${teacher.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${teacher.status === "Active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {teacher.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {teachers.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No teachers found.</p>}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Lesson Plans</h2>
                <p className="text-sm text-slate-500">{lessonPlans.length} pending review</p>
              </div>
              <Link href="/department-head/lesson-plans" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Review
              </Link>
            </div>
            <div className="space-y-3">
              {lessonPlans.slice(0, 5).map((plan) => (
                <div key={plan.plan_id} className="rounded-xl border border-slate-200 p-4 hover:border-orange-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{plan.teacher_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{plan.subject}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${plan.status === "Pending" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {plan.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{new Date(plan.submitted_date).toLocaleDateString()}</p>
                </div>
              ))}
              {lessonPlans.length === 0 && <p className="text-sm text-slate-400">No pending lesson plans.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              <Link href="/department-head/teachers" className="flex items-center gap-3 rounded-xl bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700 hover:bg-orange-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>
                Manage teachers
              </Link>
              <Link href="/department-head/lesson-plans" className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.642A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                Review lesson plans
              </Link>
              <Link href="/department-head/evaluations" className="flex items-center gap-3 rounded-xl bg-purple-50 px-4 py-3 text-sm font-medium text-purple-700 hover:bg-purple-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Teacher evaluations
              </Link>
              <Link href="/department-head/resources" className="flex items-center gap-3 rounded-xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700 hover:bg-sky-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25m-17.25 0a2.25 2.25 0 012.25-2.25h12.75a2.25 2.25 0 012.25 2.25m-2.25 0h.008v.008h-.008V7.5z" /></svg>
                Allocate resources
              </Link>
              <Link href="/department-head/reports" className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
                Department reports
              </Link>
              <Link href="/department-head/analytics" className="flex items-center gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 hover:bg-rose-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" /></svg>
                Department analytics
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">System Status</h2>
            <div className="mt-4 flex items-center gap-3">
              <span className={`flex h-3 w-3 rounded-full ${loading ? "bg-amber-400" : metrics ? "bg-emerald-500" : "bg-rose-500"}`} />
              <span className="text-sm text-slate-600">{loading ? "Connecting..." : metrics ? "Backend online" : "Backend offline"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
