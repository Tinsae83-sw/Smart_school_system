"use client";

import React, { useEffect, useState } from "react";
import { vpAdminApi } from "@/lib/api";

type Category = {
  category_id: number;
  name: string;
  type: string;
  is_active: boolean;
};

type Supplier = {
  supplier_id: number;
  supplier_name: string;
  contact_person: string;
  email?: string;
  phone_number: string;
  is_approved: boolean;
};

type Preference = {
  preference_key: string;
  preference_value: string;
  description: string;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"categories" | "suppliers" | "preferences">("categories");
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [preferences, setPreferences] = useState<Preference[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"category" | "supplier">("category");
  const [formData, setFormData] = useState({
    name: "",
    type: "ASSET",
    supplier_name: "",
    contact_person: "",
    email: "",
    phone_number: "",
    address: "",
  });

  const categoryTypes = ["ASSET", "FACILITY", "EXPENDITURE", "INVENTORY"];

  async function fetchData() {
    setLoading(true);
    try {
      const [catRes, supRes, prefRes] = await Promise.all([
        vpAdminApi.get('/settings/categories'),
        vpAdminApi.get('/settings/suppliers'),
        vpAdminApi.get('/settings/preferences'),
      ]);

      if (catRes.ok) setCategories(await catRes.json());
      if (supRes.ok) setSuppliers(await supRes.json());
      if (prefRes.ok) setPreferences(await prefRes.json());
    } catch (error) {
      console.error("Failed to fetch settings data:", error);
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

  function openModal(type: "category" | "supplier") {
    setModalType(type);
    setFormData({
      name: "",
      type: "ASSET",
      supplier_name: "",
      contact_person: "",
      email: "",
      phone_number: "",
      address: "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let url = "";
      let payload = {};

      if (modalType === "category") {
        url = '/settings/categories';
        payload = {
          name: formData.name,
          type: formData.type,
        };
      } else if (modalType === "supplier") {
        url = '/settings/suppliers';
        payload = {
          supplier_name: formData.supplier_name,
          contact_person: formData.contact_person,
          email: formData.email,
          phone_number: formData.phone_number,
          address: formData.address,
        };
      }

      const res = await vpAdminApi.post(url, payload);

      if (res.ok) {
        setShowModal(false);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to save:", error);
    }
  }

  async function toggleCategory(categoryId: number, currentStatus: boolean) {
    try {
      const res = await vpAdminApi.post(`/settings/categories/${categoryId}/toggle`, { is_active: !currentStatus });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to toggle category:", error);
    }
  }

  async function deleteCategory(categoryId: number) {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await vpAdminApi.delete(`/settings/categories/${categoryId}`);
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete category:", error);
    }
  }

  async function toggleSupplier(supplierId: number, currentStatus: boolean) {
    try {
      const res = await vpAdminApi.post(`/settings/suppliers/${supplierId}/toggle`, { is_approved: !currentStatus });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to toggle supplier:", error);
    }
  }

  async function updatePreference(key: string, value: string) {
    try {
      const res = await vpAdminApi.request('put', '/settings/preferences', { preference_key: key, preference_value: value });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to update preference:", error);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage categories, suppliers, and system preferences</p>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("categories")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "categories"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Categories ({categories.length})
          </button>
          <button
            onClick={() => setActiveTab("suppliers")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "suppliers"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Suppliers ({suppliers.length})
          </button>
          <button
            onClick={() => setActiveTab("preferences")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "preferences"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Preferences
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <>
          {activeTab === "categories" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Category Management</h3>
                <button
                  onClick={() => openModal("category")}
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition"
                >
                  Add Category
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {categories.map((category) => (
                      <tr key={category.category_id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{category.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{category.type}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${category.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-700"}`}>
                            {category.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleCategory(category.category_id, category.is_active)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${category.is_active ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                            >
                              {category.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => deleteCategory(category.category_id)}
                              className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {categories.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400">
                          No categories found. Click "Add Category" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "suppliers" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Supplier Database</h3>
                <button
                  onClick={() => openModal("supplier")}
                  className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-purple-700 transition"
                >
                  Add Supplier
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Supplier Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Contact Person</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Phone</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {suppliers.map((supplier) => (
                      <tr key={supplier.supplier_id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{supplier.supplier_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{supplier.contact_person}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{supplier.phone_number}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{supplier.email || "-"}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${supplier.is_approved ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                            {supplier.is_approved ? "Approved" : "Not Approved"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => toggleSupplier(supplier.supplier_id, supplier.is_approved)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${supplier.is_approved ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                          >
                            {supplier.is_approved ? "Revoke" : "Approve"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {suppliers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                          No suppliers found. Click "Add Supplier" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "preferences" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="p-4 border-b border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">System Preferences</h3>
              </div>
              <div className="divide-y divide-slate-100">
                {preferences.map((pref) => (
                  <div key={pref.preference_key} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-slate-900">{pref.preference_key.replace(/_/g, " ")}</h4>
                        <p className="text-xs text-slate-500 mt-1">{pref.description}</p>
                      </div>
                      <div className="ml-4">
                        {pref.preference_key === "email_notifications" || pref.preference_key === "push_notifications" ? (
                          <button
                            onClick={() => updatePreference(pref.preference_key, pref.preference_value === "true" ? "false" : "true")}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pref.preference_value === "true" ? "bg-purple-600" : "bg-gray-200"}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pref.preference_value === "true" ? "translate-x-6" : "translate-x-1"}`} />
                          </button>
                        ) : (
                          <input
                            type="text"
                            value={pref.preference_value}
                            onChange={(e) => updatePreference(pref.preference_key, e.target.value)}
                            className="w-48 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {preferences.length === 0 && (
                  <div className="p-12 text-center text-sm text-slate-400">
                    No preferences configured.
                  </div>
                )}
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
                {modalType === "category" ? "Add New Category" : "Add New Supplier"}
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
              {modalType === "category" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category Name *</label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Category Type *</label>
                    <select
                      name="type"
                      value={formData.type}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      {categoryTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {modalType === "supplier" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Name *</label>
                      <input
                        type="text"
                        name="supplier_name"
                        value={formData.supplier_name}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person *</label>
                      <input
                        type="text"
                        name="contact_person"
                        value={formData.contact_person}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                      <input
                        type="tel"
                        name="phone_number"
                        value={formData.phone_number}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <textarea
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      rows={2}
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
                  {modalType === "category" ? "Add Category" : "Add Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
