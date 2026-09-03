"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/principal";

const api = authFetchFor("PRINCIPAL");

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
  const [seniorStaff, setSeniorStaff] = useState<StaffMember[]>([]);
  const [teachers, setTeachers] = useState<StaffMember[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"senior" | "teachers">("senior");
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);

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

  async function fetchStaff() {
    setLoading(true);
    try {
      const [seniorRes, teachersRes, deptsRes] = await Promise.all([
        api(`${API_BASE}/staff/senior`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        api(`${API_BASE}/staff/teachers`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        api(`${API_BASE}/departments`, {
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
      setStatusMessage({ type: "error", message: "Failed to load staff data." });
    } finally {
      setLoading(false);
    }
  }

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

  function handleDelete(staff: StaffMember) {
    if (!confirm(`Are you sure you want to delete ${staff.full_name}?`)) return;

    const endpoint = activeTab === "senior" ? `/staff/senior/${staff.user_id}` : `/staff/teachers/${staff.user_id}`;

    api(`${API_BASE}${endpoint}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => {
        if (res.ok) {
          setStatusMessage({ type: "success", message: "Staff member deleted successfully." });
          fetchStaff();
        } else {
          setStatusMessage({ type: "error", message: "Failed to delete staff member." });
        }
      })
      .catch(() => setStatusMessage({ type: "error", message: "Failed to delete staff member." }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const endpoint = activeTab === "senior" ? "/staff/senior" : "/staff/teachers";
    const method = editingStaff ? "PUT" : "POST";
    const url = editingStaff ? `${API_BASE}${endpoint}/${editingStaff.user_id}` : `${API_BASE}${endpoint}`;

    api(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(formData),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatusMessage({ type: "success", message: `Staff member ${editingStaff ? "updated" : "created"} successfully.` });
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
          fetchStaff();
        } else {
          const errorData = await res.json();
          setStatusMessage({ type: "error", message: errorData.error || `Failed to ${editingStaff ? "update" : "create"} staff member.` });
        }
      })
      .catch(() => setStatusMessage({ type: "error", message: `Failed to ${editingStaff ? "update" : "create"} staff member.` }));
  }

  const currentStaff = activeTab === "senior" ? seniorStaff : teachers;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
        <p className="mt-1 text-sm text-slate-500">Manage senior staff and teachers</p>
      </div>

      {statusMessage && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${
          statusMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
        }`}>
          {statusMessage.message}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab("senior")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "senior"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Senior Staff ({seniorStaff.length})
          </button>
          <button
            onClick={() => setActiveTab("teachers")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "teachers"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Teachers ({teachers.length})
          </button>
        </nav>
      </div>

      {/* Actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search staff..."
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setEditingStaff(null);
            setFormData({
              full_name: "",
              role: activeTab === "senior" ? "VP_ACADEMIC" : "TEACHER",
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
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          Add {activeTab === "senior" ? "Senior Staff" : "Teacher"}
        </button>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
        ) : currentStaff.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No staff members found.</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Employee ID</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Email</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentStaff.map((staff) => (
                <tr key={staff.user_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{staff.full_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{staff.employee_id}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{staff.role}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{staff.department || "N/A"}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{staff.email}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      staff.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${staff.status === "ACTIVE" ? "bg-emerald-500" : "bg-rose-500"}`} />
                      {staff.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(staff)}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(staff)}
                        className="text-sm text-rose-600 hover:text-rose-700"
                      >
                        Delete
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
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {editingStaff ? "Edit Staff Member" : `Add ${activeTab === "senior" ? "Senior Staff" : "Teacher"}`}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingStaff(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
                <select
                  required
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {activeTab === "senior" ? (
                    <>
                      <option value="VP_ACADEMIC">Vice Principal - Academic</option>
                      <option value="VP_ADMINISTRATION">Vice Principal - Administration</option>
                      <option value="DEPARTMENT_HEAD">Department Head</option>
                    </>
                  ) : (
                    <option value="TEACHER">Teacher</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Employee ID</label>
                <input
                  type="text"
                  required
                  value={formData.employee_id}
                  onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {!editingStaff && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="Leave blank for default password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-500 mt-1">Default password will be used if left blank</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {activeTab === "senior" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Department {formData.role === "DEPARTMENT_HEAD" && <span className="text-red-500">*</span>}
                  </label>
                  <select
                    required={formData.role === "DEPARTMENT_HEAD"}
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select Department</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === "teachers" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept} value={dept}>
                          {dept}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Qualification</label>
                    <select
                      value={formData.qualification}
                      onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Qualification</option>
                      <option value="BACHELOR">Bachelor's Degree</option>
                      <option value="MASTER">Master's Degree</option>
                      <option value="PHD">PhD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Years of Experience</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.years_of_experience}
                      onChange={(e) => setFormData({ ...formData, years_of_experience: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                    <select
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select Gender</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                    <input
                      type="number"
                      min="18"
                      max="100"
                      value={formData.age}
                      onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                  className="w-full sm:w-auto rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  {editingStaff ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
