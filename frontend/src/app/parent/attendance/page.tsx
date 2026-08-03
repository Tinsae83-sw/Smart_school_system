"use client";

import { useEffect, useState } from "react";
import { useParent } from "../ParentContext";
import { MOCK_ATTENDANCE, MOCK_ATTENDANCE_SUMMARY } from "../mockData";

export default function AttendancePage() {
  const { selectedChildId, selectedChild, authFetch } = useParent();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<"daily" | "summary">("daily");

  useEffect(() => {
    if (!selectedChildId) return;
    loadAttendance();
    loadSummary();
  }, [selectedChildId]);

  async function loadAttendance() {
    try {
      const data = await authFetch(`/api/parent/children/${selectedChildId}/attendance`);
      const attendanceArray = Array.isArray(data) ? data : [];
      setAttendance(attendanceArray);
    } catch {
      setAttendance(MOCK_ATTENDANCE);
    }
  }

  async function loadSummary() {
    try {
      const data = await authFetch(`/api/parent/children/${selectedChildId}/attendance/summary`);
      const summaryArray = Array.isArray(data) ? data : [];
      setSummary(summaryArray);
    } catch {
      setSummary(MOCK_ATTENDANCE_SUMMARY);
    }
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "PRESENT": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "ABSENT": return "bg-red-100 text-red-700 border-red-200";
      case "LATE": return "bg-amber-100 text-amber-700 border-amber-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "PRESENT":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        );
      case "ABSENT":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case "LATE":
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default: return null;
    }
  }

  const totalDays = attendance.length;
  const presentDays = attendance.filter((a) => a.status === "PRESENT").length;
  const absentDays = attendance.filter((a) => a.status === "ABSENT").length;
  const lateDays = attendance.filter((a) => a.status === "LATE").length;
  const overallRate = totalDays ? Math.round((presentDays / totalDays) * 100) : 0;

  // FR-P22: Check for recent unexcused absences
  const recentUnexcusedAbsences = attendance.filter(
    (a) => a.status === "ABSENT" && (!a.remark || a.remark.toLowerCase() === "none" || a.remark.trim() === "")
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Attendance Monitoring</h1>
        <p className="text-sm text-slate-500 mt-1">
          {selectedChild?.full_name || "Student"} &middot; {selectedChild?.class_name || ""}
        </p>
      </div>

      {/* FR-P22: Real-time Absence Notification */}
      {recentUnexcusedAbsences.length > 0 && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-red-800">Absence Alert</p>
              <p className="text-sm text-red-700 mt-1">
                {selectedChild?.full_name} has {recentUnexcusedAbsences.length} unexcused absence{recentUnexcusedAbsences.length > 1 ? "s" : ""} on record.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {recentUnexcusedAbsences.map((a, i) => (
                  <span key={i} className="rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                    {a.date}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overall Rate</p>
          <p className="text-3xl font-bold text-slate-900 mt-2">{overallRate}%</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Present</p>
          <p className="text-3xl font-bold text-emerald-700 mt-2">{presentDays}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
          <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Absent</p>
          <p className="text-3xl font-bold text-red-700 mt-2">{absentDays}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Late</p>
          <p className="text-3xl font-bold text-amber-700 mt-2">{lateDays}</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView("daily")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeView === "daily" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Daily Record
        </button>
        <button
          onClick={() => setActiveView("summary")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeView === "summary" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Monthly Summary
        </button>
      </div>

      {/* FR-P19: Daily Attendance Record */}
      {activeView === "daily" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="text-lg font-semibold text-slate-900">Daily Attendance</h2>
          </div>
          {attendance.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {attendance.map((entry, index) => (
                <div key={`${entry.attendance_id}-${entry.date}-${index}`} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${getStatusStyle(entry.status)}`}>
                      {getStatusIcon(entry.status)}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{new Date(entry.date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
                      {/* FR-P21: Attendance Remarks */}
                      {entry.remark && entry.remark.trim() && entry.remark.toLowerCase() !== "none" && (
                        <p className="text-sm text-slate-500 mt-0.5">
                          <span className="font-medium">Remark:</span> {entry.remark}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={`rounded-xl px-3 py-1.5 text-xs font-bold border ${getStatusStyle(entry.status)}`}>
                    {entry.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-slate-500">No attendance records available.</p>
            </div>
          )}
        </div>
      )}

      {/* FR-P20: Attendance Summary by Month/Term */}
      {activeView === "summary" && (
        <div className="space-y-4">
          {summary.length > 0 ? (
            summary.map((month) => (
              <div key={month.month} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">{month.month}</h3>
                  <span className={`rounded-xl px-3 py-1.5 text-sm font-bold ${
                    month.percentage >= 90 ? "bg-emerald-100 text-emerald-700" : month.percentage >= 75 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"
                  }`}>
                    {month.percentage}% Present
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden mb-4">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      month.percentage >= 90 ? "bg-emerald-500" : month.percentage >= 75 ? "bg-amber-500" : "bg-red-500"
                    }`}
                    style={{ width: `${month.percentage}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <p className="text-xs text-emerald-600 font-medium">Present</p>
                    <p className="text-lg font-bold text-emerald-700">{month.present}</p>
                  </div>
                  <div className="rounded-xl bg-red-50 p-3">
                    <p className="text-xs text-red-600 font-medium">Absent</p>
                    <p className="text-lg font-bold text-red-700">{month.absent}</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3">
                    <p className="text-xs text-amber-600 font-medium">Late</p>
                    <p className="text-lg font-bold text-amber-700">{month.late}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
              <p className="text-slate-500">No attendance summary available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
