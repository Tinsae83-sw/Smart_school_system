"use client";

import { useEffect, useState } from "react";
import { useStudent } from "./StudentContext";
import { 
  BookOpen, 
  BarChart3, 
  Calendar, 
  Bell, 
  FileText, 
  TrendingUp, 
  GraduationCap,
  MessageSquare,
  Play,
  Library,
  Clock,
  CheckCircle,
  XCircle,
  Users
} from "lucide-react";

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

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="space-y-8">
      {/* Page Header with Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">{getGreeting()}, {profile?.full_name?.split(' ')[0] || "Student"}!</h1>
          <p className="text-blue-100 text-lg">Here's what's happening with your studies today.</p>
        </div>
      </div>

      {/* Modern Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-200 dark:shadow-orange-900/50">
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full">Assignments</span>
          </div>
          <p className="text-4xl font-bold text-slate-900 dark:text-white mb-1">{upcomingAssignments.length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Upcoming deadlines</p>
        </div>

        <div className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full">Grades</span>
          </div>
          <p className="text-4xl font-bold text-slate-900 dark:text-white mb-1">{recentGrades.filter((g: any) => g.score != null).length}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Recently graded</p>
        </div>

        <div className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-200 dark:shadow-blue-900/50">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">Attendance</span>
          </div>
          <p className="text-4xl font-bold text-slate-900 dark:text-white mb-1">{attendanceSummary.percentage}%</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Attendance rate</p>
        </div>

        <div className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="flex items-center justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-200 dark:shadow-purple-900/50">
              <Bell className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-3 py-1 rounded-full">Alerts</span>
          </div>
          <p className="text-4xl font-bold text-slate-900 dark:text-white mb-1">{unreadCount}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">Unread notifications</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Upcoming Assignment Deadlines */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 px-6 py-4 border-b border-amber-100 dark:border-amber-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              Upcoming Deadlines
            </h2>
          </div>
          <div className="p-6">
            {upcomingAssignments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAssignments.slice(0, 5).map((assignment: any, index: number) => (
                  <div key={assignment.assignment_id} className="group rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 border border-slate-200 dark:border-slate-600 p-4 hover:shadow-md transition-all duration-300">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                            {index + 1}
                          </span>
                          <p className="font-semibold text-slate-900 dark:text-white">{assignment.title}</p>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{assignment.subject || "Subject"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1.5 rounded-lg block">
                          {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{assignment.max_score} pts</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">No upcoming deadlines</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Grades */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 px-6 py-4 border-b border-emerald-100 dark:border-emerald-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Recent Grades
            </h2>
          </div>
          <div className="p-6">
            {recentGrades.length > 0 ? (
              <div className="space-y-4">
                {recentGrades.slice(0, 5).map((grade: any) => (
                  <div key={grade.submission_id} className="group rounded-xl bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 border border-slate-200 dark:border-slate-600 p-4 hover:shadow-md transition-all duration-300">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900 dark:text-white">{grade.assignment_title || "Assignment"}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{grade.subject || "Subject"}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-bold px-4 py-2 rounded-xl ${
                          grade.grade ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/50" : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
                        }`}>
                          {grade.grade || (grade.score ?? "Pending")}
                        </span>
                        {grade.score != null && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{grade.score} pts</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">No graded submissions yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* School Announcements */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-blue-100 dark:border-blue-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Announcements
            </h2>
          </div>
          <div className="p-6">
            {announcements.length > 0 ? (
              <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                {announcements.map((announcement: any) => (
                  <div key={announcement.announcement_id} className="rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 p-5 hover:shadow-md transition-all duration-300">
                    <p className="font-semibold text-slate-900 dark:text-white mb-2">{announcement.title}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{announcement.body}</p>
                    {announcement.created_at && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-3 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(announcement.created_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400">No announcements available</p>
              </div>
            )}
          </div>
        </div>

        {/* Attendance Summary */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-blue-100 dark:border-blue-800">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Attendance Summary
            </h2>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Overall Attendance</span>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{attendanceSummary.percentage}%</span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${Math.max(attendanceSummary.percentage, 5)}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-4 text-center border border-emerald-100 dark:border-emerald-800 hover:shadow-md transition-all duration-300">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Present</p>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-500">{attendanceSummary.present}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-4 text-center border border-red-100 dark:border-red-800 hover:shadow-md transition-all duration-300">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center mx-auto mb-2">
                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">Absent</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-500">{attendanceSummary.total - attendanceSummary.present}</p>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-4 text-center border border-blue-100 dark:border-blue-800 hover:shadow-md transition-all duration-300">
                  <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center mx-auto mb-2">
                    <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Total</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-500">{attendanceSummary.total}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 px-6 py-4 border-b border-purple-100 dark:border-purple-800">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            Quick Actions
          </h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <a href="/student/assignments" className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-100 dark:border-amber-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Assignments</span>
            </a>
            <a href="/student/grades" className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-100 dark:border-emerald-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">View Grades</span>
            </a>
            <a href="/student/learning" className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-100 dark:border-blue-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Play className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">Learning</span>
            </a>
            <a href="/student/messages" className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-100 dark:border-purple-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-purple-700 dark:text-purple-400">Messages</span>
            </a>
            <a href="/student/notes" className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-50 dark:from-sky-900/20 dark:to-cyan-900/20 border border-sky-100 dark:border-sky-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Library className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-semibold text-sky-700 dark:text-sky-400">Notes & Books</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
