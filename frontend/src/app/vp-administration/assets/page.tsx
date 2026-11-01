"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { vpAdminApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { translateVpAdministrationOperation } from "@/translations/vp-administration-operations";

type Asset = {
  asset_id: number;
  asset_name: string;
  asset_code: string;
  category: string;
  quantity: number;
  unit_cost?: number;
  purchase_date?: string;
  location?: string;
  condition: string;
  status: string;
  assigned_to?: string;
  serial_number?: string;
  brand?: string;
  model?: string;
  warranty_expiry?: string;
  supplier?: string;
  description?: string;
  notes?: string;
};

export default function AssetsPage() {
  const { language } = useLanguage();
  const tr = (value: string) => translateVpAdministrationOperation(value, language);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [formData, setFormData] = useState({
    asset_name: "",
    asset_code: "",
    category: "",
    quantity: 1,
    unit_cost: "",
    purchase_date: "",
    location: "",
    condition: "GOOD",
    status: "AVAILABLE",
    assigned_to: "",
    serial_number: "",
    brand: "",
    model: "",
    warranty_expiry: "",
    supplier: "",
    description: "",
    notes: "",
  });

  const categories = ["LAB_EQUIPMENT", "FURNITURE", "COMPUTERS", "PROJECTORS", "VEHICLES", "OFFICE_EQUIPMENT", "SPORTS_EQUIPMENT"];
  const conditions = ["NEW", "GOOD", "FAIR", "DAMAGED"];
  const statuses = ["AVAILABLE", "IN_USE", "MAINTENANCE", "RETIRED"];

  async function fetchAssets() {
    setLoading(true);
    try {
      const res = await vpAdminApi.get('/assets');
      if (res.ok) {
        const data = await res.json();
        setAssets(data);
      }
    } catch (error) {
      console.error("Failed to fetch assets:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssets();
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const url = editingAsset 
        ? `/assets/${editingAsset.asset_id}`
        : '/assets';
      const method = editingAsset ? "put" : "post";
      
      const payload = {
        ...formData,
        unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
        quantity: typeof formData.quantity === 'string' ? parseInt(formData.quantity) : formData.quantity,
      };

      const res = await vpAdminApi.request(method, url, payload);

      if (res.ok) {
        setShowModal(false);
        setEditingAsset(null);
        setFormData({
          asset_name: "",
          asset_code: "",
          category: "",
          quantity: 1,
          unit_cost: "",
          purchase_date: "",
          location: "",
          condition: "GOOD",
          status: "AVAILABLE",
          assigned_to: "",
          serial_number: "",
          brand: "",
          model: "",
          warranty_expiry: "",
          supplier: "",
          description: "",
          notes: "",
        });
        fetchAssets();
      } else {
        const errorData = await res.json();
        console.error("Server error:", errorData);
        alert(`${tr("Failed to save asset: ")}${errorData.error || tr("Unknown error")}`);
      }
    } catch (error) {
      console.error("Failed to save asset:", error);
      alert(tr("Failed to save asset. Please try again."));
    }
  }

  async function handleDelete(assetId: number) {
    if (!confirm(tr("Are you sure you want to delete this asset?"))) return;
    try {
      const res = await vpAdminApi.delete(`/assets/${assetId}`);
      if (res.ok) {
        fetchAssets();
      }
    } catch (error) {
      console.error("Failed to delete asset:", error);
    }
  }

  function openEditModal(asset: Asset) {
    setEditingAsset(asset);
    setFormData({
      asset_name: asset.asset_name,
      asset_code: asset.asset_code,
      category: asset.category,
      quantity: asset.quantity,
      unit_cost: asset.unit_cost?.toString() || "",
      purchase_date: asset.purchase_date || "",
      location: asset.location || "",
      condition: asset.condition,
      status: asset.status,
      assigned_to: asset.assigned_to || "",
      serial_number: asset.serial_number || "",
      brand: asset.brand || "",
      model: asset.model || "",
      warranty_expiry: asset.warranty_expiry || "",
      supplier: asset.supplier || "",
      description: asset.description || "",
      notes: asset.notes || "",
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingAsset(null);
    setFormData({
      asset_name: "",
      asset_code: "",
      category: "",
      quantity: 1,
      unit_cost: "",
      purchase_date: "",
      location: "",
      condition: "GOOD",
      status: "AVAILABLE",
      assigned_to: "",
      serial_number: "",
      brand: "",
      model: "",
      warranty_expiry: "",
      supplier: "",
      description: "",
      notes: "",
    });
  }

  function openAssignmentModal(asset: Asset) {
    setSelectedAsset(asset);
    setShowAssignmentModal(true);
  }

  function openMaintenanceModal(asset: Asset) {
    setSelectedAsset(asset);
    setShowMaintenanceModal(true);
  }

  async function handleAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      const res = await vpAdminApi.post(`/assets/${selectedAsset.asset_id}/assign`, { assigned_to: formData.assigned_to });
      if (res.ok) {
        setShowAssignmentModal(false);
        fetchAssets();
      } else {
        const errorData = await res.json();
        console.error("Server error:", errorData);
        alert(`${tr("Failed to assign asset: ")}${errorData.error || tr("Unknown error")}`);
      }
    } catch (error) {
      console.error("Failed to assign asset:", error);
      alert(tr("Failed to assign asset. Please try again."));
    }
  }

  async function handleMaintenance(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedAsset) return;
    try {
      const res = await vpAdminApi.post(`/assets/${selectedAsset.asset_id}/maintenance`, { 
        maintenance_type: "ROUTINE",
        description: formData.description || "Scheduled maintenance",
        scheduled_date: formData.purchase_date || new Date().toISOString().split('T')[0],
      });
      if (res.ok) {
        setShowMaintenanceModal(false);
        fetchAssets();
      } else {
        const errorData = await res.json();
        console.error("Server error:", errorData);
        alert(`${tr("Failed to schedule maintenance: ")}${errorData.error || tr("Unknown error")}`);
      }
    } catch (error) {
      console.error("Failed to schedule maintenance:", error);
      alert(tr("Failed to schedule maintenance. Please try again."));
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "AVAILABLE": return "bg-emerald-50 text-emerald-700";
      case "IN_USE": return "bg-blue-50 text-blue-700";
      case "MAINTENANCE": return "bg-amber-50 text-amber-700";
      case "RETIRED": return "bg-rose-50 text-rose-700";
      default: return "bg-gray-50 text-gray-700";
    }
  }

  function getConditionColor(condition: string) {
    switch (condition) {
      case "NEW": return "bg-emerald-50 text-emerald-700";
      case "GOOD": return "bg-blue-50 text-blue-700";
      case "FAIR": return "bg-amber-50 text-amber-700";
      case "DAMAGED": return "bg-rose-50 text-rose-700";
      default: return "bg-gray-50 text-gray-700";
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{tr("Asset Management")}</h1>
          <p className="mt-1 text-sm text-slate-500">{tr("Manage school assets and equipment")}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition w-full sm:w-auto"
        >
          {tr("Add New Asset")}</button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">{tr("Loading assets...")}</div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Code")}</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Name")}</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Category")}</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Qty")}</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Cost")}</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Purchased")}</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Location")}</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Condition")}</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Status")}</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Assigned")}</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Serial")}</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Brand")}</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Model")}</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Warranty")}</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Supplier")}</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">{tr("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assets.map((asset) => (
                  <tr key={asset.asset_id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 text-xs font-medium text-slate-900">{asset.asset_code}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">{asset.asset_name}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{tr(asset.category.replace(/_/g, " "))}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{asset.quantity}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{asset.unit_cost ? `ETB ${asset.unit_cost}` : "-"}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{asset.purchase_date || "-"}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{asset.location || "-"}</td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getConditionColor(asset.condition)}`}>
                        {tr(asset.condition)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(asset.status)}`}>
                        {tr(asset.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-600">{asset.assigned_to || "-"}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{asset.serial_number || "-"}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{asset.brand || "-"}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{asset.model || "-"}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{asset.warranty_expiry || "-"}</td>
                    <td className="px-3 py-2 text-xs text-slate-600">{asset.supplier || "-"}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEditModal(asset)}
                          className="rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition"
                        >
                          {tr("Edit")}</button>
                        <button
                          onClick={() => openAssignmentModal(asset)}
                          className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-100 transition"
                        >
                          {tr("Assign")}</button>
                        <button
                          onClick={() => openMaintenanceModal(asset)}
                          className="rounded bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-100 transition"
                        >
                          {tr("Maintain")}</button>
                        <button
                          onClick={() => handleDelete(asset.asset_id)}
                          className="rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 transition"
                        >
                          {tr("Delete")}</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {assets.length === 0 && (
                  <tr>
                    <td colSpan={16} className="px-3 py-12 text-center text-xs text-slate-400">
                      {tr("No assets found. Click \"Add New Asset\" to get started.")}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {tr(editingAsset ? "Edit Asset" : "Add New Asset")}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {tr("Basic Information")}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Asset Name *")}</label>
                    <input
                      type="text"
                      name="asset_name"
                      value={formData.asset_name}
                      onChange={handleInputChange}
                      required
                      placeholder={tr("e.g., Dell Latitude Laptop")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Asset Code *")}</label>
                    <input
                      type="text"
                      name="asset_code"
                      value={formData.asset_code}
                      onChange={handleInputChange}
                      required
                      placeholder={tr("e.g., AST-2024-001")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Classification Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {tr("Classification")}</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Category *")}</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      <option value="">{tr("Select category")}</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{tr(cat.replace(/_/g, " "))}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Quantity *")}</label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      required
                      min="1"
                      placeholder="1"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Condition *")}</label>
                    <select
                      name="condition"
                      value={formData.condition}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      {conditions.map(cond => (
                        <option key={cond} value={cond}>{tr(cond)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Financial Information Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {tr("Financial Information")}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Unit Cost (ETB)")}</label>
                    <input
                      type="number"
                      name="unit_cost"
                      value={formData.unit_cost}
                      onChange={handleInputChange}
                      step="0.01"
                      placeholder="0.00"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Purchase Date")}</label>
                    <input
                      type="date"
                      name="purchase_date"
                      value={formData.purchase_date}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Product Details Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  {tr("Product Details")}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Brand")}</label>
                    <input
                      type="text"
                      name="brand"
                      value={formData.brand}
                      onChange={handleInputChange}
                      placeholder={tr("e.g., Dell, HP, Samsung")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Model")}</label>
                    <input
                      type="text"
                      name="model"
                      value={formData.model}
                      onChange={handleInputChange}
                      placeholder={tr("e.g., Latitude 5420")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Serial Number")}</label>
                    <input
                      type="text"
                      name="serial_number"
                      value={formData.serial_number}
                      onChange={handleInputChange}
                      placeholder={tr("e.g., SN123456789")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Warranty Expiry")}</label>
                    <input
                      type="date"
                      name="warranty_expiry"
                      value={formData.warranty_expiry}
                      onChange={handleInputChange}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Supplier Information Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  {tr("Supplier Information")}</h3>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Supplier/Vendor")}</label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    placeholder={tr("e.g., ABC Technology Solutions")}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Location & Assignment Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {tr("Location & Assignment")}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Location")}</label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder={tr("e.g., Computer Lab 1, Room 201")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Assigned To")}</label>
                    <input
                      type="text"
                      name="assigned_to"
                      value={formData.assigned_to}
                      onChange={handleInputChange}
                      placeholder={tr("e.g., John Doe or IT Department")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Status *")}</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    >
                      {statuses.map(stat => (
                        <option key={stat} value={stat}>{tr(stat.replace(/_/g, " "))}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <svg className="h-4 w-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {tr("Description & Notes")}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Description")}</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={3}
                      placeholder={tr("Provide a detailed description of the asset...")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Additional Notes")}</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={2}
                      placeholder={tr("Any additional information or special instructions...")}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {tr("Cancel")}</button>
                <button
                  type="submit"
                  className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition"
                >
                  {tr(editingAsset ? "Update Asset" : "Add Asset")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignmentModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{tr("Assign Asset")}</h2>
              <button
                onClick={() => setShowAssignmentModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600"><strong>{tr("Asset:")}</strong> {selectedAsset.asset_name}</p>
              <p className="text-sm text-slate-600"><strong>{tr("Code:")}</strong> {selectedAsset.asset_code}</p>
            </div>

            <form onSubmit={handleAssignment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Assign To *")}</label>
                <input
                  type="text"
                  name="assigned_to"
                  value={formData.assigned_to}
                  onChange={handleInputChange}
                  required
                  placeholder={tr("Enter staff name or department")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignmentModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {tr("Cancel")}</button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  {tr("Assign Asset")}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMaintenanceModal && selectedAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{tr("Schedule Maintenance")}</h2>
              <button
                onClick={() => setShowMaintenanceModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-4 bg-slate-50 rounded-lg">
              <p className="text-sm text-slate-600"><strong>{tr("Asset:")}</strong> {selectedAsset.asset_name}</p>
              <p className="text-sm text-slate-600"><strong>{tr("Code:")}</strong> {selectedAsset.asset_code}</p>
              <p className="text-sm text-slate-600"><strong>{tr("Current Condition:")}</strong> {tr(selectedAsset.condition)}</p>
            </div>

            <form onSubmit={handleMaintenance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Description")}</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder={tr("Describe the maintenance needed")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{tr("Scheduled Date")}</label>
                <input
                  type="date"
                  name="purchase_date"
                  value={formData.purchase_date}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowMaintenanceModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  {tr("Cancel")}</button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition"
                >
                  {tr("Schedule Maintenance")}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
