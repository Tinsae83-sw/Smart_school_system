"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { principalTranslations } from "@/translations/principal";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/principal";

type StaffMember = {
  user_id: number;
  full_name: string;
  role: string;
  employee_id: string;
  department?: string;
  status: string;
  email: string;
  phone_number?: string;
  qualification?: string;
  years_of_experience?: number;
  gender?: string;
  age?: number;
};

type CreateStaffRequest = {
  full_name: string;
  role: string;
  employee_id: string;
  email: string;
  password?: string;
  phone_number?: string;
  department?: string;
  qualification?: string;
  years_of_experience?: number;
  gender?: string;
  age?: number;
};

export default function StaffManagementPage() {
  const { language } = useLanguage();
  const t = principalTranslations[language];
  const [seniorStaff, setSeniorStaff] = useState<StaffMember[]>([]);
  const [teachers, setTeachers] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"senior" | "teachers">("senior");
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const fetchStaffRef = useRef<{ isFetching: boolean }>({ isFetching: false });

  const [formData, setFormData] = useState<CreateStaffRequest>({
    full_name: "",
    role: "",
    employee_id: "",
    email: "",
    password: "",
    phone_number: "",
    department: "",
    qualification: "",
    years_of_experience: 0,
    gender: "",
    age: 0,
  });

  const fetchStaff = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (fetchStaffRef.current.isFetching) {
      return;
    }

    fetchStaffRef.current.isFetching = true;

    // Only show loading state on initial load, not on refreshes
    if (seniorStaff.length === 0 && teachers.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [seniorRes, teachersRes, deptsRes] = await Promise.all([
        fetch(`${API_BASE}/staff/senior`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/staff/teachers`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/departments`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      if (seniorRes.ok && teachersRes.ok && deptsRes.ok) {
        const [seniorData, teachersData, deptsData] = await Promise.all([
          seniorRes.json(),
          teachersRes.json(),
          deptsRes.json(),
        ]);
        setSeniorStaff(seniorData);
        setTeachers(teachersData);
        setDepartments(deptsData.map((d: any) => d.name));
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: language === "am" ? "የሰራተኞች መረጃን መጫን አልተቻለም።" : "Failed to load staff data." });
    } finally {
      setLoading(false);
      setRefreshing(false);
      fetchStaffRef.current.isFetching = false;
    }
  }, [seniorStaff.length, teachers.length]);

  useEffect(() => {
    fetchStaff();
  }, []);

  function handleEdit(staff: StaffMember) {
    setEditingStaff(staff);
    setFormData({
      full_name: staff.full_name,
      role: staff.role,
      employee_id: staff.employee_id,
      email: staff.email,
      password: "",
      phone_number: staff.phone_number || "",
      department: staff.department || "",
      qualification: staff.qualification || "",
      years_of_experience: staff.years_of_experience || 0,
      gender: staff.gender || "",
      age: staff.age || 0,
    });
    setShowModal(true);
  }

  async function handleDeactivate(staff: StaffMember) {
    if (!confirm(language === "am"
      ? `${staff.full_name}ን ከስራ ማገድ ይፈልጋሉ? ይህ ወደ ስርዓቱ እንዳይገቡ ያደርጋል።`
      : `Are you sure you want to deactivate ${staff.full_name}? This will prevent them from accessing the system.`)) return;

    setDeactivatingId(staff.user_id);

    const endpoint = activeTab === "senior" ? `/staff/senior/${staff.user_id}` : `/staff/teachers/${staff.user_id}`;

    // Optimistically update local state
    const deactivatedStaff = { ...staff, status: "INACTIVE" };
    if (activeTab === "senior") {
      setSeniorStaff(prev => prev.map(s => s.user_id === staff.user_id ? deactivatedStaff : s));
    } else {
      setTeachers(prev => prev.map(s => s.user_id === staff.user_id ? deactivatedStaff : s));
    }

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (res.ok) {
        setStatusMessage({ type: "success", message: language === "am" ? "ሰራተኛው ከስራ ታግዷል።" : "Staff member deactivated successfully." });
      } else {
        // Revert optimistic update on failure
        if (activeTab === "senior") {
          setSeniorStaff(prev => prev.map(s => s.user_id === staff.user_id ? staff : s));
        } else {
          setTeachers(prev => prev.map(s => s.user_id === staff.user_id ? staff : s));
        }
        setStatusMessage({ type: "error", message: language === "am" ? "ሰራተኛውን ከስራ ማገድ አልተቻለም።" : "Failed to deactivate staff member." });
      }
    } catch (error) {
      // Revert optimistic update on error
      if (activeTab === "senior") {
        setSeniorStaff(prev => prev.map(s => s.user_id === staff.user_id ? staff : s));
      } else {
        setTeachers(prev => prev.map(s => s.user_id === staff.user_id ? staff : s));
      }
      setStatusMessage({ type: "error", message: language === "am" ? "ሰራተኛውን ከስራ ማገድ አልተቻለም።" : "Failed to deactivate staff member." });
    } finally {
      setDeactivatingId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isSubmitting) return; // Prevent duplicate submissions
    setIsSubmitting(true);

    const endpoint = activeTab === "senior" ? "/staff/senior" : "/staff/teachers";
    const method = editingStaff ? "PUT" : "POST";
    const url = editingStaff ? `${API_BASE}${endpoint}/${editingStaff.user_id}` : `${API_BASE}${endpoint}`;

    // Prepare request body based on whether it's create or update
    let requestBody;
    if (editingStaff) {
      // For updates, only send fields that can be changed
      if (activeTab === "senior") {
        requestBody = {
          full_name: formData.full_name,
          email: formData.email,
          phone_number: formData.phone_number,
          department: formData.department,
        };
      } else {
        // Teacher update
        requestBody = {
          full_name: formData.full_name,
          email: formData.email,
          phone_number: formData.phone_number,
          department: formData.department,
          qualification: formData.qualification,
          years_of_experience: formData.years_of_experience,
        };
      }
    } else {
      // For creation, send all required fields
      if (activeTab === "senior") {
        requestBody = {
          full_name: formData.full_name,
          role: formData.role,
          employee_id: formData.employee_id,
          email: formData.email,
          password: formData.password || undefined,
          phone_number: formData.phone_number,
          department: formData.department,
        };
      } else {
        // Teacher creation
        requestBody = {
          full_name: formData.full_name,
          role: "TEACHER",
          employee_id: formData.employee_id,
          email: formData.email,
          password: formData.password || undefined,
          phone_number: formData.phone_number,
          department: formData.department,
          qualification: formData.qualification,
          years_of_experience: formData.years_of_experience,
        };
      }
    }

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

        // Update local state with the returned data from backend
        if (editingStaff && responseData.staff) {
          if (activeTab === "senior") {
            setSeniorStaff(prev => prev.map(s => s.user_id === editingStaff.user_id ? responseData.staff : s));
          } else {
            setTeachers(prev => prev.map(s => s.user_id === editingStaff.user_id ? responseData.staff : s));
          }
        } else if (!editingStaff) {
          // For new staff, fetch all data to get the complete list
          await fetchStaff();
        }

        setStatusMessage({ type: "success", message: language === "am"
          ? `ሰራተኛው ${editingStaff ? "ታድሷል" : "ተፈጥሯል"}።`
          : `Staff member ${editingStaff ? "updated" : "created"} successfully.` });
        setShowModal(false);
        setEditingStaff(null);
        setFormData({
          full_name: "",
          role: "",
          employee_id: "",
          email: "",
          password: "",
          phone_number: "",
          department: "",
          qualification: "",
          years_of_experience: 0,
          gender: "",
          age: 0,
        });
      } else {
        const errorData = await res.json();
        setStatusMessage({ type: "error", message: errorData.error || (language === "am"
          ? `ሰራተኛውን ${editingStaff ? "ማዘመን" : "መፍጠር"} አልተቻለም።`
          : `Failed to ${editingStaff ? "update" : "create"} staff member.`) });
      }
    } catch (error) {
      setStatusMessage({ type: "error", message: language === "am"
        ? `ሰራተኛውን ${editingStaff ? "ማዘመን" : "መፍጠር"} አልተቻለም።`
        : `Failed to ${editingStaff ? "update" : "create"} staff member.` });
    } finally {
      setIsSubmitting(false);
    }
  }

  const currentStaff = activeTab === "senior" ? seniorStaff : teachers;

  // Filter staff based on search query and department
  const filteredStaff = currentStaff.filter((staff) => {
    const matchesSearch =
      searchQuery === "" ||
      staff.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      staff.employee_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDepartment =
      departmentFilter === "" ||
      staff.department === departmentFilter ||
      (staff.department === null && departmentFilter === "Unassigned");

    return matchesSearch && matchesDepartment;
  });

  function formatRole(role: string): string {
    const roleMap: Record<string, string> = {
      'VP_ACADEMIC': t.vicePrincipalAcademic,
      'VP_ADMINISTRATION': t.vicePrincipalAdministration,
      'VP_ADMIN': t.vicePrincipalAdministration,
      'DEPARTMENT_HEAD': t.departmentHead,
      'TEACHER': t.teacher,
    };
    return roleMap[role] || role;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.staffManagement}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.staffSubtitle}</p>
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
            onClick={() => setActiveTab("senior")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "senior"
                ? "border-b-2 border-navy-600 text-navy-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.seniorStaffTab} ({seniorStaff.length})
          </button>
          <button
            onClick={() => setActiveTab("teachers")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "teachers"
                ? "border-b-2 border-navy-600 text-navy-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.teachersTab} ({teachers.length})
          </button>
        </nav>
      </div>

      {/* Actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder={t.searchStaff}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-600 pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 w-64"
            />
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
          >
            <option value="">{t.allDepartments}</option>
            <option value="Unassigned">{t.unassigned}</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
          {(searchQuery || departmentFilter) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setDepartmentFilter("");
              }}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              {t.clearFilters}
            </button>
          )}
          {refreshing && (
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t.syncingDatabase}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setEditingStaff(null);
            setFormData({
              full_name: "",
              role: "",
              employee_id: "",
              email: "",
              phone_number: "",
              department: "",
              qualification: "",
              years_of_experience: 0,
              gender: "",
              age: 0,
            });
            setShowModal(true);
          }}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
        >
          {activeTab === "senior" ? t.addSeniorStaff : t.addTeacher}
        </button>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t.loadingPage}</div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {searchQuery || departmentFilter ? t.noStaffMatch : t.noStaff}
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-slate-50 dark:bg-slate-700">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="px-6 py-3">{t.name}</th>
                <th className="px-6 py-3">{t.employeeId}</th>
                <th className="px-6 py-3">{t.role}</th>
                <th className="px-6 py-3">{t.department}</th>
                <th className="px-6 py-3">{t.email}</th>
                <th className="px-6 py-3">{t.status}</th>
                <th className="px-6 py-3">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredStaff.map((staff) => (
                <tr key={staff.user_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{staff.full_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{staff.employee_id}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{formatRole(staff.role)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{staff.department || t.notAvailable}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{staff.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      staff.status === "ACTIVE" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${staff.status === "ACTIVE" ? "bg-orange-500" : "bg-rose-500"}`} />
                      {staff.status === "ACTIVE" ? t.active : t.inactive}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(staff)}
                        className="text-sm text-orange-600 hover:text-orange-700"
                      >
                        {t.edit}
                      </button>
                      <button
                        onClick={() => handleDeactivate(staff)}
                        disabled={deactivatingId === staff.user_id}
                        className="text-sm text-rose-600 hover:text-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deactivatingId === staff.user_id ? t.deactivating : t.deactivate}
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
                {editingStaff ? t.editStaff : (activeTab === "senior" ? t.addSeniorStaff : t.addTeacher)}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingStaff(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.fullName}</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.role}</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                >
                  {activeTab === "senior" ? (
                    <>
                      <option value="">{t.selectRole}</option>
                      <option value="VP_ACADEMIC">{t.vicePrincipalAcademic}</option>
                      <option value="VP_ADMINISTRATION">{t.vicePrincipalAdministration}</option>
                      <option value="DEPARTMENT_HEAD">{t.departmentHead}</option>
                    </>
                  ) : (
                    <option value="TEACHER">{t.teacher}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.employeeId}</label>
                <input
                  type="text"
                  required
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.email}</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                />
              </div>

              {!editingStaff && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.password}</label>
                  <input
                    type="password"
                    placeholder={t.defaultPasswordPlaceholder}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.defaultPasswordHint}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.phoneNumber}</label>
                <input
                  type="text"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                />
              </div>

              {activeTab === "senior" && formData.role === "DEPARTMENT_HEAD" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assign to Department <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  >
                    <option value="">{t.selectDepartment}</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.departmentHeadAssignment}</p>
                </div>
              )}

              {activeTab === "senior" && (formData.role === "VP_ACADEMIC" || formData.role === "VP_ADMINISTRATION") && (
                <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-3">
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Note: Vice Principals oversee all departments and are not assigned to a specific department.
                  </p>
                </div>
              )}

              {activeTab === "teachers" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.departments}</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                    >
                      <option value="">{t.selectDepartment}</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.qualification}</label>
                    <select
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                    >
                      <option value="">{t.selectQualification}</option>
                      <option value="BACHELOR">{t.bachelorsDegree}</option>
                      <option value="MASTER">{t.mastersDegree}</option>
                      <option value="PHD">{t.phd}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.yearsExperience}</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.years_of_experience}
                      onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.gender}</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                    >
                      <option value="">{t.selectGender}</option>
                      <option value="MALE">{t.male}</option>
                      <option value="FEMALE">{t.female}</option>
                      <option value="OTHER">{t.other}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.age}</label>
                    <input
                      type="number"
                      min="18"
                      max="100"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingStaff(null);
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
                  {isSubmitting ? (editingStaff ? t.updating : t.creating) : (editingStaff ? t.update : t.create)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
