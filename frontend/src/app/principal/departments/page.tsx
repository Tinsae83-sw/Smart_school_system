"use client";

import { useEffect, useState } from "react";

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
};


export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
  });

  async function fetchDepartments() {
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
      setStatusMessage({ type: "error", message: "Failed to load departments." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDepartments();
  }, []);

  function handleEdit(department: Department) {
    setEditingDepartment(department);
    setFormData({
      name: department.name,
      code: department.code || "",
      description: department.description || "",
    });
    setShowModal(true);
  }

  async function handleDelete(departmentId: number) {
    if (!confirm("Are you sure you want to delete this department?")) return;

    try {
      const res = await fetch(`${API_BASE}/departments/${departmentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (res.ok) {
        setStatusMessage({ type: "success", message: "Department deleted successfully." });
        fetchDepartments();
      } else {
        const errorData = await res.json();
        setStatusMessage({ type: "error", message: errorData.error || "Failed to delete department." });
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: "Failed to delete department." });
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const method = editingDepartment ? "PUT" : "POST";
    const url = editingDepartment
      ? `${API_BASE}/departments/${editingDepartment.department_id}`
      : `${API_BASE}/departments`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setStatusMessage({
          type: "success",
          message: `Department ${editingDepartment ? "updated" : "created"} successfully.`,
        });
        setShowModal(false);
        setEditingDepartment(null);
        setFormData({
          name: "",
          code: "",
          description: "",
        });
        fetchDepartments();
      } else {
        const errorData = await res.json();
        setStatusMessage({ type: "error", message: errorData.error || "Operation failed." });
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: "Operation failed." });
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Department Management</h1>
        <p className="mt-1 text-sm text-slate-500">Manage school departments and their heads</p>
      </div>

      {statusMessage && (
        <div
          className={`mb-6 rounded-xl px-4 py-3 text-sm ${
            statusMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusMessage.message}
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div></div>
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
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          Add Department
        </button>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
        ) : departments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No departments found.</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Name</th>
                <th className="px-6 py-3">Code</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Head of Department</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.map((department) => (
                <tr key={department.department_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{department.name}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{department.code || "N/A"}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{department.description || "N/A"}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {department.head_of_department?.user.full_name || "Not Assigned"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        department.is_active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          department.is_active ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {department.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(department)}
                        className="text-sm text-indigo-600 hover:text-indigo-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(department.department_id)}
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
                {editingDepartment ? "Edit Department" : "Add New Department"}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingDepartment(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>


              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingDepartment(null);
                  }}
                  className="w-full sm:w-auto rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  {editingDepartment ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
