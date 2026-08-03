"use client";

import React, { useEffect, useState } from "react";
import { vpAdminApi } from "@/lib/api";

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
      case "ACTIVE": return "bg-emerald-50 text-emerald-700";
      case "PENDING": return "bg-amber-50 text-amber-700";
      case "APPROVED": return "bg-emerald-50 text-emerald-700";
      case "REJECTED": return "bg-rose-50 text-rose-700";
      case "ORDERED": return "bg-blue-50 text-blue-700";
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
    return new Intl.NumberFormat("et-ET", { style: "currency", currency: "ETB" }).format(amount);
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Financial Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage budgets, expenditures, income, and purchase requests</p>
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
            Budget Overview
          </button>
          <button
            onClick={() => setActiveTab("expenditures")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "expenditures"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Expenditures ({expenditures.length})
          </button>
          <button
            onClick={() => setActiveTab("income")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "income"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Income ({income.length})
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "requests"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Purchase Requests ({purchaseRequests.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <>
          {activeTab === "budget" && (
            <div className="space-y-6">
              {budgets.map((budget) => {
                const utilizationPercent = (budget.spent_amount / budget.total_amount) * 100;
                const healthColor = utilizationPercent < 70 ? "bg-emerald-500" : utilizationPercent < 90 ? "bg-amber-500" : "bg-rose-500";
                
                return (
                  <div key={budget.budget_id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">{budget.budget_name}</h3>
                        <p className="text-sm text-slate-500">{budget.academic_year}</p>
                      </div>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(budget.status)}`}>
                        {budget.status}
                      </span>
                    </div>
                    
                    <div className="grid gap-4 sm:grid-cols-4 mb-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Total Budget</p>
                        <p className="text-xl font-bold text-slate-900">{formatCurrency(budget.total_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Spent</p>
                        <p className="text-xl font-bold text-rose-600">{formatCurrency(budget.spent_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Remaining</p>
                        <p className="text-xl font-bold text-emerald-600">{formatCurrency(budget.remaining_amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-wider">Utilization</p>
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
                  <p className="text-sm text-slate-400">No budgets found.</p>
                </div>
              )}
            </div>
          )}

          {activeTab === "expenditures" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Expenditure Log</h3>
                <button
                  onClick={() => openModal("expenditure")}
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition"
                >
                  Add Expenditure
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenditures.map((exp) => (
                      <tr key={exp.expenditure_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm text-slate-600">{exp.expenditure_date}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{exp.category}</td>
                        <td className="px-6 py-3 text-sm text-slate-700">{exp.description}</td>
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{formatCurrency(exp.amount)}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(exp.status)}`}>
                            {exp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {expenditures.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                          No expenditures recorded.
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
                <h3 className="text-sm font-semibold text-slate-700">Income Transactions</h3>
                <button
                  onClick={() => openModal("income")}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Add Income
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {income.map((inc) => (
                      <tr key={inc.income_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm text-slate-600">{inc.income_date}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{inc.income_source.replace(/_/g, " ")}</td>
                        <td className="px-6 py-3 text-sm text-slate-700">{inc.description}</td>
                        <td className="px-6 py-3 text-sm font-medium text-emerald-600">+{formatCurrency(inc.amount)}</td>
                      </tr>
                    ))}
                    {income.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">
                          No income transactions recorded.
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
                <h3 className="text-sm font-semibold text-slate-700">Purchase Requests</h3>
                <button
                  onClick={() => openModal("request")}
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition"
                >
                  New Request
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Request #</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Total Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Priority</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
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
                            {req.priority}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(req.status)}`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right">
                          {req.status === "PENDING" && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleRequestAction(req.request_id, "approve")}
                                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleRequestAction(req.request_id, "reject")}
                                className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {purchaseRequests.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                          No purchase requests found.
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
                {modalType === "expenditure" && "Add Expenditure"}
                {modalType === "income" && "Add Income"}
                {modalType === "request" && "New Purchase Request"}
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Budget</label>
                    <select
                      name="budget_id"
                      value={formData.budget_id}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select budget</option>
                      {budgets.map(bud => (
                        <option key={bud.budget_id} value={bud.budget_id}>{bud.budget_name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">Select category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount (ETB)</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">Income Source</label>
                    <select
                      name="income_source"
                      value={formData.income_source}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Select source</option>
                      {incomeSources.map(src => (
                        <option key={src} value={src}>{src.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Amount (ETB)</label>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                      <input
                        type="date"
                        name="income_date"
                        value={formData.income_date}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {modalType === "request" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Item Name</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quantity</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost (ETB)</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        <option value="">Select category</option>
                        {requestCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                      <select
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      >
                        {priorities.map(pri => (
                          <option key={pri} value={pri}>{pri}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Justification</label>
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
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
