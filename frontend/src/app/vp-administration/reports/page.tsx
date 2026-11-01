"use client";

import React, { useState } from "react";
import { vpAdminApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAdministrationReportingTranslations } from "@/translations/vp-administration-reporting";

type ReportType = 
  | "asset" 
  | "financial" 
  | "facility" 
  | "staff" 
  | "procurement" 
  | "incident";

export default function ReportsPage() {
  const { language } = useLanguage();
  const t = vpAdministrationReportingTranslations[language];
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    { id: "asset" as ReportType, name: t.assetReport, description: t.assetReportDescription, icon: "📦", color: "bg-blue-500" },
    { id: "financial" as ReportType, name: t.financialReport, description: t.financialReportDescription, icon: "💰", color: "bg-orange-500" },
    { id: "facility" as ReportType, name: t.facilityUtilization, description: t.facilityUtilizationDescription, icon: "🏢", color: "bg-purple-500" },
    { id: "staff" as ReportType, name: t.staffAttendance, description: t.staffAttendanceDescription, icon: "👥", color: "bg-orange-500" },
    { id: "procurement" as ReportType, name: t.procurementReport, description: t.procurementReportDescription, icon: "🛒", color: "bg-pink-500" },
    { id: "incident" as ReportType, name: t.incidentReport, description: t.incidentReportDescription, icon: "⚠️", color: "bg-red-500" },
  ];

  async function generateReport(reportType: ReportType) {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.append("start_date", dateRange.start);
      if (dateRange.end) params.append("end_date", dateRange.end);
      
      const res = await vpAdminApi.get(`/reports/${reportType}?${params.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${reportType}-report-${new Date().toISOString().split("T")[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert(t.reportNotImplemented);
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert(t.reportGenerationFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.administrativeReports}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.reportsSubtitle}</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalReports}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{reportTypes.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <span className="text-2xl">📊</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.available}</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{reportTypes.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.formats}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">2</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-2xl">📥</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.filters}</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{t.dateRange}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="mb-8 rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-slate-600 dark:text-slate-400">📅</span>
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{t.dateRangeFilter}</h3>
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{t.optional}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.startDate}</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 dark:bg-slate-700 dark:text-white transition"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.endDate}</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:focus:ring-amber-400 dark:bg-slate-700 dark:text-white transition"
            />
          </div>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reportTypes.map((report) => (
          <div
            key={report.id}
            className="group bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-lg transition-all duration-200 cursor-pointer"
            onClick={() => setSelectedReport(report.id)}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${report.color} bg-opacity-10`}>
                <span className="text-3xl">{report.icon}</span>
              </div>
              <div className="rounded-full bg-slate-100 dark:bg-slate-700 p-2 opacity-0 group-hover:opacity-100 transition">
                <span className="text-slate-600 dark:text-slate-400">📄</span>
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{report.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">{report.description}</p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                generateReport(report.id);
              }}
              disabled={loading}
              className="w-full rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-200"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t.generating}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>📥</span>
                  {t.generateReport}
                </span>
              )}
            </button>
          </div>
        ))}
      </div>

      {selectedReport && (
        <div className="mt-8 rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {reportTypes.find(r => r.id === selectedReport)?.name} {t.reportDetails}
            </h3>
            <button
              onClick={() => setSelectedReport(null)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {selectedReport === "asset" && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.assetReportIncludes}</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  <li>{t.completeAssetInventory}</li>
                  <li>{t.assetConditionBreakdown}</li>
                  <li>{t.assetAssignmentTracking}</li>
                  <li>{t.maintenanceScheduleOverview}</li>
                  <li>{t.totalAssetValuation}</li>
                </ul>
              </div>
            )}

            {selectedReport === "financial" && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.financialReportIncludes}</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  <li>{t.budgetExpenditureAnalysis}</li>
                  <li>{t.incomeTransactionSummary}</li>
                  <li>{t.expenditureByCategory}</li>
                  <li>{t.purchaseRequestStatus}</li>
                  <li>{t.financialHealthIndicators}</li>
                </ul>
              </div>
            )}

            {selectedReport === "facility" && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.facilityReportIncludes}</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  <li>{t.facilityUtilizationStatistics}</li>
                  <li>{t.bookingSummaryTrends}</li>
                  <li>{t.maintenanceRequestStatus}</li>
                  <li>{t.facilityConditionAssessment}</li>
                  <li>{t.capacityUtilizationAnalysis}</li>
                </ul>
              </div>
            )}

            {selectedReport === "staff" && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.staffReportIncludes}</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  <li>{t.staffAttendanceRecords}</li>
                  <li>{t.leaveRequestSummary}</li>
                  <li>{t.staffRosterOverview}</li>
                  <li>{t.attendancePatternsAnalysis}</li>
                  <li>{t.staffStatusBreakdown}</li>
                </ul>
              </div>
            )}

            {selectedReport === "procurement" && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.procurementReportIncludes}</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  <li>{t.purchaseRequestHistory}</li>
                  <li>{t.inventoryStockLevels}</li>
                  <li>{t.supplierPerformanceSummary}</li>
                  <li>{t.stockTransactionLog}</li>
                  <li>{t.lowStockAlerts}</li>
                </ul>
              </div>
            )}

            {selectedReport === "incident" && (
              <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">{t.incidentReportIncludes}</h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-slate-600 dark:text-slate-400">
                  <li>{t.incidentLogDetails}</li>
                  <li>{t.disciplinaryActionsSummary}</li>
                  <li>{t.incidentTypeBreakdown}</li>
                  <li>{t.resolutionStatusTracking}</li>
                  <li>{t.trendsPatternsAnalysis}</li>
                </ul>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => generateReport(selectedReport)}
              disabled={loading}
              className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t.generating : t.downloadPdf}
            </button>
            <button
              onClick={() => generateReport(selectedReport)}
              disabled={loading}
              className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t.generating : t.downloadExcel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
