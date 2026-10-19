"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/principal";

type AcademicReport = {
  report_id: number;
  report_type: string;
  title: string;
  description: string;
  generated_date: string;
  academic_year: string;
  data: any;
};

type ComplianceReport = {
  report_id: number;
  report_type: string;
  title: string;
  description: string;
  generated_date: string;
  status: string;
  submitted_date?: string;
};

type AuditLog = {
  log_id: number;
  action: string;
  performed_by: string;
  timestamp: string;
  details: string;
};

export default function ReportsPage() {
  const [academicReports, setAcademicReports] = useState<AcademicReport[]>([]);
  const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"academic" | "compliance" | "audit">("academic");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function fetchReports() {
    setLoading(true);
    try {
      const [academicRes, complianceRes, auditRes] = await Promise.all([
        fetch(`${API_BASE}/reports/academic`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/reports/compliance`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/reports/audit-logs`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      if (academicRes.ok) {
        const academicData = await academicRes.json();
        setAcademicReports(academicData);
      }

      if (complianceRes.ok) {
        const complianceData = await complianceRes.json();
        setComplianceReports(complianceData);
      }

      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: "Failed to load reports." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  function handleGenerateReport(reportType: string) {
    fetch(`${API_BASE}/reports/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ report_type: reportType }),
    })
      .then((res) => {
        if (res.ok) {
          setStatusMessage({ type: "success", message: "Report generated successfully." });
          fetchReports();
        } else {
          setStatusMessage({ type: "error", message: "Failed to generate report." });
        }
      })
      .catch(() => setStatusMessage({ type: "error", message: "Failed to generate report." }));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reports & Compliance</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">View academic reports, compliance documents, and audit logs</p>
      </div>

      {statusMessage && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${
          statusMessage.type === "success" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" : "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
        }`}>
          {statusMessage.message}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab("academic")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "academic"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Academic Reports ({academicReports.length})
          </button>
          <button
            onClick={() => setActiveTab("compliance")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "compliance"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Compliance Reports ({complianceReports.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "audit"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Audit Logs ({auditLogs.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700">
          Loading...
        </div>
      ) : (
        <>
          {activeTab === "academic" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Academic Reports</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerateReport("ENROLLMENT")}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Generate Enrollment Report
                  </button>
                  <button
                    onClick={() => handleGenerateReport("PERFORMANCE")}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Generate Performance Report
                  </button>
                  <button
                    onClick={() => handleGenerateReport("ATTENDANCE")}
                    className="rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Generate Attendance Report
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {academicReports.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No academic reports found.</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">Title</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Description</th>
                        <th className="px-6 py-3">Academic Year</th>
                        <th className="px-6 py-3">Generated Date</th>
                        <th className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {academicReports.map((report) => (
                        <tr key={report.report_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{report.title}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{report.report_type}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-md truncate">{report.description}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{report.academic_year}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(report.generated_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:hover:text-indigo-400">View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === "compliance" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Compliance Reports</h2>
                <button
                  onClick={() => handleGenerateReport("COMPLIANCE")}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                >
                  Generate Compliance Report
                </button>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {complianceReports.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No compliance reports found.</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">Title</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Description</th>
                        <th className="px-6 py-3">Generated Date</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Submitted Date</th>
                        <th className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {complianceReports.map((report) => (
                        <tr key={report.report_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{report.title}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{report.report_type}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-md truncate">{report.description}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(report.generated_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              report.status === "SUBMITTED" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" :
                              report.status === "PENDING" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                              "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            }`}>
                              {report.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                            {report.submitted_date ? new Date(report.submitted_date).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-sm text-indigo-600 hover:text-indigo-700 dark:hover:text-indigo-400">View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Audit Logs</h2>
                <button
                  onClick={() => handleGenerateReport("AUDIT")}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Export Audit Log
                </button>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No audit logs found.</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">Action</th>
                        <th className="px-6 py-3">Performed By</th>
                        <th className="px-6 py-3">Timestamp</th>
                        <th className="px-6 py-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {auditLogs.map((log) => (
                        <tr key={log.log_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{log.action}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{log.performed_by}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-md truncate">{log.details}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
