"use client";

import { useEffect, useState } from "react";
import { useParent } from "../ParentContext";
import { useRouter } from "next/navigation";
import { clearAuth } from "@/lib/auth";
import { MOCK_GRADES, MOCK_PERFORMANCE, MOCK_TRANSCRIPT } from "../mockData";

export default function GradesPage() {
  const { selectedChildId, selectedChild, authFetch } = useParent();
  const router = useRouter();
  const [grades, setGrades] = useState<any[]>([]);
  const [studentMarks, setStudentMarks] = useState<any[]>([]);
  const [performance, setPerformance] = useState<any>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [activeSection, setActiveSection] = useState<"grades" | "marks" | "analysis" | "predictions" | "transcript">("grades");

  useEffect(() => {
    if (!selectedChildId) return;
    loadGrades();
    loadPerformance();
    loadTranscript();
  }, [selectedChildId]);

  async function loadGrades() {
    try {
      const data = await authFetch(`/api/parent/children/${selectedChildId}/grades`);
      // Handle new response structure with assignment_grades and student_marks
      if (data.assignment_grades) {
        setGrades(data.assignment_grades);
        setStudentMarks(data.student_marks || []);
      } else if (Array.isArray(data)) {
        setGrades(data);
        setStudentMarks([]);
      } else {
        setGrades([]);
        setStudentMarks([]);
      }
    } catch (error: any) {
      console.error(error);
      // Clear auth and redirect on token errors
      if (error.message?.includes('Invalid or expired token') || 
          error.message?.includes('No token provided') ||
          error.message?.includes('Session expired')) {
        clearAuth('PARENT');
        router.push("/login");
        return;
      }
      setGrades(MOCK_GRADES);
      setStudentMarks([]);
    }
  }

  async function loadPerformance() {
    try {
      // Use grade-distribution as the performance endpoint since /performance doesn't exist
      const data = await authFetch(`/api/parent/children/${selectedChildId}/grade-distribution`);
      setPerformance(data);
    } catch (error: any) {
      console.error(error);
      // Clear auth and redirect on token errors
      if (error.message?.includes('Invalid or expired token') || 
          error.message?.includes('No token provided') ||
          error.message?.includes('Session expired')) {
        clearAuth('PARENT');
        router.push("/login");
        return;
      }
      setPerformance(MOCK_PERFORMANCE);
    }
  }

  async function loadTranscript() {
    try {
      const data = await authFetch(`/api/parent/children/${selectedChildId}/transcript`);
      setTranscript(data);
    } catch (error: any) {
      console.error(error);
      // Clear auth and redirect on token errors
      if (error.message?.includes('Invalid or expired token') || 
          error.message?.includes('No token provided') ||
          error.message?.includes('Session expired')) {
        clearAuth('PARENT');
        router.push("/login");
        return;
      }
      setTranscript(MOCK_TRANSCRIPT);
    }
  }

  function getLetterGrade(score: number | null): string {
    if (score === null) return "—";
    if (score >= 90) return "A";
    if (score >= 85) return "A-";
    if (score >= 80) return "B+";
    if (score >= 75) return "B";
    if (score >= 70) return "B-";
    if (score >= 65) return "C+";
    if (score >= 60) return "C";
    if (score >= 55) return "C-";
    if (score >= 50) return "D";
    return "F";
  }

  function getGradeColor(score: number | null): string {
    if (score === null) return "bg-slate-100 text-slate-500";
    if (score >= 80) return "bg-emerald-100 text-emerald-700";
    if (score >= 65) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  }

  function getRiskColor(level: string): string {
    switch (level) {
      case "LOW": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "MEDIUM": return "bg-amber-100 text-amber-700 border-amber-200";
      case "HIGH": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  const gradedAssignments = grades.filter((g) => g.score != null);
  const averageScore = gradedAssignments.length
    ? Math.round(gradedAssignments.reduce((sum, g) => sum + Number(g.score), 0) / gradedAssignments.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Student Information Card */}
      {selectedChild && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selectedChild.full_name}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Student ID: {selectedChild.student_number || selectedChild.student_id || "N/A"}
                </p>
                <p className="text-sm text-slate-500">
                  {selectedChild.class_name || "Class not assigned"}
                </p>
                {selectedChild.school_name && (
                  <p className="text-sm text-slate-500">
                    {selectedChild.school_name}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700 border border-emerald-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Registered
              </span>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Grades & Academic Performance</h1>
        <p className="text-sm text-slate-500 mt-1">
          {selectedChild?.full_name || "Student"} &middot; {selectedChild?.class_name || ""}
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "grades", label: "Grades by Subject" },
          { key: "marks", label: "Student Marks" },
          { key: "analysis", label: "Academic Analysis" },
          { key: "predictions", label: "AI Predictions" },
          { key: "transcript", label: "Transcript" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key as any)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeSection === tab.key
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Student Marks Section */}
      {activeSection === "marks" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Student Marks</h2>
                <p className="text-xs text-slate-500">Test, Midterm, Final, Assignment, and Other marks by subject</p>
              </div>
            </div>

            {studentMarks.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-200">
                      <th className="text-left py-4 px-4 text-sm font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10">Subject</th>
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
                    {studentMarks.map((mark: any, index: number) => {
                      const total = mark.total || (mark.test + mark.mid + mark.final + mark.assignment + mark.other);
                      const average = total / 5;
                      const letterGrade = mark.letter_grade || getLetterGrade(average);
                      
                      return (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50 transition">
                          <td className="py-4 px-4 sticky left-0 bg-white z-10">
                            <div>
                              <p className="text-sm font-medium text-slate-900">{mark.subject}</p>
                              <p className="text-xs text-slate-500">{mark.class_name}</p>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`font-semibold text-sm ${mark.test > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                              {mark.test > 0 ? mark.test : '-'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`font-semibold text-sm ${mark.mid > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                              {mark.mid > 0 ? mark.mid : '-'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`font-semibold text-sm ${mark.final > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                              {mark.final > 0 ? mark.final : '-'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`font-semibold text-sm ${mark.assignment > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                              {mark.assignment > 0 ? mark.assignment : '-'}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <span className={`font-semibold text-sm ${mark.other > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                              {mark.other > 0 ? mark.other : '-'}
                            </span>
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
            ) : (
              <div className="bg-slate-50 rounded-xl p-8 text-center">
                <p className="text-slate-500">No student marks recorded yet.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FR-P14: Grades per Subject */}
      {activeSection === "grades" && (
        <div className="space-y-4">
          {/* Grade Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Overall Average</h2>
              <div className={`rounded-xl px-4 py-2 text-lg font-bold ${getGradeColor(averageScore)}`}>
                {averageScore}% ({getLetterGrade(averageScore)})
              </div>
            </div>
          </div>

          {/* Grade List */}
          {grades.length > 0 ? (
            <div className="space-y-3">
              {grades.map((grade) => (
                <div key={grade.submission_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{grade.assignment_title}</h3>
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        {grade.score != null && (
                          <span className="text-sm text-slate-600">
                            Score: <span className="font-semibold">{grade.score}</span>
                          </span>
                        )}
                        {grade.grade && (
                          <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${getGradeColor(grade.score)}`}>
                            {grade.grade}
                          </span>
                        )}
                        {grade.is_late && (
                          <span className="rounded-lg px-2 py-0.5 text-xs font-bold bg-red-100 text-red-700">Late</span>
                        )}
                        {grade.status && (
                          <span className="text-xs text-slate-500">{grade.status}</span>
                        )}
                      </div>
                    </div>
                    <div className={`rounded-xl px-4 py-2 text-center min-w-[80px] ${getGradeColor(grade.score)}`}>
                      <p className="text-2xl font-bold">{grade.score ?? "—"}</p>
                      <p className="text-xs font-medium">{getLetterGrade(grade.score)}</p>
                    </div>
                  </div>

                  {/* FR-P15: Teacher Feedback */}
                  {grade.feedback && (
                    <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 p-4">
                      <div className="flex items-start gap-2">
                        <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <div>
                          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Teacher Feedback</p>
                          <p className="mt-1 text-sm text-slate-700">{grade.feedback}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
              <p className="text-slate-500">No grade records found.</p>
            </div>
          )}
        </div>
      )}

      {/* FR-P17: Academic Analysis Reports */}
      {activeSection === "analysis" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Performance Trends</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {/* Strengths */}
              <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-5">
                <h3 className="font-semibold text-emerald-800 mb-3">Strengths</h3>
                {gradedAssignments.filter((g) => Number(g.score) >= 80).length > 0 ? (
                  <div className="space-y-2">
                    {gradedAssignments
                      .filter((g) => Number(g.score) >= 80)
                      .map((g) => (
                        <div key={g.submission_id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{g.assignment_title}</span>
                          <span className="font-semibold text-emerald-700">{g.score}%</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No high-scoring assignments yet.</p>
                )}
              </div>

              {/* Weaknesses */}
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-5">
                <h3 className="font-semibold text-amber-800 mb-3">Areas for Improvement</h3>
                {gradedAssignments.filter((g) => Number(g.score) < 70).length > 0 ? (
                  <div className="space-y-2">
                    {gradedAssignments
                      .filter((g) => Number(g.score) < 70)
                      .map((g) => (
                        <div key={g.submission_id} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{g.assignment_title}</span>
                          <span className="font-semibold text-amber-700">{g.score}%</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No low-scoring assignments. Great job!</p>
                )}
              </div>
            </div>

            {/* Grade Distribution */}
            <div className="mt-6">
              <h3 className="font-semibold text-slate-900 mb-3">Grade Distribution</h3>
              <div className="space-y-2">
                {["A", "B", "C", "D", "F"].map((letter) => {
                  const count = gradedAssignments.filter((g) => getLetterGrade(g.score).startsWith(letter)).length;
                  const percentage = gradedAssignments.length ? (count / gradedAssignments.length) * 100 : 0;
                  return (
                    <div key={letter} className="flex items-center gap-3">
                      <span className="w-8 text-sm font-bold text-slate-700">{letter}</span>
                      <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            letter === "A" ? "bg-emerald-400" : letter === "B" ? "bg-blue-400" : letter === "C" ? "bg-amber-400" : "bg-red-400"
                          }`}
                          style={{ width: `${Math.max(percentage, 2)}%` }}
                        />
                      </div>
                      <span className="w-8 text-sm text-slate-600 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FR-P18: AI Performance Predictions */}
      {activeSection === "predictions" && (
        <div className="space-y-4">
          {performance ? (
            <>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Predicted Final Grade</p>
                  <p className="text-4xl font-bold text-slate-900">{performance.predicted_grade}</p>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Risk Level</p>
                  <span className={`inline-block rounded-xl px-4 py-2 text-lg font-bold border ${getRiskColor(performance.risk_level)}`}>
                    {performance.risk_level}
                  </span>
                </div>
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Average Score</p>
                  <p className="text-4xl font-bold text-slate-900">{performance.average_score}%</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">AI Recommendation</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{performance.recommendation}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="font-semibold text-slate-900 mb-3">Attendance Impact</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${performance.attendance_rate >= 90 ? "bg-emerald-500" : performance.attendance_rate >= 75 ? "bg-amber-500" : "bg-red-500"}`}
                        style={{ width: `${performance.attendance_rate}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{performance.attendance_rate}%</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">Attendance rate has a direct impact on predicted performance.</p>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <p className="text-slate-500">No performance prediction available yet.</p>
            </div>
          )}
        </div>
      )}

      {/* FR-P16: Official Transcript */}
      {activeSection === "transcript" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Official Transcript</h2>
              <p className="text-sm text-slate-500 mt-1">Download the official academic transcript for {selectedChild?.full_name || "student"}.</p>
            </div>
            {transcript?.pdf_url && (
              <a
                href={transcript.pdf_url}
                download
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-white font-semibold hover:bg-emerald-700 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </a>
            )}
          </div>

          {/* Transcript Preview */}
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-8 text-center bg-slate-50">
            <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-500 font-medium">Transcript Document</p>
            <p className="text-sm text-slate-400 mt-1">
              {selectedChild?.full_name} &middot; {selectedChild?.class_name}
            </p>
            {transcript?.pdf_url ? (
              <p className="text-sm text-emerald-600 mt-3">Click &quot;Download PDF&quot; to save the transcript.</p>
            ) : (
              <p className="text-sm text-slate-400 mt-3">Transcript not yet generated.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
