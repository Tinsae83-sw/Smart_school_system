"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { vpAcademicApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAcademicTranslations } from "@/translations/vp-academic";

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
  const { language } = useLanguage();
  const t = vpAcademicTranslations[language];
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const fetchDataRef = useRef<{ isFetching: boolean }>({ isFetching: false });
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

  const fetchData = useCallback(async () => {
    if (fetchDataRef.current.isFetching) return;
    fetchDataRef.current.isFetching = true;
    setLoading(true);
    try {
      const [teachersRes, deptsRes] = await Promise.all([
        vpAcademicApi.get('/teachers'),
        vpAcademicApi.get('/departments'),
      ]);

      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        setTeachers(teachersData.teachers || teachersData);
      }

      if (deptsRes.ok) {
        const deptsData = await deptsRes.json();
        setDepartments(deptsData.map((d: any) => d.name));
      }
    } catch (error) {
      console.error("Failed to fetch teachers:", error);
    } finally {
      setLoading(false);
      fetchDataRef.current.isFetching = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTeachers = teachers.filter(teacher => {
    if (!teacher.user.is_active) return false;
    
    const matchesSearch = searchQuery === "" || 
      teacher.user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.employee_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = departmentFilter === "" || teacher.department === departmentFilter;
    
    const matchesGrade = gradeFilter === "" || teacher.grade_levels.includes(parseInt(gradeFilter));
    
    return matchesSearch && matchesDepartment && matchesGrade;
  });

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
    if (!editingTeacher || isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      const payload = {
        ...formData,
        age: formData.age ? parseInt(formData.age) : null,
        experience_years: formData.experience_years ? parseInt(formData.experience_years) : null,
      };

      const res = await vpAcademicApi.put(`/teachers/${editingTeacher.teacher_id}`, payload);

      if (res.ok) {
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
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to update teacher:", error);
      alert(t.operationFailed);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(teacherId: number) {
    if (!confirm(t.confirmDeleteTeacher)) return;
    try {
      const res = await vpAcademicApi.delete(`/teachers/${teacherId}`);
      if (res.ok) {
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to delete teacher:", error);
      alert(t.failedDeleteTeacher);
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

  function clearFilters() {
    setSearchQuery("");
    setDepartmentFilter("");
    setGradeFilter("");
  }

  return (
    <div>
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.availableTeachers}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.viewManageActiveTeachers}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalTeachersCard}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{teachers.filter(t => t.user.is_active).length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-2xl">👨‍🏫</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.departmentsCard}</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{departments.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <span className="text-2xl">🏢</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.subjectsTaughtCard}</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{availableSubjects.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <span className="text-2xl">📚</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.gradeLevelsCard}</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{availableGrades.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <span className="text-2xl">🎓</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 dark:border-orange-400 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder={t.searchTeachers}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 dark:bg-slate-800 dark:text-white"
            >
              <option value="">{t.allDepartments}</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 dark:bg-slate-800 dark:text-white"
            >
              <option value="">{t.allGrades}</option>
              {availableGrades.map((grade) => (
                <option key={grade} value={grade}>Grade {grade}</option>
              ))}
            </select>
            {(searchQuery || departmentFilter || gradeFilter) && (
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
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.department}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.degree}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.subjects}</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.grades}</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {filteredTeachers.map((teacher) => (
                    <tr key={teacher.teacher_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">{teacher.employee_id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-white">{teacher.user.full_name}</p>
                          {teacher.experience_years && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{teacher.experience_years} {t.yearsExp}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">{teacher.user.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                          {teacher.department || t.unassigned}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">{teacher.degree_level || "N/A"}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-[200px] truncate">
                          {teacher.subjects.slice(0, 3).join(", ")}
                          {teacher.subjects.length > 3 && "..."}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {teacher.grade_levels.length > 0 ? teacher.grade_levels.map(g => `Grade ${g}`).join(", ") : "N/A"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(teacher)}
                            className="rounded-lg bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition"
                          >
                            {t.edit}
                          </button>
                          <button
                            onClick={() => handleDelete(teacher.teacher_id)}
                            className="rounded-lg bg-red-50 dark:bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                          >
                            {t.delete}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredTeachers.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                        {teachers.filter(t => t.user.is_active).length === 0 ? t.noActiveTeachers : t.noTeachersMatchFilters}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.editTeacher}</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingTeacher(null);
                }}
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
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.employeeIdLabel} *</label>
                  <input
                    type="text"
                    required
                    value={formData.employee_id}
                    onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.email} *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.phoneNumber}</label>
                  <input
                    type="text"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.department} *</label>
                  <select
                    required
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                  >
                    <option value="">{t.department}</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.degree}</label>
                  <select
                    value={formData.degree_level}
                    onChange={(e) => setFormData({ ...formData, degree_level: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                  >
                    {degreeLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.gender}</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                  >
                    {genders.map((gender) => (
                      <option key={gender} value={gender}>
                        {gender}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.age}</label>
                  <input
                    type="number"
                    min="18"
                    max="100"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.experienceYears}</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.experience_years}
                    onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.selectGrades}</label>
                <div className="flex flex-wrap gap-2">
                  {availableGrades.map((grade) => (
                    <button
                      key={grade}
                      type="button"
                      onClick={() => toggleGradeLevel(grade)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        formData.grade_levels.includes(grade)
                          ? "bg-orange-600 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      Grade {grade}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.selectSubjects}</label>
                <div className="flex flex-wrap gap-2">
                  {availableSubjects.map((subject) => (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                        formData.subjects.includes(subject)
                          ? "bg-orange-600 text-white"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
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
                  className="w-full sm:w-auto rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t.loading : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
