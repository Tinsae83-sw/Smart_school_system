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
        <h1 className="text-2xl font-bold text-slate-900">Reports & Compliance</h1>
        <p className="mt-1 text-sm text-slate-500">View academic reports, compliance documents, and audit logs</p>
      </div>

      {statusMessage && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${
          statusMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
        }`}>
          {statusMessage.message}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab("academic")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "academic"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Academic Reports ({academicReports.length})
          </button>
          <button
            onClick={() => setActiveTab("compliance")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "compliance"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Compliance Reports ({complianceReports.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "audit"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Audit Logs ({auditLogs.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm border border-slate-200">
          Loading...
        </div>
      ) : (
        <>
          {activeTab === "academic" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Academic Reports</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerateReport("ENROLLMENT")}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Generate Enrollment Report
                  </button>
                  <button
                    onClick={() => handleGenerateReport("PERFORMANCE")}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Generate Performance Report
                  </button>
                  <button
                    onClick={() => handleGenerateReport("ATTENDANCE")}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Generate Attendance Report
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                {academicReports.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">No academic reports found.</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-3">Title</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Description</th>
                        <th className="px-6 py-3">Academic Year</th>
                        <th className="px-6 py-3">Generated Date</th>
                        <th className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {academicReports.map((report) => (
                        <tr key={report.report_id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{report.title}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{report.report_type}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-md truncate">{report.description}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{report.academic_year}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{new Date(report.generated_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <button className="text-sm text-indigo-600 hover:text-indigo-700">View</button>
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
                <h2 className="text-lg font-bold text-slate-900">Compliance Reports</h2>
                <button
                  onClick={() => handleGenerateReport("COMPLIANCE")}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                >
                  Generate Compliance Report
                </button>
              </div>

              <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                {complianceReports.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">No compliance reports found.</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-3">Title</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Description</th>
                        <th className="px-6 py-3">Generated Date</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Submitted Date</th>
                        <th className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {complianceReports.map((report) => (
                        <tr key={report.report_id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{report.title}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{report.report_type}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-md truncate">{report.description}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{new Date(report.generated_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              report.status === "SUBMITTED" ? "bg-emerald-50 text-emerald-700" :
                              report.status === "PENDING" ? "bg-amber-50 text-amber-700" :
                              "bg-slate-50 text-slate-700"
                            }`}>
                              {report.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {report.submitted_date ? new Date(report.submitted_date).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="px-6 py-4">
                            <button className="text-sm text-indigo-600 hover:text-indigo-700">View</button>
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
                <h2 className="text-lg font-bold text-slate-900">Audit Logs</h2>
                <button
                  onClick={() => handleGenerateReport("AUDIT")}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Export Audit Log
                </button>
              </div>

              <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                {auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">No audit logs found.</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-3">Action</th>
                        <th className="px-6 py-3">Performed By</th>
                        <th className="px-6 py-3">Timestamp</th>
                        <th className="px-6 py-3">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.map((log) => (
                        <tr key={log.log_id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{log.action}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{log.performed_by}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 max-w-md truncate">{log.details}</td>
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
