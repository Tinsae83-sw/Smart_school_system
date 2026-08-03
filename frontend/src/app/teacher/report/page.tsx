"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function ReportPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [reportType, setReportType] = useState<"class" | "student">("class");
  const [selectedStudent, setSelectedStudent] = useState<number | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadClasses(savedToken);
  }, [router]);

  async function loadClasses(token: string) {
    try {
      const data = await authFetch("/api/teacher/classes", {}, token);
      setClasses(data);
      if (data.length > 0) {
        setSelectedClass(data[0].class_id);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadStudents() {
    if (!selectedClass) return;
    try {
      const data = await authFetch(`/api/teacher/classes/${selectedClass}/roster`, {}, token);
      setStudents(data || []);
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
    }
  }, [selectedClass]);

  async function handleGenerateReport() {
    setGenerating(true);
    setMessage("");
    try {
      let url = "";
      if (reportType === "class" && selectedClass) {
        url = `/api/teacher/reports/class/${selectedClass}`;
      } else if (reportType === "student" && selectedStudent) {
        url = `/api/teacher/reports/student/${selectedStudent}`;
      } else {
        setMessage("Please select a class and student");
        setGenerating(false);
        return;
      }

      const data = await authFetch(url, {}, token);
      setReport(data);
      setMessage("Report generated successfully!");
    } catch (e) {
      setMessage("Failed to generate report");
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-amber-100 rounded-xl">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Reports</h1>
              <p className="text-slate-600">Generate and view academic reports</p>
            </div>
          </div>
        </div>
        
        {/* Report Type Selection Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 rounded-lg">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Report Type</label>
              <p className="text-xs text-slate-500">Choose the type of report to generate</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setReportType("class")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition ${
                reportType === "class"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Class Report
            </button>
            <button
              onClick={() => setReportType("student")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition ${
                reportType === "student"
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Student Report
            </button>
          </div>
        </div>

        {/* Class Selection Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Select Class</label>
              <p className="text-xs text-slate-500">Choose the class for the report</p>
            </div>
          </div>
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          >
            {classes.map((cls: any) => (
              <option key={cls.class_subject_id} value={cls.class_id}>
                {cls.school_class?.class_name || cls.class_name} - {cls.subject?.subject_name || cls.subject}
              </option>
            ))}
          </select>
        </div>

        {/* Student Selection Card (for student reports) */}
        {reportType === "student" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700">Select Student</label>
                <p className="text-xs text-slate-500">Choose the student for the report</p>
              </div>
            </div>
            <select
              value={selectedStudent || ''}
              onChange={(e) => setSelectedStudent(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            >
              <option value="">Select a student...</option>
              {students.map((student: any) => (
                <option key={student.student_id} value={student.student_id}>
                  {student.user?.full_name || student.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Generate Button */}
        <div className="mb-6">
          <button
            onClick={handleGenerateReport}
            disabled={generating || (reportType === "student" && !selectedStudent)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-6 py-3 text-white font-semibold hover:from-amber-700 hover:to-amber-800 transition shadow-lg shadow-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {generating ? "Generating..." : "Generate Report"}
          </button>
        </div>

        {message && (
          <div className={`mb-6 rounded-xl p-4 ${message.includes("success") ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
            <div className="flex items-center gap-2">
              {message.includes("success") ? (
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <p className={`text-sm font-medium ${message.includes("success") ? "text-emerald-700" : "text-red-700"}`}>
                {message}
              </p>
            </div>
          </div>
        )}

        {/* Report Display */}
        {report && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">
                    {reportType === "class" ? "Class Academic Report" : "Student Academic Report"}
                  </h2>
                  <p className="text-xs text-slate-500">Generated: {new Date(report.generated_at).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Class Report */}
            {reportType === "class" && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-emerald-100 rounded">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700">Class Average</h3>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{report.class_average || "N/A"}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-blue-100 rounded">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700">Total Students</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{report.total_students || 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-amber-100 rounded">
                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700">Pass Rate</h3>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">{report.pass_rate || "N/A"}%</p>
                  </div>
                </div>

                {report.subject_performance && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-purple-100 rounded">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">Subject Performance</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left border-b border-slate-200">
                            <th className="pb-3 px-4 text-sm font-semibold text-slate-700">Subject</th>
                            <th className="pb-3 px-4 text-sm font-semibold text-slate-700">Average</th>
                            <th className="pb-3 px-4 text-sm font-semibold text-slate-700">Highest</th>
                            <th className="pb-3 px-4 text-sm font-semibold text-slate-700">Lowest</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.subject_performance.map((subject: any, index: number) => (
                            <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition">
                              <td className="py-3 px-4 text-sm font-medium text-slate-900">{subject.subject}</td>
                              <td className="py-3 px-4 text-sm text-slate-600">{subject.average}</td>
                              <td className="py-3 px-4 text-sm text-slate-600">{subject.highest}</td>
                              <td className="py-3 px-4 text-sm text-slate-600">{subject.lowest}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {report.top_performers && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-emerald-100 rounded">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">Top Performers</h3>
                    </div>
                    <div className="space-y-2">
                      {report.top_performers.map((student: any, index: number) => (
                        <div key={index} className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center">
                              <span className="text-xs font-semibold text-emerald-600">{index + 1}</span>
                            </div>
                            <span className="text-sm font-medium text-slate-900">{student.name}</span>
                          </div>
                          <span className="text-sm font-semibold text-emerald-600">{student.average}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Student Report */}
            {reportType === "student" && (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-emerald-100 rounded">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700">Overall Average</h3>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600">{report.overall_average || "N/A"}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-blue-100 rounded">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700">Class Rank</h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600">{report.class_rank || "N/A"}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-amber-100 rounded">
                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-700">Attendance Rate</h3>
                    </div>
                    <p className="text-2xl font-bold text-amber-600">{report.attendance_rate || "N/A"}%</p>
                  </div>
                </div>

                {report.subject_grades && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-purple-100 rounded">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">Subject Grades</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left border-b border-slate-200">
                            <th className="pb-3 px-4 text-sm font-semibold text-slate-700">Subject</th>
                            <th className="pb-3 px-4 text-sm font-semibold text-slate-700">Grade</th>
                            <th className="pb-3 px-4 text-sm font-semibold text-slate-700">Score</th>
                            <th className="pb-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.subject_grades.map((grade: any, index: number) => (
                            <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition">
                              <td className="py-3 px-4 text-sm font-medium text-slate-900">{grade.subject}</td>
                              <td className="py-3 px-4 text-sm text-slate-600">{grade.grade}</td>
                              <td className="py-3 px-4 text-sm text-slate-600">{grade.score}</td>
                              <td className="py-3 px-4">
                                <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                                  grade.status === "PASS" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                }`}>
                                  {grade.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {report.remarks && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="p-1.5 bg-indigo-100 rounded">
                        <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </div>
                      <h3 className="text-lg font-semibold text-slate-900">Remarks</h3>
                    </div>
                    <p className="text-slate-600 bg-slate-50 rounded-xl p-4 border border-slate-100">{report.remarks}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
