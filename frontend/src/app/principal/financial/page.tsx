"use client";

import { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/principal";

const api = authFetchFor("PRINCIPAL");

type FinancialSummary = {
  total_budget: number;
  spent: number;
  remaining: number;
  utilization_rate: string;
  fiscal_year: string;
};

type BudgetAllocation = {
  allocation_id: number;
  category: string;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  fiscal_year: string;
};

type Expense = {
  expense_id: number;
  description: string;
  amount: number;
  category: string;
  date: string;
  status: string;
  approved_by?: string;
};

export default function FinancialOversightPage() {
  const [summary, setSummary] = useState<FinancialSummary | null>(null);
  const [allocations, setAllocations] = useState<BudgetAllocation[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "allocations" | "expenses">("overview");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function fetchFinancialData() {
    setLoading(true);
    try {
      const [summaryRes, allocationsRes, expensesRes] = await Promise.all([
        api(`${API_BASE}/financial/summary`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        api(`${API_BASE}/financial/allocations`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        api(`${API_BASE}/financial/expenses`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

      if (allocationsRes.ok) {
        const allocationsData = await allocationsRes.json();
        setAllocations(allocationsData);
      }

      if (expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: "Failed to load financial data." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchFinancialData();
  }, []);

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("et-ET", {
      style: "currency",
      currency: "ETB",
    }).format(value);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Financial Oversight</h1>
        <p className="mt-1 text-sm text-slate-500">Monitor budget, allocations, and expenses</p>
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
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "overview"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("allocations")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "allocations"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Budget Allocations
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "expenses"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Expenses
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm border border-slate-200">
          Loading...
        </div>
      ) : (
        <>
          {activeTab === "overview" && summary && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                  <p className="text-sm text-slate-500 mb-1">Total Budget</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(summary.total_budget)}</p>
                  <p className="text-xs text-slate-400 mt-1">Fiscal Year: {summary.fiscal_year}</p>
                </div>
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                  <p className="text-sm text-slate-500 mb-1">Spent</p>
                  <p className="text-2xl font-bold text-rose-600">{formatCurrency(summary.spent)}</p>
                  <p className="text-xs text-slate-400 mt-1">{summary.utilization_rate} utilized</p>
                </div>
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                  <p className="text-sm text-slate-500 mb-1">Remaining</p>
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.remaining)}</p>
                  <p className="text-xs text-slate-400 mt-1">Available balance</p>
                </div>
                <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                  <p className="text-sm text-slate-500 mb-1">Utilization Rate</p>
                  <p className="text-2xl font-bold text-indigo-600">{summary.utilization_rate}</p>
                  <p className="text-xs text-slate-400 mt-1">Budget efficiency</p>
                </div>
              </div>

              {/* Budget Progress */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Budget Utilization</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600">Overall Budget</span>
                      <span className="text-sm font-medium text-slate-900">{summary.utilization_rate}</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full transition-all"
                        style={{ width: summary.utilization_rate }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "allocations" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Budget Allocations</h2>
                </div>
                {allocations.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">No budget allocations found.</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3">Allocated</th>
                        <th className="px-6 py-3">Spent</th>
                        <th className="px-6 py-3">Remaining</th>
                        <th className="px-6 py-3">Utilization</th>
                        <th className="px-6 py-3">Fiscal Year</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {allocations.map((allocation) => {
                        const utilization = ((allocation.spent_amount / allocation.allocated_amount) * 100).toFixed(1);
                        return (
                          <tr key={allocation.allocation_id} className="hover:bg-slate-50">
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{allocation.category}</td>
                            <td className="px-6 py-4 text-sm text-slate-500">{formatCurrency(allocation.allocated_amount)}</td>
                            <td className="px-6 py-4 text-sm text-slate-500">{formatCurrency(allocation.spent_amount)}</td>
                            <td className="px-6 py-4 text-sm text-emerald-600">{formatCurrency(allocation.remaining_amount)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      parseFloat(utilization) > 90 ? "bg-rose-500" :
                                      parseFloat(utilization) > 70 ? "bg-amber-500" :
                                      "bg-emerald-500"
                                    }`}
                                    style={{ width: `${utilization}%` }}
                                  />
                                </div>
                                <span className="text-sm text-slate-600">{utilization}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500">{allocation.fiscal_year}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === "expenses" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Recent Expenses</h2>
                </div>
                {expenses.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">No expenses found.</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-3">Description</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3">Amount</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Approved By</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {expenses.map((expense) => (
                        <tr key={expense.expense_id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{expense.description}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{expense.category}</td>
                          <td className="px-6 py-4 text-sm text-slate-900 font-medium">{formatCurrency(expense.amount)}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{new Date(expense.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              expense.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" :
                              expense.status === "PENDING" ? "bg-amber-50 text-amber-700" :
                              "bg-rose-50 text-rose-700"
                            }`}>
                              {expense.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{expense.approved_by || "N/A"}</td>
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
