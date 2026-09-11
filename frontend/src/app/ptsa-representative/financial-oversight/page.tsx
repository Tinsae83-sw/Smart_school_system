"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetchFor } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000") + "/api/ptsa";
const api = authFetchFor("PTSA_REPRESENTATIVE");

type BudgetSummary = {
  fiscal_year: string;
  total_income: number;
  total_expenditure: number;
  balance: number;
};

type ExpenditureBreakdown = {
  category: string;
  amount: number;
  percentage: number;
};

type PTSAFund = {
  fund_id: number;
  fund_name: string;
  total_contributions: number;
  total_used: number;
  remaining_balance: number;
  description: string;
};

type ProcurementReport = {
  procurement_id: number;
  item_name: string;
  category: string;
  amount: number;
  purchase_date: string;
  vendor: string;
  status: string;
};

export default function FinancialOversightPage() {
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [expenditureBreakdown, setExpenditureBreakdown] = useState<ExpenditureBreakdown[]>([]);
  const [ptsaFunds, setPTSAFunds] = useState<PTSAFund[]>([]);
  const [procurementReports, setProcurementReports] = useState<ProcurementReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvisoryForm, setShowAdvisoryForm] = useState(false);
  const [advisoryText, setAdvisoryText] = useState("");

  useEffect(() => {
    loadFinancialData();
  }, []);

  async function loadFinancialData() {
    setLoading(true);
    try {
      const [budgetRes, expenditureRes, fundsRes, procurementRes] = await Promise.all([
        api(`${API_BASE}/financial/budget-summary`),
        api(`${API_BASE}/financial/expenditure-breakdown`),
        api(`${API_BASE}/financial/ptsa-funds`),
        api(`${API_BASE}/financial/procurement-reports`),
      ]);

      if (budgetRes.ok) setBudgetSummary(await budgetRes.json());
      if (expenditureRes.ok) setExpenditureBreakdown(await expenditureRes.json());
      if (fundsRes.ok) setPTSAFunds(await fundsRes.json());
      if (procurementRes.ok) setProcurementReports(await procurementRes.json());
    } catch (error) {
      console.error("Error loading financial data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function submitAdvisory() {
    if (!advisoryText.trim()) return;
    
    try {
      await api(`${API_BASE}/financial/budget-advisory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ advisory: advisoryText }),
      });
      setAdvisoryText("");
      setShowAdvisoryForm(false);
      alert("Budget advisory submitted successfully!");
    } catch (error) {
      console.error("Error submitting advisory:", error);
      alert("Failed to submit advisory. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Oversight</h1>
          <p className="text-sm text-slate-500 mt-1">School budget and expenditure monitoring (Read-Only / Advisory)</p>
        </div>
        <button
          onClick={() => setShowAdvisoryForm(true)}
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
        >
          Submit Budget Advisory
        </button>
      </div>

      {showAdvisoryForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Submit Budget Advisory</h2>
          <textarea
            value={advisoryText}
            onChange={(e) => setAdvisoryText(e.target.value)}
            placeholder="Provide your non-binding suggestions on budget priorities..."
            className="w-full rounded-xl border border-slate-200 p-4 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-none"
            rows={4}
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={submitAdvisory}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
            >
              Submit Advisory
            </button>
            <button
              onClick={() => setShowAdvisoryForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500">Loading financial data...</div>
        </div>
      ) : (
        <>
          {/* Budget Summary */}
          {budgetSummary && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Income</p>
                <p className="text-3xl font-bold text-emerald-600 mt-2">
                  ETB {budgetSummary.total_income.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">{budgetSummary.fiscal_year}</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total Expenditure</p>
                <p className="text-3xl font-bold text-amber-600 mt-2">
                  ETB {budgetSummary.total_expenditure.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">{budgetSummary.fiscal_year}</p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Balance</p>
                <p className="text-3xl font-bold text-teal-600 mt-2">
                  ETB {budgetSummary.balance.toLocaleString()}
                </p>
                <p className="text-xs text-slate-400 mt-1">{budgetSummary.fiscal_year}</p>
              </div>
            </div>
          )}

          {/* Expenditure Breakdown */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Expenditure Breakdown</h2>
            <div className="space-y-4">
              {expenditureBreakdown.map((item) => (
                <div key={item.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">{item.category}</span>
                    <span className="text-sm text-slate-600">ETB {item.amount.toLocaleString()}</span>
                  </div>
                  <div className="h-6 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full flex items-center justify-end pr-2 transition-all"
                      style={{ width: `${item.percentage}%` }}
                    >
                      <span className="text-xs font-bold text-white">{item.percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* PTSA Fund Management */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">PTSA Fund Management</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Fund Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Description</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Total Contributions</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Used</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {ptsaFunds.map((fund) => (
                    <tr key={fund.fund_id} className="border-b border-slate-100">
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">{fund.fund_name}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{fund.description}</td>
                      <td className="py-3 px-4 text-sm text-emerald-600 font-medium">ETB {fund.total_contributions.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-amber-600 font-medium">ETB {fund.total_used.toLocaleString()}</td>
                      <td className="py-3 px-4 text-sm text-teal-600 font-medium">ETB {fund.remaining_balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Procurement Reports */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Major Procurements</h2>
            <div className="space-y-3">
              {procurementReports.map((report) => (
                <div key={report.procurement_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{report.item_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{report.category} â€¢ {report.vendor}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      report.status === "Completed" ? "bg-emerald-50 text-emerald-700" : 
                      report.status === "Pending" ? "bg-amber-50 text-amber-700" : 
                      "bg-blue-50 text-blue-700"
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-slate-400">{new Date(report.purchase_date).toLocaleDateString()}</p>
                    <p className="text-sm font-semibold text-slate-900">ETB {report.amount.toLocaleString()}</p>
                  </div>
                </div>
              ))}
              {procurementReports.length === 0 && (
                <p className="text-sm text-slate-400">No procurement reports available.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
