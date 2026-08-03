"use client";

import { useEffect, useState } from "react";
import { useStudent } from "./StudentContext";

export default function StudentDashboard() {
  const { profile, authFetch } = useStudent();
  const [dashboard, setDashboard] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
    loadAnnouncements();
    loadNotifications();
  }, []);

  async function loadDashboard() {
    try {
      const data = await authFetch("/api/student/dashboard");
      setDashboard(data);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      setDashboard(null);
    }
  }

  async function loadAnnouncements() {
    try {
      const data = await authFetch("/api/student/announcements");
      setAnnouncements(data);
    } catch (error) {
      console.error("Failed to load announcements:", error);
      setAnnouncements([]);
    }
  }

  async function loadNotifications() {
    try {
      const data = await authFetch("/api/student/notifications");
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications:", error);
      setNotifications([]);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const upcomingAssignments = dashboard?.upcoming_assignments || [];
  const recentGrades = dashboard?.recent_grades || [];
  const attendanceSummary = dashboard?.attendance_summary || { present: 0, total: 0, percentage: 0 };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome back, {profile?.full_name || "Student"}</p>
      </div>

      {/* FR-S09: Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Upcoming</p>
              <p className="text-2xl font-bold text-slate-900">{upcomingAssignments.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Graded</p>
              <p className="text-2xl font-bold text-slate-900">{recentGrades.filter((g: any) => g.score != null).length}</p>
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
              <p className="text-2xl font-bold text-slate-900">{attendanceSummary.percentage}%</p>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* FR-S06: Upcoming Assignment Deadlines */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Upcoming Deadlines</h2>
          {upcomingAssignments.length > 0 ? (
            <div className="space-y-3">
              {upcomingAssignments.slice(0, 5).map((assignment: any) => (
                <div key={assignment.assignment_id} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{assignment.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{assignment.subject || "Subject"}</p>
                    </div>
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-lg whitespace-nowrap">
                      Due {new Date(assignment.due_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Max {assignment.max_score} pts</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No upcoming deadlines.</p>
          )}
        </div>

        {/* FR-S07: Recent Grades */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Grades</h2>
          {recentGrades.length > 0 ? (
            <div className="space-y-3">
              {recentGrades.slice(0, 5).map((grade: any) => (
                <div key={grade.submission_id} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900 text-sm">{grade.assignment_title || "Assignment"}</p>
                      <p className="text-xs text-slate-500 mt-1">{grade.subject || "Subject"}</p>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
                      grade.grade ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      {grade.grade || (grade.score ?? "Pending")}
                    </span>
                  </div>
                  {grade.score != null && <p className="text-xs text-slate-400 mt-2">Score: {grade.score}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No graded submissions yet.</p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* FR-S08: School Announcements */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Announcements</h2>
          {announcements.length > 0 ? (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {announcements.map((announcement: any) => (
                <div key={announcement.announcement_id} className="rounded-xl bg-sky-50 border border-sky-100 p-4">
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

        {/* FR-S09: Attendance Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Attendance Summary</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(attendanceSummary.percentage, 5)}%` }}
                  />
                </div>
              </div>
              <span className="text-lg font-bold text-slate-900">{attendanceSummary.percentage}%</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-xs font-medium text-slate-500 uppercase">Present</p>
                <p className="text-xl font-bold text-emerald-700">{attendanceSummary.present}</p>
              </div>
              <div className="rounded-xl bg-red-50 p-3 text-center">
                <p className="text-xs font-medium text-slate-500 uppercase">Absent</p>
                <p className="text-xl font-bold text-red-600">{attendanceSummary.total - attendanceSummary.present}</p>
              </div>
              <div className="rounded-xl bg-blue-50 p-3 text-center">
                <p className="text-xs font-medium text-slate-500 uppercase">Total</p>
                <p className="text-xl font-bold text-blue-700">{attendanceSummary.total}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <a href="/student/assignments" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition">
            <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <span className="text-sm font-medium text-amber-700">Assignments</span>
          </a>
          <a href="/student/grades" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition">
            <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <span className="text-sm font-medium text-emerald-700">View Grades</span>
          </a>
          <a href="/student/learning" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-blue-50 border border-blue-100 hover:bg-blue-100 transition">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-blue-700">Learning</span>
          </a>
          <a href="/student/messages" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-purple-50 border border-purple-100 hover:bg-purple-100 transition">
            <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium text-purple-700">Message Teacher</span>
          </a>
          <a href="/student/notes" className="flex flex-col items-center gap-2 p-4 rounded-xl bg-sky-50 border border-sky-100 hover:bg-sky-100 transition">
            <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="text-sm font-medium text-sky-700">Notes & Books</span>
          </a>
        </div>
      </div>
    </div>
  );
}
