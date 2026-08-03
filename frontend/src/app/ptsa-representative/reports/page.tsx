"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/ptsa";

type Report = {
  report_id: number;
  title: string;
  type: string;
  description: string;
  generated_at: string;
  file_url?: string;
};

type PTSAActivity = {
  activity_id: number;
  activity_type: string;
  description: string;
  date: string;
  participants: number;
  outcome: string;
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [ptsaActivities, setPTSAActivities] = useState<PTSAActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    loadReportsData();
  }, []);

  async function loadReportsData() {
    setLoading(true);
    try {
      const [reportsRes, activitiesRes] = await Promise.all([
        fetch(`${API_BASE}/reports`),
        fetch(`${API_BASE}/reports/ptsa-activities`),
      ]);

      if (reportsRes.ok) setReports(await reportsRes.json());
      if (activitiesRes.ok) setPTSAActivities(await activitiesRes.json());
    } catch (error) {
      console.error("Error loading reports data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function generateSchoolReport() {
    setGeneratingReport(true);
    try {
      const res = await fetch(`${API_BASE}/reports/school-performance`, {
        method: "POST",
      });
      if (res.ok) {
        alert("School performance report generated successfully!");
        loadReportsData();
      }
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setGeneratingReport(false);
    }
  }

  async function generatePTSAReport() {
    setGeneratingReport(true);
    try {
      const res = await fetch(`${API_BASE}/reports/ptsa-activity`, {
        method: "POST",
      });
      if (res.ok) {
        alert("PTSA activity report generated successfully!");
        loadReportsData();
      }
    } catch (error) {
      console.error("Error generating report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setGeneratingReport(false);
    }
  }

  async function downloadReport(reportId: number) {
    try {
      const res = await fetch(`${API_BASE}/reports/${reportId}/download`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `report-${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      alert("Failed to download report. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Export</h1>
          <p className="text-sm text-slate-500 mt-1">Generate and download school and PTSA reports</p>
        </div>
      </div>

      {/* Generate Reports */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          onClick={generateSchoolReport}
          disabled={generatingReport}
          className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 hover:border-teal-300 transition text-left disabled:opacity-50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900">School Performance Report</p>
              <p className="text-xs text-slate-500">Academic, attendance, financial summary</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Generate a comprehensive PDF report summarizing school performance across academic, attendance, and financial metrics.
          </p>
        </button>

        <button
          onClick={generatePTSAReport}
          disabled={generatingReport}
          className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 hover:border-teal-300 transition text-left disabled:opacity-50"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900">PTSA Activity Report</p>
              <p className="text-xs text-slate-500">Meetings, resolutions, feedback</p>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Generate a report on PTSA activities including meetings held, resolutions passed, and feedback submitted.
          </p>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500">Loading reports...</div>
        </div>
      ) : (
        <>
          {/* Available Reports */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Available Reports</h2>
            <div className="space-y-3">
              {reports.map((report) => (
                <div key={report.report_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{report.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{report.type} • {report.description}</p>
                      <p className="text-xs text-slate-400 mt-2">Generated: {new Date(report.generated_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() => downloadReport(report.report_id)}
                      className="shrink-0 rounded-lg bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 transition flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      Download
                    </button>
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <p className="text-sm text-slate-400">No reports available yet. Generate a report to get started.</p>
              )}
            </div>
          </div>

          {/* PTSA Activities Summary */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">PTSA Activities Summary</h2>
            <div className="space-y-3">
              {ptsaActivities.map((activity) => (
                <div key={activity.activity_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                          {activity.activity_type}
                        </span>
                        <span className="text-xs text-slate-500">{new Date(activity.date).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm text-slate-600">{activity.description}</p>
                      <div className="flex gap-4 mt-2 text-xs text-slate-500">
                        <span>Participants: {activity.participants}</span>
                        <span>Outcome: {activity.outcome}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {ptsaActivities.length === 0 && (
                <p className="text-sm text-slate-400">No PTSA activities recorded yet.</p>
              )}
            </div>
          </div>

          {/* Print Options */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Print Options</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.2-.54-1.227-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5zm-3 0h.008v.008H15V10.5z" />
                </svg>
                Print Current Page
              </button>
              <Link
                href="/ptsa-representative"
                className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
                Print Dashboard
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
