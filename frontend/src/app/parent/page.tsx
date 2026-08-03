"use client";

import { useEffect, useState } from "react";
import { useParent } from "./ParentContext";
import { MOCK_DASHBOARD, MOCK_DASHBOARD_2, MOCK_NOTIFICATIONS } from "./mockData";

export default function ParentDashboard() {
  const { selectedChildId, selectedChild, authFetch } = useParent();
  const [dashboard, setDashboard] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>(MOCK_NOTIFICATIONS);

  useEffect(() => {
    if (!selectedChildId) return;
    loadDashboard();
    loadNotifications();
  }, [selectedChildId]);

  async function loadDashboard() {
    try {
      const data = await authFetch(`/api/parent/children/${selectedChildId}/dashboard`);
      setDashboard(data);
    } catch {
      setDashboard(selectedChildId === 4 ? MOCK_DASHBOARD_2 : MOCK_DASHBOARD);
    }
  }

  async function loadNotifications() {
    try {
      const data = await authFetch("/api/parent/notifications");
      setNotifications(data);
    } catch {
      setNotifications(MOCK_NOTIFICATIONS);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!selectedChild) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">No child selected</p>
          <p className="text-sm text-slate-400 mt-1">Please link a child to your account to view the dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Overview for {selectedChild.full_name} &middot; {selectedChild.class_name}
        </p>
      </div>

      {/* FR-P10: Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Avg Grade</p>
              <p className="text-2xl font-bold text-slate-900">{dashboard?.summary?.average_grade ?? "—"}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Attendance</p>
              <p className="text-2xl font-bold text-slate-900">{dashboard?.summary?.attendance_rate ?? "—"}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted</p>
              <p className="text-2xl font-bold text-slate-900">{dashboard?.summary?.assignments_submitted ?? 0}/{dashboard?.summary?.total_assignments ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.058-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Alerts</p>
              <p className="text-2xl font-bold text-slate-900">{unreadCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* FR-P11: Recent Alerts */}
      {dashboard?.alerts?.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Alerts</h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {dashboard.alerts.map((alert: any, index: number) => (
              <div
                key={index}
                className={`rounded-xl p-4 border ${
                  alert.type === "ABSENCE"
                    ? "bg-red-50 border-red-100"
                    : alert.type === "LOW_GRADE"
                    ? "bg-amber-50 border-amber-100"
                    : "bg-blue-50 border-blue-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    alert.type === "ABSENCE"
                      ? "text-red-600"
                      : alert.type === "LOW_GRADE"
                      ? "text-amber-600"
                      : "text-blue-600"
                  }`}>
                    {alert.type === "ABSENCE" ? "Absence" : alert.type === "LOW_GRADE" ? "Low Grade" : "Deadline"}
                  </span>
                </div>
                <p className="text-sm text-slate-700">{alert.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* FR-P12: Performance Trend Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Performance Trend</h2>
          {dashboard?.performance_trend?.length > 0 ? (
            <div className="space-y-3">
              {dashboard.performance_trend.map((point: any) => (
                <div key={point.month} className="flex items-center gap-4">
                  <span className="w-12 text-sm font-medium text-slate-600">{point.month}</span>
                  <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full flex items-center justify-end pr-2 transition-all duration-500"
                      style={{ width: `${Math.max(point.score, 8)}%` }}
                    >
                      <span className="text-xs font-bold text-white">{point.score}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No performance data available.</p>
          )}
        </div>

        {/* FR-P13: Recent Announcements */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Announcements</h2>
          {dashboard?.announcements?.length > 0 ? (
            <div className="space-y-3">
              {dashboard.announcements.map((announcement: any) => (
                <div key={announcement.announcement_id} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <p className="font-semibold text-slate-900 text-sm">{announcement.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{announcement.body}</p>
                  {announcement.created_at && (
                    <p className="mt-2 text-xs text-slate-400">{new Date(announcement.created_at).toLocaleDateString()}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No announcements available.</p>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a href="/parent/grades" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm font-medium text-emerald-700">View Grades</span>
          </a>
          <a href="/parent/attendance" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-blue-700">Attendance</span>
          </a>
          <a href="/parent/messages" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 border border-purple-100 hover:bg-purple-100 transition">
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium text-purple-700">Message Teacher</span>
          </a>
          <a href="/parent/payments" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            <span className="text-sm font-medium text-amber-700">Pay Fees</span>
          </a>
        </div>
      </div>
    </div>
  );
}
