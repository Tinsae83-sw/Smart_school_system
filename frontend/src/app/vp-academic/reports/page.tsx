"use client";

import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/vp-academic";

type GradeData = {
  student_id: number;
  student_name: string;
  class_name: string;
  subject_name: string;
  score: number;
  letter_grade: string;
};

type AttendanceData = {
  class_name: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  attendance_rate: number;
};

type AtRiskStudent = {
  student_id: number;
  student_name: string;
  class_name: string;
  risk_level: string;
  average_grade: number;
  attendance_rate: number;
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"grades" | "attendance" | "at-risk">("grades");
  const [grades, setGrades] = useState<GradeData[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [reportType, setReportType] = useState("");
  const [reportParams, setReportParams] = useState({
    class_id: "",
    subject_id: "",
    start_date: "",
    end_date: "",
  });

  async function fetchGrades() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/academic/grades`);
      if (!res.ok) throw new Error("Failed to fetch grades");
      const data = await res.json();
      setGrades(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setGrades([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAttendance() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/academic/attendance`);
      if (!res.ok) throw new Error("Failed to fetch attendance");
      const data = await res.json();
      setAttendance(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAtRiskStudents() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/academic/at-risk`);
      if (!res.ok) throw new Error("Failed to fetch at-risk students");
      const data = await res.json();
      setAtRiskStudents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setAtRiskStudents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "grades") fetchGrades();
    else if (activeTab === "attendance") fetchAttendance();
    else if (activeTab === "at-risk") fetchAtRiskStudents();
  }, [activeTab]);

  async function handleGenerateReport() {
    try {
      const res = await fetch(`${API_BASE}/academic/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: reportType,
          ...reportParams,
        }),
      });
      if (!res.ok) throw new Error("Failed to generate report");
      const data = await res.json();
      alert(`Report generated successfully! ${data.message || ""}`);
      setShowGenerateModal(false);
    } catch (error) {
      console.error(error);
      alert("Failed to generate report.");
    }
  }

  async function handleGenerateTranscript(studentId: number) {
    try {
      const res = await fetch(`${API_BASE}/academic/transcripts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId }),
      });
      if (!res.ok) throw new Error("Failed to generate transcript");
      alert("Transcript generated successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to generate transcript.");
    }
  }

  function getRiskLevelColor(level: string) {
    switch (level) {
      case "HIGH":
        return "bg-rose-50 text-rose-700";
      case "MEDIUM":
        return "bg-amber-50 text-amber-700";
      case "LOW":
        return "bg-emerald-50 text-emerald-700";
      default:
        return "bg-slate-50 text-slate-700";
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academic Reports</h1>
          <p className="mt-1 text-sm text-slate-500">View and generate academic performance reports</p>
        </div>
        <button
          onClick={() => {
            setReportType("");
            setReportParams({ class_id: "", subject_id: "", start_date: "", end_date: "" });
            setShowGenerateModal(true);
          }}
          className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
        >
          Generate Report
        </button>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("grades")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "grades"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            School-Wide Grades
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "attendance"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Attendance Summary
          </button>
          <button
            onClick={() => setActiveTab("at-risk")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "at-risk"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            At-Risk Students
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          {activeTab === "grades" && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Letter Grade</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {grades.map((grade, index) => (
                    <tr key={`${grade.student_id}-${grade.subject_name}-${index}`} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{grade.student_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{grade.class_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{grade.subject_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{grade.score}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          {grade.letter_grade}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleGenerateTranscript(grade.student_id)}
                          className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 transition"
                        >
                          Transcript
                        </button>
                      </td>
                    </tr>
                  ))}
                  {grades.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                        No grade data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Total Students</th>
                    <th className="px-6 py-4">Present</th>
                    <th className="px-6 py-4">Absent</th>
                    <th className="px-6 py-4">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.map((att) => (
                    <tr key={att.class_name} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{att.class_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{att.total_students}</td>
                      <td className="px-6 py-4 text-sm text-emerald-600">{att.present_count}</td>
                      <td className="px-6 py-4 text-sm text-rose-600">{att.absent_count}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-slate-200">
                            <div
                              className="h-2 rounded-full bg-emerald-500"
                              style={{ width: `${att.attendance_rate}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-900">{att.attendance_rate.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {attendance.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                        No attendance data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "at-risk" && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Average Grade</th>
                    <th className="px-6 py-4">Attendance Rate</th>
                    <th className="px-6 py-4">Risk Level</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {atRiskStudents.map((student) => (
                    <tr key={student.student_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{student.student_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{student.class_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{student.average_grade.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{student.attendance_rate.toFixed(1)}%</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getRiskLevelColor(student.risk_level)}`}>
                          {student.risk_level}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {atRiskStudents.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                        No at-risk students identified.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Generate Report</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Report Type</label>
                <select
                  required
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Select Report Type</option>
                  <option value="academic_performance">Academic Performance</option>
                  <option value="attendance_report">Attendance Report</option>
                  <option value="grade_distribution">Grade Distribution</option>
                  <option value="subject_performance">Subject Performance</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={reportParams.start_date}
                    onChange={(e) => setReportParams({ ...reportParams, start_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    value={reportParams.end_date}
                    onChange={(e) => setReportParams({ ...reportParams, end_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGenerateReport}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
