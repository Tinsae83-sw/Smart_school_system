"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function PerformancePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [studentMarks, setStudentMarks] = useState<Record<number, { test: number; mid: number; final: number; assignment: number; other: number; total: number }>>({});
  const [loading, setLoading] = useState(true);

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

  async function loadPerformance() {
    if (!selectedClass) return;
    try {
      const data = await authFetch(`/api/teacher/grades/${selectedClass}`, {}, token);
      setPerformanceData(data);
      
      // Load student marks
      const marks: Record<number, { test: number; mid: number; final: number; assignment: number; other: number; total: number }> = {};
      if (data.student_marks && Array.isArray(data.student_marks)) {
        data.student_marks.forEach((markData: any) => {
          if (markData.student_id) {
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
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    if (selectedClass) {
      loadPerformance();
    }
  }, [selectedClass]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-indigo-100 rounded-xl">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Performance Analytics</h1>
              <p className="text-slate-600">Track student performance and class metrics</p>
            </div>
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
              <p className="text-xs text-slate-500">Choose the class to view performance</p>
            </div>
          </div>
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          >
            {classes.map((cls: any) => (
              <option key={cls.class_subject_id} value={cls.class_id}>
                {cls.school_class?.class_name || cls.class_name} - {cls.subject?.subject_name || cls.subject}
              </option>
            ))}
          </select>
        </div>

        {/* Performance Metrics */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-xs text-slate-500 font-medium">Average</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Class Average</h3>
            <p className="text-3xl font-bold text-indigo-600">{performanceData?.average_grade || performanceData?.average || "N/A"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <span className="text-xs text-slate-500 font-medium">Top</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Top Performer</h3>
            <p className="text-xl font-semibold text-emerald-600 truncate">{performanceData?.top_student || "N/A"}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <span className="text-xs text-slate-500 font-medium">Alert</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">At Risk Students</h3>
            <p className="text-3xl font-bold text-red-600">{performanceData?.at_risk_count || 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-xs text-slate-500 font-medium">Total</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Total Students</h3>
            <p className="text-3xl font-bold text-blue-600">{performanceData?.total_students || 0}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs text-slate-500 font-medium">Rate</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Pass Rate</h3>
            <p className="text-3xl font-bold text-emerald-600">{performanceData?.pass_rate || "N/A"}%</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:shadow-md transition">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <span className="text-xs text-slate-500 font-medium">Graded</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-700 mb-1">Assignments Graded</h3>
            <p className="text-3xl font-bold text-amber-600">{performanceData?.assignments_graded || 0}</p>
          </div>
        </div>

        {/* Student Marks Table */}
        {performanceData?.student_marks && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Student Marks</h2>
                <p className="text-xs text-slate-500">View all student marks by assessment type</p>
              </div>
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
                  {performanceData.student_marks.map((markData: any) => {
                    const marks = studentMarks[markData.student_id] || { test: 0, mid: 0, final: 0, assignment: 0, other: 0, total: 0 };
                    const total = marks.total || 0;
                    const average = total / 5;
                    const letterGrade = average >= 90 ? 'A' : average >= 80 ? 'B' : average >= 70 ? 'C' : average >= 60 ? 'D' : 'F';
                    const gradeColor = average >= 90 ? 'bg-emerald-100 text-emerald-700' : average >= 80 ? 'bg-blue-100 text-blue-700' : average >= 70 ? 'bg-amber-100 text-amber-700' : average >= 60 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700';
                    
                    return (
                      <tr key={markData.student_id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                        <td className="py-4 px-4 sticky left-0 bg-white z-10">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                              {(markData.student?.user?.full_name || markData.student?.full_name || "S").charAt(0)}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {markData.student?.user?.full_name || markData.student?.full_name}
                              </p>
                              <p className="text-xs text-slate-500">{markData.student?.student_number || `ID: ${markData.student_id}`}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center text-sm text-slate-600">{marks.test || 0}</td>
                        <td className="py-4 px-4 text-center text-sm text-slate-600">{marks.mid || 0}</td>
                        <td className="py-4 px-4 text-center text-sm text-slate-600">{marks.final || 0}</td>
                        <td className="py-4 px-4 text-center text-sm text-slate-600">{marks.assignment || 0}</td>
                        <td className="py-4 px-4 text-center text-sm text-slate-600">{marks.other || 0}</td>
                        <td className="py-4 px-4 text-center">
                          <span className={`font-semibold text-sm ${total > 0 ? 'text-slate-900' : 'text-slate-400'}`}>
                            {total > 0 ? total.toFixed(1) : '-'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {total > 0 ? (
                            <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${gradeColor}`}>
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
        )}
      </div>
    </main>
  );
}
