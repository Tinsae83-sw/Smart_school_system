"use client";

import React, { useEffect, useState } from "react";
import { vpAdminApi, authFetchFor } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000") + "/api/vp-administration";
const api = authFetchFor("VP_ADMINISTRATION");

type MealPlan = {
  plan_id: number;
  plan_name: string;
  plan_type: string;
  description?: string;
  daily_cost: number;
  is_active: boolean;
  created_at: string;
};

type FoodInventory = {
  inventory_id: number;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  reorder_level: number;
  unit_cost: number;
  supplier?: string;
  last_restocked?: string;
  expiry_date?: string;
};

type FoodTransaction = {
  transaction_id: number;
  item_name: string;
  transaction_type: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  transaction_date: string;
  reference?: string;
  notes?: string;
};

export default function CateringPage() {
  const [activeTab, setActiveTab] = useState<"plans" | "inventory" | "transactions">("plans");
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [inventory, setInventory] = useState<FoodInventory[]>([]);
  const [transactions, setTransactions] = useState<FoodTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"plan" | "inventory" | "transaction">("plan");
  const [formData, setFormData] = useState({
    plan_name: "",
    plan_type: "STANDARD",
    description: "",
    daily_cost: "",
    item_name: "",
    category: "GRAINS",
    quantity: "",
    unit: "KG",
    reorder_level: "",
    unit_cost: "",
    supplier: "",
    expiry_date: "",
    transaction_type: "RESTOCK",
    reference: "",
    notes: "",
  });

  const planTypes = ["STANDARD", "VEGETARIAN", "HALAL", "KOSHER", "SPECIAL_DIET"];
  const foodCategories = ["GRAINS", "VEGETABLES", "FRUITS", "DAIRY", "PROTEINS", "BEVERAGES", "SNACKS"];
  const units = ["KG", "LITERS", "PIECES", "PACKS", "BOXES"];
  const transactionTypes = ["RESTOCK", "USAGE", "WASTE", "ADJUSTMENT"];

  async function fetchData() {
    setLoading(true);
    try {
      const [mealPlans, foodInventory, foodTransactions] = await Promise.all([
        vpAdminApi.get('/meal-plans'),
        vpAdminApi.get('/food-inventory'),
        vpAdminApi.get('/food-transactions'),
      ]);
      setMealPlans(mealPlans || []);
      setInventory(foodInventory || []);
      setTransactions(foodTransactions || []);
    } catch (error) {
      console.error("Failed to fetch catering data:", error);
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

  function openModal(type: "plan" | "inventory" | "transaction") {
    setModalType(type);
    setFormData({
      plan_name: "",
      plan_type: "STANDARD",
      description: "",
      daily_cost: "",
      item_name: "",
      category: "GRAINS",
      quantity: "",
      unit: "KG",
      reorder_level: "",
      unit_cost: "",
      supplier: "",
      expiry_date: "",
      transaction_type: "RESTOCK",
      reference: "",
      notes: "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let url = "";
      let payload = {};

      if (modalType === "plan") {
        url = `${API_BASE}/meal-plans`;
        payload = {
          plan_name: formData.plan_name,
          plan_type: formData.plan_type,
          description: formData.description || null,
          daily_cost: parseFloat(formData.daily_cost),
        };
      } else if (modalType === "inventory") {
        url = `${API_BASE}/food-inventory`;
        payload = {
          item_name: formData.item_name,
          category: formData.category,
          quantity: parseFloat(formData.quantity),
          unit: formData.unit,
          reorder_level: parseFloat(formData.reorder_level),
          unit_cost: parseFloat(formData.unit_cost),
          supplier: formData.supplier || null,
          expiry_date: formData.expiry_date || null,
        };
      } else if (modalType === "transaction") {
        url = `${API_BASE}/food-transactions`;
        payload = {
          item_name: formData.item_name,
          transaction_type: formData.transaction_type,
          quantity: parseFloat(formData.quantity),
          unit_cost: parseFloat(formData.unit_cost),
          reference: formData.reference || null,
          notes: formData.notes || null,
        };
      }

      const res = await api(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to submit:", error);
    }
  }

  function getStockLevelColor(item: FoodInventory) {
    if (item.quantity <= 0) return "bg-rose-50 text-rose-700";
    if (item.quantity <= item.reorder_level) return "bg-amber-50 text-amber-700";
    return "bg-emerald-50 text-emerald-700";
  }

  function getTransactionTypeColor(type: string) {
    switch (type) {
      case "RESTOCK": return "bg-emerald-50 text-emerald-700";
      case "USAGE": return "bg-blue-50 text-blue-700";
      case "WASTE": return "bg-rose-50 text-rose-700";
      case "ADJUSTMENT": return "bg-amber-50 text-amber-700";
      default: return "bg-gray-50 text-gray-700";
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Catering Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage meal plans, food inventory, and transactions</p>
        </div>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("plans")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "plans"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Meal Plans ({mealPlans.length})
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "inventory"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Food Inventory ({inventory.length})
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "transactions"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Transactions ({transactions.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <>
          {activeTab === "plans" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Meal Plans</h3>
                <button
                  onClick={() => openModal("plan")}
                  className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition"
                >
                  Add Meal Plan
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Plan Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Daily Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mealPlans.map((plan) => (
                      <tr key={plan.plan_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{plan.plan_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{plan.plan_type}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">ETB {plan.daily_cost.toFixed(2)}</td>
                        <td className="px-6 py-3 text-sm text-slate-600 max-w-xs truncate">{plan.description || "-"}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${plan.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                            {plan.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {mealPlans.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                          No meal plans found. Click "Add Meal Plan" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Food Inventory</h3>
                <button
                  onClick={() => openModal("inventory")}
                  className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition"
                >
                  Add Inventory Item
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Item Name</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Unit Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Reorder Level</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Expiry Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventory.map((item) => (
                      <tr key={item.inventory_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{item.item_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{item.category}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{item.quantity} {item.unit}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">ETB {item.unit_cost.toFixed(2)}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{item.reorder_level} {item.unit}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{item.expiry_date || "-"}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStockLevelColor(item)}`}>
                            {item.quantity <= item.reorder_level ? "Low Stock" : "OK"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {inventory.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                          No inventory items found. Click "Add Inventory Item" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Food Transactions</h3>
                <button
                  onClick={() => openModal("transaction")}
                  className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition"
                >
                  Record Transaction
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Total Cost</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Reference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((trans) => (
                      <tr key={trans.transaction_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm text-slate-600">{new Date(trans.transaction_date).toLocaleString()}</td>
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{trans.item_name}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getTransactionTypeColor(trans.transaction_type)}`}>
                            {trans.transaction_type}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm text-slate-600">{trans.quantity}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">ETB {trans.total_cost.toFixed(2)}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{trans.reference || "-"}</td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                          No transactions recorded.
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
                {modalType === "plan" && "Add Meal Plan"}
                {modalType === "inventory" && "Add Inventory Item"}
                {modalType === "transaction" && "Record Transaction"}
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
              {modalType === "plan" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Plan Name *</label>
                    <input
                      type="text"
                      name="plan_name"
                      value={formData.plan_name}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Plan Type *</label>
                    <select
                      name="plan_type"
                      value={formData.plan_type}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      {planTypes.map(type => (
                        <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Daily Cost (ETB) *</label>
                    <input
                      type="number"
                      name="daily_cost"
                      value={formData.daily_cost}
                      onChange={handleInputChange}
                      required
                      step="0.01"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </>
              )}

              {modalType === "inventory" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
                      <input
                        type="text"
                        name="item_name"
                        value={formData.item_name}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        {foodCategories.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Unit *</label>
                      <select
                        name="unit"
                        value={formData.unit}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        {units.map(unit => (
                          <option key={unit} value={unit}>{unit}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost (ETB) *</label>
                      <input
                        type="number"
                        name="unit_cost"
                        value={formData.unit_cost}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Level *</label>
                      <input
                        type="number"
                        name="reorder_level"
                        value={formData.reorder_level}
                        onChange={handleInputChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                      <input
                        type="text"
                        name="supplier"
                        value={formData.supplier}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Expiry Date</label>
                      <input
                        type="date"
                        name="expiry_date"
                        value={formData.expiry_date}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {modalType === "transaction" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
                    <input
                      type="text"
                      name="item_name"
                      value={formData.item_name}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Type *</label>
                      <select
                        name="transaction_type"
                        value={formData.transaction_type}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        {transactionTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost (ETB) *</label>
                      <input
                        type="number"
                        name="unit_cost"
                        value={formData.unit_cost}
                        onChange={handleInputChange}
                        required
                        step="0.01"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Reference</label>
                      <input
                        type="text"
                        name="reference"
                        value={formData.reference}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
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
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
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
