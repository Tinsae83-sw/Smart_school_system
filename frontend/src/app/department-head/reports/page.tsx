"use client";

import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/department-head";

type ReportOverview = {
  department: string;
  available_reports: {
    name: string;
    endpoint: string;
    description: string;
    formats: string[];
  }[];
  statistics: {
    total_teachers: number;
    total_grades: number;
    total_attendance_records: number;
    total_lesson_plans: number;
  };
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [overview, setOverview] = useState<ReportOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);

  async function generateReport(format: string = "json") {
    setLoading(true);
    try {
      const token = localStorage.getItem("dept_head_token");
      const res = await fetch(`${API_BASE}/reports/generate?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        if (format === "csv") {
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `department_report_${Date.now()}.csv`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          const data = await res.json();
          setReportData(data);
        }
      }
    } catch (error) {
      console.error("Error generating report:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchOverview() {
    setOverviewLoading(true);
    try {
      const token = localStorage.getItem("dept_head_token");
      const res = await fetch(`${API_BASE}/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setOverview(await res.json());
      }
    } catch (error) {
      console.error("Error fetching overview:", error);
    } finally {
      setOverviewLoading(false);
    }
  }

  useEffect(() => {
    fetchOverview();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Department Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Generate and export department performance reports</p>
      </div>

      {/* Statistics Overview */}
      {overviewLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        </div>
      ) : overview && (
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-50 p-3">
                <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Teachers</p>
                <p className="text-2xl font-bold text-slate-900">{overview.statistics.total_teachers}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-emerald-50 p-3">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Grades</p>
                <p className="text-2xl font-bold text-slate-900">{overview.statistics.total_grades}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-sky-50 p-3">
                <svg className="w-6 h-6 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">Attendance Records</p>
                <p className="text-2xl font-bold text-slate-900">{overview.statistics.total_attendance_records}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-purple-50 p-3">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-slate-500">Lesson Plans</p>
                <p className="text-2xl font-bold text-slate-900">{overview.statistics.total_lesson_plans}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Reports */}
      {overview && (
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Available Reports</h2>
          <p className="mt-1 text-sm text-slate-500">Department: {overview.department}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {overview.available_reports.map((report, index) => (
              <div key={index} className="rounded-xl border border-slate-200 p-4 hover:border-orange-300 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900">{report.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">{report.description}</p>
                    <div className="mt-2 flex gap-2">
                      {report.formats.map(format => (
                        <span key={format} className="rounded-full bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {format.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Generate Report</h2>
          <p className="mt-1 text-sm text-slate-500">Create a comprehensive department report</p>
          
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Report Type</label>
              <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500">
                <option value="academic">Academic Performance Report</option>
                <option value="teacher">Teacher Performance Report</option>
                <option value="subject">Subject-wise Report</option>
                <option value="attendance">Attendance Report</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700">Term</label>
              <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500">
                <option value="current">Current Term</option>
                <option value="semester1">Semester 1</option>
                <option value="semester2">Semester 2</option>
                <option value="annual">Annual</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Grade Level</label>
              <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500">
                <option value="all">All Grades</option>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={() => generateReport("json")}
                disabled={loading}
                className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50"
              >
                {loading ? "Generating..." : "View Report"}
              </button>
              <button
                onClick={() => generateReport("csv")}
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Quick Reports</h2>
          <p className="mt-1 text-sm text-slate-500">Access pre-configured reports</p>
          
          <div className="mt-6 space-y-3">
            <button className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              <span className="flex items-center gap-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
                </svg>
                Grade Distribution Analysis
              </span>
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            
            <button className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              <span className="flex items-center gap-3">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
                Teacher Workload Report
              </span>
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            
            <button className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              <span className="flex items-center gap-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.642A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                Lesson Plan Compliance
              </span>
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            
            <button className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              <span className="flex items-center gap-3">
                <svg className="w-5 h-5 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25m-17.25 0a2.25 2.25 0 012.25-2.25h12.75a2.25 2.25 0 012.25 2.25m-2.25 0h.008v.008h-.008V7.5z" />
                </svg>
                Resource Utilization
              </span>
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            
            <button className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              <span className="flex items-center gap-3">
                <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Intervention Progress Report
              </span>
              <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {reportData && (
        <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Report Preview</h2>
          <div className="mt-4 rounded-xl bg-slate-50 p-4">
            <pre className="text-sm text-slate-700 overflow-x-auto">{JSON.stringify(reportData, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
