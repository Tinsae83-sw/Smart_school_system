"use client";

import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/department-head";

type Subject = {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  credit_hour: number;
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
  };
  teacher: {
    teacher_id: number;
    user: {
      full_name: string;
    };
    department: string;
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
  const [department, setDepartment] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    selectedClasses: [] as number[],
    subject_id: "",
    teacher_id: "",
    credit_hour: "3",
  });

  async function fetchData() {
    setLoading(true);
    try {
      const token = localStorage.getItem("dept_head_token");
      
      const [classSubjectsRes, subjectsRes, classesRes, teachersRes, deptRes] = await Promise.all([
        fetch("http://localhost:5000/api/admin/class-subject"),
        fetch("http://localhost:5000/api/admin/subjects"),
        fetch("http://localhost:5000/api/classes"),
        fetch(`${API_BASE}/teachers`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/teachers`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
      ]);

      if (classSubjectsRes.ok) {
        const data = await classSubjectsRes.json();
        const classSubjectsData = data.class_subjects || data;
        
        // Get department info first
        if (deptRes.ok) {
          const deptData = await deptRes.json();
          setDepartment(deptData.department || "");
          
          // Filter class subjects to only show those in this department
          const filteredClassSubjects = classSubjectsData.filter((cs: ClassSubject) => 
            cs.teacher?.department === deptData.department
          );
          setClassSubjects(filteredClassSubjects);
        }
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
        setTeachers(data.teachers || []);
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
    
    if (formData.selectedClasses.length === 0) {
      alert("Please select at least one class");
      return;
    }
    
    try {
      const token = localStorage.getItem("dept_head_token");
      
      // Assign course to each selected class
      for (const classId of formData.selectedClasses) {
        const res = await fetch(`${API_BASE}/teachers/assign`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            class_id: classId,
            subject_id: parseInt(formData.subject_id),
            teacher_id: parseInt(formData.teacher_id),
            credit_hour: parseInt(formData.credit_hour),
          }),
        });
        if (!res.ok) throw new Error("Failed to assign course");
      }
      
      setShowModal(false);
      setFormData({ selectedClasses: [], subject_id: "", teacher_id: "", credit_hour: "3" });
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to assign course.");
    }
  }

  async function handleDelete(classSubjectId: number) {
    if (!confirm("Are you sure you want to remove this course assignment?")) return;
    try {
      const res = await fetch(`http://localhost:5000/api/admin/class-subject/${classSubjectId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete course");
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to delete course.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Department Courses</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage subject assignments in <span className="font-medium text-orange-600">{department || "your department"}</span>
          </p>
        </div>
        <button
          onClick={() => {
            setFormData({ selectedClasses: [], subject_id: "", teacher_id: "", credit_hour: "3" });
            setShowModal(true);
          }}
          className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
        >
          Assign Course
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Course Assignments</h2>
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
                {classSubjects.map((cs) => (
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
                {classSubjects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                      No courses assigned in your department yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Classes</label>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-300 p-3 space-y-2">
                  {classes.length === 0 ? (
                    <p className="text-sm text-slate-500">No classes available</p>
                  ) : (
                    classes.map((cls) => (
                      <label key={cls.class_id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={formData.selectedClasses.includes(cls.class_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, selectedClasses: [...formData.selectedClasses, cls.class_id] });
                            } else {
                              setFormData({ ...formData, selectedClasses: formData.selectedClasses.filter(id => id !== cls.class_id) });
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <select
                  required
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.teacher_id} value={teacher.teacher_id}>
                      {teacher.user.full_name}
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
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
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
                >
                  Assign Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
