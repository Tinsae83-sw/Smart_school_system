"use client";

import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/vp-academic";

type Teacher = {
  teacher_id: number;
  user: {
    user_id: number;
    full_name: string;
    email: string;
    phone_number?: string;
    is_active: boolean;
  };
  employee_id: string;
  department?: string;
  degree_level?: string;
  gender?: string;
  age?: number;
  experience_years?: number;
  grade_levels: number[];
  subjects: string[];
};

type Department = string;

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    password: "",
    department: "",
    degree_level: "BACHELOR",
    gender: "MALE",
    age: "",
    experience_years: "",
    grade_levels: [] as number[],
    subjects: [] as string[],
    employee_id: "",
  });

  const degreeLevels = ["BACHELOR", "MASTER", "PHD", "DIPLOMA", "OTHER"];
  const genders = ["MALE", "FEMALE", "OTHER"];
  const availableSubjects = [
    "Mathematics",
    "Physics",
    "Chemistry",
    "Biology",
    "English",
    "Amharic",
    "History",
    "Geography",
    "Civics",
    "ICT",
    "Physical Education",
    "Arts",
  ];
  const availableGrades = [9, 10, 11, 12];

  async function fetchTeachers() {
    setLoading(true);
    try {
      const [teachersRes, deptsRes] = await Promise.all([
        fetch(`${API_BASE}/teachers`),
        fetch("http://localhost:5000/api/principal/departments"),
      ]);

      if (!teachersRes.ok) throw new Error("Failed to fetch teachers");
      const teachersData = await teachersRes.json();
      setTeachers(teachersData.teachers || teachersData);

      if (deptsRes.ok) {
        const deptsData = await deptsRes.json();
        setDepartments(deptsData.map((d: any) => d.name));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTeachers();
  }, []);

  function handleEdit(teacher: Teacher) {
    setEditingTeacher(teacher);
    setFormData({
      full_name: teacher.user.full_name,
      email: teacher.user.email,
      phone_number: teacher.user.phone_number || "",
      password: "",
      department: teacher.department || "",
      degree_level: teacher.degree_level || "BACHELOR",
      gender: teacher.gender || "MALE",
      age: teacher.age?.toString() || "",
      experience_years: teacher.experience_years?.toString() || "",
      grade_levels: teacher.grade_levels,
      subjects: teacher.subjects,
      employee_id: teacher.employee_id,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTeacher) return;
    
    try {
      const payload = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
      };

      const res = await fetch(`${API_BASE}/teachers/${editingTeacher.teacher_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update teacher");

      setShowModal(false);
      setEditingTeacher(null);
      setFormData({
        full_name: "",
        email: "",
        phone_number: "",
        password: "",
        department: "",
        degree_level: "BACHELOR",
        gender: "MALE",
        age: "",
        experience_years: "",
        grade_levels: [],
        subjects: [],
        employee_id: "",
      });
      fetchTeachers();
    } catch (error) {
      console.error(error);
      alert("Operation failed. Please try again.");
    }
  }

  async function handleDelete(teacherId: number) {
    if (!confirm("Are you sure you want to remove this teacher?")) return;
    try {
      const res = await fetch(`${API_BASE}/teachers/${teacherId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete teacher");
      fetchTeachers();
    } catch (error) {
      console.error(error);
      alert("Failed to delete teacher.");
    }
  }

  function toggleGradeLevel(grade: number) {
    setFormData((prev) => ({
      ...prev,
      grade_levels: prev.grade_levels.includes(grade)
        ? prev.grade_levels.filter((g) => g !== grade)
        : [...prev.grade_levels, grade],
    }));
  }

  function toggleSubject(subject: string) {
    setFormData((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((s) => s !== subject)
        : [...prev.subjects, subject],
    }));
  }

  return (
    <div>
      <div className="mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Available Teachers</h1>
          <p className="mt-1 text-sm text-slate-500">View all active teaching staff</p>
        </div>
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
                  <th className="px-6 py-4">Employee ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Department</th>
                  <th className="px-6 py-4">Degree</th>
                  <th className="px-6 py-4">Gender</th>
                  <th className="px-6 py-4">Age</th>
                  <th className="px-6 py-4">Experience</th>
                  <th className="px-6 py-4">Subjects</th>
                  <th className="px-6 py-4">Grades</th>
                  <th className="px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.filter(t => t.user.is_active).map((teacher) => (
                  <tr key={teacher.teacher_id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{teacher.employee_id}</td>
                    <td className="px-6 py-4 text-sm text-slate-900">{teacher.user.full_name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{teacher.user.email}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{teacher.user.phone_number || "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{teacher.department || "Unassigned"}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{teacher.degree_level || "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{teacher.gender || "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{teacher.age || "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{teacher.experience_years ? `${teacher.experience_years} years` : "N/A"}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {teacher.subjects.slice(0, 3).join(", ")}
                      {teacher.subjects.length > 3 && "..."}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {teacher.grade_levels.join(", ") || "N/A"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(teacher)}
                          className="text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(teacher.teacher_id)}
                          className="text-sm text-rose-600 hover:text-rose-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {teachers.filter(t => t.user.is_active).length === 0 && (
                  <tr>
                    <td colSpan={12} className="px-6 py-12 text-center text-sm text-slate-400">
                      No active teachers found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Edit Teacher</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTeacher(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                  <select
                    required
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
                  <label className="block text-sm font-medium text-slate-700 mb-1">Degree Level</label>
                  <select
                    value={formData.degree_level}
                    onChange={(e) => setFormData({ ...formData, degree_level: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {degreeLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {genders.map((gender) => (
                      <option key={gender} value={gender}>
                        {gender}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Years of Experience</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Grade Levels</label>
                <div className="flex flex-wrap gap-2">
                  {availableGrades.map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => toggleGradeLevel(grade)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        formData.grade_levels.includes(grade)
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      Grade {grade}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Subjects</label>
                <div className="flex flex-wrap gap-2">
                  {availableSubjects.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        formData.subjects.includes(subject)
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {subject}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingTeacher(null);
                  }}
                  className="w-full sm:w-auto rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
