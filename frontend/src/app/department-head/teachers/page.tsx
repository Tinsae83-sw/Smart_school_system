"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/department-head";
const api = authFetchFor("DEPARTMENT_HEAD");

type Teacher = {
  teacher_id: number;
  full_name: string;
  email: string;
  phone_number?: string;
  department: string;
  subjects: string[];
  grade_levels: number[];
  degree_level?: string;
  experience_years?: number;
  hire_date?: string;
  workload: number;
  classes: { class_name: string; subject: string }[];
  status: string;
};

type SchoolClass = {
  class_id: number;
  class_name: string;
  academic_year: string;
};

type Subject = {
  subject_id: number;
  subject_name: string;
  subject_code: string;
};

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [department, setDepartment] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<number[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);

  async function fetchTeachers() {
    setLoading(true);
    try {
      const token = localStorage.getItem("dept_head_token");
      const res = await api(`${API_BASE}/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.teachers || []);
        setDepartment(data.department || "");
      }
    } catch (error) {
      console.error("Error fetching teachers:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClasses() {
    try {
      const res = await api(`${API_BASE}/classes`);
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || data);
      }
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  }

  async function fetchSubjects() {
    try {
      const res = await api(`${API_BASE}/subjects`);
      if (res.ok) {
        const data = await res.json();
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  }

  useEffect(() => {
    fetchTeachers();
    fetchClasses();
    fetchSubjects();
  }, []);

  async function handleAssignCourse(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedTeacher || selectedClasses.length === 0 || !selectedSubject) {
      alert("Please select at least one class and a subject");
      return;
    }

    try {
      const token = localStorage.getItem("dept_head_token");
      
      for (const classId of selectedClasses) {
        const res = await api(`${API_BASE}/teachers/assign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            teacher_id: selectedTeacher.teacher_id,
            class_id: classId,
            subject_id: selectedSubject
          })
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to assign course");
        }
      }

      alert("Course assigned successfully!");
      setShowAssignModal(false);
      setSelectedTeacher(null);
      setSelectedClasses([]);
      setSelectedSubject(null);
      fetchTeachers();
    } catch (error) {
      console.error("Error assigning course:", error);
      alert("Failed to assign course. Please try again.");
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Department Teachers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage teaching staff in <span className="font-medium text-orange-600">{department || "your department"}</span>
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
        >
          Add Teaching Assistant
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        </div>
      ) : teachers.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-200">
          <p className="text-slate-500">No teachers found in your department.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Name</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Email</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Subjects</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Grade Levels</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Assigned Classes</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Workload</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((teacher) => (
                  <tr key={teacher.teacher_id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{teacher.full_name}</div>
                      <div className="text-xs text-slate-500">{teacher.degree_level}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{teacher.email}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {teacher.subjects.map((subject, i) => (
                          <span key={i} className="inline-flex items-center rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                            {subject}
                          </span>
                        ))}
                        {teacher.subjects.length === 0 && (
                          <span className="text-sm text-slate-400">No subjects</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {teacher.grade_levels.map((gl, i) => (
                        <span key={i}>{gl}{i < teacher.grade_levels.length - 1 ? ", " : ""}</span>
                      ))}
                    </td>
                    <td className="px-6 py-4">
                      {teacher.classes && teacher.classes.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teacher.classes.map((cls, i) => (
                            <span key={i} className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                              {cls.class_name} - {cls.subject}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">No classes assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        teacher.workload <= 4 ? "bg-emerald-50 text-emerald-700" : 
                        teacher.workload <= 6 ? "bg-amber-50 text-amber-700" : 
                        "bg-rose-50 text-rose-700"
                      }`}>
                        {teacher.workload} classes
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        teacher.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                      }`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${teacher.status === "Active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                        {teacher.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelectedTeacher(teacher); setShowAssignModal(true); }}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
                        >
                          Assign Course
                        </button>
                        <Link
                          href={`/department-head/teachers/${teacher.teacher_id}/performance`}
                          className="rounded-lg bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100 transition"
                        >
                          Performance
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Teaching Assistant Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Add Teaching Assistant</h2>
            <p className="mt-1 text-sm text-slate-500">Register a new teaching assistant for your department</p>
            <form className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                <input type="text" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="Enter full name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input type="email" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="Enter email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Phone Number</label>
                <input type="tel" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="+251XXXXXXXXX" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input type="password" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="Enter password" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Subjects (comma-separated)</label>
                <input type="text" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="Math, Physics" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Grade Levels (comma-separated)</label>
                <input type="text" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" placeholder="9, 10, 11, 12" />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
                >
                  Add TA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Course Modal */}
      {showAssignModal && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">Assign Course to {selectedTeacher.full_name}</h2>
            <p className="mt-1 text-sm text-slate-500">Assign this teacher to classes and subject</p>
            <form onSubmit={handleAssignCourse} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Classes</label>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-300 p-3 space-y-2">
                  {classes.length === 0 ? (
                    <p className="text-sm text-slate-500">No classes available</p>
                  ) : (
                    classes.map((cls) => (
                      <label key={cls.class_id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedClasses.includes(cls.class_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClasses([...selectedClasses, cls.class_id]);
                            } else {
                              setSelectedClasses(selectedClasses.filter(id => id !== cls.class_id));
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm text-slate-700">
                          {cls.class_name} ({cls.academic_year})
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Subject</label>
                <select 
                  value={selectedSubject || ""}
                  onChange={(e) => setSelectedSubject(e.target.value ? Number(e.target.value) : null)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                >
                  <option value="">Select subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.subject_id} value={subject.subject_id}>
                      {subject.subject_name} ({subject.subject_code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { 
                    setShowAssignModal(false); 
                    setSelectedTeacher(null); 
                    setSelectedClasses([]);
                    setSelectedSubject(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
