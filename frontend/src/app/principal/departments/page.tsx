"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { principalTranslations } from "@/translations/principal";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/principal";

type Department = {
  department_id: number;
  name: string;
  code?: string;
  description?: string;
  head_of_department_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  head_of_department?: {
    dept_head_id: number;
    user: {
      user_id: number;
      full_name: string;
      email: string;
    };
  };
  staff_count?: number;
};


export default function DepartmentsPage() {
  const { language } = useLanguage();
  const t = principalTranslations[language];
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const fetchDepartmentsRef = useRef<{ isFetching: boolean }>({ isFetching: false });

  // Filter departments based on search query and status
  const filteredDepartments = departments.filter((dept) => {
    const matchesSearch =
      searchQuery === "" ||
      dept.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      dept.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && dept.is_active) ||
      (statusFilter === "inactive" && !dept.is_active);

    return matchesSearch && matchesStatus;
  });

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });

  const fetchDepartments = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (fetchDepartmentsRef.current.isFetching) {
      return;
    }

    fetchDepartmentsRef.current.isFetching = true;
    setLoading(true);

    try {
      const deptsRes = await fetch(`${API_BASE}/departments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (deptsRes.ok) {
        const deptsData = await deptsRes.json();
        setDepartments(deptsData);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: language === "am" ? "ክፍሎችን መጫን አልተቻለም።" : "Failed to load departments." });
    } finally {
      setLoading(false);
      fetchDepartmentsRef.current.isFetching = false;
    }
  }, [language]);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  function handleEdit(department: Department) {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      code: department.code || "",
      description: department.description || "",
    });
    setShowModal(true);
  }

  async function handleDeactivate(departmentId: number) {
    if (!confirm(language === "am" ? "ይህን ክፍል ከስራ ማገድ ይፈልጋሉ?" : "Are you sure you want to deactivate this department?")) return;

    setDeactivatingId(departmentId);

    // Optimistically update local state
    const deactivatedDept = departments.find(d => d.department_id === departmentId);
    if (deactivatedDept) {
      setDepartments(prev => prev.map(d => d.department_id === departmentId ? { ...d, is_active: false } : d));
    }

    try {
      const res = await fetch(`${API_BASE}/departments/${departmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (res.ok) {
        const responseData = await res.json();

        // Update with returned data from backend
        if (responseData.department) {
          setDepartments(prev => prev.map(d => d.department_id === departmentId ? responseData.department : d));
        }

        setStatusMessage({ type: "success", message: language === "am" ? "ክፍሉ ከስራ ታግዷል።" : "Department deactivated successfully." });
      } else {
        // Revert optimistic update on failure
        if (deactivatedDept) {
          setDepartments(prev => prev.map(d => d.department_id === departmentId ? deactivatedDept : d));
        }
        const errorData = await res.json();
        setStatusMessage({ type: "error", message: errorData.error || (language === "am" ? "ክፍሉን ከስራ ማገድ አልተቻለም።" : "Failed to deactivate department.") });
      }
    } catch (error) {
      // Revert optimistic update on error
      if (deactivatedDept) {
        setDepartments(prev => prev.map(d => d.department_id === departmentId ? deactivatedDept : d));
      }
      console.error(error);
      setStatusMessage({ type: "error", message: language === "am" ? "ክፍሉን ከስራ ማገድ አልተቻለም።" : "Failed to deactivate department." });
    } finally {
      setDeactivatingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    const method = editingDepartment ? "PUT" : "POST";
    const url = editingDepartment
      ? `${API_BASE}/departments/${editingDepartment.department_id}`
      : `${API_BASE}/departments`;

    // Prepare request body
    const requestBody = {
      name: formData.name,
      code: formData.code || undefined,
      description: formData.description || undefined,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (res.ok) {
        const responseData = await res.json();

        // Optimistically update local state
        if (editingDepartment) {
          setDepartments(prev => prev.map(d => d.department_id === editingDepartment.department_id ? responseData : d));
        } else {
          setDepartments(prev => [...prev, responseData]);
        }

        setStatusMessage({
          type: "success",
          message: language === "am"
            ? `ክፍሉ ${editingDepartment ? "ታድሷል" : "ተፈጥሯል"}።`
            : `Department ${editingDepartment ? "updated" : "created"} successfully.`,
        });
        setShowModal(false);
        setEditingDepartment(null);
        setFormData({
          name: "",
          code: "",
          description: "",
        });
      } else {
        const errorData = await res.json();
        setStatusMessage({ type: "error", message: errorData.error || (language === "am" ? "ተግባሩ አልተሳካም።" : "Operation failed.") });
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: language === "am" ? "ተግባሩ አልተሳካም።" : "Operation failed." });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.departmentManagement}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.manageDepartmentsSubtitle}</p>
      </div>

      {statusMessage && (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm ${
            statusMessage.type === "success"
              ? "bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800"
              : "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
          }`}
        >
          {statusMessage.message}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder={t.searchDepartments}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 w-64"
            />
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
          >
            <option value="all">{t.allStatus}</option>
            <option value="active">{t.active}</option>
            <option value="inactive">{t.inactive}</option>
          </select>
          {(searchQuery || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              {t.clearFilters}
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setEditingDepartment(null);
            setFormData({
              name: "",
              code: "",
              description: "",
            });
            setShowModal(true);
          }}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
        >
          {t.addDepartment}
        </button>
      </div>

      <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t.loadingPage}</div>
        ) : filteredDepartments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {searchQuery || statusFilter !== "all" ? t.noDepartmentsMatch : t.noDepartments}
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-6 py-3">{t.name}</th>
                <th className="px-6 py-3">{t.code}</th>
                <th className="px-6 py-3">{t.description}</th>
                <th className="px-6 py-3">{t.headOfDepartment}</th>
                <th className="px-6 py-3">{t.status}</th>
                <th className="px-6 py-3">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredDepartments.map((department) => (
                <tr key={department.department_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{department.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{department.code || t.notAvailable}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{department.description || t.notAvailable}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                    {department.head_of_department?.user.full_name || t.notAssigned}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        department.is_active
                          ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                          : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          department.is_active ? "bg-orange-500" : "bg-rose-500"
                        }`}
                      />
                      {department.is_active ? t.active : t.inactive}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(department)}
                        className="text-sm text-orange-600 hover:text-orange-700 dark:hover:text-orange-400"
                      >
                        {t.edit}
                      </button>
                      <button
                        onClick={() => handleDeactivate(department.department_id)}
                        disabled={deactivatingId === department.department_id}
                        className="text-sm text-rose-600 hover:text-rose-700 dark:hover:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deactivatingId === department.department_id ? t.deactivating : t.deactivate}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingDepartment ? t.editDepartment : t.addNewDepartment}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingDepartment(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.departmentName}</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.departmentCode}</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.description}</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                />
              </div>

              <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {t.noteDepartmentHeads}
                </p>
              </div>


              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingDepartment(null);
                  }}
                  className="w-full sm:w-auto rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (editingDepartment ? t.updating : t.creating) : (editingDepartment ? t.update : t.create)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
