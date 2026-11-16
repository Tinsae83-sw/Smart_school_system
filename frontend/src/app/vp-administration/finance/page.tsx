"use client";

import React, { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CalendarDays, CircleDollarSign, FilePlus2, PiggyBank, Plus, RefreshCw, Wallet } from "lucide-react";
import { financeApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAdministrationTranslations } from "@/translations/vp-administration";
import { principalTranslations } from "@/translations/principal";

type Budget = {
  budget_id: number;
  budget_name: string;
  academic_year: string;
  total_amount: number;
  allocated_amount: number;
  spent_amount: number;
  remaining_amount: number;
  status: string;
};

type Expenditure = {
  expenditure_id: number;
  budget_id: number;
  category: string;
  description: string;
  amount: number;
  expenditure_date: string;
  status: string;
};

type IncomeTransaction = {
  income_id: number;
  income_source: string;
  amount: number;
  description: string;
  income_date: string;
};

type PurchaseRequest = {
  request_id: number;
  request_number: string;
  item_name: string;
  quantity: number;
  total_cost: number;
  category: string;
  priority: string;
  status: string;
  requester?: {
    full_name: string;
  };
};

export default function FinancePage() {
  const { language } = useLanguage();
  const t = vpAdministrationTranslations[language].financePage;
  const schoolName = principalTranslations[language].yekatitSchool;
  const [activeTab, setActiveTab] = useState<"budget" | "expenditures" | "income" | "requests">("budget");
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [income, setIncome] = useState<IncomeTransaction[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"expenditure" | "income" | "request">("expenditure");
  const [formData, setFormData] = useState({
    budget_id: "",
    category: "",
    description: "",
    amount: "",
    expenditure_date: "",
    income_source: "",
    income_date: "",
    item_name: "",
    quantity: "",
    unit_cost: "",
    priority: "MEDIUM",
    justification: "",
  });

  const categories = ["SALARIES", "MATERIALS", "INFRASTRUCTURE", "MAINTENANCE", "EXTRACURRICULAR", "EQUIPMENT"];
  const incomeSources = ["GOVERNMENT_GRANT", "SCHOOL_FEES", "DONATION", "PTSA_CONTRIBUTION", "OTHER"];
  const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const requestCategories = ["EQUIPMENT", "MATERIALS", "SUPPLIES", "SERVICES"];
  const statuses = ["PENDING", "APPROVED", "REJECTED", "ORDERED", "RECEIVED"];

  function translateValue(value: string | null | undefined) {
    if (typeof value !== "string" || value.length === 0) return "-";

    const labels: Record<string, string> = {
      ACTIVE: t.active,
      PENDING: t.pending,
      APPROVED: t.approved,
      REJECTED: t.rejected,
      ORDERED: t.ordered,
      RECEIVED: t.received,
      CLOSED: t.closed,
      SALARIES: t.salaries,
      MATERIALS: t.materials,
      INFRASTRUCTURE: t.infrastructure,
      MAINTENANCE: t.maintenance,
      EXTRACURRICULAR: t.extracurricular,
      EQUIPMENT: t.equipment,
      GOVERNMENT_GRANT: t.governmentGrant,
      SCHOOL_FEES: t.schoolFees,
      DONATION: t.donation,
      PTSA_CONTRIBUTION: t.ptsaContribution,
      OTHER: t.other,
      LOW: t.low,
      MEDIUM: t.medium,
      HIGH: t.high,
      URGENT: t.urgent,
      SUPPLIES: t.supplies,
      SERVICES: t.services,
    };
    return labels[value] ?? value.replace(/_/g, " ");
  }

  async function fetchData() {
    setLoading(true);
    try {
      const [budRes, expRes, incRes, reqRes] = await Promise.all([
        financeApi.get('/budgets'),
        financeApi.get('/expenditures'),
        financeApi.get('/income'),
        financeApi.get('/purchase-requests'),
      ]);

      if (budRes.ok) setBudgets(await budRes.json());
      if (expRes.ok) setExpenditures(await expRes.json());
      if (incRes.ok) setIncome(await incRes.json());
      if (reqRes.ok) setPurchaseRequests(await reqRes.json());
    } catch (error) {
      console.error("Failed to fetch financial data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function openModal(type: "expenditure" | "income" | "request") {
    setModalType(type);
    setFormData({
      budget_id: "",
      category: "",
      description: "",
      amount: "",
      expenditure_date: "",
      income_source: "",
      income_date: "",
      item_name: "",
      quantity: "",
      unit_cost: "",
      priority: "MEDIUM",
      justification: "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let url = "";
      let payload = {};

      if (modalType === "expenditure") {
        url = '/expenditures';
        payload = {
          budget_id: parseInt(formData.budget_id),
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          expenditure_date: formData.expenditure_date,
        };
      } else if (modalType === "income") {
        url = '/income';
        payload = {
          income_source: formData.income_source,
          amount: parseFloat(formData.amount),
          description: formData.description,
          income_date: formData.income_date,
        };
      } else if (modalType === "request") {
        url = '/purchase-requests';
        payload = {
          item_name: formData.item_name,
          quantity: parseInt(formData.quantity),
          unit_cost: parseFloat(formData.unit_cost),
          total_cost: parseFloat(formData.quantity) * parseFloat(formData.unit_cost),
          category: formData.category,
          priority: formData.priority,
          justification: formData.justification,
        };
      }

      const res = await financeApi.post(url, payload);

      if (res.ok) {
        setShowModal(false);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to submit:", error);
    }
  }

  async function handleRequestAction(requestId: number, action: "approve" | "reject") {
    try {
      const res = await financeApi.post(`/purchase-requests/${requestId}/${action}`, {});
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "ACTIVE": return "bg-emerald-50 text-emerald-700";
      case "PENDING": return "bg-amber-50 text-amber-700";
      case "APPROVED": return "bg-emerald-50 text-emerald-700";
      case "REJECTED": return "bg-rose-50 text-rose-700";
      case "ORDERED": return "bg-sky-50 text-sky-700";
      case "RECEIVED": return "bg-emerald-50 text-emerald-700";
      case "CLOSED": return "bg-gray-50 text-gray-700";
      default: return "bg-gray-50 text-gray-700";
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "LOW": return "bg-blue-50 text-blue-700";
      case "MEDIUM": return "bg-amber-50 text-amber-700";
      case "HIGH": return "bg-orange-50 text-orange-700";
      case "URGENT": return "bg-rose-50 text-rose-700";
      default: return "bg-gray-50 text-gray-700";
    }
  }

  function formatCurrency(amount: number) {
    return new Intl.NumberFormat("et-ET", {
      style: "currency",
      currency: "ETB",
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
  }

  const totalBudget = budgets.reduce((total, budget) => total + Number(budget.total_amount || 0), 0);
  const totalSpent = budgets.reduce((total, budget) => total + Number(budget.spent_amount || 0), 0);
  const totalRemaining = budgets.reduce((total, budget) => total + Number(budget.remaining_amount || 0), 0);
  const totalIncome = income.reduce((total, transaction) => total + Number(transaction.amount || 0), 0);
  const pendingRequests = purchaseRequests.filter((request) => request.status === "PENDING").length;
  const activeBudgets = budgets.filter((budget) => budget.status === "ACTIVE").length;
  const budgetUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const recentActivity = [
    ...income.map((transaction) => ({
      id: `income-${transaction.income_id}`,
      title: translateValue(transaction.income_source),
      description: transaction.description,
      date: transaction.income_date,
      amount: Number(transaction.amount || 0),
      direction: "income" as const,
    })),
    ...expenditures.map((transaction) => ({
      id: `expense-${transaction.expenditure_id}`,
      title: translateValue(transaction.category),
      description: transaction.description,
      date: transaction.expenditure_date,
      amount: Number(transaction.amount || 0),
      direction: "expense" as const,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);
  const currentDate = new Intl.DateTimeFormat(language === "am" ? "am-ET" : "en-ET", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{schoolName}</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.title} · {t.subtitle}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
                {t.workspace}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {currentDate}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
                <CircleDollarSign className="h-3.5 w-3.5" aria-hidden="true" />
                {pendingRequests} {t.pendingRequests}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => openModal("expenditure")}
              className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-orange-700"
            >
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              {t.addExpenditure}
            </button>
            <button
              onClick={() => openModal("income")}
              className="inline-flex items-center gap-2 rounded-xl bg-navy-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-navy-700"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t.addIncome}
            </button>
          </div>
        </div>
      </section>

      <section aria-label="Financial summary" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t.totalBudget, value: formatCurrency(totalBudget), icon: Wallet, accent: "bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400", detail: t.budgetOverview },
          { label: t.spent, value: formatCurrency(totalSpent), icon: ArrowUpRight, accent: "bg-orange-50 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", detail: t.expenditureLog },
          { label: t.remaining, value: formatCurrency(totalRemaining), icon: PiggyBank, accent: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", detail: t.utilization },
          { label: t.income, value: formatCurrency(totalIncome), icon: ArrowDownLeft, accent: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400", detail: t.incomeTransactions },
        ].map((stat) => (
          <article key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.accent}`}>
                <stat.icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</span>
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.detail}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.8fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.budgetOverview}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{activeBudgets} {t.active.toLowerCase()} {t.budgetHealth.toLowerCase()}</p>
            </div>
            <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800 dark:bg-teal-900/30 dark:text-teal-200">
              {activeBudgets} {t.active.toLowerCase()}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.totalBudget}</p>
              <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.spent}</p>
              <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{formatCurrency(totalSpent)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.remaining}</p>
              <p className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{formatCurrency(totalRemaining)}</p>
            </div>
          </div>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600 dark:text-slate-300">{t.utilization}</span>
              <span className="font-semibold text-slate-900 dark:text-white">{budgetUtilization.toFixed(1)}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700" role="progressbar" aria-valuenow={Math.min(100, Math.round(budgetUtilization))} aria-valuemin={0} aria-valuemax={100} aria-label={t.utilization}>
              <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${Math.min(100, Math.max(0, budgetUtilization))}%` }} />
            </div>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.quickActions}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.financialOverview}</p>
            </div>
          </div>
          <div className="space-y-2">
            <button onClick={() => openModal("expenditure")} className="flex w-full items-center gap-3 rounded-xl bg-orange-50 px-4 py-3 text-left text-sm font-medium text-orange-800 transition hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-200 dark:hover:bg-orange-900/50">
              <ArrowUpRight className="h-5 w-5" aria-hidden="true" />
              {t.addExpenditure}
              <Plus className="ml-auto h-4 w-4" aria-hidden="true" />
            </button>
            <button onClick={() => openModal("income")} className="flex w-full items-center gap-3 rounded-xl bg-teal-50 px-4 py-3 text-left text-sm font-medium text-teal-800 transition hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-200 dark:hover:bg-teal-900/50">
              <ArrowDownLeft className="h-5 w-5" aria-hidden="true" />
              {t.addIncome}
              <Plus className="ml-auto h-4 w-4" aria-hidden="true" />
            </button>
            <button onClick={() => openModal("request")} className="flex w-full items-center gap-3 rounded-xl bg-sky-50 px-4 py-3 text-left text-sm font-medium text-sky-800 transition hover:bg-sky-100 dark:bg-sky-900/30 dark:text-sky-200 dark:hover:bg-sky-900/50">
              <FilePlus2 className="h-5 w-5" aria-hidden="true" />
              {t.newRequest}
              <Plus className="ml-auto h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.recentActivity}</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.recentActivityDescription}</p>
          </div>
          <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-800 dark:bg-orange-900/30 dark:text-orange-200">
            {recentActivity.length} {t.transactions.toLowerCase()}
          </span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${activity.direction === "income" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"}`}>
                {activity.direction === "income" ? <ArrowDownLeft className="h-4 w-4" aria-hidden="true" /> : <ArrowUpRight className="h-4 w-4" aria-hidden="true" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{activity.title}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{activity.description}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className={`text-sm font-semibold ${activity.direction === "income" ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-white"}`}>
                  {activity.direction === "income" ? "+" : "-"}{formatCurrency(activity.amount)}
                </p>
                <p className="text-xs text-slate-400">{activity.date}</p>
              </div>
            </div>
          ))}
          {recentActivity.length === 0 && <p className="py-5 text-center text-sm text-slate-400 dark:text-slate-500">{t.noTransactions}</p>}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <nav role="tablist" aria-label="Finance sections" className="flex gap-1 overflow-x-auto border-b border-slate-200 px-3 pt-3 sm:px-5 dark:border-slate-800">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "budget"}
            onClick={() => setActiveTab("budget")}
            className={`shrink-0 rounded-t-xl px-4 py-3 text-sm font-medium transition ${
              activeTab === "budget"
                ? "border-b-2 border-teal-700 bg-teal-50/70 text-teal-800"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
            }`}
          >
            {t.budgetOverview}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "expenditures"}
            onClick={() => setActiveTab("expenditures")}
            className={`shrink-0 rounded-t-xl px-4 py-3 text-sm font-medium transition ${
              activeTab === "expenditures"
                ? "border-b-2 border-teal-700 bg-teal-50/70 text-teal-800"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">{t.expenditures}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{expenditures.length}</span></span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "income"}
            onClick={() => setActiveTab("income")}
            className={`shrink-0 rounded-t-xl px-4 py-3 text-sm font-medium transition ${
              activeTab === "income"
                ? "border-b-2 border-teal-700 bg-teal-50/70 text-teal-800"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">{t.income}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{income.length}</span></span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "requests"}
            onClick={() => setActiveTab("requests")}
            className={`shrink-0 rounded-t-xl px-4 py-3 text-sm font-medium transition ${
              activeTab === "requests"
                ? "border-b-2 border-teal-700 bg-teal-50/70 text-teal-800"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
            }`}
          >
            <span className="flex items-center gap-2">{t.purchaseRequests}<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{purchaseRequests.length}</span></span>
          </button>
        </nav>

      {loading ? (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-slate-500">
          <RefreshCw className="h-6 w-6 animate-spin text-teal-700" aria-hidden="true" />
          <p className="text-sm">{t.loading}</p>
        </div>
      ) : (
        <>
          {activeTab === "budget" && (
            <div className="space-y-4 p-4 sm:p-6">
              {budgets.map((budget) => {
                const spent = Number(budget.spent_amount || 0);
                const amount = Number(budget.total_amount || 0);
                const utilizationPercent = amount > 0 ? (spent / amount) * 100 : 0;
                const progressWidth = Math.min(100, Math.max(0, utilizationPercent));
                const healthColor = utilizationPercent < 70 ? "bg-teal-600" : utilizationPercent < 90 ? "bg-amber-500" : "bg-rose-500";
                
                return (
                  <article key={budget.budget_id} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-200 hover:shadow-sm sm:p-6">
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">{budget.budget_name}</h3>
                        <p className="mt-1 text-sm text-slate-500">{budget.academic_year}</p>
                      </div>
                      <span className={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${getStatusColor(budget.status)}`}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {translateValue(budget.status)}
                      </span>
                    </div>
                    
                    <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <div>
                        <p className="text-xs font-medium text-slate-500">{t.totalBudget}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">{t.spent}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{formatCurrency(spent)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">{t.remaining}</p>
                        <p className="mt-1 text-lg font-semibold text-teal-800">{formatCurrency(Number(budget.remaining_amount || 0))}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">{t.utilization}</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{utilizationPercent.toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={Math.round(progressWidth)} aria-valuemin={0} aria-valuemax={100} aria-label={`${budget.budget_name} ${t.utilization}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${healthColor}`}
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                  </article>
                );
              })}
              {budgets.length === 0 && (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-14 text-center">
                  <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-teal-700 shadow-sm"><CircleDollarSign className="h-6 w-6" aria-hidden="true" /></span>
                  <p className="text-sm font-medium text-slate-700">{t.noBudgets}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "expenditures" && (
            <div className="overflow-hidden border-t border-slate-100">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{t.expenditureLog}</h3>
                  <p className="mt-1 text-xs text-slate-500">{expenditures.length} {t.expenditures.toLowerCase()}</p>
                </div>
                <button
                  onClick={() => openModal("expenditure")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t.addExpenditure}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.date}</th>
                      <th className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.category}</th>
                      <th className="min-w-56 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.description}</th>
                      <th className="whitespace-nowrap px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.amount}</th>
                      <th className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {expenditures.map((exp) => (
                      <tr key={exp.expenditure_id} className="transition-colors hover:bg-slate-50/80">
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">{exp.expenditure_date}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">{translateValue(exp.category)}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{exp.description}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(exp.amount)}</td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(exp.status)}`}>
                            {translateValue(exp.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {expenditures.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                          {t.noExpenditures}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "income" && (
            <div className="overflow-hidden border-t border-slate-100">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{t.incomeTransactions}</h3>
                  <p className="mt-1 text-xs text-slate-500">{income.length} {t.income.toLowerCase()}</p>
                </div>
                <button
                  onClick={() => openModal("income")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t.addIncome}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.date}</th>
                      <th className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.source}</th>
                      <th className="min-w-56 px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.description}</th>
                      <th className="whitespace-nowrap px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.amount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {income.map((inc) => (
                      <tr key={inc.income_id} className="transition-colors hover:bg-slate-50/80">
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-500">{inc.income_date}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-700">{translateValue(inc.income_source)}</td>
                        <td className="px-5 py-4 text-sm text-slate-600">{inc.description}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums text-emerald-700">+{formatCurrency(inc.amount)}</td>
                      </tr>
                    ))}
                    {income.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">
                          {t.noIncome}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "requests" && (
            <div className="overflow-hidden border-t border-slate-100">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{t.purchaseRequests}</h3>
                  <p className="mt-1 text-xs text-slate-500">{purchaseRequests.length} {t.purchaseRequests.toLowerCase()}</p>
                </div>
                <button
                  onClick={() => openModal("request")}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-900"
                >
                  <FilePlus2 className="h-4 w-4" aria-hidden="true" />
                  {t.submit}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead>
                    <tr className="bg-slate-50/80">
                      <th className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.requestNumber}</th>
                      <th className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.item}</th>
                      <th className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.quantity}</th>
                      <th className="whitespace-nowrap px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.totalCost}</th>
                      <th className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.priority}</th>
                      <th className="whitespace-nowrap px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.status}</th>
                      <th className="whitespace-nowrap px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {purchaseRequests.map((req) => (
                      <tr key={req.request_id} className="transition-colors hover:bg-slate-50/80">
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold text-slate-900">{req.request_number}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-700">{req.item_name}</td>
                        <td className="px-5 py-4 text-sm text-slate-500">{req.quantity}</td>
                        <td className="whitespace-nowrap px-5 py-4 text-right text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(req.total_cost)}</td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityColor(req.priority)}`}>
                            {translateValue(req.priority)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(req.status)}`}>
                            {translateValue(req.status)}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-right">
                          {req.status === "PENDING" && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleRequestAction(req.request_id, "approve")}
                                className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition"
                              >
                                {t.approve}
                              </button>
                              <button
                                onClick={() => handleRequestAction(req.request_id, "reject")}
                                className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
                              >
                                {t.reject}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {purchaseRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                          {t.noRequests}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {modalType === "expenditure" && t.expenditureModal}
                {modalType === "income" && t.incomeModal}
                {modalType === "request" && t.requestModal}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {modalType === "expenditure" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.budget}</label>
                    <select
                      name="budget_id"
                      value={formData.budget_id}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">{t.selectBudget}</option>
                      {budgets.map(bud => (
                        <option key={bud.budget_id} value={bud.budget_id}>{bud.budget_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.category}</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">{t.selectCategory}</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{translateValue(cat)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.description}</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.amountETB}</label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.date}</label>
                      <input
                        type="date"
                        name="expenditure_date"
                        value={formData.expenditure_date}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {modalType === "income" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.incomeSource}</label>
                    <select
                      name="income_source"
                      value={formData.income_source}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="">{t.selectSource}</option>
                      {incomeSources.map(src => (
                        <option key={src} value={src}>{translateValue(src)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.description}</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.amountETB}</label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.date}</label>
                      <input
                        type="date"
                        name="income_date"
                        value={formData.income_date}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {modalType === "request" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.itemName}</label>
                    <input
                      type="text"
                      name="item_name"
                      value={formData.item_name}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.quantity}</label>
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        required
                        min="1"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.unitCost}</label>
                      <input
                        type="number"
                        name="unit_cost"
                        value={formData.unit_cost}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.category}</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">{t.selectCategory}</option>
                        {requestCategories.map(cat => (
                          <option key={cat} value={cat}>{translateValue(cat)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.priority}</label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        {priorities.map(pri => (
                          <option key={pri} value={pri}>{translateValue(pri)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.justification}</label>
                    <textarea
                      name="justification"
                      value={formData.justification}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition"
                >
                  {t.newRequest}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
