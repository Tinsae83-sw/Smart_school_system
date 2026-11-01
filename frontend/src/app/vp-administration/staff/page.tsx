"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { vpAdminApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAdministrationTranslations } from "@/translations/vp-administration";

type StaffMember = {
  staff_id: number;
  user_id: number;
  employee_id: string;
  full_name: string;
  email: string;
  phone_number?: string;
  role: string;
  hire_date?: string;
  is_active: boolean;
};

type AttendanceRecord = {
  attendance_id: number;
  staff_id: number;
  full_name: string;
  date: string;
  status: string;
  check_in_time?: string;
  check_out_time?: string;
};

type LeaveRequest = {
  leave_id: number;
  staff_id: number;
  full_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  reason: string;
  status: string;
};

export default function StaffPage() {
  const { language } = useLanguage();
  const t = vpAdministrationTranslations[language];
  const [activeTab, setActiveTab] = useState<"staff" | "attendance" | "leave">("staff");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const fetchDataRef = useRef<{ isFetching: boolean }>({ isFetching: false });
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    role: "LIBRARIAN",
    hire_date: "",
    password: "",
  });

  const roles = ["LIBRARIAN"];
  const leaveTypes = ["ANNUAL", "SICK", "EMERGENCY", "MATERNITY", "PATERNITY"];
  const attendanceStatuses = ["PRESENT", "ABSENT", "LATE", "HALF_DAY"];
  const leaveStatuses = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

  function getStatusLabel(status: string) {
    const labels: Record<string, string> = {
      PRESENT: t.present,
      ABSENT: t.absent,
      LATE: t.late,
      HALF_DAY: t.halfDay,
      APPROVED: t.approved,
      PENDING: t.pending,
      REJECTED: t.rejected,
      CANCELLED: t.cancelled,
    };
    return labels[status] || status.replace(/_/g, " ");
  }

  function getLeaveTypeLabel(leaveType: string) {
    const labels: Record<string, string> = {
      ANNUAL: t.annual,
      SICK: t.sick,
      EMERGENCY: t.emergency,
      MATERNITY: t.maternity,
      PATERNITY: t.paternity,
    };
    return labels[leaveType] || leaveType.replace(/_/g, " ");
  }

  function getRoleLabel(role: string) {
    return role === "LIBRARIAN" ? t.librarian : role.replace(/_/g, " ");
  }

  const fetchData = useCallback(async () => {
    if (fetchDataRef.current.isFetching) return;
    fetchDataRef.current.isFetching = true;
    setLoading(true);
    try {
      const [staffRes, attRes, leaveRes] = await Promise.all([
        vpAdminApi.get('/non-academic-staff'),
        vpAdminApi.get('/staff-attendance'),
        vpAdminApi.get('/staff-leave-requests'),
      ]);

      if (staffRes.ok) setStaff(await staffRes.json());
      if (attRes.ok) setAttendance(await attRes.json());
      if (leaveRes.ok) setLeaveRequests(await leaveRes.json());
    } catch (error) {
      console.error("Failed to fetch staff data:", error);
    } finally {
      setLoading(false);
      fetchDataRef.current.isFetching = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredStaff = staff.filter(member => {
    const matchesSearch = searchQuery === "" ||
      member.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.employee_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "" ||
      (statusFilter === "active" && member.is_active) ||
      (statusFilter === "inactive" && !member.is_active);

    return matchesSearch && matchesStatus;
  });

  const filteredAttendance = attendance.filter(record => {
    const matchesSearch = searchQuery === "" ||
      record.full_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "" || record.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const filteredLeaveRequests = leaveRequests.filter(request => {
    const matchesSearch = searchQuery === "" ||
      request.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.leave_type.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "" || request.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const url = editingStaff 
        ? `/non-academic-staff/${editingStaff.staff_id}`
        : '/non-academic-staff';
      const method = editingStaff ? "put" : "post";
      
      const payload = {
        ...formData,
      };

      const res = await vpAdminApi[method](url, payload);

      if (res.ok) {
        closeModal();
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to save staff:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleToggleStatus(staffId: number, currentStatus: boolean) {
    try {
      const res = await vpAdminApi.post(`/non-academic-staff/${staffId}/toggle-status`, { is_active: !currentStatus });
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to toggle staff status:", error);
    }
  }

  async function handleLeaveAction(leaveId: number, action: "approve" | "reject") {
    try {
      const res = await vpAdminApi.post(`/staff-leave-requests/${leaveId}/${action}`, {});
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error(`Failed to ${action} leave request:`, error);
    }
  }

  function openEditModal(staffMember: StaffMember) {
    setEditingStaff(staffMember);
    setFormData({
      full_name: staffMember.full_name,
      email: staffMember.email,
      phone_number: staffMember.phone_number || "",
      role: staffMember.role,
      hire_date: staffMember.hire_date || "",
      password: "",
    });
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingStaff(null);
    setFormData({
      full_name: "",
      email: "",
      phone_number: "",
      role: "LIBRARIAN",
      hire_date: "",
      password: "",
    });
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "PRESENT": return "bg-orange-100 text-orange-700 border-orange-200";
      case "ABSENT": return "bg-rose-100 text-rose-700 border-rose-200";
      case "LATE": return "bg-amber-100 text-amber-700 border-amber-200";
      case "HALF_DAY": return "bg-blue-100 text-blue-700 border-blue-200";
      case "APPROVED": return "bg-orange-100 text-orange-700 border-orange-200";
      case "PENDING": return "bg-amber-100 text-amber-700 border-amber-200";
      case "REJECTED": return "bg-rose-100 text-rose-700 border-rose-200";
      case "CANCELLED": return "bg-gray-100 text-gray-700 border-gray-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  }

  function clearFilters() {
    setSearchQuery("");
    setStatusFilter("");
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.staffManagementTitle}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.staffManagementSubtitle}</p>
        </div>
        {activeTab === "staff" && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-700 transition w-full sm:w-auto shadow-lg shadow-orange-200"
          >
            {t.addStaffMember}
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalStaff}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{staff.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <svg className="h-6 w-6 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v2c0 .656-.126 1.283-.356 1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.28 0 5.002 5.002 0 019.28 0M7 20v-2M12 12l9-4-9-4" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.active}</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{staff.filter(s => s.is_active).length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <svg className="h-6 w-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.pendingLeave}</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{leaveRequests.filter(l => l.status === 'PENDING').length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <svg className="h-6 w-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4l3 3m0 0l3-3M8 7v10m0 0l6-2m-6 2h6" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.attendanceToday}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{attendance.filter(a => a.date === new Date().toISOString().split('T')[0]).length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2zm-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("staff")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "staff"
                ? "border-b-2 border-sky-600 text-sky-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.staffMembers} ({staff.length})
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "attendance"
                ? "border-b-2 border-sky-600 text-sky-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.attendance} ({attendance.length})
          </button>
          <button
            onClick={() => setActiveTab("leave")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "leave"
                ? "border-b-2 border-sky-600 text-sky-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.leaveRequests} ({leaveRequests.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500 dark:text-slate-400">{t.loading}</div>
        </div>
      ) : (
        <>
          {activeTab === "staff" && (
            <>
              {/* Filters */}
              <div className="mb-6 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder={t.searchStaff}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">{t.allStatuses}</option>
                  <option value="active">{t.active}</option>
                  <option value="inactive">{t.inactive}</option>
                </select>
                {(searchQuery || statusFilter) && (
                  <button
                    onClick={clearFilters}
                    className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    {t.clear}
                  </button>
                )}
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.employeeId}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.name}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.email}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.phone}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.role}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.status}</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredStaff.map((member) => (
                        <tr key={member.staff_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                          <td className="px-6 py-4">
                            <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">{member.employee_id}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{member.full_name}</p>
                            {member.hire_date && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.hired}: {member.hire_date}</p>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">{member.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">{member.phone_number || "-"}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                              {getRoleLabel(member.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-medium ${member.is_active ? "bg-orange-100 text-orange-700 border-orange-200" : "bg-rose-100 text-rose-700 border-rose-200"}`}>
                              {member.is_active ? t.active : t.inactive}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEditModal(member)}
                                className="rounded-lg bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
                              >
                                {t.edit}
                              </button>
                              <button
                                onClick={() => handleToggleStatus(member.staff_id, member.is_active)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${member.is_active ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50" : "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50"}`}
                              >
                                {member.is_active ? t.deactivate : t.activate}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {filteredStaff.length === 0 && (
                        <tr>
                          <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                            {staff.length === 0 ? t.noStaffFound : t.noStaffMatch}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === "attendance" && (
            <>
              {/* Filters */}
              <div className="mb-6 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder={t.searchAttendance}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">{t.allStatuses}</option>
                  {attendanceStatuses.map(status => (
                    <option key={status} value={status}>{getStatusLabel(status)}</option>
                  ))}
                </select>
                {(searchQuery || statusFilter) && (
                  <button
                    onClick={clearFilters}
                    className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    {t.clear}
                  </button>
                )}
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.date}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.staffName}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.status}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.checkIn}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.checkOut}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredAttendance.map((record) => (
                        <tr key={record.attendance_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">{record.date}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{record.full_name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>
                              {getStatusLabel(record.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">{record.check_in_time || "-"}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400">{record.check_out_time || "-"}</p>
                          </td>
                        </tr>
                      ))}
                      {filteredAttendance.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                            {attendance.length === 0 ? t.noAttendanceFound : t.noAttendanceMatch}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === "leave" && (
            <>
              {/* Filters */}
              <div className="mb-6 flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="text"
                    placeholder={t.searchLeaveRequests}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-800 dark:text-white"
                  />
                </div>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">{t.allStatuses}</option>
                  {leaveStatuses.map(status => (
                    <option key={status} value={status}>{getStatusLabel(status)}</option>
                  ))}
                </select>
                {(searchQuery || statusFilter) && (
                  <button
                    onClick={clearFilters}
                    className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    {t.clear}
                  </button>
                )}
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.staffName}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.leaveType}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.duration}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.reason}</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.status}</th>
                        <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {filteredLeaveRequests.map((request) => (
                        <tr key={request.leave_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{request.full_name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                              {getLeaveTypeLabel(request.leave_type)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm text-slate-600 dark:text-slate-400">{request.start_date} {t.to} {request.end_date}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">{request.total_days} {t.days}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{request.reason}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center rounded-lg border px-3 py-1 text-xs font-medium ${getStatusColor(request.status)}`}>
                              {getStatusLabel(request.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {request.status === "PENDING" && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleLeaveAction(request.leave_id, "approve")}
                                  className="rounded-lg bg-orange-50 dark:bg-orange-900/30 px-3 py-1.5 text-xs font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition"
                                >
                                  {t.approve}
                                </button>
                                <button
                                  onClick={() => handleLeaveAction(request.leave_id, "reject")}
                                  className="rounded-lg bg-red-50 dark:bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                                >
                                  {t.reject}
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                      {filteredLeaveRequests.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                            {leaveRequests.length === 0 ? t.noLeaveFound : t.noLeaveMatch}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingStaff ? t.editStaffMember : t.addNewStaffMember}
              </h2>
              <button
                onClick={closeModal}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.fullName} *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.email} *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.phone}</label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.role} *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:bg-slate-700 dark:text-white"
                  >
                    <option value="">{t.selectRole}</option>
                    {roles.map(role => (
                      <option key={role} value={role}>{getRoleLabel(role)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.hireDate}</label>
                <input
                  type="date"
                  name="hire_date"
                  value={formData.hire_date}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:bg-slate-700 dark:text-white"
                />
              </div>

              {!editingStaff && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.password} *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t.saving : (editingStaff ? t.updateStaff : t.addStaff)}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
