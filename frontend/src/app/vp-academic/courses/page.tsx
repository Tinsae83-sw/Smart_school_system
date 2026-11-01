"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { vpAcademicApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAcademicTranslations } from "@/translations/vp-academic";

// Subject to department mapping for subjects without department data
const SUBJECT_DEPARTMENT_MAP: Record<string, string> = {
  // Natural Sciences
  'Physics': 'Natural',
  'Chemistry': 'Natural',
  'Biology': 'Natural',
  'Mathematics': 'Natural',
  'Advanced Mathematics': 'Natural',
  'Physical Science': 'Natural',
  'Geology': 'Natural',
  'Astronomy': 'Natural',
  
  // Social Sciences
  'History': 'Social',
  'Geography': 'Social',
  'Civics': 'Social',
  'Economics': 'Social',
  'Sociology': 'Social',
  'Psychology': 'Social',
  'Political Science': 'Social',
  'Ethiopian History': 'Social',
  'World History': 'Social',
  
  // Languages (General)
  'English': 'General',
  'Amharic': 'General',
  'Afaan Oromo': 'General',
  'Tigrinya': 'General',
  'French': 'General',
  'Arabic': 'General',
  'Literature': 'General',
  
  // Other (General)
  'Physical Education': 'General',
  'Art': 'General',
  'Music': 'General',
  'Information Technology': 'General',
  'Computer Science': 'General',
  'Technical Drawing': 'General',
  'Entrepreneurship': 'General',
};

// Function to get department from subject name
const getDepartmentFromSubject = (subjectName: string): string => {
  // Check if subject name contains any mapped subject
  for (const [subject, department] of Object.entries(SUBJECT_DEPARTMENT_MAP)) {
    if (subjectName.toLowerCase().includes(subject.toLowerCase())) {
      return department;
    }
  }
  return 'General'; // Default fallback
};

type Subject = {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  credit_hour: number;
  department?: string;
  grade_levels?: number[];
};

type Department = {
  department_id: number;
  name: string;
  code?: string;
};

export default function CoursesPage() {
  const { language } = useLanguage();
  const t = vpAcademicTranslations[language];
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const fetchDataRef = useRef<{ isFetching: boolean }>({ isFetching: false });
  const [subjectFormData, setSubjectFormData] = useState({
    subject_name: "",
    subject_code: "",
    credit_hour: "3",
    department: "",
    grade_levels: [] as number[],
  });

  // Group subjects by department
  const subjectsByDepartment = useMemo(() => {
    const grouped = subjects.reduce((acc: Record<string, Subject[]>, subject: Subject) => {
      const department = subject.department || getDepartmentFromSubject(subject.subject_name);
      if (!acc[department]) {
        acc[department] = [];
      }
      acc[department].push(subject);
      return acc;
    }, {});

    // Sort departments: first by database departments, then by custom order for fallback departments
    const sortedGrouped: Record<string, Subject[]> = {};
    const deptOrder = departments.map(d => d.name);
    const fallbackOrder = { 'Natural': 1, 'Social': 2, 'General': 3 };

    Object.keys(grouped)
      .sort((a, b) => {
        const aIndex = deptOrder.indexOf(a);
        const bIndex = deptOrder.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return (fallbackOrder[a as keyof typeof fallbackOrder] || 99) - (fallbackOrder[b as keyof typeof fallbackOrder] || 99);
      })
      .forEach(dept => {
        sortedGrouped[dept] = grouped[dept].sort((a, b) => a.subject_name.localeCompare(b.subject_name));
      });

    return sortedGrouped;
  }, [subjects, departments]);



  // Filter subjects by search
  const filteredSubjectsByDepartment = useMemo(() => {
    if (!searchQuery) return subjectsByDepartment;
    
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, Subject[]> = {};
    
    Object.entries(subjectsByDepartment).forEach(([department, deptSubjects]) => {
      const matching = deptSubjects.filter(subject => 
        subject.subject_name.toLowerCase().includes(query) ||
        subject.subject_code.toLowerCase().includes(query)
      );
      if (matching.length > 0) {
        filtered[department] = matching;
      }
    });
    
    return filtered;
  }, [subjectsByDepartment, searchQuery]);

  const fetchData = useCallback(async () => {
    if (fetchDataRef.current.isFetching) return;
    fetchDataRef.current.isFetching = true;
    setLoading(true);
    try {
      const subjectsRes = await vpAcademicApi.get(`/../admin/subjects`);

      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setSubjects(data.subjects || data);
      }

      // Fetch departments from database
      const academicOptionsRes = await vpAcademicApi.get(`/students/academic-options`);
      if (academicOptionsRes.ok) {
        const optionsData = await academicOptionsRes.json();
        setDepartments(optionsData.departments || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
      fetchDataRef.current.isFetching = false;
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubjectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await vpAcademicApi.post(`/../admin/subjects`, {
        subject_name: subjectFormData.subject_name,
        subject_code: subjectFormData.subject_code,
        credit_hour: parseInt(subjectFormData.credit_hour),
        department: subjectFormData.department,
        grade_levels: subjectFormData.grade_levels,
      });
      if (!res.ok) throw new Error("Failed to create subject");
      setShowSubjectModal(false);
      setSubjectFormData({ subject_name: "", subject_code: "", credit_hour: "3", department: "", grade_levels: [] });
      await fetchData();
    } catch (error) {
      console.error("Failed to create subject:", error);
      alert(t.failedCreateSubject);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDeleteSubject(subject: Subject) {
    setSelectedSubject(subject);
    setShowDeleteModal(true);
  }

  async function confirmDeleteSubject() {
    if (!selectedSubject) return;
    try {
      const res = await vpAcademicApi.delete(`/../admin/subjects/${selectedSubject.subject_id}`);
      if (res.ok) {
        setShowDeleteModal(false);
        setSelectedSubject(null);
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to delete subject:", error);
      alert(t.failedDeleteSubject);
    }
  }

  async function handleEditSubjectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSubject || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await vpAcademicApi.put(`/../admin/subjects/${selectedSubject.subject_id}`, {
        subject_name: subjectFormData.subject_name,
        subject_code: subjectFormData.subject_code,
        credit_hour: parseInt(subjectFormData.credit_hour),
        department: subjectFormData.department,
        grade_levels: subjectFormData.grade_levels,
      });
      if (!res.ok) throw new Error("Failed to update subject");
      setShowEditSubjectModal(false);
      setSelectedSubject(null);
      setSubjectFormData({ subject_name: "", subject_code: "", credit_hour: "3", department: "", grade_levels: [] });
      await fetchData();
    } catch (error) {
      console.error("Failed to update subject:", error);
      alert(t.failedUpdateSubject);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Calculate stats
  const totalSubjects = subjects.length;

  // Count subjects per department from database
  const departmentStats = useMemo(() => {
    const stats: Record<string, number> = {};
    departments.forEach(dept => {
      stats[dept.name] = subjects.filter(s => s.department === dept.name).length;
    });
    return stats;
  }, [subjects, departments]);

  return (
    <div>
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.coursesManagement}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.manageSubjectAssignments}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Total Subjects Card */}
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalSubjects}</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{totalSubjects}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>
        </div>

        {/* Dynamic Department Cards */}
        {departments.slice(0, 3).map((dept, index) => {
          const colors = [
            { light: 'bg-purple-100', dark: 'dark:bg-purple-900/30', text: 'text-purple-600', darkText: 'dark:text-purple-400' },
            { light: 'bg-blue-100', dark: 'dark:bg-blue-900/30', text: 'text-blue-600', darkText: 'dark:text-blue-400' },
            { light: 'bg-orange-100', dark: 'dark:bg-orange-900/30', text: 'text-orange-600', darkText: 'dark:text-orange-400' },
          ];
          const color = colors[index % colors.length];
          const count = departmentStats[dept.name] || 0;

          return (
            <div key={dept.department_id} className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{dept.name}</p>
                  <p className={`text-2xl font-bold ${color.text} ${color.darkText} mt-1`}>{count}</p>
                </div>
                <div className={`h-12 w-12 rounded-xl ${color.light} ${color.dark} flex items-center justify-center`}>
                  <svg className={`w-6 h-6 ${color.text} ${color.darkText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-6">
        <button
          onClick={() => {
            setSubjectFormData({ subject_name: "", subject_code: "", credit_hour: "3", department: "", grade_levels: [] });
            setShowSubjectModal(true);
          }}
          className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition shadow-lg shadow-emerald-200"
        >
          {t.registerSubject}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 dark:border-orange-400 border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t.registeredSubjects}</h2>
            <input
              type="text"
              placeholder={t.searchSubjects}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 dark:bg-slate-700 dark:text-white"
            />
          </div>
          <div className="p-6 space-y-6">
            {Object.keys(filteredSubjectsByDepartment).length === 0 ? (
              <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-12">
                {searchQuery ? t.noSubjectsMatchSearch : t.noSubjectsRegistered}
              </div>
            ) : (
              Object.entries(filteredSubjectsByDepartment).map(([department, deptSubjects]) => (
                <div key={department} className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="bg-orange-50 dark:bg-orange-900/30 px-4 py-3 border-b border-orange-100 dark:border-orange-800">
                    <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-300">{department}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                          <th className="px-6 py-4">{t.subjectName}</th>
                          <th className="px-6 py-4">{t.subjectCode}</th>
                          <th className="px-6 py-4">{t.creditHour}</th>
                          <th className="px-6 py-4">{t.gradeLevel}</th>
                          <th className="px-6 py-4">{t.department}</th>
                          <th className="px-6 py-4 text-right">{t.actions}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {deptSubjects.map((subject) => (
                          <tr key={subject.subject_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                            <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{subject.subject_name}</td>
                            <td className="px-6 py-4">
                              <span className="font-mono text-sm text-slate-600 dark:text-slate-400">{subject.subject_code}</span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{subject.credit_hour}</td>
                            <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">
                              {subject.grade_levels && subject.grade_levels.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {subject.grade_levels.map((grade) => (
                                    <span key={grade} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300">
                                      {t.grade} {grade}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{subject.department || getDepartmentFromSubject(subject.subject_name)}</td>
                            <td className="px-6 py-4">
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => {
                                    setSelectedSubject(subject);
                                    setSubjectFormData({
                                      subject_name: subject.subject_name,
                                      subject_code: subject.subject_code,
                                      credit_hour: subject.credit_hour.toString(),
                                      department: subject.department || '',
                                      grade_levels: subject.grade_levels || [],
                                    });
                                    setShowEditSubjectModal(true);
                                  }}
                                  className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                                >
                                  {t.edit}
                                </button>
                                <button
                                  onClick={() => handleDeleteSubject(subject)}
                                  className="rounded-lg bg-red-50 dark:bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                                >
                                  {t.delete}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Register Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.registerSubject}</h2>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubjectSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.subjectName} *</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={subjectFormData.subject_name}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, subject_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                  placeholder={t.subjectName}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.subjectCode} *</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={subjectFormData.subject_code}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, subject_code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                  placeholder={t.subjectCode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.creditHour} *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10"
                  value={subjectFormData.credit_hour}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, credit_hour: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.department}</label>
                <select
                  value={subjectFormData.department}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, department: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                >
                  <option value="">{t.selectDepartment}</option>
                  {departments.map((dept) => (
                    <option key={dept.department_id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.gradeLevel} (Grades 9-12)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[9, 10, 11, 12].map((grade) => (
                    <label key={grade} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={subjectFormData.grade_levels.includes(grade)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSubjectFormData({
                              ...subjectFormData,
                              grade_levels: [...subjectFormData.grade_levels, grade]
                            });
                          } else {
                            setSubjectFormData({
                              ...subjectFormData,
                              grade_levels: subjectFormData.grade_levels.filter(g => g !== grade)
                            });
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-orange-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{t.grade} {grade}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t.registering : t.registerSubject}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditSubjectModal && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.editSubject}</h2>
              <button
                onClick={() => {
                  setShowEditSubjectModal(false);
                  setSelectedSubject(null);
                }}
                className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubjectSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.subjectName} *</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={subjectFormData.subject_name}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, subject_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                  placeholder={t.subjectName}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.subjectCode} *</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={subjectFormData.subject_code}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, subject_code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                  placeholder={t.subjectCode}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.creditHour} *</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10"
                  value={subjectFormData.credit_hour}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, credit_hour: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.department}</label>
                <select
                  value={subjectFormData.department}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, department: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400"
                >
                  <option value="">{t.selectDepartment}</option>
                  {departments.map((dept) => (
                    <option key={dept.department_id} value={dept.name}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.gradeLevelsRange}</label>
                <div className="grid grid-cols-4 gap-2">
                  {[9, 10, 11, 12].map((grade) => (
                    <label key={grade} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={subjectFormData.grade_levels.includes(grade)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSubjectFormData({
                              ...subjectFormData,
                              grade_levels: [...subjectFormData.grade_levels, grade]
                            });
                          } else {
                            setSubjectFormData({
                              ...subjectFormData,
                              grade_levels: subjectFormData.grade_levels.filter(g => g !== grade)
                            });
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 text-orange-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{t.grade} {grade}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSubjectModal(false);
                    setSelectedSubject(null);
                  }}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t.updating : t.updateSubject}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.deleteSubject}</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSubject(null);
                }}
                className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                    {t.deleteSubjectConfirmation}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    {t.deleteSubjectImpact}
                  </p>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3 border border-slate-200 dark:border-slate-600">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {selectedSubject.subject_name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {t.codeLabel}: {selectedSubject.subject_code}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedSubject(null);
                }}
                className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                {t.cancel}
              </button>
              <button
                onClick={confirmDeleteSubject}
                disabled={isSubmitting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t.deleting : t.deleteSubject}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
