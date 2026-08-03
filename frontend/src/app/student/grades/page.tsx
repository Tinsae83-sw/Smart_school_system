"use client";

import { useContext, useEffect, useState } from "react";
import { StudentContext } from "../StudentContext";
import { useRouter } from "next/navigation";
import { clearAllAuth } from "@/lib/auth";

interface Grade {
  mark_id: number;
  type: string;
  score: number;
  letter_grade: string | null;
  subject: string;
  subject_code: string;
  teacher_name: string;
  graded_at: string;
}

interface SubmissionGrade {
  submission_id: number;
  assignment_title: string;
  subject: string;
  teacher_name: string;
  score: number | null;
  max_score: number;
  grade: string | null;
  feedback: string | null;
  submitted_at: string;
}

interface SubjectGrades {
  subject_name: string;
  subject_code: string;
  teacher_name: string;
  grades: Grade[];
  submissions: SubmissionGrade[];
}

export default function StudentGrades() {
  const { authFetch } = useContext(StudentContext);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subjectGrades, setSubjectGrades] = useState<SubjectGrades[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGrades();
  }, [authFetch]);

  async function loadGrades() {
    try {
      setLoading(true);
      const data = await authFetch("/api/student/grades");
      
      // Group student marks by subject
      const subjectMap = new Map<string, SubjectGrades>();

      // Process student marks (TEST, MID, FINAL, ASSIGNMENT, OTHER)
      if (data.studentMarks && Array.isArray(data.studentMarks)) {
        data.studentMarks.forEach((mark: Grade) => {
          const key = `${mark.subject_code}-${mark.teacher_name}`;
          if (!subjectMap.has(key)) {
            subjectMap.set(key, {
              subject_name: mark.subject,
              subject_code: mark.subject_code,
              teacher_name: mark.teacher_name,
              grades: [],
              submissions: []
            });
          }
          subjectMap.get(key)!.grades.push(mark);
        });
      }

      // Process submission grades
      if (data.submissions && Array.isArray(data.submissions)) {
        data.submissions.forEach((sub: SubmissionGrade) => {
          const key = `${sub.subject}-${sub.teacher_name}`;
          if (!subjectMap.has(key)) {
            subjectMap.set(key, {
              subject_name: sub.subject,
              subject_code: '',
              teacher_name: sub.teacher_name,
              grades: [],
              submissions: []
            });
          }
          subjectMap.get(key)!.submissions.push(sub);
        });
      }

      setSubjectGrades(Array.from(subjectMap.values()));
      setError(null);
    } catch (err: any) {
      console.error("Error loading grades:", err);
      // Clear auth and redirect on token errors
      if (err.message?.includes('Invalid or expired token') || 
          err.message?.includes('No token provided') ||
          err.message?.includes('Session expired')) {
        clearAllAuth();
        router.push("/login");
        return;
      }
      setError(err.message || "Failed to load grades");
    } finally {
      setLoading(false);
    }
  }

  function getGradeColor(letterGrade: string | null): string {
    if (!letterGrade) return "text-slate-500";
    const grade = letterGrade.toUpperCase();
    if (["A", "A+", "A-"].includes(grade)) return "text-green-600 bg-green-50";
    if (["B", "B+", "B-"].includes(grade)) return "text-blue-600 bg-blue-50";
    if (["C", "C+", "C-"].includes(grade)) return "text-yellow-600 bg-yellow-50";
    if (["D", "D+", "D-"].includes(grade)) return "text-orange-600 bg-orange-50";
    return "text-red-600 bg-red-50";
  }

  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      TEST: "Test",
      MID: "Midterm",
      FINAL: "Final Exam",
      ASSIGNMENT: "Assignment",
      OTHER: "Other"
    };
    return labels[type] || type;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading grades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 font-medium">{error}</p>
        <button
          onClick={loadGrades}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  if (subjectGrades.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center">
        <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">No Grades Available</h3>
        <p className="text-slate-500">Your grades will appear here once they are posted by your teachers.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Grades</h1>
          <p className="text-slate-500 mt-1">View your academic performance by subject</p>
        </div>
        <button
          onClick={loadGrades}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {subjectGrades.map((subject, index) => (
        <div key={`${subject.subject_code}-${index}`} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* Subject Header */}
          <div className="bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">{subject.subject_name}</h2>
                <p className="text-sky-100 text-sm mt-1">
                  {subject.subject_code && `${subject.subject_code} • `}{subject.teacher_name}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sky-100 text-sm">
                  {subject.grades.length + subject.submissions.length} Grade{subject.grades.length + subject.submissions.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Student Marks (Test, Mid, Final, etc.) */}
            {subject.grades.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Assessment Grades</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Type</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Score</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Letter Grade</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subject.grades.map((grade) => (
                        <tr key={grade.mark_id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                              {getTypeLabel(grade.type)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-slate-900">{grade.score.toFixed(2)}</td>
                          <td className="py-3 px-4">
                            {grade.letter_grade ? (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getGradeColor(grade.letter_grade)}`}>
                                {grade.letter_grade}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-sm">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-500">
                            {new Date(grade.graded_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Assignment Submissions */}
            {subject.submissions.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-3">Assignment Grades</h3>
                <div className="space-y-3">
                  {subject.submissions.map((sub) => (
                    <div key={sub.submission_id} className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-slate-900">{sub.assignment_title}</h4>
                          <p className="text-sm text-slate-500 mt-1">
                            Score: {sub.score !== null ? sub.score.toFixed(2) : 'N/A'} / {sub.max_score.toFixed(2)}
                          </p>
                          {sub.feedback && (
                            <p className="text-sm text-slate-600 mt-2 italic">"{sub.feedback}"</p>
                          )}
                        </div>
                        <div className="ml-4 text-right">
                          {sub.grade ? (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(sub.grade)}`}>
                              {sub.grade}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(sub.submitted_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {subject.grades.length === 0 && subject.submissions.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <p>No grades posted yet for this subject.</p>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
