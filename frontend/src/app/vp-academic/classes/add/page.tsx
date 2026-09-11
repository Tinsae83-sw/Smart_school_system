"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { authFetchFor } from "@/lib/api";

const API_BASE = "/api/vp-academic";
const api = authFetchFor("VP_ACADEMIC");
const VP_ACADEMIC_API = "/api/vp-academic";

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

export default function AddClassPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    grade_level: "10",
    section: "A",
    category: "GENERAL" as ClassCategory,
    academic_year: "2024-2025",
    homeroom_teacher_id: "",
  });

  const gradeLevels = ["9", "10", "11", "12"];
  const sections = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T"];
  const categories: { value: ClassCategory; label: string; color: string; icon: string }[] = [
    { value: "GENERAL", label: "General", color: "bg-gradient-to-br from-slate-500 to-slate-600", icon: "📚" },
    { value: "NATURAL_SCIENCE", label: "Natural Science", color: "bg-gradient-to-br from-emerald-500 to-teal-600", icon: "🔬" },
    { value: "SOCIAL_SCIENCE", label: "Social Science", color: "bg-gradient-to-br from-sky-500 to-blue-600", icon: "🌍" },
  ];

  async function fetchTeachers() {
    setLoadingTeachers(true);
    try {
      const res = await api(`${VP_ACADEMIC_API}/teachers`);
      if (!res.ok) throw new Error("Failed to fetch teachers");
      const data = await res.json();
      setTeachers(data.teachers || data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingTeachers(false);
    }
  }

  useEffect(() => {
    fetchTeachers();
  }, []);

  function getFilteredTeachers() {
    const grade = parseInt(formData.grade_level);
    return teachers.filter(teacher => 
      teacher.grade_levels.includes(grade) || teacher.grade_levels.length === 0
    );
  }

  function generateClassName() {
    const categoryLabel = categories.find(c => c.value === formData.category)?.label || "";
    return `${formData.grade_level}${formData.section} ${categoryLabel}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Check for duplicate grade/section combination
      const existingClassesRes = await api(`${API_BASE}/classes`);
      if (existingClassesRes.ok) {
        const existingData = await existingClassesRes.json();
        const existingClasses = existingData.classes || existingData;
        
        const duplicate = existingClasses.find((cls: any) => {
          // Parse grade and section from existing class name
          const match = cls.class_name?.match(/(\d+)\s*([A-Za-z])/);
          if (match) {
            const existingGrade = match[1];
            const existingSection = match[2];
            return existingGrade === formData.grade_level && existingSection === formData.section;
          }
          return false;
        });

        if (duplicate) {
          throw new Error(`A class with Grade ${formData.grade_level} Section ${formData.section} already exists.`);
        }
      }

      const payload = {
        class_name: generateClassName(),
        grade_level: formData.grade_level,
        section: formData.section,
        academic_year: formData.academic_year,
        homeroom_teacher_id: formData.homeroom_teacher_id ? parseInt(formData.homeroom_teacher_id) : null,
      };

      const res = await api(`${API_BASE}/classes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create class");
      }

      alert(`Class "${generateClassName()}" created successfully!`);
      
      // Reset form
      setFormData({
        grade_level: "10",
        section: "A",
        category: "GENERAL",
        academic_year: "2024-2025",
        homeroom_teacher_id: "",
      });
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to create class. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/vp-academic/classes" className="text-sm text-slate-500 hover:text-slate-700 mb-2 inline-block flex items-center gap-1">
            ← Back to Classes
          </Link>
          <div className="flex items-center gap-3 mt-2">
            <div className="rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 p-3 shadow-lg">
              <span className="text-2xl">📚</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Add New Class</h1>
              <p className="text-sm text-slate-500 mt-0.5">Register a new class with category assignment</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Grade Level */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Grade Level</label>
                  <div className="grid grid-cols-4 gap-3">
                    {gradeLevels.map((grade) => (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => setFormData({ ...formData, grade_level: grade })}
                        className={`rounded-xl px-4 py-4 text-sm font-semibold transition-all duration-200 ${
                          formData.grade_level === grade
                            ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        Grade {grade}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Section */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Section</label>
                  <div className="grid grid-cols-5 gap-2">
                    {sections.map((section) => (
                      <button
                        key={section}
                        type="button"
                        onClick={() => setFormData({ ...formData, section })}
                        className={`rounded-xl px-3 py-3 text-sm font-semibold transition-all duration-200 ${
                          formData.section === section
                            ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {section}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category/Stream */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Category/Stream</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {categories.map((category) => (
                      <button
                        key={category.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: category.value })}
                        className={`rounded-xl px-4 py-6 text-sm font-semibold transition-all duration-200 ${
                          formData.category === category.value
                            ? category.color + " text-white shadow-lg"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-2xl">{category.icon}</span>
                          <span>{category.label}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Academic Year */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Academic Year</label>
                  <input
                    type="text"
                    required
                    value={formData.academic_year}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    placeholder="e.g., 2024-2025"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                  />
                </div>

                {/* Homeroom Teacher */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Homeroom Teacher (Optional)</label>
                  {loadingTeachers ? (
                    <div className="flex items-center justify-center py-4">
                      <div className="h-6 w-6 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
                    </div>
                  ) : (
                    <select
                      value={formData.homeroom_teacher_id}
                      onChange={(e) => setFormData({ ...formData, homeroom_teacher_id: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                    >
                      <option value="">No homeroom teacher assigned</option>
                      {getFilteredTeachers().map((teacher) => (
                        <option key={teacher.teacher_id} value={teacher.teacher_id}>
                          {teacher.user.full_name} - {teacher.department || "Unassigned"} ({teacher.employee_id})
                        </option>
                      ))}
                      {getFilteredTeachers().length === 0 && (
                        <option value="" disabled>
                          No teachers available for Grade {formData.grade_level}
                        </option>
                      )}
                    </select>
                  )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                  <Link
                    href="/vp-academic/classes"
                    className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-semibold text-white hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating...
                      </span>
                    ) : (
                      "Create Class"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Preview Card */}
            <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-6 border border-emerald-200">
              <h3 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                <span className="text-lg">👁️</span>
                Class Name Preview
              </h3>
              <div className="text-2xl font-bold text-emerald-600 mb-2">
                {generateClassName()}
              </div>
              <p className="text-xs text-emerald-700">
                This will be the class name in the system
              </p>
            </div>

            {/* Info Card */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-sky-50 p-6 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                <span className="text-lg">ℹ️</span>
                Class Categories
              </h3>
              <div className="space-y-3 text-xs text-blue-700">
                <div className="flex items-start gap-2">
                  <span className="text-lg">📚</span>
                  <div>
                    <strong>General:</strong>
                    <p className="mt-0.5">Mixed curriculum classes</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🔬</span>
                  <div>
                    <strong>Natural Science:</strong>
                    <p className="mt-0.5">Physics, Chemistry, Biology focus</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-lg">🌍</span>
                  <div>
                    <strong>Social Science:</strong>
                    <p className="mt-0.5">History, Geography, Civics focus</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Note Card */}
            <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 p-6 border border-amber-200">
              <h3 className="text-sm font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <span className="text-lg">📝</span>
                Important Note
              </h3>
              <p className="text-xs text-amber-700">
                Homeroom teacher assignment is optional during class creation. You can assign or change teachers later from the classes management page.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
