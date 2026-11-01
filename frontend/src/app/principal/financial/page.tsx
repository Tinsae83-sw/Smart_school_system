"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { principalTranslations } from "@/translations/principal";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/principal";

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
  const { language } = useLanguage();
  const t = principalTranslations[language];
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
        fetch(`${API_BASE}/financial/summary`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/financial/allocations`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/financial/expenses`, {
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
      setStatusMessage({ type: "error", message: language === "am" ? "የፋይናንስ መረጃን መጫን አልተቻለም።" : "Failed to load financial data." });
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
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.financialOversight}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.financialSubtitle}</p>
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
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "overview"
                ? "border-b-2 border-navy-600 text-navy-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.overview}
          </button>
          <button
            onClick={() => setActiveTab("allocations")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "allocations"
                ? "border-b-2 border-navy-600 text-navy-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.budgetAllocations}
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "expenses"
                ? "border-b-2 border-navy-600 text-navy-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.expenses}
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700">
          {t.loadingPage}
        </div>
      ) : (
        <>
          {activeTab === "overview" && summary && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t.totalBudget}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{formatCurrency(summary.total_budget)}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.fiscalYear}: {summary.fiscal_year}</p>
                </div>
                <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t.spent}</p>
                  <p className="text-2xl font-bold text-rose-600">{formatCurrency(summary.spent)}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{summary.utilization_rate} {t.utilized}</p>
                </div>
                <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t.remaining}</p>
                  <p className="text-2xl font-bold text-orange-600">{formatCurrency(summary.remaining)}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.availableBalance}</p>
                </div>
                <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t.utilizationRate}</p>
                  <p className="text-2xl font-bold text-navy-600">{summary.utilization_rate}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.budgetEfficiency}</p>
                </div>
              </div>

              {/* Budget Progress */}
              <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t.budgetUtilization}</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">{t.overallBudget}</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">{summary.utilization_rate}</span>
                    </div>
                    <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-navy-600 rounded-full transition-all"
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
              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.budgetAllocations}</h2>
                </div>
                {allocations.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t.noAllocations}</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">{t.category}</th>
                        <th className="px-6 py-3">{t.allocated}</th>
                        <th className="px-6 py-3">{t.spent}</th>
                        <th className="px-6 py-3">{t.remaining}</th>
                        <th className="px-6 py-3">{t.utilization}</th>
                        <th className="px-6 py-3">{t.fiscalYear}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {allocations.map((allocation) => {
                        const utilization = ((allocation.spent_amount / allocation.allocated_amount) * 100).toFixed(1);
                        return (
                          <tr key={allocation.allocation_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                            <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{allocation.category}</td>
                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{formatCurrency(allocation.allocated_amount)}</td>
                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{formatCurrency(allocation.spent_amount)}</td>
                            <td className="px-6 py-4 text-sm text-orange-600">{formatCurrency(allocation.remaining_amount)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-24 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${
                                      parseFloat(utilization) > 90 ? "bg-rose-500" :
                                      parseFloat(utilization) > 70 ? "bg-amber-500" :
                                      "bg-orange-500"
                                    }`}
                                    style={{ width: `${utilization}%` }}
                                  />
                                </div>
                                <span className="text-sm text-slate-600 dark:text-slate-400">{utilization}%</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{allocation.fiscal_year}</td>
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
              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.recentExpenses}</h2>
                </div>
                {expenses.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t.noExpenses}</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">{t.description}</th>
                        <th className="px-6 py-3">{t.category}</th>
                        <th className="px-6 py-3">{t.amount}</th>
                        <th className="px-6 py-3">{t.date}</th>
                        <th className="px-6 py-3">{t.status}</th>
                        <th className="px-6 py-3">{t.approvedBy}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {expenses.map((expense) => (
                        <tr key={expense.expense_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{expense.description}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{expense.category}</td>
                          <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium">{formatCurrency(expense.amount)}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(expense.date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              expense.status === "APPROVED" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" :
                              expense.status === "PENDING" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                              "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                            }`}>
                              {expense.status === "APPROVED" ? t.approved : expense.status === "PENDING" ? t.pending : expense.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{expense.approved_by || t.notAvailable}</td>
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
