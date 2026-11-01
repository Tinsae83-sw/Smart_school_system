"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { principalTranslations } from "@/translations/principal";

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
  const { language } = useLanguage();
  const t = principalTranslations[language];
  const [academicReports, setAcademicReports] = useState<AcademicReport[]>([]);
  const [complianceReports, setComplianceReports] = useState<ComplianceReport[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"academic" | "compliance" | "audit">("academic");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const fetchReportsRef = useRef<{ isFetching: boolean }>({ isFetching: false });
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showReportModal, setShowReportModal] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  const fetchReports = useCallback(async () => {
    if (fetchReportsRef.current.isFetching) return;
    fetchReportsRef.current.isFetching = true;
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
      setStatusMessage({ type: "error", message: language === "am" ? "ሪፖርቶችን መጫን አልተቻለም።" : "Failed to load reports." });
    } finally {
      setLoading(false);
      fetchReportsRef.current.isFetching = false;
    }
  }, [language]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function handleGenerateReport(reportType: string) {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const res = await fetch(`${API_BASE}/reports/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ report_type: reportType }),
      });

      if (res.ok) {
        setStatusMessage({ type: "success", message: language === "am" ? "ሪፖርቱ በተሳካ ሁኔታ ተፈጥሯል።" : "Report generated successfully." });
        await fetchReports();
      } else {
        const errorData = await res.json();
        setStatusMessage({ type: "error", message: errorData.error || (language === "am" ? "ሪፖርት መፍጠር አልተቻለም።" : "Failed to generate report.") });
      }
    } catch (error) {
      setStatusMessage({ type: "error", message: language === "am" ? "ሪፖርት መፍጠር አልተቻለም።" : "Failed to generate report." });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleExportAuditLogs() {
    try {
      const res = await fetch(`${API_BASE}/reports/audit-logs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (res.ok) {
        const data = await res.json();
        const csv = [
          `${t.action},${t.performedBy},${t.timestamp},${t.details}`,
          ...data.map((log: AuditLog) =>
            `"${log.action}","${log.performed_by}","${new Date(log.timestamp).toLocaleString()}","${log.details.replace(/"/g, '""')}"`
          )
        ].join("\n");

        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        setStatusMessage({ type: "success", message: language === "am" ? "የኦዲት መዝገቦቹ ወደ ውጭ ተልከዋል።" : "Audit logs exported successfully." });
      } else {
        setStatusMessage({ type: "error", message: language === "am" ? "የኦዲት መዝገቦቹን ወደ ውጭ መላክ አልተቻለም።" : "Failed to export audit logs." });
      }
    } catch (error) {
      setStatusMessage({ type: "error", message: language === "am" ? "የኦዲት መዝገቦቹን ወደ ውጭ መላክ አልተቻለም።" : "Failed to export audit logs." });
    }
  }

  function clearFilters() {
    setSearchQuery("");
    setYearFilter("");
    setStatusFilter("");
    setDateRange({ start: "", end: "" });
  }

  function getStatusLabel(status: string) {
    if (language === "en") return status;
    const labels: Record<string, string> = {
      PENDING: t.pending,
      SUBMITTED: t.submittedStatus,
      APPROVED: t.approved,
    };
    return labels[status] || status.replaceAll("_", " ");
  }

  function getReportTypeLabel(type: string) {
    if (language === "en") return type.replaceAll("_", " ");
    const labels: Record<string, string> = {
      ENROLLMENT: "ምዝገባ",
      PERFORMANCE: "አፈጻጸም",
      ATTENDANCE: "መገኘት",
      COMPLIANCE: "ተገዢነት",
    };
    return labels[type] || type.replaceAll("_", " ");
  }

  const filteredAcademicReports = academicReports.filter((report) => {
    const matchesSearch =
      searchQuery === "" ||
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesYear = yearFilter === "" || report.academic_year === yearFilter;

    return matchesSearch && matchesYear;
  });

  const filteredComplianceReports = complianceReports.filter((report) => {
    const matchesSearch =
      searchQuery === "" ||
      report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "" || report.status === statusFilter;

    const matchesDateRange =
      dateRange.start === "" && dateRange.end === "" ||
      (dateRange.start && new Date(report.generated_date) >= new Date(dateRange.start)) &&
      (dateRange.end && new Date(report.generated_date) <= new Date(dateRange.end));

    return matchesSearch && matchesStatus && matchesDateRange;
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    const matchesSearch =
      searchQuery === "" ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.performed_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDateRange =
      dateRange.start === "" && dateRange.end === "" ||
      (dateRange.start && new Date(log.timestamp) >= new Date(dateRange.start)) &&
      (dateRange.end && new Date(log.timestamp) <= new Date(dateRange.end));

    return matchesSearch && matchesDateRange;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.reports}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.reportsSubtitle}</p>
      </div>

      {statusMessage && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${
          statusMessage.type === "success" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800" : "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
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
                ? "border-b-2 border-orange-600 text-orange-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.academicReportsTab} ({academicReports.length})
          </button>
          <button
            onClick={() => setActiveTab("compliance")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "compliance"
                ? "border-b-2 border-orange-600 text-orange-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.complianceReports} ({complianceReports.length})
          </button>
          <button
            onClick={() => setActiveTab("audit")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "audit"
                ? "border-b-2 border-orange-600 text-orange-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.auditLogs} ({auditLogs.length})
          </button>
        </nav>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder={t.search}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 w-64"
        />
        {activeTab === "academic" && (
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
          >
            <option value="">{t.allYears}</option>
            <option value="2024">2024</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        )}
        {activeTab === "compliance" && (
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
          >
            <option value="">{t.allStatuses}</option>
            <option value="PENDING">{t.pending}</option>
            <option value="SUBMITTED">{t.submittedStatus}</option>
            <option value="APPROVED">{t.approved}</option>
          </select>
        )}
        {(activeTab === "compliance" || activeTab === "audit") && (
          <>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
            />
          </>
        )}
        {(searchQuery || yearFilter || statusFilter || dateRange.start || dateRange.end) && (
          <button
            onClick={clearFilters}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
          >
            {t.clearFilters}
          </button>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700">
          {t.loadingPage}
        </div>
      ) : (
        <>
          {activeTab === "academic" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.academicReportsTab}</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerateReport("ENROLLMENT")}
                    disabled={isGenerating}
                    className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? t.generating : t.generateEnrollmentReport}
                  </button>
                  <button
                    onClick={() => handleGenerateReport("PERFORMANCE")}
                    disabled={isGenerating}
                    className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? t.generating : t.generatePerformanceReport}
                  </button>
                  <button
                    onClick={() => handleGenerateReport("ATTENDANCE")}
                    disabled={isGenerating}
                    className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? t.generating : t.generateAttendanceReport}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {filteredAcademicReports.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    {academicReports.length === 0 ? t.noAcademicReports : t.noReportsMatch}
                  </div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">{t.title}</th>
                        <th className="px-6 py-3">{t.type}</th>
                        <th className="px-6 py-3">{t.description}</th>
                        <th className="px-6 py-3">{t.academicYear}</th>
                        <th className="px-6 py-3">{t.generatedDate}</th>
                        <th className="px-6 py-3">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredAcademicReports.map((report) => (
                        <tr key={report.report_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{report.title}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-xs font-medium">
                              {getReportTypeLabel(report.report_type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-md truncate">{report.description}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{report.academic_year}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(report.generated_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => { setSelectedReport(report); setShowReportModal(true); }}
                              className="text-sm text-orange-600 hover:text-orange-700 dark:hover:text-orange-400 font-medium"
                            >
                              View
                            </button>
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
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.complianceReports}</h2>
                <button
                  onClick={() => handleGenerateReport("COMPLIANCE")}
                  disabled={isGenerating}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? t.generating : t.generateComplianceReport}
                </button>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {filteredComplianceReports.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    {complianceReports.length === 0 ? t.noComplianceReports : t.noReportsMatch}
                  </div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">{t.title}</th>
                        <th className="px-6 py-3">{t.type}</th>
                        <th className="px-6 py-3">{t.description}</th>
                        <th className="px-6 py-3">{t.generatedDate}</th>
                        <th className="px-6 py-3">{t.status}</th>
                        <th className="px-6 py-3">{t.submittedDate}</th>
                        <th className="px-6 py-3">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredComplianceReports.map((report) => (
                        <tr key={report.report_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{report.title}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-xs font-medium">
                              {getReportTypeLabel(report.report_type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-md truncate">{report.description}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(report.generated_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              report.status === "SUBMITTED" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" :
                              report.status === "PENDING" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                              report.status === "APPROVED" ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300" :
                              "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            }`}>
                              {getStatusLabel(report.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                            {report.submitted_date ? new Date(report.submitted_date).toLocaleDateString() : t.notAvailable}
                          </td>
                          <td className="px-6 py-4">
                            <button 
                              onClick={() => { setSelectedReport(report); setShowReportModal(true); }}
                              className="text-sm text-orange-600 hover:text-orange-700 dark:hover:text-orange-400 font-medium"
                            >
                              {t.view}
                            </button>
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
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.auditLogs}</h2>
                <button
                  onClick={handleExportAuditLogs}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition"
                >
                  {t.exportCsv}
                </button>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                {filteredAuditLogs.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                    {auditLogs.length === 0 ? t.noAuditLogs : t.noLogsMatch}
                  </div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">{t.action}</th>
                        <th className="px-6 py-3">{t.performedBy}</th>
                        <th className="px-6 py-3">{t.timestamp}</th>
                        <th className="px-6 py-3">{t.details}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredAuditLogs.map((log) => (
                        <tr key={log.log_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 text-xs font-medium">
                              {log.action}
                            </span>
                          </td>
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

      {/* Report View Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-6 py-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedReport.title}</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.reportType}</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">{getReportTypeLabel(selectedReport.report_type)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.academicYear}</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">{selectedReport.academic_year}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.generatedDate}</p>
                    <p className="text-lg font-semibold text-slate-900 dark:text-white">{new Date(selectedReport.generated_date).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">{t.description}</p>
                  <p className="text-slate-900 dark:text-white">{selectedReport.description}</p>
                </div>

                {/* Report Data Display */}
                {selectedReport.data && (
                  <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t.reportData}</h3>
                    
                    {selectedReport.data.type === 'ENROLLMENT' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{selectedReport.data.total_students || 0}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalStudents}</p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{Object.keys(selectedReport.data.enrollment_by_grade || {}).length}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t.gradeLevels}</p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{selectedReport.data.attendance_rate ?? t.notAvailable}%</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t.attendanceRate}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{t.enrollmentByGrade}</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {Object.entries(selectedReport.data.enrollment_by_grade || {}).map(([grade, count]) => (
                              <div key={grade} className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{count}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t.grade} {grade}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{t.enrollmentByGender}</h4>
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-lg p-3 text-center">
                              <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{selectedReport.data.enrollment_by_gender?.male || 0}</p>
                              <p className="text-xs text-blue-600 dark:text-blue-400">{t.male}</p>
                            </div>
                            <div className="bg-pink-50 dark:bg-pink-900/30 rounded-lg p-3 text-center">
                              <p className="text-xl font-bold text-pink-700 dark:text-pink-300">{selectedReport.data.enrollment_by_gender?.female || 0}</p>
                              <p className="text-xs text-pink-600 dark:text-pink-400">{t.female}</p>
                            </div>
                            <div className="bg-purple-50 dark:bg-purple-900/30 rounded-lg p-3 text-center">
                              <p className="text-xl font-bold text-purple-700 dark:text-purple-300">{selectedReport.data.enrollment_by_gender?.other || 0}</p>
                              <p className="text-xs text-purple-600 dark:text-purple-400">{t.other}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedReport.data.type === 'PERFORMANCE' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{selectedReport.data.total_grades || 0}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalGrades}</p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{Object.keys(selectedReport.data.performance_by_grade || {}).length}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t.gradeLevels}</p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{selectedReport.data.average_score ?? t.notAvailable}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t.averageScore}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{t.performanceByGrade}</h4>
                          <div className="grid grid-cols-4 gap-2">
                            {Object.entries(selectedReport.data.performance_by_grade || {}).map(([grade, data]) => (
                              <div key={grade} className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{data.average || 0}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t.grade} {grade}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{t.gradeDistribution}</h4>
                          <div className="grid grid-cols-5 gap-2">
                            {Object.entries(selectedReport.data.grade_distribution || {}).map(([grade, count]) => (
                              <div key={grade} className="bg-white dark:bg-slate-800 rounded-lg p-3 text-center">
                                <p className="text-xl font-bold text-slate-900 dark:text-white">{count}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">{t.grade} {grade}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedReport.data.type === 'ATTENDANCE' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{selectedReport.data.total_records || 0}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalRecords}</p>
                          </div>
                          <div className="bg-orange-50 dark:bg-orange-900/30 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{selectedReport.data.present_count || 0}</p>
                            <p className="text-sm text-orange-600 dark:text-orange-400">{t.present}</p>
                          </div>
                          <div className="bg-rose-50 dark:bg-rose-900/30 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-rose-600 dark:text-rose-400">{selectedReport.data.absent_count || 0}</p>
                            <p className="text-sm text-rose-600 dark:text-rose-400">{t.absent}</p>
                          </div>
                          <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{selectedReport.data.late_count || 0}</p>
                            <p className="text-sm text-amber-600 dark:text-amber-400">{t.late}</p>
                          </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 text-center">
                          <p className="text-5xl font-bold text-orange-600 dark:text-orange-400">{selectedReport.data.attendance_rate || 0}%</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">{t.overallAttendanceRate}</p>
                        </div>
                      </div>
                    )}

                    {selectedReport.report_type === 'COMPLIANCE' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{getStatusLabel(selectedReport.status)}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t.status}</p>
                          </div>
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 text-center">
                            <p className="text-3xl font-bold text-slate-900 dark:text-white">{selectedReport.academic_year}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{t.academicYear}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{t.complianceType}</h4>
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                            <p className="text-slate-900 dark:text-white">{selectedReport.compliance_type || 'GENERAL'}</p>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{t.actionRequired}</h4>
                          <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                            <p className={`font-medium ${selectedReport.action_required ? 'text-rose-600 dark:text-rose-400' : 'text-orange-600 dark:text-orange-400'}`}>
                              {selectedReport.action_required ? t.yes : t.no}
                            </p>
                          </div>
                        </div>

                        {selectedReport.submitted_date && (
                          <div>
                            <h4 className="font-semibold text-slate-900 dark:text-white mb-2">{t.submittedDate}</h4>
                            <div className="bg-white dark:bg-slate-800 rounded-lg p-3">
                              <p className="text-slate-900 dark:text-white">{new Date(selectedReport.submitted_date).toLocaleString()}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
