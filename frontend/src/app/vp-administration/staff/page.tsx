"use client";

import React, { useEffect, useState } from "react";
import { vpAdminApi } from "@/lib/api";

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
  const [activeTab, setActiveTab] = useState<"staff" | "attendance" | "leave">("staff");
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
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

  async function fetchData() {
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
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
        fetchData();
      }
    } catch (error) {
      console.error("Failed to save staff:", error);
    }
  }

  async function handleToggleStatus(staffId: number, currentStatus: boolean) {
    try {
      const res = await vpAdminApi.post(`/non-academic-staff/${staffId}/toggle-status`, { is_active: !currentStatus });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to toggle staff status:", error);
    }
  }

  async function handleLeaveAction(leaveId: number, action: "approve" | "reject") {
    try {
      const res = await vpAdminApi.post(`/staff-leave-requests/${leaveId}/${action}`, {});
      if (res.ok) {
        fetchData();
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
      case "PRESENT": return "bg-emerald-50 text-emerald-700";
      case "ABSENT": return "bg-rose-50 text-rose-700";
      case "LATE": return "bg-amber-50 text-amber-700";
      case "HALF_DAY": return "bg-blue-50 text-blue-700";
      case "APPROVED": return "bg-emerald-50 text-emerald-700";
      case "PENDING": return "bg-amber-50 text-amber-700";
      case "REJECTED": return "bg-rose-50 text-rose-700";
      case "CANCELLED": return "bg-gray-50 text-gray-700";
      default: return "bg-gray-50 text-gray-700";
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Non-Academic Staff Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage non-academic staff, attendance, and leave requests</p>
        </div>
        {activeTab === "staff" && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition"
          >
            Add Staff Member
          </button>
        )}
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("staff")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "staff"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Staff Members ({staff.length})
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "attendance"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Attendance ({attendance.length})
          </button>
          <button
            onClick={() => setActiveTab("leave")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "leave"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Leave Requests ({leaveRequests.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <>
          {activeTab === "staff" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Employee ID</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Email</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Role</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staff.map((member) => (
                      <tr key={member.staff_id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{member.employee_id}</td>
                        <td className="px-6 py-4 text-sm text-slate-700">{member.full_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{member.email}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{member.role.replace(/_/g, " ")}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${member.is_active ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                            {member.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditModal(member)}
                              className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleStatus(member.staff_id, member.is_active)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${member.is_active ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                            >
                              {member.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {staff.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                          No staff members found. Click "Add Staff Member" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Staff Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Check In</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Check Out</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendance.map((record) => (
                      <tr key={record.attendance_id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm text-slate-600">{record.date}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{record.full_name}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{record.check_in_time || "-"}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{record.check_out_time || "-"}</td>
                      </tr>
                    ))}
                    {attendance.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                          No attendance records found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "leave" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Staff Name</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Leave Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Duration</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Reason</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaveRequests.map((request) => (
                      <tr key={request.leave_id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{request.full_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{request.leave_type.replace(/_/g, " ")}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {request.start_date} to {request.end_date} ({request.total_days} days)
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 max-w-xs truncate">{request.reason}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(request.status)}`}>
                            {request.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {request.status === "PENDING" && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleLeaveAction(request.leave_id, "approve")}
                                className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleLeaveAction(request.leave_id, "reject")}
                                className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                    {leaveRequests.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                          No leave requests found.
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
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingStaff ? "Edit Staff Member" : "Add New Staff Member"}
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">Select role</option>
                    {roles.map(role => (
                      <option key={role} value={role}>{role.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Hire Date</label>
                <input
                  type="date"
                  name="hire_date"
                  value={formData.hire_date}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {!editingStaff && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition"
                >
                  {editingStaff ? "Update Staff" : "Add Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
