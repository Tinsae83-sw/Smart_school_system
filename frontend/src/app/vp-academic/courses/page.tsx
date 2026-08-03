"use client";

import React, { useEffect, useState, useMemo } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/vp-academic";

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

type ClassSubject = {
  class_subject_id: number;
  school_class: {
    class_id: number;
    class_name: string;
    academic_year: string;
  };
  subject: {
    subject_id: number;
    subject_name: string;
    subject_code: string;
    department?: string;
  };
  teacher: {
    teacher_id: number;
    user: {
      full_name: string;
    };
  };
  credit_hour?: number;
};

type SchoolClass = {
  class_id: number;
  class_name: string;
  academic_year: string;
};

type Teacher = {
  teacher_id: number;
  user: {
    full_name: string;
  };
  department?: string;
};

export default function CoursesPage() {
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [showEditSubjectModal, setShowEditSubjectModal] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [courseFilter, setCourseFilter] = useState({
    class_id: "",
    subject_id: "",
    teacher_id: "",
    department: "",
  });
  const [formData, setFormData] = useState({
    class_id: "",
    subject_id: "",
    teacher_id: "",
    credit_hour: "3",
  });
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

    // Sort departments: Natural, Social, General
    const sortedGrouped: Record<string, Subject[]> = {};
    const order = { 'Natural': 1, 'Social': 2, 'General': 3 };
    Object.keys(grouped)
      .sort((a, b) => (order[a as keyof typeof order] || 99) - (order[b as keyof typeof order] || 99))
      .forEach(dept => {
        sortedGrouped[dept] = grouped[dept].sort((a, b) => a.subject_name.localeCompare(b.subject_name));
      });

    return sortedGrouped;
  }, [subjects]);

  // Filter course assignments
  const filteredClassSubjects = useMemo(() => {
    return classSubjects.filter((cs) => {
      if (courseFilter.class_id && cs.school_class.class_id !== parseInt(courseFilter.class_id)) {
        return false;
      }
      if (courseFilter.subject_id && cs.subject.subject_id !== parseInt(courseFilter.subject_id)) {
        return false;
      }
      if (courseFilter.teacher_id && cs.teacher?.teacher_id !== parseInt(courseFilter.teacher_id)) {
        return false;
      }
      if (courseFilter.department) {
        const subjectDept = cs.subject.department || getDepartmentFromSubject(cs.subject.subject_name);
        if (subjectDept !== courseFilter.department) {
          return false;
        }
      }
      return true;
    });
  }, [classSubjects, courseFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      const [classSubjectsRes, subjectsRes, classesRes, teachersRes] = await Promise.all([
        fetch(`${API_BASE}/../admin/class-subject`),
        fetch(`${API_BASE}/../admin/subjects`),
        fetch(`${API_BASE}/../admin/classes`),
        fetch(`${API_BASE}/teachers`),
      ]);

      if (classSubjectsRes.ok) {
        const data = await classSubjectsRes.json();
        setClassSubjects(data.class_subjects || data);
      }
      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setSubjects(data.subjects || data);
      }
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.classes || data);
      }
      if (teachersRes.ok) {
        const data = await teachersRes.json();
        setTeachers(data.teachers || data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/../admin/class-subject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: parseInt(formData.class_id),
          subject_id: parseInt(formData.subject_id),
          teacher_id: parseInt(formData.teacher_id),
          credit_hour: parseInt(formData.credit_hour),
        }),
      });
      if (!res.ok) throw new Error("Failed to assign course");
      setShowModal(false);
      setFormData({ class_id: "", subject_id: "", teacher_id: "", credit_hour: "3" });
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to assign course.");
    }
  }

  async function handleDelete(classSubjectId: number) {
    if (!confirm("Are you sure you want to remove this course assignment?")) return;
    try {
      const res = await fetch(`${API_BASE}/../admin/class-subject/${classSubjectId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete course");
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to delete course.");
    }
  }

  async function handleSubjectSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/../admin/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_name: subjectFormData.subject_name,
          subject_code: subjectFormData.subject_code,
          credit_hour: parseInt(subjectFormData.credit_hour),
          department: subjectFormData.department,
          grade_levels: subjectFormData.grade_levels,
        }),
      });
      if (!res.ok) throw new Error("Failed to create subject");
      setShowSubjectModal(false);
      setSubjectFormData({ subject_name: "", subject_code: "", credit_hour: "3", department: "", grade_levels: [] });
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to create subject.");
    }
  }

  async function handleDeleteSubject(subjectId: number) {
    if (!confirm("Are you sure you want to delete this subject? This will affect all course assignments.")) return;
    try {
      const res = await fetch(`${API_BASE}/../admin/subjects/${subjectId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete subject");
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to delete subject.");
    }
  }

  async function handleEditSubjectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSubject) return;
    try {
      const res = await fetch(`${API_BASE}/../admin/subjects/${selectedSubject.subject_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject_name: subjectFormData.subject_name,
          subject_code: subjectFormData.subject_code,
          credit_hour: parseInt(subjectFormData.credit_hour),
          department: subjectFormData.department,
          grade_levels: subjectFormData.grade_levels,
        }),
      });
      if (!res.ok) throw new Error("Failed to update subject");
      setShowEditSubjectModal(false);
      setSelectedSubject(null);
      setSubjectFormData({ subject_name: "", subject_code: "", credit_hour: "3", department: "", grade_levels: [] });
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to update subject.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Courses Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage subject assignments to classes and teachers</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              setSubjectFormData({ subject_name: "", subject_code: "", credit_hour: "3", department: "", grade_levels: [] });
              setShowSubjectModal(true);
            }}
            className="rounded-xl border border-emerald-600 px-4 py-2 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 transition"
          >
            Register Subject
          </button>
          <button
            onClick={() => {
              setFormData({ class_id: "", subject_id: "", teacher_id: "", credit_hour: "3" });
              setShowModal(true);
            }}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Assign Course
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Subjects List */}
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Registered Subjects</h2>
            </div>
            <div className="p-6 space-y-6">
              {Object.keys(subjectsByDepartment).length === 0 ? (
                <div className="text-center text-sm text-slate-400 py-12">
                  No subjects registered yet. Register your first subject to get started.
                </div>
              ) : (
                Object.entries(subjectsByDepartment).map(([department, deptSubjects]) => (
                  <div key={department} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100">
                      <h3 className="text-sm font-semibold text-emerald-900">{department}</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                            <th className="px-4 py-3">Subject Name</th>
                            <th className="px-4 py-3">Subject Code</th>
                            <th className="px-4 py-3">Credit Hour</th>
                            <th className="px-4 py-3">Grade Level</th>
                            <th className="px-4 py-3">Department</th>
                            <th className="px-4 py-3">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {deptSubjects.map((subject) => (
                            <tr key={subject.subject_id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">{subject.subject_name}</td>
                              <td className="px-4 py-3 text-sm text-slate-500">{subject.subject_code}</td>
                              <td className="px-4 py-3 text-sm text-slate-900">{subject.credit_hour}</td>
                              <td className="px-4 py-3 text-sm text-slate-900">
                                {subject.grade_levels && subject.grade_levels.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {subject.grade_levels.map((grade) => (
                                      <span key={grade} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                        Grade {grade}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  '-'
                                )}
                              </td>
                              <td className="px-4 py-3 text-sm text-slate-600">{subject.department || getDepartmentFromSubject(subject.subject_name)}</td>
                              <td className="px-4 py-3">
                                <div className="flex gap-2">
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
                                    className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubject(subject.subject_id)}
                                    className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 transition"
                                  >
                                    Delete
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

          {/* Course Assignments */}
          <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Course Assignments</h2>
              <button
                onClick={() => setCourseFilter({ class_id: "", subject_id: "", teacher_id: "", department: "" })}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Clear Filters
              </button>
            </div>
            
            {/* Filter Bar */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Class</label>
                  <select
                    value={courseFilter.class_id}
                    onChange={(e) => setCourseFilter({ ...courseFilter, class_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">All Classes</option>
                    {classes.map((cls) => (
                      <option key={cls.class_id} value={cls.class_id}>
                        {cls.class_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Subject</label>
                  <select
                    value={courseFilter.subject_id}
                    onChange={(e) => setCourseFilter({ ...courseFilter, subject_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">All Subjects</option>
                    {subjects.map((subject) => (
                      <option key={subject.subject_id} value={subject.subject_id}>
                        {subject.subject_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Teacher</label>
                  <select
                    value={courseFilter.teacher_id}
                    onChange={(e) => setCourseFilter({ ...courseFilter, teacher_id: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">All Teachers</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.teacher_id} value={teacher.teacher_id}>
                        {teacher.user.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Department</label>
                  <select
                    value={courseFilter.department}
                    onChange={(e) => setCourseFilter({ ...courseFilter, department: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="">All Departments</option>
                    <option value="Natural">Natural</option>
                    <option value="Social">Social</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Subject</th>
                    <th className="px-6 py-4">Subject Code</th>
                    <th className="px-6 py-4">Teacher</th>
                    <th className="px-6 py-4">Academic Year</th>
                    <th className="px-6 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredClassSubjects.map((cs) => (
                    <tr key={cs.class_subject_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{cs.school_class.class_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{cs.subject.subject_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{cs.subject.subject_code}</td>
                      <td className="px-6 py-4 text-sm text-slate-900">{cs.teacher?.user?.full_name || "Unassigned"}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{cs.school_class.academic_year}</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleDelete(cs.class_subject_id)}
                          className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredClassSubjects.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                        No courses found matching the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Assign Course Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Assign Course</h2>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                <select
                  required
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.class_name} ({cls.academic_year})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <select
                  required
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.subject_id} value={subject.subject_id}>
                      {subject.subject_name} ({subject.subject_code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teacher</label>
                <select
                  required
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.teacher_id} value={teacher.teacher_id}>
                      {teacher.user.full_name} {teacher.department ? `(${teacher.department})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Credit Hour</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10"
                  value={formData.credit_hour}
                  onChange={(e) => setFormData({ ...formData, credit_hour: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
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
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Assign Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Register Subject Modal */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Register Subject</h2>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubjectSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={subjectFormData.subject_name}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, subject_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g., Mathematics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={subjectFormData.subject_code}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, subject_code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g., MATH101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Credit Hour</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10"
                  value={subjectFormData.credit_hour}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, credit_hour: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={subjectFormData.department}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, department: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g., Natural Science, Social Science"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Grade Levels</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
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
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-700">Grade {grade}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Register Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Subject Modal */}
      {showEditSubjectModal && selectedSubject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Edit Subject</h2>
              <button
                onClick={() => {
                  setShowEditSubjectModal(false);
                  setSelectedSubject(null);
                }}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubjectSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject Name</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={subjectFormData.subject_name}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, subject_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g., Mathematics"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject Code</label>
                <input
                  type="text"
                  required
                  minLength={2}
                  value={subjectFormData.subject_code}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, subject_code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g., MATH101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Credit Hour</label>
                <input
                  type="number"
                  required
                  min="1"
                  max="10"
                  value={subjectFormData.credit_hour}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, credit_hour: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={subjectFormData.department}
                  onChange={(e) => setSubjectFormData({ ...subjectFormData, department: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  placeholder="e.g., Natural Science, Social Science"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Grade Levels</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((grade) => (
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
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-700">Grade {grade}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditSubjectModal(false);
                    setSelectedSubject(null);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Update Subject
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
