"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/vp-academic";

type DashboardMetrics = {
  total_students: number;
  total_teachers: number;
  attendance_rate: number;
  pass_rate: number;
  average_grades_by_subject: Record<string, string>;
  teacher_workload: Array<{ teacher_id: number; _count: { teacher_id: number } }>;
  pending_lesson_plans: number;
  academic_year: string;
};

type TeacherItem = {
  teacher_id: number;
  full_name: string;
  department: string;
  subjects: string[];
  status: string;
};

type CourseItem = {
  course_id: number;
  course_name: string;
  subject: string;
  class_name: string;
  teacher_name: string;
};

function formatNumber(value: number | undefined) {
  if (value === undefined || value === null) return "0";
  return value.toLocaleString();
}

export default function VPAcademicDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [dashboardRes, teachersRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard`),
        fetch(`${API_BASE}/teachers`),
      ]);

      if (!dashboardRes.ok || !teachersRes.ok) {
        throw new Error("Unable to fetch VP Academic data.");
      }

      const [dashboardData, teachersData] = await Promise.all([
        dashboardRes.json(),
        teachersRes.json(),
      ]);

      setMetrics(dashboardData);
      setTeachers(Array.isArray(teachersData) ? teachersData.map((t: any) => ({
        teacher_id: t.teacher_id,
        full_name: t.user?.full_name || t.full_name || 'Unknown',
        department: t.department || "Unassigned",
        subjects: t.subjects || [],
        status: t.user?.is_active !== false ? "Active" : "Inactive"
      })) : []);
      setCourses([]);
    } catch (error) {
      console.error(error);
      setStatusMessage("Unable to load VP Academic dashboard. Check backend connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const statCards = [
    { label: "Total Teachers", value: metrics?.total_teachers ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>, color: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
    { label: "Total Students", value: metrics?.total_students ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg>, color: "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" },
    { label: "Pass Rate", value: metrics?.pass_rate ? `${metrics.pass_rate}%` : "0%", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
    { label: "Pending Lesson Plans", value: metrics?.pending_lesson_plans ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>, color: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" },
    { label: "Attendance Rate", value: metrics?.attendance_rate ? `${metrics.attendance_rate}%` : "0%", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" },
    { label: "Academic Year", value: metrics?.academic_year || "N/A", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>, color: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">VP Academic Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Welcome back. Here is your academic overview.</p>
      </div>

      {loading && (
        <div className="mb-6 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
          Loading dashboard data...
        </div>
      )}

      {statusMessage && (
        <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">{statusMessage}</div>
      )}

      {/* Stat Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                {card.icon}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{typeof card.value === 'number' ? formatNumber(card.value) : card.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          {/* Teachers Overview */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Teachers</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage teaching staff</p>
              </div>
              <Link href="/vp-academic/teachers" className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition">
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Department</th>
                    <th className="pb-3 pr-4">Subjects</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {teachers.slice(0, 6).map((teacher) => (
                    <tr key={teacher.teacher_id}>
                      <td className="py-3 pr-4 text-sm font-medium text-slate-900 dark:text-white">{teacher.full_name}</td>
                      <td className="py-3 pr-4 text-sm text-slate-500 dark:text-slate-400">{teacher.department}</td>
                      <td className="py-3 pr-4 text-sm text-slate-500 dark:text-slate-400">{teacher.subjects.slice(0, 2).join(", ")}{teacher.subjects.length > 2 ? "..." : ""}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${teacher.status === "Active" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${teacher.status === "Active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {teacher.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {teachers.length === 0 && <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">No teachers found.</p>}
            </div>
          </div>

          {/* Courses Overview */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Courses</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{courses.length} active courses</p>
              </div>
              <Link href="/vp-academic/courses" className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                Manage
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {courses.slice(0, 6).map((course) => (
                <div key={course.course_id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50 dark:bg-slate-700/50 hover:border-emerald-300 dark:hover:border-emerald-600 transition">
                  <p className="font-semibold text-slate-900 dark:text-white text-sm">{course.course_name}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{course.subject}</p>
                  <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">{course.class_name} &bull; {course.teacher_name}</p>
                </div>
              ))}
              {courses.length === 0 && (
                <div className="col-span-full py-8 text-center">
                  <svg className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                  </svg>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">No courses found</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">Get started by creating your first course</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              <Link href="/vp-academic/teachers" className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>
                Manage teachers
              </Link>
              <Link href="/vp-academic/students" className="flex items-center gap-3 rounded-xl bg-sky-50 dark:bg-sky-900/30 px-4 py-3 text-sm font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                Manage students
              </Link>
              <Link href="/vp-academic/classes/add" className="flex items-center gap-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add class
              </Link>
              <Link href="/vp-academic/courses" className="flex items-center gap-3 rounded-xl bg-purple-50 dark:bg-purple-900/30 px-4 py-3 text-sm font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                Manage courses
              </Link>
              <Link href="/vp-academic/timetables" className="flex items-center gap-3 rounded-xl bg-purple-50 dark:bg-purple-900/30 px-4 py-3 text-sm font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                Manage timetables
              </Link>
              <Link href="/vp-academic/exams" className="flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
                Schedule exams
              </Link>
              <Link href="/vp-academic/reports" className="flex items-center gap-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
                Academic reports
              </Link>
            </div>
          </div>

          {/* System Status */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">System Status</h2>
            <div className="mt-4 flex items-center gap-3">
              <span className={`flex h-3 w-3 rounded-full ${loading ? "bg-amber-400" : metrics ? "bg-emerald-500" : "bg-rose-500"}`} />
              <span className="text-sm text-slate-600 dark:text-slate-400">{loading ? "Connecting..." : metrics ? "Backend online" : "Backend offline"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
