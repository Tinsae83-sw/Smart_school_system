"use client";

import React, { useState } from "react";
import { vpAdminApi } from "@/lib/api";

type ReportType = 
  | "asset" 
  | "financial" 
  | "facility" 
  | "staff" 
  | "procurement" 
  | "incident";

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType | null>(null);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const reportTypes = [
    { id: "asset" as ReportType, name: "Asset Report", description: "Complete inventory of all school assets", icon: "📦", color: "bg-blue-500" },
    { id: "financial" as ReportType, name: "Financial Report", description: "Budget vs expenditure analysis", icon: "💰", color: "bg-emerald-500" },
    { id: "facility" as ReportType, name: "Facility Utilization", description: "Facility usage and maintenance status", icon: "🏢", color: "bg-purple-500" },
    { id: "staff" as ReportType, name: "Staff Attendance", description: "Non-academic staff attendance summary", icon: "👥", color: "bg-orange-500" },
    { id: "procurement" as ReportType, name: "Procurement Report", description: "Purchase requests and inventory status", icon: "🛒", color: "bg-pink-500" },
    { id: "incident" as ReportType, name: "Incident Report", description: "Disciplinary incidents and actions", icon: "⚠️", color: "bg-red-500" },
  ];

  async function generateReport(reportType: ReportType) {
    setLoading(true);
    setReportData(null);
    setReportError(null);
    try {
      const params = new URLSearchParams();
      if (dateRange.start) params.append("start_date", dateRange.start);
      if (dateRange.end) params.append("end_date", dateRange.end);
      
      const data = await vpAdminApi.get(`/reports/${reportType}?${params.toString()}`);
      setReportData(data.data ?? data);
    } catch (error: any) {
      console.error("Failed to generate report:", error);
      setReportError(error?.message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 p-3 shadow-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Administrative Reports</h1>
              <p className="text-sm text-slate-500 mt-0.5">Generate and export comprehensive administrative reports</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-purple-600">📈</span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Reports</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{reportTypes.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-emerald-600">✅</span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Available</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{reportTypes.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600">📥</span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Formats</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">2</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-600">🔍</span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Filters</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">Date Range</p>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="mb-8 bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-slate-600">📅</span>
            <h3 className="text-sm font-semibold text-slate-700">Date Range Filter</h3>
            <span className="text-xs text-slate-400 ml-auto">Optional</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>
          </div>
        </div>

        {/* Report Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {reportTypes.map((report) => (
            <div
              key={report.id}
              className="group bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:border-purple-300 hover:shadow-lg transition-all duration-200 cursor-pointer"
              onClick={() => setSelectedReport(report.id)}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`flex h-14 w-14 items-center justify-center rounded-xl ${report.color} bg-opacity-10`}>
                  <span className="text-3xl">{report.icon}</span>
                </div>
                <div className="rounded-full bg-slate-100 p-2 opacity-0 group-hover:opacity-100 transition">
                  <span className="text-slate-600">📄</span>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">{report.name}</h3>
              <p className="text-sm text-slate-500 mb-4 line-clamp-2">{report.description}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  generateReport(report.id);
                }}
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>📥</span>
                    Generate Report
                  </span>
                )}
              </button>
            </div>
          ))}
        </div>

        {selectedReport && (
          <div className="mt-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {reportTypes.find(r => r.id === selectedReport)?.name} Details
              </h3>
              <button
                onClick={() => setSelectedReport(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {selectedReport === "asset" && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Asset Report Includes:</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                    <li>Complete asset inventory with details</li>
                    <li>Asset condition and status breakdown</li>
                    <li>Asset assignment tracking</li>
                    <li>Maintenance schedule overview</li>
                    <li>Total asset valuation</li>
                  </ul>
                </div>
              )}

              {selectedReport === "financial" && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Financial Report Includes:</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                    <li>Budget vs actual expenditure analysis</li>
                    <li>Income transaction summary</li>
                    <li>Expenditure by category</li>
                    <li>Purchase request status</li>
                    <li>Financial health indicators</li>
                  </ul>
                </div>
              )}

              {selectedReport === "facility" && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Facility Report Includes:</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                    <li>Facility utilization statistics</li>
                    <li>Booking summary and trends</li>
                    <li>Maintenance request status</li>
                    <li>Facility condition assessment</li>
                    <li>Capacity utilization analysis</li>
                  </ul>
                </div>
              )}

              {selectedReport === "staff" && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Staff Report Includes:</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                    <li>Staff attendance records</li>
                    <li>Leave request summary</li>
                    <li>Staff roster overview</li>
                    <li>Attendance patterns analysis</li>
                    <li>Active vs inactive staff breakdown</li>
                  </ul>
                </div>
              )}

              {selectedReport === "procurement" && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Procurement Report Includes:</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                    <li>Purchase request history</li>
                    <li>Inventory stock levels</li>
                    <li>Supplier performance summary</li>
                    <li>Stock transaction log</li>
                    <li>Low stock alerts</li>
                  </ul>
                </div>
              )}

              {selectedReport === "incident" && (
                <div className="rounded-xl bg-slate-50 p-4">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">Incident Report Includes:</h4>
                  <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
                    <li>Incident log with details</li>
                    <li>Disciplinary actions summary</li>
                    <li>Incident type breakdown</li>
                    <li>Resolution status tracking</li>
                    <li>Trends and patterns analysis</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => generateReport(selectedReport)}
                disabled={loading}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Generating..." : "Generate Report"}
              </button>
            </div>

            {reportError && (
              <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm text-rose-700">
                {reportError}
              </div>
            )}

            {reportData !== null && (
              <div className="mt-4 rounded-xl bg-slate-50 border border-slate-200 p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-2">
                  Report Data ({Array.isArray(reportData) ? reportData.length : Object.keys(reportData).length} records)
                </h4>
                <pre className="max-h-96 overflow-auto rounded-lg bg-white border border-slate-200 p-3 text-xs text-slate-600 whitespace-pre-wrap">
                  {JSON.stringify(reportData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
