"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { vpAcademicApi } from "@/lib/api";
import { Users, UserRound, Link, Building2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAcademicTranslations } from "@/translations/vp-academic";

type Student = {
  student_id: number;
  user: {
    user_id: number;
    full_name: string;
    email: string;
    phone_number?: string;
    is_active: boolean;
  };
  student_number: string;
  enrollment_date: string;
  current_class?: {
    class_id: number;
    class_name: string;
  };
  date_of_birth?: string;
  gender?: string;
};

type SchoolClass = {
  class_id: number;
  class_name: string;
  academic_year: string;
};

type AcademicOptions = {
  grade_levels: string[];
  departments: Array<{
    department_id: number;
    name: string;
    code: string;
  }>;
  classes: SchoolClass[];
};

export default function StudentsPage() {
  const { language } = useLanguage();
  const t = vpAcademicTranslations[language];
  const [students, setStudents] = useState<Student[]>([]);
  const [groupedStudents, setGroupedStudents] = useState<Record<string, Student[]>>({});
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicOptions, setAcademicOptions] = useState<AcademicOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'students' | 'parents'>('students');
  const [parentRelationships, setParentRelationships] = useState<any[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const fetchDataRef = useRef<{ isFetching: boolean }>({ isFetching: false });

  const fetchData = useCallback(async () => {
    if (fetchDataRef.current.isFetching) return;
    fetchDataRef.current.isFetching = true;
    setLoading(true);
    try {
      const url = gradeFilter 
        ? `/students?grade_level=${gradeFilter}`
        : '/students';
      const [studentsRes, classesRes, academicOptionsRes] = await Promise.all([
        vpAcademicApi.get(url),
        vpAcademicApi.get(`/../admin/classes`),
        vpAcademicApi.get('/students/academic-options'),
      ]);

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        setStudents(data.all || data);
        setGroupedStudents(data.grouped || {});
      }
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.classes || data);
      }
      if (academicOptionsRes.ok) {
        const data = await academicOptionsRes.json();
        setAcademicOptions(data);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
      fetchDataRef.current.isFetching = false;
    }
  }, [gradeFilter]);

  const fetchParentRelationships = useCallback(async () => {
    setLoadingParents(true);
    try {
      const res = await vpAcademicApi.get('/parent-student-relationships');
      if (res.ok) {
        const data = await res.json();
        setParentRelationships(data);
      }
    } catch (error) {
      console.error("Failed to fetch parent relationships:", error);
    } finally {
      setLoadingParents(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'parents') {
      fetchParentRelationships();
    }
  }, [activeTab, fetchParentRelationships]);

  // Filter students based on search query
  const filteredGroupedStudents = Object.entries(groupedStudents).reduce((acc, [className, classStudents]) => {
    const filtered = classStudents.filter(student => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        student.user.full_name.toLowerCase().includes(query) ||
        student.user.email.toLowerCase().includes(query) ||
        student.student_number.toLowerCase().includes(query)
      );
    });
    if (filtered.length > 0) {
      acc[className] = filtered;
    }
    return acc;
  }, {} as Record<string, Student[]>);

  // Calculate stats
  const totalStudents = students.filter(s => s.user.is_active).length;
  const totalParents = parentRelationships.length;
  const totalLinkedStudents = parentRelationships.reduce((acc: number, parent: any) => acc + parent.students.length, 0);

  return (
    <div>
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.studentsManagement}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.manageStudentEnrollment}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalStudents}</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{totalStudents}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalParents}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalParents}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <UserRound className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.linkedStudents}</p>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">{totalLinkedStudents}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Link className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalClasses}</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{classes.length}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-4 px-1 text-sm font-semibold transition-colors ${
              activeTab === 'students'
                ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.studentsTab}
          </button>
          <button
            onClick={() => setActiveTab('parents')}
            className={`pb-4 px-1 text-sm font-semibold transition-colors ${
              activeTab === 'parents'
                ? 'text-orange-600 dark:text-orange-400 border-b-2 border-orange-600 dark:border-orange-400'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {t.parentStudentRelationships}
          </button>
        </nav>
      </div>

      {activeTab === 'students' ? (
        <>
          <div className="mb-6 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                placeholder={t.searchStudents}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
              />
            </div>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition focus:border-orange-500 focus:outline-none"
            >
              <option value="">{t.allGrades}</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
              <option value="11">Grade 11</option>
              <option value="12">Grade 12</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 dark:border-orange-400 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              {Object.keys(filteredGroupedStudents).length === 0 ? (
                <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
                  <div className="text-sm text-slate-400 dark:text-slate-500">
                    {searchQuery ? t.noStudentsMatchSearch : t.noStudentsFound}
                  </div>
                </div>
              ) : (
                Object.entries(filteredGroupedStudents).map(([className, classStudents]) => (
                  <div key={className} className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className="bg-gradient-to-r from-orange-50 dark:from-orange-900/30 to-blue-50 dark:to-blue-900/30 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{className}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">{classStudents.length} {classStudents.length === 1 ? t.student : t.students}</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            <th className="px-6 py-4">{t.studentNumber}</th>
                            <th className="px-6 py-4">{t.name}</th>
                            <th className="px-6 py-4">{t.email}</th>
                            <th className="px-6 py-4">{t.gender}</th>
                            <th className="px-6 py-4">{t.enrollmentDate}</th>
                            <th className="px-6 py-4">{t.status}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {classStudents.map((student) => (
                            <tr key={student.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                              <td className="px-6 py-4">
                                <span className="font-mono text-sm font-medium text-slate-900 dark:text-white">{student.student_number}</span>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{student.user.full_name}</td>
                              <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{student.user.email}</td>
                              <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{student.gender || "N/A"}</td>
                              <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                                {new Date(student.enrollment_date).toLocaleDateString()}
                              </td>
                              <td className="px-6 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border ${
                                    student.user.is_active
                                      ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800"
                                      : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      student.user.is_active ? "bg-orange-500" : "bg-rose-500"
                                    }`}
                                  />
                                  {student.user.is_active ? t.active : t.inactive}
                                </span>
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
          )}
        </>
      ) : (
        <>
          {/* Parent-Student Relationships Tab */}
          {loadingParents ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 dark:border-orange-400 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              {parentRelationships.length === 0 ? (
                <div className="rounded-xl bg-white dark:bg-slate-800 p-12 text-center shadow-sm border border-slate-200 dark:border-slate-700">
                  <div className="text-slate-400 dark:text-slate-500">{t.noParentStudentRelationships}</div>
                </div>
              ) : (
                parentRelationships.map((parent: any) => (
                  <div
                    key={parent.parent_id}
                    className="rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden"
                  >
                    {/* Parent Information */}
                    <div className="bg-gradient-to-r from-orange-50 dark:from-orange-900/30 to-blue-50 dark:to-blue-900/30 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{parent.parent_name}</h3>
                          <div className="mt-1 space-y-1 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700 dark:text-slate-300">{t.emailLabel}</span>
                              <span className="text-slate-900 dark:text-white">{parent.parent_email}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700 dark:text-slate-300">{t.phoneLabel}</span>
                              <span className="text-slate-900 dark:text-white">{parent.parent_phone || t.notProvided}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-700 dark:text-slate-300">{t.relationship}:</span>
                              <span className="capitalize text-slate-900 dark:text-white">{parent.relationship.toLowerCase()}</span>
                            </div>
                            {parent.address && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-700 dark:text-slate-300">{t.addressLabel}</span>
                                <span className="text-slate-900 dark:text-white">{parent.address}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-300 px-3 py-1 rounded-full text-sm font-medium">
                          {parent.students.length} {parent.students.length === 1 ? 'Student' : 'Students'}
                        </div>
                      </div>
                    </div>

                    {/* Students List */}
                    <div className="p-6">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">Linked Students</h4>
                      {parent.students.length === 0 ? (
                        <div className="text-slate-400 dark:text-slate-500 text-sm">No students linked to this parent</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-slate-200 dark:border-slate-700">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                  Student Name
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                  Student Number
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                  Grade
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                  Relationship
                                </th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                  Linked Date
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {parent.students.map((student: any) => (
                                <tr key={student.student_id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                  <td className="py-3 px-4">
                                    <div className="font-medium text-slate-900 dark:text-white">{student.student_name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{student.student_email}</div>
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{student.student_number}</td>
                                  <td className="py-3 px-4">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                      {student.grade}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 capitalize">
                                    {student.relationship_to_parent.toLowerCase()}
                                  </td>
                                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-sm">
                                    {new Date(student.linked_at).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
