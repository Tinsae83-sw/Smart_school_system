"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function GradePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  
  // Student marks data structure: { student_id: { test: number, mid: number, final: number, assignment: number, other: number, total: number } }
  const [studentMarks, setStudentMarks] = useState<Record<number, { test: number; mid: number; final: number; assignment: number; other: number; total: number }>>({});

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadClasses(savedToken);
  }, [router]);

  async function loadClasses(token: string) {
    try {
      const data = await authFetch("/api/teacher/classes", {}, token);
      setClasses(data);
      if (data.length > 0) {
        setSelectedClass(data[0].class_id);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadStudents() {
    if (!selectedClass) return;
    try {
      const data = await authFetch(`/api/teacher/classes/${selectedClass}/roster`, {}, token);
      const studentsList = data.students || data || [];
      setStudents(Array.isArray(studentsList) ? studentsList : []);
      
      // Initialize student marks with existing grades
      const marks: Record<number, { test: number; mid: number; final: number; assignment: number; other: number; total: number }> = {};
      studentsList.forEach((student: any) => {
        marks[student.student_id] = { test: 0, mid: 0, final: 0, assignment: 0, other: 0, total: 0 };
      });
      setStudentMarks(marks);
    } catch (e) { 
      console.error(e); 
      setStudents([]);
    }
  }

  async function loadGrades() {
    if (!selectedClass) return;
    try {
      const data = await authFetch(`/api/teacher/grades/${selectedClass}`, {}, token);
      setGrades(Array.isArray(data) ? data : []);
      
      // Populate student marks from backend data
      const marks: Record<number, { test: number; mid: number; final: number; assignment: number; other: number; total: number }> = {};
      students.forEach((student: any) => {
        marks[student.student_id] = { test: 0, mid: 0, final: 0, assignment: 0, other: 0, total: 0 };
      });
      
      // Use student_marks from backend if available
      if (data.student_marks && Array.isArray(data.student_marks)) {
        data.student_marks.forEach((markData: any) => {
          if (markData.student_id && marks[markData.student_id]) {
            marks[markData.student_id] = {
              test: markData.marks?.TEST || 0,
              mid: markData.marks?.MID || 0,
              final: markData.marks?.FINAL || 0,
              assignment: markData.marks?.ASSIGNMENT || 0,
              other: markData.marks?.OTHER || 0,
              total: markData.total || 0
            };
          }
        });
      }
      setStudentMarks(marks);
    } catch (e) { 
      console.error(e); 
      setGrades([]);
    }
  }

  useEffect(() => {
    if (selectedClass) {
      loadStudents();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (students.length > 0) {
      loadGrades();
    }
  }, [students]);

  function handleMarkChange(studentId: number, type: 'test' | 'mid' | 'final' | 'assignment' | 'other', value: string) {
    const numValue = parseFloat(value) || 0;
    setStudentMarks(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [type]: numValue
      }
    }));
  }

  async function handleSubmitAllMarks(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    
    try {
      const gradeEntries = Object.entries(studentMarks).map(([studentId, marks]) => {
        return Object.entries(marks).map(([type, score]) => ({
          student_id: Number(studentId),
          type: type.toUpperCase(),
          score,
          class_id: selectedClass
        }));
      }).flat();

      await authFetch("/api/teacher/grades/bulk", {
        method: "POST",
        body: JSON.stringify({ grades: gradeEntries })
      }, token);
      
      setMessage("All marks submitted successfully!");
      loadGrades();
    } catch (e) {
      setMessage("Failed to submit marks");
      console.error(e);
    }
  }

  function getGradeColor(score: number) {
    if (score >= 90) return "bg-emerald-100 text-emerald-700";
    if (score >= 80) return "bg-blue-100 text-blue-700";
    if (score >= 70) return "bg-amber-100 text-amber-700";
    if (score >= 60) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  }

  function getLetterGrade(score: number) {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 mb-2">Grade Management</h1>
            <p className="text-slate-600">Enter and manage student marks for tests, midterms, finals, and other assessments</p>
          </div>
        </div>
        
        {/* Class Selection Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Select Class</label>
              <p className="text-xs text-slate-500">Choose the class to manage grades</p>
            </div>
          </div>
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          >
            {classes.map((cls: any) => (
              <option key={cls.class_subject_id || cls.class_id} value={cls.school_class?.class_id || cls.class_id}>
                Grade {cls.school_class?.class_name || cls.class_name} - {cls.subject?.subject_name || cls.subject}
              </option>
            ))}
          </select>
        </div>

        {message && (
          <div className={`mb-6 rounded-xl p-4 ${message.includes("success") ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
            <div className="flex items-center gap-2">
              {message.includes("success") ? (
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <p className={`text-sm font-medium ${message.includes("success") ? "text-emerald-700" : "text-red-700"}`}>
                {message}
              </p>
            </div>
          </div>
        )}

        {/* Excel-like Grade Entry Table */}
        {students.length > 0 ? (
          <form onSubmit={handleSubmitAllMarks}>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Student Marks</h2>
                    <p className="text-xs text-slate-500">Enter marks for each student (out of 100)</p>
                  </div>
                </div>
                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3 text-white font-semibold hover:from-emerald-700 hover:to-emerald-800 transition shadow-lg shadow-emerald-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Submit All Marks
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                      <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10">Student</th>
                      <th className="text-center py-4 px-4 text-sm font-semibold text-slate-700 w-24">Test</th>
                      <th className="text-center py-4 px-4 text-sm font-semibold text-slate-700 w-24">Mid</th>
                      <th className="text-center py-4 px-4 text-sm font-semibold text-slate-700 w-24">Final</th>
                      <th className="text-center py-4 px-4 text-sm font-semibold text-slate-700 w-24">Assignment</th>
                      <th className="text-center py-4 px-4 text-sm font-semibold text-slate-700 w-24">Other</th>
                      <th className="text-center py-4 px-4 text-sm font-semibold text-slate-700 w-24">Total</th>
                      <th className="text-center py-4 px-4 text-sm font-semibold text-slate-700 w-20">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student: any) => {
                      const marks = studentMarks[student.student_id] || { test: 0, mid: 0, final: 0, assignment: 0, other: 0, total: 0 };
                      const total = marks.total || (marks.test + marks.mid + marks.final + marks.assignment + marks.other);
                      const average = total / 5;
                      const letterGrade = getLetterGrade(average);
                      
                      return (
                        <tr key={student.student_id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="py-4 px-4 sticky left-0 bg-white z-10">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                {(student.user?.full_name || student.full_name || "S").charAt(0)}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-900">
                                  {student.user?.full_name || student.full_name}
                                </p>
                                <p className="text-xs text-slate-500">{student.student_number || `ID: ${student.student_id}`}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={marks.test || ''}
                              onChange={(e) => handleMarkChange(student.student_id, 'test', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={marks.mid || ''}
                              onChange={(e) => handleMarkChange(student.student_id, 'mid', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={marks.final || ''}
                              onChange={(e) => handleMarkChange(student.student_id, 'final', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={marks.assignment || ''}
                              onChange={(e) => handleMarkChange(student.student_id, 'assignment', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-4 px-4">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={marks.other || ''}
                              onChange={(e) => handleMarkChange(student.student_id, 'other', e.target.value)}
                              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                              placeholder="0"
                            />
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`font-semibold text-sm ${total > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                              {total > 0 ? total.toFixed(1) : '-'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            {total > 0 ? (
                              <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${getGradeColor(average)}`}>
                                {letterGrade}
                              </span>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Students Found</h3>
            <p className="text-slate-600">Select a class to view and manage student grades</p>
          </div>
        )}
      </div>
    </main>
  );
}
