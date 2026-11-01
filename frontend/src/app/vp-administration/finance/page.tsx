"use client";

import React, { useEffect, useState } from "react";
import { vpAdminApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAdministrationTranslations } from "@/translations/vp-administration";

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
  requested_by: string;
};

export default function FinancePage() {
  const { language } = useLanguage();
  const t = vpAdministrationTranslations[language].financePage;
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

  function translateValue(value: string) {
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
        vpAdminApi.get('/budgets'),
        vpAdminApi.get('/expenditures'),
        vpAdminApi.get('/income'),
        vpAdminApi.get('/purchase-requests'),
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

      const res = await vpAdminApi.post(url, payload);

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
      const res = await vpAdminApi.post(`/purchase-requests/${requestId}/${action}`, {});
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "ACTIVE": return "bg-orange-50 text-orange-700";
      case "PENDING": return "bg-amber-50 text-amber-700";
      case "APPROVED": return "bg-orange-50 text-orange-700";
      case "REJECTED": return "bg-rose-50 text-rose-700";
      case "ORDERED": return "bg-blue-50 text-blue-700";
      case "RECEIVED": return "bg-orange-50 text-orange-700";
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
    return new Intl.NumberFormat("et-ET", { style: "currency", currency: "ETB" }).format(amount);
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
        </div>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("budget")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "budget"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.budgetOverview}
          </button>
          <button
            onClick={() => setActiveTab("expenditures")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "expenditures"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.expenditures} ({expenditures.length})
          </button>
          <button
            onClick={() => setActiveTab("income")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "income"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.income} ({income.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "requests"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.purchaseRequests} ({purchaseRequests.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">{t.loading}</div>
        </div>
      ) : (
        <>
          {activeTab === "budget" && (
            <div className="space-y-6">
              {budgets.map((budget) => {
                const utilizationPercent = (budget.spent_amount / budget.total_amount) * 100;
                const healthColor = utilizationPercent < 70 ? "bg-orange-500" : utilizationPercent < 90 ? "bg-amber-500" : "bg-rose-500";
                
                return (
                  <div key={budget.budget_id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{budget.budget_name}</h3>
                        <p className="text-sm text-slate-500">{budget.academic_year}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(budget.status)}`}>
                        {translateValue(budget.status)}
                      </span>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">{t.totalBudget}</p>
                        <p className="text-xl font-bold text-slate-900">{formatCurrency(budget.total_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">{t.spent}</p>
                        <p className="text-xl font-bold text-rose-600">{formatCurrency(budget.spent_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">{t.remaining}</p>
                        <p className="text-xl font-bold text-orange-600">{formatCurrency(budget.remaining_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">{t.utilization}</p>
                        <p className="text-xl font-bold text-slate-900">{utilizationPercent.toFixed(1)}%</p>
                      </div>
                    </div>

                    <div className="relative h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`absolute left-0 top-0 h-full transition-all duration-500 ${healthColor}`}
                        style={{ width: `${utilizationPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {budgets.length === 0 && (
                <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-200">
                  <p className="text-sm text-slate-400">{t.noBudgets}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "expenditures" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">{t.expenditureLog}</h3>
                <button
                  onClick={() => openModal("expenditure")}
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition"
                >
                  {t.addExpenditure}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.date}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.category}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.description}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.amount}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenditures.map((exp) => (
                      <tr key={exp.expenditure_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm text-slate-600">{exp.expenditure_date}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{translateValue(exp.category)}</td>
                        <td className="px-6 py-3 text-sm text-slate-700">{exp.description}</td>
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{formatCurrency(exp.amount)}</td>
                        <td className="px-6 py-3">
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
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">{t.incomeTransactions}</h3>
                <button
                  onClick={() => openModal("income")}
                  className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition"
                >
                  {t.addIncome}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.date}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.source}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.description}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.amount}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {income.map((inc) => (
                      <tr key={inc.income_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm text-slate-600">{inc.income_date}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{translateValue(inc.income_source)}</td>
                        <td className="px-6 py-3 text-sm text-slate-700">{inc.description}</td>
                        <td className="px-6 py-3 text-sm font-medium text-orange-600">+{formatCurrency(inc.amount)}</td>
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
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">{t.purchaseRequests}</h3>
                <button
                  onClick={() => openModal("request")}
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition"
                >
                  {t.submit}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.requestNumber}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.item}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.quantity}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.totalCost}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.priority}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.status}</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchaseRequests.map((req) => (
                      <tr key={req.request_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{req.request_number}</td>
                        <td className="px-6 py-3 text-sm text-slate-700">{req.item_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{req.quantity}</td>
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{formatCurrency(req.total_cost)}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getPriorityColor(req.priority)}`}>
                            {translateValue(req.priority)}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(req.status)}`}>
                            {translateValue(req.status)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
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

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
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
