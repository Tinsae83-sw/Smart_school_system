"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { authFetchFor } from "@/lib/api";

// ==================== CONSTANTS ====================
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/vp-academic";
const api = authFetchFor("VP_ACADEMIC");
const STORAGE_TOKEN_KEY = "vp_academic_token";

const EXAM_TYPES = ["MIDTERM", "FINAL", "QUIZ", "UNIT_TEST", "PRACTICAL"] as const;
const EXAM_STATUSES = ["APPROVED", "PENDING_APPROVAL", "COMPLETED", "DRAFT"] as const;
const AVAILABLE_GRADES = [9, 10, 11, 12] as const;

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

// ==================== TYPES & INTERFACES ====================
type ExamType = typeof EXAM_TYPES[number];
type ExamStatus = typeof EXAM_STATUSES[number];

interface Exam {
  exam_id: number;
  title: string;
  type: ExamType;
  subject: string;
  subject_department?: string;
  class: string;
  exam_date: string;
  exam_time?: string;
  duration_minutes: number;
  total_marks: number;
  status: ExamStatus;
  created_by: string;
  approved_by?: string;
  invigilators: string[];
  room?: string;
  coordinator?: string;
}

interface Subject {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  department?: string;
}

interface ClassSubject {
  class_subject_id: number;
  class_id: number;
  subject_id: number;
  school_class?: {
    class_id: number;
    class_name: string;
  };
  subject?: {
    subject_id: number;
    subject_name: string;
    subject_code: string;
    department?: string;
  };
}

interface ExamFormData {
  title: string;
  exam_type: string;
  selected_class_subjects: number[];
  exam_date: string;
  exam_time: string;
  duration_minutes: string;
  total_marks: string;
  room: string;
  invigilators: string;
  coordinator: string;
}

interface ApiError {
  error?: string;
  message?: string;
}

// ==================== UTILITY FUNCTIONS ====================
const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_TOKEN_KEY);
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

const getStatusColor = (status: ExamStatus): string => {
  const colors: Record<ExamStatus, string> = {
    APPROVED: "bg-emerald-50 text-emerald-700",
    PENDING_APPROVAL: "bg-amber-50 text-amber-700",
    COMPLETED: "bg-blue-50 text-blue-700",
    DRAFT: "bg-slate-50 text-slate-600",
  };
  return colors[status] || colors.DRAFT;
};

const formatStatus = (status: ExamStatus): string => {
  return status.replace(/_/g, " ");
};

// ==================== MAIN COMPONENT ====================
export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [formData, setFormData] = useState<ExamFormData>({
    title: "",
    exam_type: "",
    selected_class_subjects: [],
    exam_date: "",
    exam_time: "",
    duration_minutes: "",
    total_marks: "",
    room: "",
    invigilators: "",
    coordinator: ""
  });

  // ==================== API FUNCTIONS ====================
  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const res = await api(`${API_BASE}/exams`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData: ApiError = await res.json();
        throw new Error(errorData.error || errorData.message || "Failed to fetch exams");
      }

      const data = await res.json();
      // Map backend response to frontend expected format
      const examArray = data.exams || data || [];
      const mappedData = examArray.map((exam: any) => ({
        exam_id: exam.exam_id,
        title: exam.title,
        type: exam.exam_type,
        subject: exam.subject,
        subject_department: exam.subject_department,
        class: exam.class,
        exam_date: exam.exam_date,
        exam_time: exam.exam_time,
        duration_minutes: exam.duration_minutes,
        total_marks: exam.total_marks,
        status: exam.status,
        created_by: exam.created_by,
        approved_by: exam.approved_by,
        invigilators: exam.invigilators || [],
        room: exam.room,
        coordinator: exam.coordinator
      }));
      setExams(mappedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch exams";
      setError(errorMessage);
      console.error("Error fetching exams:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllClassSubjects = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const res = await api(`${API_BASE}/class-subject`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        const errorData: ApiError = await res.json();
        throw new Error(errorData.error || errorData.message || "Failed to fetch class subjects");
      }

      const data = await res.json();
      setClassSubjects(data.class_subjects || []);
    } catch (err) {
      console.error("Error fetching class subjects:", err);
    }
  }, []);

  // --- Initial data loading ---
  useEffect(() => {
    fetchExams();
    fetchAllClassSubjects();
  }, []);

  // ==================== EVENT HANDLERS ====================
  const handleGradeChange = useCallback((grade: string) => {
    // Grade is no longer used as class-subject assignments include class info
    setFormData(prev => ({ ...prev, selected_class_subjects: [] }));
  }, []);

  const handleClassSubjectToggle = useCallback((classSubjectId: number) => {
    setFormData(prev => ({
      ...prev,
      selected_class_subjects: prev.selected_class_subjects.includes(classSubjectId)
        ? prev.selected_class_subjects.filter(id => id !== classSubjectId)
        : [...prev.selected_class_subjects, classSubjectId]
    }));
  }, []);

  const resetFormData = useCallback(() => {
    setFormData({
      title: "",
      exam_type: "",
      selected_class_subjects: [],
      exam_date: "",
      exam_time: "",
      duration_minutes: "",
      total_marks: "",
      room: "",
      invigilators: "",
      coordinator: ""
    });
  }, []);

  const handleCreateExam = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.selected_class_subjects.length === 0) {
      alert("Please select at least one class subject");
      return;
    }
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Authentication token not found");
      }

      // Create an exam for each selected class subject
      const examPromises = formData.selected_class_subjects.map(class_subject_id =>
        api(`${API_BASE}/exams`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            class_subject_id,
            title: formData.title,
            exam_type: formData.exam_type,
            exam_date: formData.exam_date,
            exam_time: formData.exam_time,
            duration_minutes: parseInt(formData.duration_minutes),
            total_marks: parseInt(formData.total_marks),
            room: formData.room,
            coordinator: formData.coordinator
          })
        })
      );

      const results = await Promise.all(examPromises);
      
      // Check if any failed
      const failed = results.filter(res => !res.ok);
      if (failed.length > 0) {
        const errorData: ApiError = await failed[0].json();
        throw new Error(errorData.error || errorData.message || "Failed to create some exams");
      }

      setShowCreateModal(false);
      resetFormData();
      await fetchExams();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create exam";
      console.error("Error creating exam:", err);
      alert(errorMessage);
    }
  }, [formData, resetFormData, fetchExams]);

  const handleApprove = useCallback(async (examId: number) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const res = await api(`${API_BASE}/exams/${examId}/approve`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });

      if (res.ok) {
        await fetchExams();
      }
    } catch (err) {
      console.error("Error approving exam:", err);
    }
  }, [fetchExams]);

  const handleDeleteExam = useCallback(async (examIds: number[]) => {
    if (!confirm("Are you sure you want to delete this exam? This will delete all related exams.")) return;
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Authentication token not found");
      }

      await Promise.all(
        examIds.map(id =>
          api(`${API_BASE}/exams/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }
          })
        )
      );
      await fetchExams();
    } catch (err) {
      console.error("Error deleting exam:", err);
      alert("Failed to delete exam");
    }
  }, [fetchExams]);

  const handleEditExam = useCallback((exam: Exam) => {
    setSelectedExam(exam);
    setFormData({
      title: exam.title,
      exam_type: exam.type,
      selected_class_subjects: [],
      exam_date: new Date(exam.exam_date).toISOString().split('T')[0],
      exam_time: "",
      duration_minutes: exam.duration_minutes.toString(),
      total_marks: exam.total_marks.toString(),
      room: "",
      invigilators: "",
      coordinator: ""
    });
    setShowEditModal(true);
  }, []);

  const handleUpdateExam = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const res = await api(`${API_BASE}/exams/${selectedExam.exam_id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: formData.title,
          exam_type: formData.exam_type,
          exam_date: formData.exam_date,
          duration_minutes: formData.duration_minutes,
          total_marks: formData.total_marks
        })
      });

      if (!res.ok) {
        const errorData: ApiError = await res.json();
        throw new Error(errorData.error || errorData.message || "Failed to update exam");
      }

      setShowEditModal(false);
      setSelectedExam(null);
      await fetchExams();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update exam";
      console.error("Error updating exam:", err);
      alert(errorMessage);
    }
  }, [selectedExam, formData, fetchExams]);

  // ==================== COMPUTED VALUES ====================
  const examsByGrade = useMemo(() => {
    const grouped = exams.reduce((acc: Record<string, Record<string, Exam[]>>, exam: Exam) => {
      // Extract grade number from class name (e.g., "Grade 10A" -> "10")
      const gradeMatch = exam.class?.match(/Grade (\d+)/);
      const grade = gradeMatch ? gradeMatch[1] : 'Other';
      
      // Get department from subject_department, or map from subject name, default to 'General'
      const department = exam.subject_department || getDepartmentFromSubject(exam.subject);
      
      if (!acc[grade]) {
        acc[grade] = {};
      }
      if (!acc[grade][department]) {
        acc[grade][department] = [];
      }
      acc[grade][department].push(exam);
      
      return acc;
    }, {});

    // Sort exams by date and time within each grade-department
    Object.keys(grouped).forEach(grade => {
      Object.keys(grouped[grade]).forEach(department => {
        grouped[grade][department].sort((a, b) => {
          const dateA = new Date(a.exam_date);
          const dateB = new Date(b.exam_date);
          
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
          }
          
          // If same date, sort by time
          const timeA = a.exam_time || '00:00';
          const timeB = b.exam_time || '00:00';
          return timeA.localeCompare(timeB);
        });
      });
    });

    return grouped;
  }, [exams]);

  const sortedGrades = useMemo(() => {
    return Object.keys(examsByGrade).sort((a: string, b: string) => {
      const gradeA = parseInt(a) || 99;
      const gradeB = parseInt(b) || 99;
      return gradeA - gradeB;
    });
  }, [examsByGrade]);

  const sortedDepartments = useMemo(() => {
    return (departments: string[]) => {
      return departments.sort((a: string, b: string) => {
        // Custom order: Natural, Social, General
        const order = { 'Natural': 1, 'Social': 2, 'General': 3 };
        const orderA = order[a as keyof typeof order] || 99;
        const orderB = order[b as keyof typeof order] || 99;
        return orderA - orderB;
      });
    };
  }, []);

  // ==================== MAIN RENDER ====================
  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Examinations</h1>
          <p className="mt-1 text-sm text-slate-500">Manage department exams and assessments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
        >
          Create Exam
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4" role="alert">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="ml-3 text-sm text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Render exams */}
      {loading ? (
        <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" aria-label="Loading exams" />
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-200">
          <p className="text-slate-500">No exams found.</p>
        </div>
      ) : (
            <div className="space-y-8">
              {sortedGrades.map((grade) => (
                <div key={grade} className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                    <h2 className="text-lg font-semibold text-orange-900">Grade {grade}</h2>
                  </div>
                  <div className="space-y-6 p-6">
                    {sortedDepartments(Object.keys(examsByGrade[grade] || {})).map((department) => (
                      <div key={department}>
                        <h3 className="text-sm font-medium text-slate-700 mb-3">{department}</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="text-left border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                                <th className="px-4 py-3 font-semibold">Title</th>
                                <th className="px-4 py-3 font-semibold">Type</th>
                                <th className="px-4 py-3 font-semibold">Grade</th>
                                <th className="px-4 py-3 font-semibold">Subject</th>
                                <th className="px-4 py-3 font-semibold">Date</th>
                                <th className="px-4 py-3 font-semibold">Time</th>
                                <th className="px-4 py-3 font-semibold">Room</th>
                                <th className="px-4 py-3 font-semibold">Duration</th>
                                <th className="px-4 py-3 font-semibold">Marks</th>
                                <th className="px-4 py-3 font-semibold">Invigilators</th>
                                <th className="px-4 py-3 font-semibold">Coordinator</th>
                                <th className="px-4 py-3 font-semibold">Status</th>
                                <th className="px-4 py-3 font-semibold">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {(examsByGrade[grade][department] || []).map((exam: Exam) => {
                                const gradeMatch = exam.class?.match(/Grade (\d+)/);
                                const gradeNumber = gradeMatch ? gradeMatch[1] : 'Other';
                                return (
                                  <tr key={exam.exam_id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{exam.title}</td>
                                    <td className="px-4 py-3">
                                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                                        {exam.type}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{gradeNumber}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{exam.subject}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(exam.exam_date)}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{exam.exam_time || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{exam.room || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{exam.duration_minutes} mins</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{exam.total_marks}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{exam.invigilators?.join(', ') || '-'}</td>
                                    <td className="px-4 py-3 text-sm text-slate-600">{exam.coordinator || '-'}</td>
                                    <td className="px-4 py-3">
                                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(exam.status)}`}>
                                        {formatStatus(exam.status)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3">
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleEditExam(exam)}
                                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
                                          aria-label={`Edit exam ${exam.title}`}
                                        >
                                          Edit
                                        </button>
                                        <button
                                          onClick={() => handleDeleteExam([exam.exam_id])}
                                          className="rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 transition focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1"
                                          aria-label={`Delete exam ${exam.title}`}
                                        >
                                          Delete
                                        </button>
                                        <button
                                            onClick={() => { setSelectedExam(exam); setShowResultsModal(true); }}
                                            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-1"
                                            aria-label={`View results for exam ${exam.title}`}
                                          >
                                            Results
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

      {/* ==================== MODALS ==================== */}
      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="create-modal-title">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 id="create-modal-title" className="text-lg font-bold text-slate-900">Create Exam</h2>
            <form onSubmit={handleCreateExam} className="mt-6 space-y-4">
              <div>
                <label htmlFor="exam-title" className="block text-sm font-medium text-slate-700">Exam Title</label>
                <input 
                  id="exam-title"
                  type="text" 
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                  placeholder="Enter exam title" 
                />
              </div>
              <div>
                <label htmlFor="exam-type" className="block text-sm font-medium text-slate-700">Exam Type</label>
                <select 
                  id="exam-type"
                  value={formData.exam_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, exam_type: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select type</option>
                  {EXAM_TYPES.map((type) => (
                    <option key={type} value={type}>{type.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Subject Selection</label>
                <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                  <div className="max-h-64 overflow-y-auto">
                    {(() => {
                      // Group by Subject -> Grade -> Department, combining class sections
                      const groupedBySubject = classSubjects.reduce((acc: Record<string, Record<string, Record<string, ClassSubject[]>>>, cs) => {
                        const subjectName = cs.subject?.subject_name || 'Unknown';
                        const gradeMatch = cs.school_class?.class_name?.match(/Grade (\d+)/);
                        const grade = gradeMatch ? gradeMatch[1] : 'Other';
                        const department = cs.subject?.department || getDepartmentFromSubject(cs.subject?.subject_name || '');
                        
                        if (!acc[subjectName]) acc[subjectName] = {};
                        if (!acc[subjectName][grade]) acc[subjectName][grade] = {};
                        if (!acc[subjectName][grade][department]) acc[subjectName][grade][department] = [];
                        acc[subjectName][grade][department].push(cs);
                        return acc;
                      }, {});

                      const sortedSubjects = Object.keys(groupedBySubject).sort();

                      return sortedSubjects.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-500">
                          No class subjects found
                        </div>
                      ) : (
                        sortedSubjects.map((subjectName) => (
                          <div key={subjectName} className="border-b border-slate-200 last:border-b-0">
                            <div className="bg-orange-50 px-4 py-2 font-semibold text-orange-900 text-sm">
                              {subjectName}
                            </div>
                            {Object.keys(groupedBySubject[subjectName])
                              .sort((a, b) => parseInt(a) - parseInt(b))
                              .map((grade) => (
                                <div key={grade}>
                                  {Object.keys(groupedBySubject[subjectName][grade])
                                    .sort((a, b) => {
                                      const order = { 'Natural': 1, 'Social': 2, 'General': 3 };
                                      const orderA = order[a as keyof typeof order] || 99;
                                      const orderB = order[b as keyof typeof order] || 99;
                                      return orderA - orderB;
                                    })
                                    .map((department) => {
                                      const classSubjectsInGroup = groupedBySubject[subjectName][grade][department];
                                      const allIds = classSubjectsInGroup.map(cs => cs.class_subject_id);
                                      const allSelected = allIds.every(id => formData.selected_class_subjects.includes(id));
                                      const someSelected = allIds.some(id => formData.selected_class_subjects.includes(id));
                                      
                                      return (
                                        <div key={department} className="border-b border-slate-100 last:border-b-0 px-4 py-2 hover:bg-slate-50">
                                          <div className="flex items-center gap-3">
                                            <input
                                              type="checkbox"
                                              id={`group-${subjectName}-${grade}-${department}`}
                                              checked={allSelected}
                                              ref={el => {
                                                if (el && someSelected && !allSelected) {
                                                  el.indeterminate = true;
                                                }
                                              }}
                                              onChange={() => {
                                                if (allSelected) {
                                                  // Deselect all
                                                  setFormData(prev => ({
                                                    ...prev,
                                                    selected_class_subjects: prev.selected_class_subjects.filter(id => !allIds.includes(id))
                                                  }));
                                                } else {
                                                  // Select all
                                                  setFormData(prev => ({
                                                    ...prev,
                                                    selected_class_subjects: [...new Set([...prev.selected_class_subjects, ...allIds])]
                                                  }));
                                                }
                                              }}
                                              className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 focus:ring-offset-0"
                                            />
                                            <label 
                                              htmlFor={`group-${subjectName}-${grade}-${department}`} 
                                              className="flex-1 cursor-pointer text-sm text-slate-700"
                                            >
                                              {subjectName} {grade} {department}
                                            </label>
                                            <span className="text-xs text-slate-500">
                                              {classSubjectsInGroup.length} class(es)
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              ))}
                          </div>
                        ))
                      );
                    })()}
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {formData.selected_class_subjects.length} class subject(s) selected
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="exam-date" className="block text-sm font-medium text-slate-700">Exam Date</label>
                  <input 
                    id="exam-date"
                    type="date" 
                    value={formData.exam_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, exam_date: e.target.value }))}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                  />
                </div>
                <div>
                  <label htmlFor="exam-time" className="block text-sm font-medium text-slate-700">Exam Time</label>
                  <input 
                    id="exam-time"
                    type="time" 
                    value={formData.exam_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, exam_time: e.target.value }))}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="exam-duration" className="block text-sm font-medium text-slate-700">Duration (minutes)</label>
                  <input 
                    id="exam-duration"
                    type="number" 
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                    required
                    min="1"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                    placeholder="60" 
                  />
                </div>
                <div>
                  <label htmlFor="exam-room" className="block text-sm font-medium text-slate-700">Room</label>
                  <input 
                    id="exam-room"
                    type="text" 
                    value={formData.room}
                    onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                    placeholder="Room 101" 
                  />
                </div>
              </div>
              <div>
                <label htmlFor="exam-marks" className="block text-sm font-medium text-slate-700">Total Marks</label>
                <input 
                  id="exam-marks"
                  type="number" 
                  value={formData.total_marks}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_marks: e.target.value }))}
                  required
                  min="1"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                  placeholder="100" 
                />
              </div>
              <div>
                <label htmlFor="exam-invigilators" className="block text-sm font-medium text-slate-700">Invigilators</label>
                <input 
                  id="exam-invigilators"
                  type="text" 
                  value={formData.invigilators}
                  onChange={(e) => setFormData(prev => ({ ...prev, invigilators: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                  placeholder="Teacher A, Teacher B" 
                />
              </div>
              <div>
                <label htmlFor="exam-coordinator" className="block text-sm font-medium text-slate-700">Coordinator</label>
                <input 
                  id="exam-coordinator"
                  type="text" 
                  value={formData.coordinator}
                  onChange={(e) => setFormData(prev => ({ ...prev, coordinator: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500" 
                  placeholder="Dr. Smith" 
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    resetFormData();
                  }}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  Create Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Exam Modal */}
      {showEditModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 id="edit-modal-title" className="text-lg font-bold text-slate-900">Edit Exam</h2>
            <form onSubmit={handleUpdateExam} className="mt-6 space-y-4">
              <div>
                <label htmlFor="edit-exam-title" className="block text-sm font-medium text-slate-700">Exam Title</label>
                <input
                  id="edit-exam-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter exam title"
                />
              </div>
              <div>
                <label htmlFor="edit-exam-type" className="block text-sm font-medium text-slate-700">Exam Type</label>
                <select
                  id="edit-exam-type"
                  value={formData.exam_type}
                  onChange={(e) => setFormData(prev => ({ ...prev, exam_type: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select type</option>
                  {EXAM_TYPES.map((type) => (
                    <option key={type} value={type}>{type.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-exam-date" className="block text-sm font-medium text-slate-700">Exam Date</label>
                  <input
                    id="edit-exam-date"
                    type="date"
                    value={formData.exam_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, exam_date: e.target.value }))}
                    required
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="edit-exam-duration" className="block text-sm font-medium text-slate-700">Duration (minutes)</label>
                  <input
                    id="edit-exam-duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                    required
                    min="1"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="60"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="edit-exam-marks" className="block text-sm font-medium text-slate-700">Total Marks</label>
                <input
                  id="edit-exam-marks"
                  type="number"
                  value={formData.total_marks}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_marks: e.target.value }))}
                  required
                  min="1"
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="100"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedExam(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  Update Exam
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="results-modal-title">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 id="results-modal-title" className="text-lg font-bold text-slate-900">Exam Results - {selectedExam.title}</h2>
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Total Students</p>
                  <p className="text-2xl font-bold text-slate-900">45</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Pass Rate</p>
                  <p className="text-2xl font-bold text-emerald-600">87%</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Average Score</p>
                  <p className="text-2xl font-bold text-orange-600">76%</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Highest Score</p>
                  <p className="text-2xl font-bold text-slate-900">95%</p>
                </div>
              </div>
              
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Top Performers</h3>
                <div className="space-y-2">
                  {[
                    { name: "Student A", score: 95, grade: "A" },
                    { name: "Student B", score: 92, grade: "A" },
                    { name: "Student C", score: 90, grade: "A" }
                  ].map((student, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2">
                      <span className="text-sm font-medium text-slate-700">{student.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600">{student.score}%</span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{student.grade}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowResultsModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                >
                  Close
                </button>
                <button
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  Export Results
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}