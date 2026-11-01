"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAdministrationTranslations } from "@/translations/vp-administration";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/vp-administration";

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
  const { language } = useLanguage();
  const t = vpAdministrationTranslations[language].cateringPage;
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
    quantity: "",
    reference: "",
    notes: "",
  });

  const planTypes = ["STANDARD", "VEGETARIAN", "HALAL", "KOSHER", "SPECIAL_DIET"];
  const foodCategories = ["GRAINS", "VEGETABLES", "FRUITS", "DAIRY", "PROTEINS", "BEVERAGES", "SNACKS"];
  const units = ["KG", "LITERS", "PIECES", "PACKS", "BOXES"];
  const transactionTypes = ["RESTOCK", "USAGE", "WASTE", "ADJUSTMENT"];

  function translateValue(value: string) {
    const labels: Record<string, string> = {
      STANDARD: t.standard,
      VEGETARIAN: t.vegetarian,
      HALAL: t.halal,
      KOSHER: t.kosher,
      SPECIAL_DIET: t.specialDiet,
      GRAINS: t.grains,
      VEGETABLES: t.vegetables,
      FRUITS: t.fruits,
      DAIRY: t.dairy,
      PROTEINS: t.proteins,
      BEVERAGES: t.beverages,
      SNACKS: t.snacks,
      KG: t.kilograms,
      LITERS: t.liters,
      PIECES: t.pieces,
      PACKS: t.packs,
      BOXES: t.boxes,
      RESTOCK: t.restock,
      USAGE: t.usage,
      WASTE: t.waste,
      ADJUSTMENT: t.adjustment,
    };
    return labels[value] ?? value.replace(/_/g, " ");
  }

  async function fetchData() {
    setLoading(true);
    try {
      const [planRes, invRes, transRes] = await Promise.all([
        fetch(`${API_BASE}/meal-plans`),
        fetch(`${API_BASE}/food-inventory`),
        fetch(`${API_BASE}/food-transactions`),
      ]);

      if (planRes.ok) setMealPlans(await planRes.json());
      if (invRes.ok) setInventory(await invRes.json());
      if (transRes.ok) setTransactions(await transRes.json());
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
      quantity: "",
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

      const res = await fetch(url, {
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
    return "bg-orange-50 text-orange-700";
  }

  function getTransactionTypeColor(type: string) {
    switch (type) {
      case "RESTOCK": return "bg-orange-50 text-orange-700";
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
          <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{t.subtitle}</p>
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
            {t.mealPlans} ({mealPlans.length})
          </button>
          <button
            onClick={() => setActiveTab("inventory")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "inventory"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.foodInventory} ({inventory.length})
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "transactions"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.transactions} ({transactions.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">{t.loading}</div>
        </div>
      ) : (
        <>
          {activeTab === "plans" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">{t.mealPlans}</h3>
                <button
                  onClick={() => openModal("plan")}
                  className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition"
                >
                  {t.addMealPlan}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.planName}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.type}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.dailyCost}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.description}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mealPlans.map((plan) => (
                      <tr key={plan.plan_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{plan.plan_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{translateValue(plan.plan_type)}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">ETB {plan.daily_cost.toFixed(2)}</td>
                        <td className="px-6 py-3 text-sm text-slate-600 max-w-xs truncate">{plan.description || "-"}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${plan.is_active ? "bg-orange-50 text-orange-700" : "bg-rose-50 text-rose-700"}`}>
                            {plan.is_active ? t.active : t.inactive}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {mealPlans.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                          {t.noMealPlans}
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
                <h3 className="text-sm font-semibold text-slate-700">{t.foodInventory}</h3>
                <button
                  onClick={() => openModal("inventory")}
                  className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition"
                >
                  {t.addInventoryItem}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.itemName}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.category}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.quantity}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.unitCost}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.reorderLevel}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.expiryDate}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventory.map((item) => (
                      <tr key={item.inventory_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{item.item_name}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{translateValue(item.category)}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{item.quantity} {translateValue(item.unit)}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">ETB {item.unit_cost.toFixed(2)}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{item.reorder_level} {translateValue(item.unit)}</td>
                        <td className="px-6 py-3 text-sm text-slate-600">{item.expiry_date || "-"}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStockLevelColor(item)}`}>
                            {item.quantity <= item.reorder_level ? t.lowStock : t.ok}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {inventory.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                          {t.noInventory}
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
                <h3 className="text-sm font-semibold text-slate-700">{t.foodTransactions}</h3>
                <button
                  onClick={() => openModal("transaction")}
                  className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition"
                >
                  {t.submit}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.date}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.item}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.type}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.quantity}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.totalCost}</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">{t.reference}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((trans) => (
                      <tr key={trans.transaction_id} className="hover:bg-slate-50">
                        <td className="px-6 py-3 text-sm text-slate-600">{new Date(trans.transaction_date).toLocaleString()}</td>
                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{trans.item_name}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getTransactionTypeColor(trans.transaction_type)}`}>
                            {translateValue(trans.transaction_type)}
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
                          {t.noTransactions}
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
                {modalType === "plan" && t.addPlanModal}
                {modalType === "inventory" && t.inventoryModal}
                {modalType === "transaction" && t.transactionModal}
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.planNameRequired}</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.planTypeRequired}</label>
                    <select
                      name="plan_type"
                      value={formData.plan_type}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      {planTypes.map(type => (
                        <option key={type} value={type}>{translateValue(type)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.dailyCostRequired}</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.description}</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.itemNameRequired}</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.categoryRequired}</label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        {foodCategories.map(cat => (
                          <option key={cat} value={cat}>{translateValue(cat)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.quantityRequired}</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.unitRequired}</label>
                      <select
                        name="unit"
                        value={formData.unit}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        {units.map(unit => (
                          <option key={unit} value={unit}>{translateValue(unit)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.unitCostRequired}</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.reorderRequired}</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.supplier}</label>
                      <input
                        type="text"
                        name="supplier"
                        value={formData.supplier}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.expiryDate}</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.itemNameRequired}</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.transactionTypeRequired}</label>
                      <select
                        name="transaction_type"
                        value={formData.transaction_type}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      >
                        {transactionTypes.map(type => (
                          <option key={type} value={type}>{translateValue(type)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.quantityRequired}</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.unitCostRequired}</label>
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
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t.reference}</label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-1">{t.notes}</label>
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
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
                >
                  {t.recordTransaction}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
