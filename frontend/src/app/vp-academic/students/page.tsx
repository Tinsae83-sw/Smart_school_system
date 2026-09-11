"use client";

import React, { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

const API_BASE = "/api/vp-academic";

function authToken() {
  return getToken("VP_ACADEMIC");
}

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
  const [students, setStudents] = useState<Student[]>([]);
  const [groupedStudents, setGroupedStudents] = useState<Record<string, Student[]>>({});
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [academicOptions, setAcademicOptions] = useState<AcademicOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'parents'>('students');
  const [parentRelationships, setParentRelationships] = useState<any[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [gradeFilter, setGradeFilter] = useState<string>('');
  const [formData, setFormData] = useState({
    // Personal Information
    first_name: "",
    middle_name: "",
    last_name: "",
    date_of_birth: "",
    gender: "MALE",
    nationality: "Ethiopian",
    religion: "",
    home_address: "",
    
    // Contact Information
    email: "",
    phone_number: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    
    // Academic Information
    grade_level: "9",
    department_id: "",
    admission_date: new Date().toISOString().split('T')[0],
    
    // Guardian/Parent Information
    guardian_name: "",
    relationship: "FATHER",
    guardian_phone: "",
    guardian_email: "",
    guardian_password: "",
    
    // System Settings
    username: "",
    password: "",
    send_credentials: true,
    terms_agreed: false,
    
    // Legacy fields for compatibility
    full_name: "",
    student_number: "",
    current_class_id: "",
  });

  async function fetchStudents() {
    setLoading(true);
    try {
      const url = gradeFilter 
        ? `${API_BASE}/students?grade_level=${gradeFilter}`
        : `${API_BASE}/students`;
      const data = await apiFetch(url, { token: authToken() });
      setStudents(data.all || data);
      setGroupedStudents(data.grouped || {});
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClasses() {
    try {
      const data = await apiFetch(`${API_BASE}/classes`, { token: authToken() });
      setClasses(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchAcademicOptions() {
    try {
      const data = await apiFetch(`${API_BASE}/students/academic-options`, { token: authToken() });
      setAcademicOptions(data);
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchParentRelationships() {
    setLoadingParents(true);
    try {
      const data = await apiFetch(`${API_BASE}/parent-student-relationships`, { token: authToken() });
      setParentRelationships(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingParents(false);
    }
  }

  useEffect(() => {
    fetchStudents();
    fetchClasses();
    fetchAcademicOptions();
    fetchParentRelationships();
  }, [gradeFilter]);

  useEffect(() => {
    if (activeTab === 'parents') {
      fetchParentRelationships();
    }
  }, [activeTab]);

  function handleEdit(student: Student) {
    setEditingStudent(student);
    const nameParts = student.user.full_name.split(' ');
    setFormData({
      // Personal Information
      first_name: nameParts[0] || "",
      middle_name: nameParts[1] || "",
      last_name: nameParts.slice(2).join(' ') || nameParts[1] || "",
      date_of_birth: student.date_of_birth?.split("T")[0] || "",
      gender: student.gender || "MALE",
      nationality: "Ethiopian",
      religion: "",
      home_address: "",
      
      // Contact Information
      email: student.user.email,
      phone_number: student.user.phone_number || "",
      emergency_contact_name: "",
      emergency_contact_phone: "",
      
      // Academic Information
      grade_level: "9",
      department_id: "",
      admission_date: new Date().toISOString().split('T')[0],
      
      // Guardian/Parent Information
      guardian_name: "",
      relationship: "FATHER",
      guardian_phone: "",
      guardian_email: "",
      guardian_password: "",
      
      // System Settings
      username: "",
      password: "",
      send_credentials: true,
      terms_agreed: false,
      
      // Legacy fields for compatibility
      full_name: student.user.full_name,
      student_number: student.student_number,
      current_class_id: student.current_class?.class_id.toString() || "",
    });
    setShowModal(true);
  }

  async function handleDelete(studentId: number) {
    if (!confirm("Are you sure you want to delete this student? This action cannot be undone.")) {
      return;
    }

    try {
      await apiFetch(`${API_BASE}/students/${studentId}`, {
        method: "DELETE",
        token: authToken(),
      });
      fetchStudents();
    } catch (error) {
      console.error("Delete student error:", error);
      alert("Failed to delete student");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        department_id: formData.department_id ? parseInt(formData.department_id) : null,
      };

      if (editingStudent) {
        await apiFetch(`${API_BASE}/students/${editingStudent.student_id}`, {
          method: "PUT",
          token: authToken(),
          body: JSON.stringify(payload),
        });
      } else {
        try {
          await apiFetch(`${API_BASE}/students/register`, {
            method: "POST",
            token: authToken(),
            body: JSON.stringify(payload),
          });
        } catch (error) {
          if ((error as Error).message.toLowerCase().includes("email")) {
            throw new Error("Email already exists. Please use a different email address.");
          }
          throw error;
        }
      }

      setShowModal(false);
      setEditingStudent(null);
      setFormData({
        // Personal Information
        first_name: "",
        middle_name: "",
        last_name: "",
        date_of_birth: "",
        gender: "MALE",
        nationality: "Ethiopian",
        religion: "",
        home_address: "",
        
        // Contact Information
        email: "",
        phone_number: "",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        
        // Academic Information
        grade_level: "9",
        department_id: "",
        admission_date: new Date().toISOString().split('T')[0],
        
        // Guardian/Parent Information
        guardian_name: "",
        relationship: "FATHER",
        guardian_phone: "",
        guardian_email: "",
        guardian_password: "",
        
        // System Settings
        username: "",
        password: "",
        send_credentials: true,
        terms_agreed: false,
        
        // Legacy fields for compatibility
        full_name: "",
        student_number: "",
        current_class_id: "",
      });
      fetchStudents();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Operation failed. Please try again.");
    }
  }

  async function handleAssignClass(studentId: number, classId: string) {
    try {
      await apiFetch(`${API_BASE}/students/${studentId}/class`, {
        method: "PUT",
        token: authToken(),
        body: JSON.stringify({ class_id: parseInt(classId) }),
      });
      fetchStudents();
    } catch (error) {
      console.error(error);
      alert("Failed to assign class.");
    }
  }

  async function handleArchive(studentId: number) {
    if (!confirm("Are you sure you want to archive this student?")) return;
    try {
      await apiFetch(`${API_BASE}/students/${studentId}/archive`, {
        method: "PUT",
        token: authToken(),
      });
      fetchStudents();
    } catch (error) {
      console.error(error);
      alert("Failed to archive student.");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Students Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage student enrollment and assignments</p>
        </div>
        <div className="flex gap-3">
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Grades</option>
            <option value="9">Grade 9</option>
            <option value="10">Grade 10</option>
            <option value="11">Grade 11</option>
            <option value="12">Grade 12</option>
          </select>
          <button
            onClick={() => {
              setEditingStudent(null);
              setFormData({
                // Personal Information
                first_name: "",
                middle_name: "",
                last_name: "",
                date_of_birth: "",
                gender: "MALE",
                nationality: "Ethiopian",
                religion: "",
                home_address: "",
                
                // Contact Information
                email: "",
                phone_number: "",
                emergency_contact_name: "",
                emergency_contact_phone: "",
                
                // Academic Information
                grade_level: "9",
                department_id: "",
                admission_date: new Date().toISOString().split('T')[0],
                
                // Guardian/Parent Information
                guardian_name: "",
                relationship: "FATHER",
                guardian_phone: "",
                guardian_email: "",
                guardian_password: "",
                
                // System Settings
                username: "",
                password: "",
                send_credentials: true,
                terms_agreed: false,
                
                // Legacy fields for compatibility
                full_name: "",
                student_number: "",
                current_class_id: "",
              });
              setShowModal(true);
            }}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Add Student
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('students')}
            className={`pb-4 px-1 text-sm font-semibold transition-colors ${
              activeTab === 'students'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Students
          </button>
          <button
            onClick={() => setActiveTab('parents')}
            className={`pb-4 px-1 text-sm font-semibold transition-colors ${
              activeTab === 'parents'
                ? 'text-emerald-600 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Parent-Student Relationships
          </button>
        </nav>
      </div>

      {activeTab === 'students' ? (
        <>
          {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {Object.keys(groupedStudents).length === 0 ? (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200 p-12 text-center">
              <div className="text-sm text-slate-400">No students found. Add your first student to get started.</div>
            </div>
          ) : (
            Object.entries(groupedStudents).map(([className, classStudents]) => (
              <div key={className} className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-50 to-blue-50 px-6 py-4 border-b border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900">{className}</h3>
                  <p className="text-sm text-slate-600">{classStudents.length} {classStudents.length === 1 ? 'student' : 'students'}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-4">Student Number</th>
                        <th className="px-6 py-4">Name</th>
                        <th className="px-6 py-4">Email</th>
                        <th className="px-6 py-4">Gender</th>
                        <th className="px-6 py-4">Enrollment Date</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {classStudents.map((student) => (
                        <tr key={student.student_id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{student.student_number}</td>
                          <td className="px-6 py-4 text-sm text-slate-900">{student.user.full_name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{student.user.email}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{student.gender || "N/A"}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">
                            {new Date(student.enrollment_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                                student.user.is_active
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  student.user.is_active ? "bg-emerald-500" : "bg-rose-500"
                                }`}
                              />
                              {student.user.is_active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEdit(student)}
                                className="rounded-lg bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 transition"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(student.student_id)}
                                className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
                              >
                                Delete
                              </button>
                              <button
                                onClick={() => handleArchive(student.student_id)}
                                className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition"
                              >
                                Archive
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
      )}
      </>
      ) : (
        <>
          {/* Parent-Student Relationships Tab */}
          {loadingParents ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Statistics */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
                  <div className="text-2xl font-bold text-emerald-600">{parentRelationships.length}</div>
                  <div className="text-sm text-slate-600">Total Parents</div>
                </div>
                <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
                  <div className="text-2xl font-bold text-blue-600">
                    {parentRelationships.reduce((acc: number, parent: any) => acc + parent.students.length, 0)}
                  </div>
                  <div className="text-sm text-slate-600">Total Students</div>
                </div>
                <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-200">
                  <div className="text-2xl font-bold text-purple-600">
                    {parentRelationships.filter((p: any) => p.students.length > 1).length}
                  </div>
                  <div className="text-sm text-slate-600">Parents with Multiple Students</div>
                </div>
              </div>

              {/* Parent Cards */}
              <div className="space-y-6">
                {parentRelationships.length === 0 ? (
                  <div className="rounded-xl bg-white p-12 text-center shadow-sm border border-slate-200">
                    <div className="text-slate-400">No parent-student relationships found</div>
                  </div>
                ) : (
                  parentRelationships.map((parent: any) => (
                    <div
                      key={parent.parent_id}
                      className="rounded-xl bg-white shadow-sm border border-slate-200 overflow-hidden"
                    >
                      {/* Parent Information */}
                      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 px-6 py-4 border-b border-slate-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900">{parent.parent_name}</h3>
                            <div className="mt-1 space-y-1 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Email:</span>
                                <span>{parent.parent_email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Phone:</span>
                                <span>{parent.parent_phone || 'Not provided'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Relationship:</span>
                                <span className="capitalize">{parent.relationship.toLowerCase()}</span>
                              </div>
                              {parent.address && (
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">Address:</span>
                                  <span>{parent.address}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                            {parent.students.length} {parent.students.length === 1 ? 'Student' : 'Students'}
                          </div>
                        </div>
                      </div>

                      {/* Students List */}
                      <div className="p-6">
                        <h4 className="text-sm font-semibold text-slate-700 mb-4">Linked Students</h4>
                        {parent.students.length === 0 ? (
                          <div className="text-slate-400 text-sm">No students linked to this parent</div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead>
                                <tr className="border-b border-slate-200">
                                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Student Name
                                  </th>
                                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Student Number
                                  </th>
                                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Grade
                                  </th>
                                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Relationship
                                  </th>
                                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                                    Linked Date
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {parent.students.map((student: any) => (
                                  <tr key={student.student_id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-3 px-4">
                                      <div className="font-medium text-slate-900">{student.student_name}</div>
                                      <div className="text-xs text-slate-500">{student.student_email}</div>
                                    </td>
                                    <td className="py-3 px-4 text-slate-600">{student.student_number}</td>
                                    <td className="py-3 px-4">
                                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {student.grade}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-600 capitalize">
                                      {student.relationship_to_parent.toLowerCase()}
                                    </td>
                                    <td className="py-3 px-4 text-slate-600 text-sm">
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
            </div>
          )}
        </>
      )}

      {/* Add/Edit Student Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingStudent ? "Edit Student" : "Register New Student"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Section 1: Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Personal Information</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      value={formData.middle_name}
                      onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Gender *</label>
                    <select
                      required
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nationality</label>
                    <input
                      type="text"
                      value={formData.nationality}
                      onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Religion</label>
                    <select
                      value={formData.religion}
                      onChange={(e) => setFormData({ ...formData, religion: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Select Religion</option>
                      <option value="Orthodox">Orthodox</option>
                      <option value="Muslim">Muslim</option>
                      <option value="Protestant">Protestant</option>
                      <option value="Catholic">Catholic</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Home Address</label>
                    <textarea
                      rows={2}
                      maxLength={200}
                      value={formData.home_address}
                      onChange={(e) => setFormData({ ...formData, home_address: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Contact Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="09XXXXXXXX"
                      pattern="09[0-9]{8}"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <p className="text-xs text-slate-500 mt-1">Ethiopian format: 09XXXXXXXX</p>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact Name *</label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Emergency Contact Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="09XXXXXXXX"
                      pattern="09[0-9]{8}"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Academic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Academic Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Grade Level *</label>
                    <select
                      required
                      value={formData.grade_level}
                      onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {academicOptions?.grade_levels && academicOptions.grade_levels.length > 0 ? (
                        academicOptions.grade_levels.map((grade) => (
                          <option key={grade} value={grade}>Grade {grade}</option>
                        ))
                      ) : (
                        <>
                          <option value="9">Grade 9</option>
                          <option value="10">Grade 10</option>
                          <option value="11">Grade 11</option>
                          <option value="12">Grade 12</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Department *</label>
                    <select
                      required
                      value={formData.department_id}
                      onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="">Select a department</option>
                      {academicOptions?.departments && academicOptions.departments.map((dept) => (
                        <option key={dept.department_id} value={dept.department_id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Admission Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.admission_date}
                    onChange={(e) => setFormData({ ...formData, admission_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              {/* Section 4: Guardian/Parent Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">Guardian/Parent Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Parent/Guardian Name *</label>
                    <input
                      type="text"
                      required
                      minLength={2}
                      value={formData.guardian_name}
                      onChange={(e) => setFormData({ ...formData, guardian_name: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Relationship *</label>
                    <select
                      required
                      value={formData.relationship}
                      onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="FATHER">Father</option>
                      <option value="MOTHER">Mother</option>
                      <option value="GUARDIAN">Guardian</option>
                    </select>
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Parent Phone *</label>
                    <input
                      type="tel"
                      required
                      placeholder="09XXXXXXXX"
                      pattern="09[0-9]{8}"
                      value={formData.guardian_phone}
                      onChange={(e) => setFormData({ ...formData, guardian_phone: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Parent Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.guardian_email}
                      onChange={(e) => setFormData({ ...formData, guardian_email: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Parent Password *</label>
                  <input
                    type="password"
                    required
                    value={formData.guardian_password}
                    onChange={(e) => setFormData({ ...formData, guardian_password: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    placeholder="Leave blank for default password"
                  />
                  <p className="text-xs text-slate-500 mt-1">Default password will be used if left blank</p>
                </div>
              </div>

              {/* Section 5: System Settings */}
              {!editingStudent && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-900 border-b pb-2">System Settings</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Username</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="Auto-generated if blank"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Student Password *</label>
                      <input
                        type="password"
                        required
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                        placeholder="Auto-generated if blank"
                      />
                      <p className="text-xs text-slate-500 mt-1">Default password will be used if left blank</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.send_credentials}
                        onChange={(e) => setFormData({ ...formData, send_credentials: e.target.checked })}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-700">Send credentials via email</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        required
                        checked={formData.terms_agreed}
                        onChange={(e) => setFormData({ ...formData, terms_agreed: e.target.checked })}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-700">I agree to the terms and conditions *</span>
                    </label>
                  </div>
                </div>
              )}

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
                  {editingStudent ? "Update Student" : "Register Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
