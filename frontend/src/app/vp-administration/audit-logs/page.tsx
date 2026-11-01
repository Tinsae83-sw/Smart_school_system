"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAdministrationReportingTranslations } from "@/translations/vp-administration-reporting";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/vp-administration";

type AuditLog = {
  log_id: number;
  user_name: string;
  action: string;
  timestamp: string;
  ip_address?: string;
  details?: unknown;
};

export default function AuditLogsPage() {
  const { language } = useLanguage();
  const t = vpAdministrationReportingTranslations[language];
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    user: "",
    action: "",
    dateFrom: "",
    dateTo: "",
  });

  function formatDetails(details: unknown): string {
    if (details === null || details === undefined || details === "") return "-";
    if (typeof details === "string") return details;
    if (typeof details === "object") return JSON.stringify(details);
    return String(details);
  }

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.user) params.append("user", filters.user);
      if (filters.action) params.append("action", filters.action);
      if (filters.dateFrom) params.append("date_from", filters.dateFrom);
      if (filters.dateTo) params.append("date_to", filters.dateTo);

      const res = await fetch(`${API_BASE}/audit-logs?${params.toString()}`);
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs();
  }, []);

  function handleFilterChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  }

  function applyFilters() {
    fetchLogs();
  }

  function clearFilters() {
    setFilters({ user: "", action: "", dateFrom: "", dateTo: "" });
    fetchLogs();
  }

  async function exportLogs() {
    try {
      const params = new URLSearchParams();
      if (filters.user) params.append("user", filters.user);
      if (filters.action) params.append("action", filters.action);
      if (filters.dateFrom) params.append("date_from", filters.dateFrom);
      if (filters.dateTo) params.append("date_to", filters.dateTo);

      const res = await fetch(`${API_BASE}/audit-logs/export?${params.toString()}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Failed to export logs:", error);
    }
  }

  function getActionColor(action: string) {
    const actionLower = action.toLowerCase();
    if (actionLower.includes("create") || actionLower.includes("add")) return "bg-orange-50 text-orange-700";
    if (actionLower.includes("update") || actionLower.includes("edit")) return "bg-blue-50 text-blue-700";
    if (actionLower.includes("delete") || actionLower.includes("remove")) return "bg-rose-50 text-rose-700";
    if (actionLower.includes("approve") || actionLower.includes("accept")) return "bg-orange-50 text-orange-700";
    if (actionLower.includes("reject") || actionLower.includes("deny")) return "bg-rose-50 text-rose-700";
    return "bg-gray-50 text-gray-700";
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.auditTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.auditSubtitle}</p>
        </div>
        <button
          onClick={exportLogs}
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition"
        >
          {t.exportLogs}
        </button>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t.user}</label>
            <input
              type="text"
              name="user"
              value={filters.user}
              onChange={handleFilterChange}
              placeholder={t.filterByUser}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t.action}</label>
            <input
              type="text"
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
              placeholder={t.filterByAction}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t.fromDate}</label>
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t.toDate}</label>
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            onClick={applyFilters}
            className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition"
          >
            {t.applyFilters}
          </button>
          <button
            onClick={clearFilters}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            {t.clearFilters}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">{t.loadingAuditLogs}</div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.timestamp}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.user}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.action}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.details}</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.ipAddress}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.log_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{log.user_name}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-md truncate">{formatDetails(log.details)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{log.ip_address || "-"}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                      {t.noAuditLogs}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
