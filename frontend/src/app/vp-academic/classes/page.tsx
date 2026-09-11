"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

const API_BASE = "/api/vp-academic";

function authToken() {
  return getToken("VP_ACADEMIC");
}

type ClassCategory = "GENERAL" | "NATURAL_SCIENCE" | "SOCIAL_SCIENCE";

type Teacher = {
  teacher_id: number;
  user: {
    user_id: number;
    full_name: string;
    email: string;
  };
  employee_id: string;
  department?: string;
  grade_levels: number[];
};

type SchoolClass = {
  class_id: number;
  class_name: string;
  academic_year: string;
  grade_level: number;
  section: string;
  category?: ClassCategory;
  homeroom_teacher?: {
    user_id: number;
    full_name: string;
  };
  student_count?: number;
  capacity?: number;
  status: string;
  created_at: string;
};

export default function ClassesPage() {
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>("grade_level");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [formData, setFormData] = useState({
    class_name: "",
    academic_year: "2024-2025",
    capacity: 40,
    status: "ACTIVE",
    homeroom_teacher_id: "",
  });

  async function fetchClasses() {
    setLoading(true);
    try {
      const data = await apiFetch(`${API_BASE}/classes`, { token: authToken() });
      
      // Handle different response structures
      const classesData = data.classes || data;
      
      // Map the API response to match frontend expectations
      const mappedClasses = classesData.map((cls: any) => {
        // Parse grade and section from class_name if not provided
        let grade_level = cls.grade_level || 0;
        let section = cls.section || "";
        
        if ((!grade_level || !section) && cls.class_name) {
          // Try to parse from class_name format like "10A General" or "Grade 10A"
          const match = cls.class_name.match(/(\d+)\s*([A-Za-z])/);
          if (match) {
            grade_level = parseInt(match[1]);
            section = match[2];
          }
        }
        
        return {
          ...cls,
          homeroom_teacher: cls.homeroom_teacher || cls.homeroomTeacher || (cls.homeroom_teacher_user ? {
            user_id: cls.homeroom_teacher_user.user_id,
            full_name: cls.homeroom_teacher_user.full_name
          } : (cls.teacher ? {
            user_id: cls.teacher.user_id,
            full_name: cls.teacher.full_name
          } : null)),
          grade_level,
          section,
          capacity: cls.capacity || 40,
          status: cls.status || "ACTIVE",
        };
      });
      
      setClasses(mappedClasses);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTeachers() {
    setLoadingTeachers(true);
    try {
      const data = await apiFetch(`${API_BASE}/teachers`, { token: authToken() });
      setTeachers(data.teachers || data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTeachers(false);
    }
  }

  function getFilteredTeachers() {
    if (!editingClass) return teachers;
    const grade = editingClass.grade_level;
    return teachers.filter(teacher => 
      teacher.grade_levels.includes(grade) || teacher.grade_levels.length === 0
    );
  }

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  function handleEdit(classData: SchoolClass) {
    setEditingClass(classData);
    setFormData({
      class_name: classData.class_name,
      academic_year: classData.academic_year,
      capacity: classData.capacity || 40,
      status: classData.status,
      homeroom_teacher_id: classData.homeroom_teacher?.user_id?.toString() || "",
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        class_name: formData.class_name,
        academic_year: formData.academic_year,
        capacity: parseInt(formData.capacity.toString()),
        status: formData.status,
        homeroom_teacher_id: formData.homeroom_teacher_id ? parseInt(formData.homeroom_teacher_id) : null,
      };

      if (!editingClass) return;

      const res = await apiFetch(`${API_BASE}/classes/${editingClass.class_id}`, {
        method: "PUT",
        token: authToken(),
        body: JSON.stringify(payload),
      });

      setShowModal(false);
      setEditingClass(null);
      setFormData({
        class_name: "",
        academic_year: "2024-2025",
        capacity: 40,
        status: "ACTIVE",
        homeroom_teacher_id: "",
      });
      fetchClasses();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Operation failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(classId: number) {
    if (!confirm("Are you sure you want to delete this class?")) return;
    try {
      await apiFetch(`${API_BASE}/classes/${classId}`, {
        method: "DELETE",
        token: authToken(),
      });
      fetchClasses();
    } catch (error) {
      console.error(error);
      alert("Failed to delete class.");
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "ACTIVE": return "bg-emerald-50 text-emerald-700";
      case "INACTIVE": return "bg-slate-50 text-slate-700";
      case "ARCHIVED": return "bg-amber-50 text-amber-700";
      default: return "bg-gray-50 text-gray-700";
    }
  }

  function handleSort(column: string) {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  }

  function getSortedClasses() {
    const sorted = [...classes].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortColumn) {
        case "class_name":
          aValue = a.class_name;
          bValue = b.class_name;
          break;
        case "grade_level":
          // Sort by grade first, then by section as secondary
          const gradeA = a.grade_level || 0;
          const gradeB = b.grade_level || 0;
          if (gradeA !== gradeB) {
            return sortDirection === "asc" ? gradeA - gradeB : gradeB - gradeA;
          }
          // If grades are equal, sort by section
          const sectionA = a.section || "";
          const sectionB = b.section || "";
          return sortDirection === "asc" 
            ? sectionA.localeCompare(sectionB) 
            : sectionB.localeCompare(sectionA);
        case "section":
          aValue = a.section;
          bValue = b.section;
          break;
        case "academic_year":
          aValue = a.academic_year;
          bValue = b.academic_year;
          break;
        case "homeroom_teacher":
          aValue = a.homeroom_teacher?.full_name || "";
          bValue = b.homeroom_teacher?.full_name || "";
          break;
        case "student_count":
          aValue = a.student_count || 0;
          bValue = b.student_count || 0;
          break;
        case "capacity":
          aValue = a.capacity || 40;
          bValue = b.capacity || 40;
          break;
        case "status":
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.class_name;
          bValue = b.class_name;
      }

      if (typeof aValue === "string") {
        return sortDirection === "asc" 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      } else {
        return sortDirection === "asc" 
          ? aValue - bValue 
          : bValue - aValue;
      }
    });

    return sorted;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 p-3 shadow-lg">
              <span className="text-2xl">📚</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Classes Management</h1>
              <p className="text-sm text-slate-500 mt-0.5">Manage school classes and sections</p>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-emerald-600">📊</span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Classes</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{classes.length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-blue-600">✅</span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{classes.filter(c => c.status === 'ACTIVE').length}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-purple-600">👥</span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Students</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{classes.reduce((acc, c) => acc + (c.student_count || 0), 0)}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-orange-600">👨‍🏫</span>
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Teachers</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{classes.filter(c => c.homeroom_teacher).length}</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex gap-3">
            <select className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition focus:border-emerald-500 focus:outline-none">
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
          <Link
            href="/vp-academic/classes/add"
            className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-2 text-sm font-semibold text-white hover:from-emerald-700 hover:to-teal-700 transition shadow-md"
          >
            Add Class
          </Link>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition"
                      onClick={() => handleSort("class_name")}
                    >
                      <div className="flex items-center gap-1">
                        Class Name
                        {sortColumn === "class_name" && (
                          <span className="text-emerald-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition"
                      onClick={() => handleSort("grade_level")}
                    >
                      <div className="flex items-center gap-1">
                        Grade
                        {sortColumn === "grade_level" && (
                          <span className="text-emerald-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition"
                      onClick={() => handleSort("section")}
                    >
                      <div className="flex items-center gap-1">
                        Section
                        {sortColumn === "section" && (
                          <span className="text-emerald-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition"
                      onClick={() => handleSort("academic_year")}
                    >
                      <div className="flex items-center gap-1">
                        Academic Year
                        {sortColumn === "academic_year" && (
                          <span className="text-emerald-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition"
                      onClick={() => handleSort("homeroom_teacher")}
                    >
                      <div className="flex items-center gap-1">
                        Homeroom Teacher
                        {sortColumn === "homeroom_teacher" && (
                          <span className="text-emerald-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition"
                      onClick={() => handleSort("student_count")}
                    >
                      <div className="flex items-center gap-1">
                        Students
                        {sortColumn === "student_count" && (
                          <span className="text-emerald-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition"
                      onClick={() => handleSort("capacity")}
                    >
                      <div className="flex items-center gap-1">
                        Capacity
                        {sortColumn === "capacity" && (
                          <span className="text-emerald-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 cursor-pointer hover:bg-slate-100 transition"
                      onClick={() => handleSort("status")}
                    >
                      <div className="flex items-center gap-1">
                        Status
                        {sortColumn === "status" && (
                          <span className="text-emerald-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {getSortedClasses().map((classData) => (
                    <tr key={classData.class_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{classData.class_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">Grade {classData.grade_level}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{classData.section}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{classData.academic_year}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {classData.homeroom_teacher?.full_name || "Not assigned"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        <span className={(classData.student_count || 0) >= 40 ? 'font-semibold text-red-600' : ''}>
                          {classData.student_count || 0}
                        </span>
                        {(classData.student_count || 0) >= 40 && (
                          <span className="ml-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Full</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">{classData.capacity || 40}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(classData.status)}`}>
                          {classData.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(classData)}
                            className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(classData.class_id)}
                            className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {classes.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400">
                        No classes found. Add your first class to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Class Modal */}
        {showModal && editingClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-900">Edit Class</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Class Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.class_name}
                    onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year *</label>
                  <input
                    type="text"
                    required
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Homeroom Teacher</label>
                  {loadingTeachers ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
                    </div>
                  ) : (
                    <select
                      value={formData.homeroom_teacher_id}
                      onChange={(e) => setFormData({ ...formData, homeroom_teacher_id: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">No homeroom teacher assigned</option>
                      {getFilteredTeachers().map((teacher) => (
                        <option key={teacher.teacher_id} value={teacher.teacher_id}>
                          {teacher.user.full_name} - {teacher.department || "Unassigned"} ({teacher.employee_id})
                        </option>
                      ))}
                      {getFilteredTeachers().length === 0 && (
                        <option value="" disabled>
                          No teachers available for Grade {editingClass?.grade_level}
                        </option>
                      )}
                    </select>
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Capacity</label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      min="1"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="ARCHIVED">Archived</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Updating..." : "Update Class"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
