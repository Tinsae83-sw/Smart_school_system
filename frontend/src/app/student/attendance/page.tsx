"use client";

import { useEffect, useState } from "react";
import { useStudent } from "../StudentContext";

export default function StudentAttendance() {
  const { authFetch } = useStudent();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"daily" | "summary">("daily");

  useEffect(() => {
    loadAttendance();
    loadSummary();
  }, []);

  async function loadAttendance() {
    try {
      const data = await authFetch("/api/student/attendance");
      setAttendance(data);
    } catch {
      setAttendance([]);
    }
  }

  async function loadSummary() {
    try {
      const data = await authFetch("/api/student/attendance/summary");
      setSummary(data);
    } catch {
      // Calculate locally from attendance data
      setSummary([]);
    }
  }

  // FR-S23: Calculate monthly summary if API didn't return it
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
        <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
        <p className="text-sm text-slate-500 mt-1">Track your daily attendance and view summaries.</p>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overall</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{overallPercentage}%</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Present</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{totalPresent}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Absent</p>
          <p className="mt-2 text-3xl font-bold text-red-600">{totalAbsent}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Late</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{totalLate}</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("daily")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            viewMode === "daily" ? "bg-sky-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Daily Record
        </button>
        <button
          onClick={() => setViewMode("summary")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            viewMode === "summary" ? "bg-sky-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          Monthly Summary
        </button>
      </div>

      {viewMode === "daily" ? (
        /* FR-S22: Daily Attendance Record */
        <div className="space-y-3">
          {attendance.length > 0 ? (
            attendance.map((entry) => (
              <div key={`${entry.attendance_id}-${entry.date}`} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                      entry.status === "PRESENT" ? "bg-emerald-50 text-emerald-700" :
                      entry.status === "ABSENT" ? "bg-red-50 text-red-700" :
                      "bg-amber-50 text-amber-700"
                    }`}>
                      {entry.status === "PRESENT" ? "P" : entry.status === "ABSENT" ? "A" : "L"}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{entry.date}</p>
                      <p className="text-xs text-slate-500">Class {entry.class_id}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    entry.status === "PRESENT" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                    entry.status === "ABSENT" ? "bg-red-50 text-red-700 border border-red-100" :
                    "bg-amber-50 text-amber-700 border border-amber-100"
                  }`}>
                    {entry.status}
                  </span>
                </div>
                {/* FR-S24: Attendance Remarks */}
                {entry.remark && (
                  <div className="mt-3 pl-13 text-sm text-slate-500">
                    <span className="font-medium">Remark:</span> {entry.remark}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-slate-500">No attendance records available.</p>
            </div>
          )}
        </div>
      ) : (
        /* FR-S23: Monthly/Term Summary */
        <div className="space-y-3">
          {localSummary.length > 0 ? (
            localSummary.map((month: any) => (
              <div key={month.month} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h3 className="font-semibold text-slate-900">{month.month}</h3>
                  <span className="text-lg font-bold text-slate-900">{month.percentage}%</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(month.percentage, 5)}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-emerald-50 py-2">
                    <span className="font-bold text-emerald-700">{month.present}</span> Present
                  </div>
                  <div className="rounded-lg bg-red-50 py-2">
                    <span className="font-bold text-red-600">{month.absent}</span> Absent
                  </div>
                  <div className="rounded-lg bg-amber-50 py-2">
                    <span className="font-bold text-amber-600">{month.late}</span> Late
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-slate-500">No attendance summary available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
