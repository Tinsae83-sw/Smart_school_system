"use client";

import React, { useEffect, useState } from "react";
import { vpAdminApi } from "@/lib/api";

type InventoryItem = {
  inventory_id: number;
  item_name: string;
  item_code: string;
  category: string;
  description?: string;
  unit_of_measure: string;
  current_stock: number;
  reorder_level: number;
  max_stock?: number;
  unit_cost?: number;
  location?: string;
  last_restocked?: string;
  brand?: string;
  model?: string;
  supplier?: string;
  reorder_lead_time?: number;
  shelf_life?: string;
  storage_requirements?: string;
  minimum_order_quantity?: number;
  notes?: string;
};

type InventoryTransaction = {
  transaction_id: number;
  inventory_id: number;
  item_name: string;
  transaction_type: string;
  quantity: number;
  remaining_stock: number;
  unit_cost?: number;
  total_cost?: number;
  reference?: string;
  transaction_date: string;
  document_number?: string;
  performed_by?: number;
  notes?: string;
};

type Supplier = {
  supplier_id: number;
  supplier_name: string;
  contact_person: string;
  email?: string;
  phone_number: string;
  address?: string;
  products_services: string[];
  is_approved: boolean;
  rating?: number;
  tax_id?: string;
  website?: string;
  payment_terms?: string;
  credit_limit?: number;
  delivery_time?: string;
  notes?: string;
  business_license?: string;
  bank_account?: string;
};

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<"inventory" | "transactions" | "suppliers">("inventory");
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"inventory" | "transaction" | "supplier">("inventory");
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<InventoryTransaction | null>(null);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    item_name: "",
    item_code: "",
    category: "",
    description: "",
    unit_of_measure: "",
    current_stock: "",
    reorder_level: "",
    max_stock: "",
    unit_cost: "",
    location: "",
    brand: "",
    model: "",
    supplier: "",
    reorder_lead_time: "",
    shelf_life: "",
    storage_requirements: "",
    minimum_order_quantity: "",
    item_notes: "",
    supplier_id: "",
    transaction_type: "IN",
    quantity: "",
    reference: "",
    transaction_date: "",
    total_cost: "",
    performed_by: "",
    document_number: "",
    supplier_name: "",
    contact_person: "",
    email: "",
    phone_number: "",
    address: "",
    products_services: "",
    tax_id: "",
    website: "",
    payment_terms: "",
    credit_limit: "",
    delivery_time: "",
    notes: "",
    business_license: "",
    bank_account: "",
  });

  const categories = ["OFFICE_SUPPLIES", "CLEANING", "LAB_CHEMICALS", "FOOD", "SPORTS_EQUIPMENT", "MAINTENANCE", "MEDICAL", "TEXTBOOKS", "ELECTRONICS"];
  const units = ["PIECES", "BOXES", "LITERS", "KILOGRAMS", "PACKS", "SETS", "ROLLS", "BOTTLES", "CARTONS"];
  const transactionTypes = ["IN", "OUT", "ADJUSTMENT"];

  async function fetchData() {
    setLoading(true);
    try {
      const [invRes, transRes, supRes] = await Promise.all([
        vpAdminApi.get('/inventory'),
        vpAdminApi.get('/inventory-transactions'),
        vpAdminApi.get('/suppliers'),
      ]);

      if (invRes.ok) setInventory(await invRes.json());
      if (transRes.ok) setTransactions(await transRes.json());
      if (supRes.ok) setSuppliers(await supRes.json());
    } catch (error) {
      console.error("Failed to fetch inventory data:", error);
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

  function openModal(type: "inventory" | "transaction" | "supplier", item?: InventoryItem | InventoryTransaction | Supplier) {
    setModalType(type);
    setEditingItem(null);
    setEditingTransaction(null);
    setEditingSupplier(null);
    
    if (item && type === "inventory" && "current_stock" in item) {
      setEditingItem(item as InventoryItem);
      setFormData({
        item_name: item.item_name,
        item_code: item.item_code,
        category: item.category,
        description: item.description || "",
        unit_of_measure: item.unit_of_measure,
        current_stock: item.current_stock.toString(),
        reorder_level: item.reorder_level.toString(),
        max_stock: item.max_stock?.toString() || "",
        unit_cost: item.unit_cost?.toString() || "",
        location: item.location || "",
        brand: item.brand || "",
        model: item.model || "",
        supplier: item.supplier || "",
        reorder_lead_time: item.reorder_lead_time?.toString() || "",
        shelf_life: item.shelf_life || "",
        storage_requirements: item.storage_requirements || "",
        minimum_order_quantity: item.minimum_order_quantity?.toString() || "",
        item_notes: item.notes || "",
        supplier_id: "",
        transaction_type: "IN",
        quantity: "",
        reference: "",
        transaction_date: "",
        total_cost: "",
        performed_by: "",
        document_number: "",
        supplier_name: "",
        contact_person: "",
        email: "",
        phone_number: "",
        address: "",
        products_services: "",
        tax_id: "",
        website: "",
        payment_terms: "",
        credit_limit: "",
        delivery_time: "",
        notes: "",
        business_license: "",
        bank_account: "",
      });
    } else if (item && type === "transaction" && "transaction_id" in item) {
      setEditingTransaction(item as InventoryTransaction);
      setFormData({
        item_name: "",
        item_code: "",
        category: "",
        description: "",
        unit_of_measure: "",
        current_stock: "",
        reorder_level: "",
        max_stock: "",
        unit_cost: "",
        location: "",
        brand: "",
        model: "",
        supplier: "",
        reorder_lead_time: "",
        shelf_life: "",
        storage_requirements: "",
        minimum_order_quantity: "",
        item_notes: "",
        supplier_id: item.inventory_id.toString(),
        transaction_type: item.transaction_type,
        quantity: item.quantity.toString(),
        reference: item.reference || "",
        transaction_date: item.transaction_date,
        total_cost: item.total_cost?.toString() || "",
        performed_by: item.performed_by?.toString() || "",
        document_number: item.document_number || "",
        supplier_name: "",
        contact_person: "",
        email: "",
        phone_number: "",
        address: "",
        products_services: "",
        tax_id: "",
        website: "",
        payment_terms: "",
        credit_limit: "",
        delivery_time: "",
        notes: item.notes || "",
        business_license: "",
        bank_account: "",
      });
    } else if (item && type === "supplier" && "supplier_name" in item) {
      setEditingSupplier(item as Supplier);
      setFormData({
        item_name: "",
        item_code: "",
        category: "",
        description: "",
        unit_of_measure: "",
        current_stock: "",
        reorder_level: "",
        max_stock: "",
        unit_cost: "",
        location: "",
        brand: "",
        model: "",
        supplier: "",
        reorder_lead_time: "",
        shelf_life: "",
        storage_requirements: "",
        minimum_order_quantity: "",
        item_notes: "",
        supplier_id: "",
        transaction_type: "IN",
        quantity: "",
        reference: "",
        transaction_date: "",
        total_cost: "",
        performed_by: "",
        document_number: "",
        supplier_name: item.supplier_name,
        contact_person: item.contact_person,
        email: item.email || "",
        phone_number: item.phone_number,
        address: item.address || "",
        products_services: item.products_services.join(", "),
        tax_id: item.tax_id || "",
        website: item.website || "",
        payment_terms: item.payment_terms || "",
        credit_limit: item.credit_limit?.toString() || "",
        delivery_time: item.delivery_time || "",
        notes: item.notes || "",
        business_license: item.business_license || "",
        bank_account: item.bank_account || "",
      });
    } else {
      setFormData({
        item_name: "",
        item_code: "",
        category: "",
        description: "",
        unit_of_measure: "",
        current_stock: "",
        reorder_level: "",
        max_stock: "",
        unit_cost: "",
        location: "",
        brand: "",
        model: "",
        supplier: "",
        reorder_lead_time: "",
        shelf_life: "",
        storage_requirements: "",
        minimum_order_quantity: "",
        item_notes: "",
        supplier_id: "",
        transaction_type: "IN",
        quantity: "",
        reference: "",
        transaction_date: "",
        total_cost: "",
        performed_by: "",
        document_number: "",
        supplier_name: "",
        contact_person: "",
        email: "",
        phone_number: "",
        address: "",
        products_services: "",
        tax_id: "",
        website: "",
        payment_terms: "",
        credit_limit: "",
        delivery_time: "",
        notes: "",
        business_license: "",
        bank_account: "",
      });
    }
    setShowModal(true);
  }

  async function handleDeleteTransaction(id: number) {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    try {
      await vpAdminApi.delete(`/inventory-transactions/${id}`);
      setTransactions(transactions.filter(t => t.transaction_id !== id));
    } catch (error) {
      console.error("Failed to delete transaction:", error);
    }
  }

  async function handleDeleteSupplier(id: number) {
    if (!confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await vpAdminApi.delete(`/suppliers/${id}`);
      setSuppliers(suppliers.filter(s => s.supplier_id !== id));
    } catch (error) {
      console.error("Failed to delete supplier:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let url = "";
      let method = "POST";
      let payload = {};

      if (modalType === "inventory") {
        url = editingItem 
          ? `/inventory/${editingItem.inventory_id}`
          : '/inventory';
        method = editingItem ? "put" : "post";
        payload = {
          item_name: formData.item_name,
          item_code: formData.item_code,
          category: formData.category,
          description: formData.description,
          unit_of_measure: formData.unit_of_measure,
          current_stock: parseInt(formData.current_stock),
          reorder_level: parseInt(formData.reorder_level),
          max_stock: formData.max_stock ? parseInt(formData.max_stock) : null,
          unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
          location: formData.location,
          brand: formData.brand,
          model: formData.model,
          supplier: formData.supplier,
          reorder_lead_time: formData.reorder_lead_time ? parseInt(formData.reorder_lead_time) : null,
          shelf_life: formData.shelf_life,
          storage_requirements: formData.storage_requirements,
          minimum_order_quantity: formData.minimum_order_quantity ? parseInt(formData.minimum_order_quantity) : null,
          notes: formData.item_notes,
        };
      } else if (modalType === "transaction") {
        url = editingTransaction 
          ? `/inventory-transactions/${editingTransaction.transaction_id}`
          : '/inventory-transactions';
        method = editingTransaction ? "put" : "post";
        payload = {
          inventory_id: parseInt(formData.supplier_id),
          transaction_type: formData.transaction_type,
          quantity: parseInt(formData.quantity),
          reference: formData.reference,
          transaction_date: formData.transaction_date || new Date().toISOString().split('T')[0],
          unit_cost: formData.unit_cost ? parseFloat(formData.unit_cost) : null,
          total_cost: formData.total_cost ? parseFloat(formData.total_cost) : null,
          notes: formData.notes,
          performed_by: formData.performed_by,
          document_number: formData.document_number,
        };
      } else if (modalType === "supplier") {
        url = editingSupplier 
          ? `/suppliers/${editingSupplier.supplier_id}`
          : '/suppliers';
        method = editingSupplier ? "put" : "post";
        payload = {
          supplier_name: formData.supplier_name,
          contact_person: formData.contact_person,
          email: formData.email,
          phone_number: formData.phone_number,
          address: formData.address,
          products_services: formData.products_services.split(",").map(s => s.trim()),
          tax_id: formData.tax_id,
          website: formData.website,
          payment_terms: formData.payment_terms,
          credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
          delivery_time: formData.delivery_time,
          notes: formData.notes,
          business_license: formData.business_license,
          bank_account: formData.bank_account,
        };
      }

      const res = await vpAdminApi.request(method, url, payload);

      if (res.ok) {
        setShowModal(false);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to submit:", error);
    }
  }

  function closeModal() {
    setShowModal(false);
    setEditingItem(null);
    setEditingTransaction(null);
    setEditingSupplier(null);
  }

  function getStockLevelColor(item: InventoryItem) {
    if (item.current_stock <= 0) return "bg-rose-50 text-rose-700";
    if (item.current_stock <= item.reorder_level) return "bg-amber-50 text-amber-700";
    if (item.max_stock && item.current_stock >= item.max_stock) return "bg-blue-50 text-blue-700";
    return "bg-emerald-50 text-emerald-700";
  }

  function getTransactionTypeColor(type: string) {
    switch (type) {
      case "IN": return "bg-emerald-50 text-emerald-700";
      case "OUT": return "bg-rose-50 text-rose-700";
      case "ADJUSTMENT": return "bg-blue-50 text-blue-700";
      default: return "bg-gray-50 text-gray-700";
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Procurement & Inventory</h1>
          <p className="mt-1 text-sm text-slate-500">Manage inventory, stock transactions, and suppliers</p>
        </div>
        {activeTab === "inventory" && (
          <button
            onClick={() => openModal("inventory")}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition w-full sm:w-auto"
          >
            Add Inventory Item
          </button>
        )}
        {activeTab === "suppliers" && (
          <button
            onClick={() => openModal("supplier")}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition w-full sm:w-auto"
          >
            Add Supplier
          </button>
        )}
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("inventory")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "inventory"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Inventory ({inventory.length})
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
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <>
          {activeTab === "inventory" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Code</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Brand</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Model</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Supplier</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Reorder</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Max</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Cost</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Lead Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Shelf Life</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Min Order</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventory.map((item) => (
                      <tr key={item.inventory_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-xs font-medium text-slate-900">{item.item_code}</td>
                        <td className="px-4 py-3 text-xs text-slate-700">{item.item_name}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.category.replace(/_/g, " ")}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.brand || "-"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.model || "-"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.supplier || "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="text-xs font-medium text-slate-900">{item.current_stock}</span>
                            <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${getStockLevelColor(item)}`}>
                              {item.current_stock <= item.reorder_level ? "Low" : "OK"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.unit_of_measure}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.reorder_level}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.max_stock || "-"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.unit_cost ? `ETB ${item.unit_cost}` : "-"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.location || "-"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.reorder_lead_time ? `${item.reorder_lead_time}d` : "-"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.shelf_life || "-"}</td>
                        <td className="px-4 py-3 text-xs text-slate-600">{item.minimum_order_quantity || "-"}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openModal("inventory", item)}
                            className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                    {inventory.length === 0 && (
                      <tr>
                        <td colSpan={17} className="px-4 py-12 text-center text-xs text-slate-400">
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
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-slate-200 gap-3">
                <h3 className="text-sm font-semibold text-slate-700">Stock Transactions</h3>
                <button
                  onClick={() => openModal("transaction")}
                  className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition w-full sm:w-auto"
                >
                  Record Transaction
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Date</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Item</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Type</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Qty</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Remaining</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Unit Cost</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Total</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Reference</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Doc #</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">By</th>
                      <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Notes</th>
                      <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((trans) => (
                      <tr key={trans.transaction_id} className="hover:bg-slate-50">
                        <td className="px-4 py-2 text-xs text-slate-600">{trans.transaction_date}</td>
                        <td className="px-4 py-2 text-xs font-medium text-slate-900">{trans.item_name}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getTransactionTypeColor(trans.transaction_type)}`}>
                            {trans.transaction_type}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-slate-600">{trans.quantity}</td>
                        <td className="px-4 py-2 text-xs text-slate-600">{trans.remaining_stock}</td>
                        <td className="px-4 py-2 text-xs text-slate-600">{trans.unit_cost ? `ETB ${trans.unit_cost}` : "-"}</td>
                        <td className="px-4 py-2 text-xs text-slate-600">{trans.total_cost ? `ETB ${trans.total_cost}` : "-"}</td>
                        <td className="px-4 py-2 text-xs text-slate-600">{trans.reference || "-"}</td>
                        <td className="px-4 py-2 text-xs text-slate-600">{trans.document_number || "-"}</td>
                        <td className="px-4 py-2 text-xs text-slate-600">{trans.performed_by || "-"}</td>
                        <td className="px-4 py-2 text-xs text-slate-600 max-w-[100px] truncate">{trans.notes || "-"}</td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openModal("transaction", trans)}
                              className="rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTransaction(trans.transaction_id)}
                              className="rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-4 py-12 text-center text-xs text-slate-400">
                          No transactions recorded.
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
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Name</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Contact</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Phone</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Email</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Tax ID</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Website</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Payment</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Credit</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Delivery</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">License</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Bank</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Products</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Rating</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {suppliers.map((supplier) => (
                      <tr key={supplier.supplier_id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs font-medium text-slate-900">{supplier.supplier_name}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{supplier.contact_person}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{supplier.phone_number}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{supplier.email || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{supplier.tax_id || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600 max-w-[100px] truncate">{supplier.website || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{supplier.payment_terms || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{supplier.credit_limit ? `ETB ${supplier.credit_limit}` : "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{supplier.delivery_time || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{supplier.business_license || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{supplier.bank_account || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600 max-w-[120px] truncate">{supplier.products_services.join(", ")}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{supplier.rating || "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openModal("supplier", supplier)}
                              className="rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSupplier(supplier.supplier_id)}
                              className="rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {suppliers.length === 0 && (
                      <tr>
                        <td colSpan={14} className="px-3 py-12 text-center text-xs text-slate-400">
                          No suppliers found. Click "Add New Supplier" to get started.
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {modalType === "inventory" && (editingItem ? "Edit Inventory Item" : "Add Inventory Item")}
                {modalType === "transaction" && "Record Stock Transaction"}
                {modalType === "supplier" && "Add New Supplier"}
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
              {modalType === "inventory" && (
                <>
                  {/* Basic Information Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Basic Information
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
                        <input
                          type="text"
                          name="item_name"
                          value={formData.item_name}
                          onChange={handleInputChange}
                          required
                          placeholder="e.g., A4 Paper Ream"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Item Code *</label>
                        <input
                          type="text"
                          name="item_code"
                          value={formData.item_code}
                          onChange={handleInputChange}
                          required
                          placeholder="e.g., INV-2024-001"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Classification Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Classification
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleInputChange}
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="">Select category</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Unit of Measure *</label>
                        <select
                          name="unit_of_measure"
                          value={formData.unit_of_measure}
                          onChange={handleInputChange}
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="">Select unit</option>
                          {units.map(unit => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Stock Management Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Stock Management
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Current Stock *</label>
                        <input
                          type="number"
                          name="current_stock"
                          value={formData.current_stock}
                          onChange={handleInputChange}
                          required
                          min="0"
                          placeholder="0"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
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
                          placeholder="10"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Max Stock</label>
                        <input
                          type="number"
                          name="max_stock"
                          value={formData.max_stock}
                          onChange={handleInputChange}
                          min="0"
                          placeholder="100"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Information Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Financial Information
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost (ETB)</label>
                        <input
                          type="number"
                          name="unit_cost"
                          value={formData.unit_cost}
                          onChange={handleInputChange}
                          step="0.01"
                          placeholder="0.00"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Minimum Order Qty</label>
                        <input
                          type="number"
                          name="minimum_order_quantity"
                          value={formData.minimum_order_quantity}
                          onChange={handleInputChange}
                          min="1"
                          placeholder="10"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Product Details Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                      Product Details
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Brand</label>
                        <input
                          type="text"
                          name="brand"
                          value={formData.brand}
                          onChange={handleInputChange}
                          placeholder="e.g., HP, Canon"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                        <input
                          type="text"
                          name="model"
                          value={formData.model}
                          onChange={handleInputChange}
                          placeholder="e.g., LaserJet Pro"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Supplier</label>
                        <input
                          type="text"
                          name="supplier"
                          value={formData.supplier}
                          onChange={handleInputChange}
                          placeholder="e.g., ABC Supplies Ltd"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reorder Lead Time (days)</label>
                        <input
                          type="number"
                          name="reorder_lead_time"
                          value={formData.reorder_lead_time}
                          onChange={handleInputChange}
                          min="1"
                          placeholder="7"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Storage & Location Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Storage & Location
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          placeholder="e.g., Warehouse A, Shelf 3"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Storage Requirements</label>
                        <input
                          type="text"
                          name="storage_requirements"
                          value={formData.storage_requirements}
                          onChange={handleInputChange}
                          placeholder="e.g., Cool, dry place"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Shelf Life</label>
                        <input
                          type="text"
                          name="shelf_life"
                          value={formData.shelf_life}
                          onChange={handleInputChange}
                          placeholder="e.g., 12 months, 2 years"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Description & Notes
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleInputChange}
                          rows={3}
                          placeholder="Provide a detailed description of the item..."
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                        <textarea
                          name="item_notes"
                          value={formData.item_notes}
                          onChange={handleInputChange}
                          rows={2}
                          placeholder="Any additional information or special instructions..."
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {modalType === "transaction" && (
                <>
                  {/* Transaction Details Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Transaction Details
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Inventory Item *</label>
                      <select
                        name="supplier_id"
                        value={formData.supplier_id}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="">Select item</option>
                        {inventory.map(item => (
                          <option key={item.inventory_id} value={item.inventory_id}>{item.item_name} ({item.item_code}) - {item.current_stock} {item.unit_of_measure}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Transaction Type & Date Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Type & Date
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Type *</label>
                        <select
                          name="transaction_type"
                          value={formData.transaction_type}
                          onChange={handleInputChange}
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          {transactionTypes.map(type => (
                            <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Date</label>
                        <input
                          type="date"
                          name="transaction_date"
                          value={formData.transaction_date}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quantity Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                      </svg>
                      Quantity
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Quantity *</label>
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleInputChange}
                        required
                        min="1"
                        placeholder="e.g., 10"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Financial Information Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Financial Information
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost (ETB)</label>
                        <input
                          type="number"
                          name="unit_cost"
                          value={formData.unit_cost}
                          onChange={handleInputChange}
                          step="0.01"
                          placeholder="0.00"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Total Cost (ETB)</label>
                        <input
                          type="number"
                          name="total_cost"
                          value={formData.total_cost}
                          onChange={handleInputChange}
                          step="0.01"
                          placeholder="0.00"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Reference & Document Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Reference & Document
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reference Number</label>
                        <input
                          type="text"
                          name="reference"
                          value={formData.reference}
                          onChange={handleInputChange}
                          placeholder="e.g., PO-2024-001"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Document Number</label>
                        <input
                          type="text"
                          name="document_number"
                          value={formData.document_number}
                          onChange={handleInputChange}
                          placeholder="e.g., INV-001234"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Information Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Additional Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Performed By</label>
                        <input
                          type="text"
                          name="performed_by"
                          value={formData.performed_by}
                          onChange={handleInputChange}
                          placeholder="e.g., John Doe"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                        <textarea
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          rows={2}
                          placeholder="Any additional notes or remarks..."
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {modalType === "supplier" && (
                <>
                  {/* Basic Information Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Basic Information
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Name *</label>
                        <input
                          type="text"
                          name="supplier_name"
                          value={formData.supplier_name}
                          onChange={handleInputChange}
                          required
                          placeholder="e.g., ABC Supplies Ltd"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person *</label>
                        <input
                          type="text"
                          name="contact_person"
                          onChange={handleInputChange}
                          required
                          placeholder="e.g., John Doe"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Contact Information Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Contact Information
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                        <input
                          type="tel"
                          name="phone_number"
                          value={formData.phone_number}
                          onChange={handleInputChange}
                          required
                          placeholder="e.g., +251 911 123 456"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="e.g., contact@abc-supplies.com"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
                        <input
                          type="url"
                          name="website"
                          value={formData.website}
                          onChange={handleInputChange}
                          placeholder="e.g., https://www.abc-supplies.com"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Address
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Physical Address</label>
                      <textarea
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        rows={3}
                        placeholder="e.g., 123 Business Street, Addis Ababa, Ethiopia"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Business Details Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Business Details
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Tax ID</label>
                        <input
                          type="text"
                          name="tax_id"
                          value={formData.tax_id}
                          onChange={handleInputChange}
                          placeholder="e.g., 123456789"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Business License</label>
                        <input
                          type="text"
                          name="business_license"
                          value={formData.business_license}
                          onChange={handleInputChange}
                          placeholder="e.g., BL-2024-001"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bank Account</label>
                        <input
                          type="text"
                          name="bank_account"
                          value={formData.bank_account}
                          onChange={handleInputChange}
                          placeholder="e.g., 1000 1234 5678"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Credit Limit (ETB)</label>
                        <input
                          type="number"
                          name="credit_limit"
                          value={formData.credit_limit}
                          onChange={handleInputChange}
                          step="0.01"
                          placeholder="0.00"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Terms & Services Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Terms & Services
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
                        <input
                          type="text"
                          name="payment_terms"
                          value={formData.payment_terms}
                          onChange={handleInputChange}
                          placeholder="e.g., Net 30, COD"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Delivery Time</label>
                        <input
                          type="text"
                          name="delivery_time"
                          value={formData.delivery_time}
                          onChange={handleInputChange}
                          placeholder="e.g., 3-5 business days"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Products & Notes Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      Products & Notes
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Products/Services (comma-separated)</label>
                        <textarea
                          name="products_services"
                          value={formData.products_services}
                          onChange={handleInputChange}
                          rows={3}
                          placeholder="e.g., Office supplies, Cleaning materials, Furniture"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Additional Notes</label>
                        <textarea
                          name="notes"
                          value={formData.notes}
                          onChange={handleInputChange}
                          rows={2}
                          placeholder="Any additional information about the supplier..."
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition"
                >
                  {modalType === "inventory" && (editingItem ? "Update" : "Add")}
                  {modalType === "transaction" && "Record"}
                  {modalType === "supplier" && "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
