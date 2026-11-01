"use client";

import { useEffect, useState } from "react";
import { useStudent } from "../StudentContext";
import { io, Socket } from "socket.io-client";

interface AttendanceSessionState {
  isOpen: boolean;
  isLocked: boolean;
  hasMarked: boolean;
  markedAt?: string | null;
  status?: string | null;
  class_name?: string;
  class_id?: number;
  today?: string;
}

export default function StudentAttendance() {
  const { authFetch, token } = useStudent();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"daily" | "summary">("daily");

  // Self-attendance session states
  const [session, setSession] = useState<AttendanceSessionState | null>(null);
  const [marking, setMarking] = useState(false);
  const [sessionMessage, setSessionMessage] = useState("");
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    loadAttendance();
    loadSummary();
    loadSession();
  }, [token]);

  // Real-time socket updates for attendance session
  useEffect(() => {
    if (!session?.class_id) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
    const socket: Socket = io(socketUrl);

    socket.on(`attendance_session_${session.class_id}`, (data: any) => {
      setSession((prev) => (prev ? { ...prev, isOpen: Boolean(data.allow_student_mark) } : null));
    });

    return () => {
      socket.disconnect();
    };
  }, [session?.class_id]);

  async function loadAttendance() {
    try {
      const data = await authFetch("/api/student/attendance");
      setAttendance(data || []);
    } catch {
      setAttendance([]);
    }
  }

  async function loadSummary() {
    try {
      const data = await authFetch("/api/student/attendance/summary");
      setSummary(data || []);
    } catch {
      setSummary([]);
    }
  }

  async function loadSession() {
    try {
      const data = await authFetch("/api/student/attendance/session");
      setSession(data);
    } catch {
      setSession(null);
    }
  }

  async function handleMarkAttendance() {
    setMarking(true);
    setSessionMessage("");
    setSessionError("");
    try {
      const res = await authFetch("/api/student/attendance/mark", {
        method: "POST",
      });
      setSessionMessage(res.message || "Attendance marked successfully! Awaiting teacher approval.");
      setSession((prev) =>
        prev
          ? {
              ...prev,
              hasMarked: true,
              status: "PRESENT",
              markedAt: new Date().toISOString(),
            }
          : null
      );
    } catch (e: any) {
      setSessionError(e.message || "Failed to mark attendance.");
    } finally {
      setMarking(false);
    }
  }

  // Calculate monthly summary if API didn't return it
  const localSummary = summary.length > 0 ? summary : Object.entries(
    attendance.reduce((map, entry) => {
      const month = entry.date.slice(0, 7);
      if (!map[month]) map[month] = { present: 0, absent: 0, late: 0, total: 0 };
      map[month].total += 1;
      if (entry.status === "PRESENT") map[month].present += 1;
      if (entry.status === "ABSENT") map[month].absent += 1;
      if (entry.status === "LATE") map[month].late += 1;
      return map;
    }, {} as Record<string, { present: number; absent: number; late: number; total: number }>)
  ).map(([month, stats]: [string, any]) => ({
    month,
    ...stats,
    percentage: stats.total ? Math.round((stats.present / stats.total) * 100) : 0,
  }));

  const totalPresent = attendance.filter((e) => e.status === "PRESENT").length;
  const totalAbsent = attendance.filter((e) => e.status === "ABSENT").length;
  const totalLate = attendance.filter((e) => e.status === "LATE").length;
  const totalDays = attendance.length;
  const overallPercentage = totalDays ? Math.round((totalPresent / totalDays) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Attendance</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Mark self-attendance when permitted by your teacher and review your attendance record.
        </p>
      </div>

      {/* Feature: Student Self-Attendance Section */}
      {session && session.isOpen && (
        <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm mb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                Live Self-Attendance Open
              </span>
              <h2 className="text-xl font-bold">
                {session.class_name ? `${session.class_name} Attendance` : "Today's Attendance"}
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                Your teacher has permitted students to fill attendance for today.
              </p>
            </div>

            <div>
              {session.hasMarked ? (
                <div className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white text-emerald-600 flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                      Attendance Submitted
                    </p>
                    <p className="text-xs text-white">
                      Marked Present · Pending teacher approval & final save
                    </p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={marking}
                  onClick={handleMarkAttendance}
                  className="px-6 py-3 bg-white text-emerald-700 font-bold text-sm rounded-xl hover:bg-emerald-50 transition shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {marking ? (
                    <>
                      <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Mark Myself Present
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {sessionMessage && (
            <div className="mt-4 p-3 bg-white/20 rounded-xl text-xs font-medium text-emerald-50">
              {sessionMessage}
            </div>
          )}
          {sessionError && (
            <div className="mt-4 p-3 bg-red-500/80 rounded-xl text-xs font-medium text-white">
              {sessionError}
            </div>
          )}
        </div>
      )}

      {/* If session already locked */}
      {session && session.isLocked && (
        <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 flex items-center gap-3">
          <div className="p-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Today&apos;s attendance for your class has been finalized and saved by the teacher.
          </p>
        </div>
      )}

      {/* Overall Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Overall Rate</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{overallPercentage}%</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Present</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{totalPresent}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Absent</p>
          <p className="mt-2 text-3xl font-bold text-red-600 dark:text-red-400">{totalAbsent}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Late</p>
          <p className="mt-2 text-3xl font-bold text-amber-600 dark:text-amber-400">{totalLate}</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("daily")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            viewMode === "daily"
              ? "bg-sky-600 text-white"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          Daily Record
        </button>
        <button
          onClick={() => setViewMode("summary")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            viewMode === "summary"
              ? "bg-sky-600 text-white"
              : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
          }`}
        >
          Monthly Summary
        </button>
      </div>

      {viewMode === "daily" ? (
        <div className="space-y-3">
          {attendance.length > 0 ? (
            attendance.map((entry) => (
              <div
                key={`${entry.attendance_id}-${entry.date}`}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                        entry.status === "PRESENT"
                          ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                          : entry.status === "ABSENT"
                          ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"
                          : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                      }`}
                    >
                      {entry.status === "PRESENT" ? "P" : entry.status === "ABSENT" ? "A" : "L"}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-sm">{entry.date}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Class {entry.class_id}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      entry.status === "PRESENT"
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800"
                        : entry.status === "ABSENT"
                        ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800"
                        : "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
                {entry.remark && (
                  <div className="mt-3 pl-13 text-sm text-slate-500 dark:text-slate-400">
                    <span className="font-medium">Remark:</span> {entry.remark}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400">No attendance records available.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {localSummary.length > 0 ? (
            localSummary.map((month: any) => (
              <div
                key={month.month}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h3 className="font-semibold text-slate-900 dark:text-white">{month.month}</h3>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">{month.percentage}%</span>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(month.percentage, 5)}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 py-2">
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{month.present}</span> Present
                  </div>
                  <div className="rounded-lg bg-red-50 dark:bg-red-900/20 py-2">
                    <span className="font-bold text-red-600 dark:text-red-400">{month.absent}</span> Absent
                  </div>
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 py-2">
                    <span className="font-bold text-amber-600 dark:text-amber-400">{month.late}</span> Late
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
              <p className="text-slate-500 dark:text-slate-400">No attendance summary available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
