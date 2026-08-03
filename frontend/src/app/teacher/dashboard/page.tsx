"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, clearAuth } from "@/lib/auth";

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken("TEACHER");
    if (!token) {
      router.push("/login");
      return;
    }
    loadDashboard(token);
  }, [router]);

  async function loadDashboard(token: string) {
    try {
      const response = await fetch("http://localhost:5000/api/teacher/dashboard", {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          clearAuth("TEACHER");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setDashboard(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Dashboard</h1>
      
      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Classes</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{dashboard?.stats?.totalClasses || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total Students</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{dashboard?.stats?.totalStudents || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Pending Submissions</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{dashboard?.stats?.pendingTasks?.ungradedSubmissions || 0}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Today's Attendance</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{dashboard?.stats?.attendanceRate || 0}%</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Today's Schedule</h2>
        {dashboard?.todaySchedule && dashboard.todaySchedule.length > 0 ? (
          <div className="space-y-3">
            {dashboard.todaySchedule.map((schedule: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-medium text-slate-900">{schedule.subject}</p>
                  <p className="text-sm text-slate-600">Class {schedule.class} - {schedule.room}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{schedule.time}</p>
                  <p className="text-sm text-slate-600">Period {schedule.period}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No classes scheduled for today</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <button
          onClick={() => router.push("/teacher/attendance")}
          className="bg-white rounded-2xl border border-slate-200 p-6 text-left hover:border-emerald-500 transition group"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Take Attendance</p>
              <p className="text-sm text-slate-600">Mark student attendance</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/teacher/assignment")}
          className="bg-white rounded-2xl border border-slate-200 p-6 text-left hover:border-indigo-500 transition group"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition">
              <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Manage Assignments</p>
              <p className="text-sm text-slate-600">Create and grade assignments</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => router.push("/teacher/grade")}
          className="bg-white rounded-2xl border border-slate-200 p-6 text-left hover:border-amber-500 transition group"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition">
              <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900">Enter Grades</p>
              <p className="text-sm text-slate-600">Grade student work</p>
            </div>
          </div>
        </button>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Recent Activity</h2>
        {dashboard?.recentActivity && dashboard.recentActivity.length > 0 ? (
          <div className="space-y-3">
            {dashboard.recentActivity.map((activity: any, index: number) => (
              <div key={index} className="flex items-center gap-4 p-3 border-b border-slate-100 last:border-0">
                <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-sm">
                  {activity.type === "submission" ? "📝" : activity.type === "attendance" ? "📅" : "📌"}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-900">{activity.description}</p>
                  <p className="text-xs text-slate-500">{new Date(activity.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No recent activity</p>
        )}
      </div>
    </div>
  );
}
