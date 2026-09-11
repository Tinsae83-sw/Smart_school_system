"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000") + "/api/department-head";
const api = authFetchFor("DEPARTMENT_HEAD");
const STORAGE_TOKEN_KEY = "dept_head_token";

async function parseErrorResponse(res: Response): Promise<{ message: string; status: number }> {
  const clone = res.clone();
  let message = `Request failed (${res.status}).`;
  try {
    const json = await clone.json();
    message = (json && (json.error || json.message)) || message;
  } catch {
    try {
      const text = await res.text();
      if (text) message = text;
    } catch {
      /* ignore */
    }
  }
  return { message, status: res.status };
}

const EXAM_TYPES = ["MIDTERM", "FINAL", "QUIZ", "UNIT_TEST", "PRACTICAL"] as const;
const EXAM_STATUSES = ["APPROVED", "PENDING_APPROVAL", "COMPLETED", "DRAFT"] as const;

// Subject to department mapping for subjects without department data
interface Teacher { teacher_id: number; full_name: string }
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
  for (const [subject, department] of Object.entries(SUBJECT_DEPARTMENT_MAP)) {
    if (subjectName.toLowerCase().includes(subject.toLowerCase())) {
      return department;
    }
  }
  return 'General';
};

// Helper functions for formatting
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatStatus = (status: string): string => {
  return status.replace(/_/g, ' ');
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'APPROVED':
      return 'bg-emerald-50 text-emerald-700';
    case 'PENDING_APPROVAL':
      return 'bg-amber-50 text-amber-700';
    case 'COMPLETED':
      return 'bg-blue-50 text-blue-700';
    case 'DRAFT':
      return 'bg-slate-50 text-slate-600';
    default:
      return 'bg-slate-50 text-slate-600';
  }
};

type ExamType = typeof EXAM_TYPES[number];
type ExamStatus = typeof EXAM_STATUSES[number];

type Exam = {
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
};

interface Subject {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  department?: string;
}

interface Teacher {
  teacher_id: number;
  full_name: string;
  email: string;
}

export default function ExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [showInvigilatorModal, setShowInvigilatorModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const teachersRef = useRef<Teacher[]>([]);
  const [invigilatorFormData, setInvigilatorFormData] = useState({
    selectedInvigilators: [] as number[]
  });

  const getAuthToken = (): string | null => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_TOKEN_KEY);
  };

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
        const err = await parseErrorResponse(res);
        throw new Error(err.message);
      }

      const data = await res.json();
      const examArray = data.exams || data || [];
      const mappedData = examArray.map((exam: any) => {
        // Convert invigilator IDs to teacher names
        const invigilatorNames = (exam.invigilators || [])
          .map((invigilator: any) => {
            // Handle both ID and name formats
            if (typeof invigilator === 'string') {
              return invigilator;
            }
            if (typeof invigilator === 'object' && invigilator.teacher_id) {
              const teacher = teachersRef.current.find(t => t.teacher_id === invigilator.teacher_id);
              return teacher ? teacher.full_name : null;
            }
            if (typeof invigilator === 'number') {
              const teacher = teachersRef.current.find(t => t.teacher_id === invigilator);
              return teacher ? teacher.full_name : null;
            }
            return null;
          })
          .filter((name: string | null) => name !== null);

        return {
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
          invigilators: invigilatorNames,
          room: exam.room,
          coordinator: exam.coordinator
        };
      });
      setExams(mappedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch exams";
      setError(errorMessage);
      console.error("Error fetching exams:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const res = await api(`${API_BASE}/../department-head/teachers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        const list = data.teachers || [];
        teachersRef.current = list;
        setTeachers(list);
        await fetchExams();
      }
    } catch (err) {
      console.error("Error fetching teachers:", err);
    }
  }, [fetchExams]);

  useEffect(() => {
    fetchExams();
    fetchTeachers();
  }, [fetchExams, fetchTeachers]);

  async function handleApprove(examId: number) {
    setNotice(null);
    try {
      const token = localStorage.getItem("dept_head_token");
      const res = await api(`${API_BASE}/exams/${examId}/approve`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
      if (res.ok) {
        setNotice({ type: "success", text: "Exam approved." });
        fetchExams();
      } else {
        const err = await parseErrorResponse(res);
        setNotice({ type: "error", text: err.message });
      }
    } catch (error) {
      console.error("Error approving exam:", error);
      setNotice({ type: "error", text: "Could not reach the server to approve this exam." });
    }
  }

  const handleAssignInvigilators = useCallback((exam: Exam) => {
    setSelectedExam(exam);
    // Try to match invigilator names to teacher IDs
    const selectedIds = exam.invigilators
      .map(name => {
        const teacher = teachers.find(t => t.full_name === name);
        return teacher ? teacher.teacher_id : null;
      })
      .filter((id): id is number => id !== null);
    
    setInvigilatorFormData({
      selectedInvigilators: selectedIds
    });
    setShowInvigilatorModal(true);
  }, [teachers]);

  const handleUpdateInvigilators = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam) return;
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const res = await api(`${API_BASE}/exams/${selectedExam.exam_id}/invigilators`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          teacher_ids: invigilatorFormData.selectedInvigilators
        })
      });

      if (res.ok) {
        setShowInvigilatorModal(false);
        setSelectedExam(null);
        setInvigilatorFormData({ selectedInvigilators: [] });
        await fetchExams();
      } else {
        const err = await parseErrorResponse(res);
        throw new Error(err.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update invigilators";
      console.error("Error updating invigilators:", err);
      alert(errorMessage);
    }
  }, [selectedExam, invigilatorFormData, fetchExams]);


  // Group exams by department and grade
  const examsByDepartment = useMemo(() => {
    const grouped = exams.reduce((acc: Record<string, Record<string, Exam[]>>, exam: Exam) => {
      // Get department from subject_department, or map from subject name, default to 'General'
      const department = exam.subject_department || getDepartmentFromSubject(exam.subject);
      
      // Extract grade number from class name (e.g., "Grade 10A" -> "10")
      const gradeMatch = exam.class?.match(/Grade (\d+)/);
      const grade = gradeMatch ? gradeMatch[1] : 'Other';
      
      if (!acc[department]) {
        acc[department] = {};
      }
      if (!acc[department][grade]) {
        acc[department][grade] = [];
      }
      acc[department][grade].push(exam);
      
      return acc;
    }, {});
    
    return grouped;
  }, [exams]);

  const sortedDepartments = useMemo(() => {
    return Object.keys(examsByDepartment).sort((a, b) => {
      const order = { 'Natural': 1, 'Social': 2, 'General': 3 };
      const orderA = order[a as keyof typeof order] || 99;
      const orderB = order[b as keyof typeof order] || 99;
      return orderA - orderB;
    });
  }, [examsByDepartment]);

  return (
    <div>
      <div className="mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Examinations</h1>
          <p className="mt-1 text-sm text-slate-500">Manage department exams and assessments</p>
        </div>
      </div>

      {notice && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${
          notice.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-rose-200 bg-rose-50 text-rose-700"
        }`}>
          {notice.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div className="rounded-2xl bg-red-50 p-12 text-center shadow-sm border border-red-200">
          <p className="text-red-600">{error}</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-200">
          <p className="text-slate-500">No exams found.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {sortedDepartments.map((department) => (
            <div key={department} className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-orange-50 px-6 py-4 border-b border-orange-100">
                <h2 className="text-lg font-semibold text-orange-900">{department}</h2>
              </div>
              <div className="space-y-6 p-6">
                {Object.keys(examsByDepartment[department])
                  .sort((a, b) => parseInt(a) - parseInt(b))
                  .map((grade) => (
                    <div key={grade}>
                      <h3 className="text-sm font-medium text-slate-700 mb-3">Grade {grade}</h3>
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
                            {examsByDepartment[department][grade].map((exam) => {
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
                                      {(exam.status === "PENDING_APPROVAL" || exam.status === "DRAFT") && (
                                        <button
                                          onClick={() => handleApprove(exam.exam_id)}
                                          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition"
                                        >
                                          Approve
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleAssignInvigilators(exam)}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                                      >
                                        Assign Invigilators
                                      </button>
                                      <button
                                        onClick={() => { setSelectedExam(exam); setShowResultsModal(true); }}
                                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
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

      {/* Assign Invigilators Modal */}
      {showInvigilatorModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="invigilator-modal-title">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 id="invigilator-modal-title" className="text-lg font-bold text-slate-900">Assign Invigilators - {selectedExam.title}</h2>
            <form onSubmit={handleUpdateInvigilators} className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Invigilators</label>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-300 p-3 space-y-2">
                  {teachers.length === 0 ? (
                    <p className="text-sm text-slate-500">No teachers available in your department</p>
                  ) : (
                    teachers.map((teacher) => (
                      <label key={teacher.teacher_id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-2 rounded">
                        <input
                          type="checkbox"
                          checked={invigilatorFormData.selectedInvigilators.includes(teacher.teacher_id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setInvigilatorFormData(prev => ({
                                ...prev,
                                selectedInvigilators: [...prev.selectedInvigilators, teacher.teacher_id]
                              }));
                            } else {
                              setInvigilatorFormData(prev => ({
                                ...prev,
                                selectedInvigilators: prev.selectedInvigilators.filter(id => id !== teacher.teacher_id)
                              }));
                            }
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                        />
                        <span className="text-sm text-slate-700">{teacher.full_name}</span>
                        <span className="text-xs text-slate-400 ml-auto">{teacher.email}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">Select teachers from your department to invigilate this exam</p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInvigilatorModal(false);
                    setSelectedExam(null);
                    setInvigilatorFormData({ selectedInvigilators: [] });
                  }}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                >
                  Assign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">Exam Results - {selectedExam.title}</h2>
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
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Close
                </button>
                <button
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
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
