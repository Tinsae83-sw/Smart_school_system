"use client";

import React, { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/vp-academic";
const api = authFetchFor("VP_ACADEMIC");

type SubjectPerformance = {
  subject_name: string;
  average_score: number;
  pass_rate: number;
  total_students: number;
  grade_distribution: {
    A: number;
    B: number;
    C: number;
    D: number;
    F: number;
  };
};

type TeacherPerformance = {
  teacher_id: number;
  teacher_name: string;
  department: string;
  average_student_grade: number;
  pass_rate: number;
  total_students: number;
  subjects_taught: number;
};

type ClassPerformance = {
  class_name: string;
  average_grade: number;
  attendance_rate: number;
  total_students: number;
  top_performing_subject: string;
  needs_improvement_subject: string;
};

type TrendData = {
  period: string;
  average_grade: number;
  attendance_rate: number;
};

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"subjects" | "teachers" | "classes" | "trends">("subjects");
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [teacherPerformance, setTeacherPerformance] = useState<TeacherPerformance[]>([]);
  const [classPerformance, setClassPerformance] = useState<ClassPerformance[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchSubjectPerformance() {
    setLoading(true);
    try {
      const res = await api(`${API_BASE}/academic/grade-distribution`);
      if (!res.ok) throw new Error("Failed to fetch subject performance");
      const data = await res.json();
      setSubjectPerformance(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setSubjectPerformance([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTeacherPerformance() {
    setLoading(true);
    try {
      const res = await api(`${API_BASE}/teachers/performance`);
      if (!res.ok) throw new Error("Failed to fetch teacher performance");
      const data = await res.json();
      setTeacherPerformance(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setTeacherPerformance([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchClassPerformance() {
    setLoading(true);
    try {
      const res = await api(`${API_BASE}/academic/grades`);
      if (!res.ok) throw new Error("Failed to fetch class performance");
      const data = await res.json();
      setClassPerformance(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setClassPerformance([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTrendData() {
    setLoading(true);
    try {
      const res = await api(`${API_BASE}/exams/comparison`);
      if (!res.ok) throw new Error("Failed to fetch trend data");
      const data = await res.json();
      setTrendData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "subjects") fetchSubjectPerformance();
    else if (activeTab === "teachers") fetchTeacherPerformance();
    else if (activeTab === "classes") fetchClassPerformance();
    else if (activeTab === "trends") fetchTrendData();
  }, [activeTab]);

  function getGradeColor(grade: string) {
    switch (grade) {
      case "A":
        return "bg-emerald-500";
      case "B":
        return "bg-sky-500";
      case "C":
        return "bg-amber-500";
      case "D":
        return "bg-orange-500";
      case "F":
        return "bg-rose-500";
      default:
        return "bg-slate-500";
    }
  }

  function getPerformanceColor(score: number) {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-sky-600";
    if (score >= 40) return "text-amber-600";
    return "text-rose-600";
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Performance Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">Comprehensive analysis of academic performance metrics</p>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("subjects")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "subjects"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Subject Performance
          </button>
          <button
            onClick={() => setActiveTab("teachers")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "teachers"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Teacher Performance
          </button>
          <button
            onClick={() => setActiveTab("classes")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "classes"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Class Performance
          </button>
          <button
            onClick={() => setActiveTab("trends")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "trends"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Trends & Comparisons
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === "subjects" && (
            <div className="grid gap-6 lg:grid-cols-2">
              {subjectPerformance.map((subject) => (
                <div key={subject.subject_name} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900">{subject.subject_name}</h3>
                    <p className="text-sm text-slate-500">{subject.total_students} students</p>
                  </div>
                  
                  <div className="grid gap-4 sm:grid-cols-2 mb-4">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Average Score</p>
                      <p className={`text-2xl font-bold ${getPerformanceColor(subject.average_score)}`}>
                        {(subject.average_score ?? 0).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wide">Pass Rate</p>
                      <p className={`text-2xl font-bold ${getPerformanceColor(subject.pass_rate)}`}>
                        {(subject.pass_rate ?? 0).toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Grade Distribution</p>
                    <div className="flex gap-1 h-8">
                      {Object.entries(subject.grade_distribution).map(([grade, count]) => (
                        <div
                          key={grade}
                          className={`${getGradeColor(grade)} rounded-sm`}
                          style={{ width: `${(count / subject.total_students) * 100}%` }}
                          title={`${grade}: ${count} students`}
                        />
                      ))}
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-slate-600">
                      {Object.entries(subject.grade_distribution).map(([grade, count]) => (
                        <span key={grade}>
                          {grade}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {subjectPerformance.length === 0 && (
                <div className="col-span-2 rounded-2xl bg-white p-12 text-center text-sm text-slate-400">
                  No subject performance data available.
                </div>
              )}
            </div>
          )}

          {activeTab === "teachers" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                      <th className="px-6 py-4">Teacher</th>
                      <th className="px-6 py-4">Department</th>
                      <th className="px-6 py-4">Students</th>
                      <th className="px-6 py-4">Subjects</th>
                      <th className="px-6 py-4">Avg Grade</th>
                      <th className="px-6 py-4">Pass Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teacherPerformance.map((teacher) => (
                      <tr key={teacher.teacher_id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{teacher.teacher_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{teacher.department}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{teacher.total_students}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{teacher.subjects_taught}</td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-semibold ${getPerformanceColor(teacher.average_student_grade)}`}>
                            {(teacher.average_student_grade ?? 0).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-semibold ${getPerformanceColor(teacher.pass_rate)}`}>
                            {(teacher.pass_rate ?? 0).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {teacherPerformance.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                          No teacher performance data available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "classes" && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {classPerformance.map((cls) => (
                <div key={cls.class_name} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold text-slate-900">{cls.class_name}</h3>
                    <p className="text-sm text-slate-500">{cls.total_students} students</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-slate-500">Average Grade</p>
                        <p className={`text-sm font-semibold ${getPerformanceColor(cls.average_grade)}`}>
                          {(cls.average_grade ?? 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className={`h-2 rounded-full ${(cls.average_grade ?? 0) >= 60 ? "bg-emerald-500" : "bg-rose-500"}`}
                          style={{ width: `${cls.average_grade ?? 0}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-slate-500">Attendance Rate</p>
                        <p className={`text-sm font-semibold ${getPerformanceColor(cls.attendance_rate)}`}>
                          {(cls.attendance_rate ?? 0).toFixed(1)}%
                        </p>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className={`h-2 rounded-full ${(cls.attendance_rate ?? 0) >= 75 ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: `${cls.attendance_rate ?? 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">Top Subject</p>
                      <p className="text-sm font-medium text-emerald-700">{cls.top_performing_subject}</p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Needs Improvement</p>
                      <p className="text-sm font-medium text-rose-700">{cls.needs_improvement_subject}</p>
                    </div>
                  </div>
                </div>
              ))}
              {classPerformance.length === 0 && (
                <div className="col-span-3 rounded-2xl bg-white p-12 text-center text-sm text-slate-400">
                  No class performance data available.
                </div>
              )}
            </div>
          )}

          {activeTab === "trends" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Performance Trends Over Time</h3>
                {trendData.length > 0 ? (
                  <div className="space-y-4">
                    {trendData.map((trend, index) => (
                      <div key={index} className="flex items-center gap-4">
                        <div className="w-24 text-sm text-slate-600">{trend.period}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex-1 h-6 rounded-full bg-slate-200">
                              <div
                                className="h-6 rounded-full bg-emerald-500"
                                style={{ width: `${trend.average_grade ?? 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-slate-900 w-16 text-right">
                              {(trend.average_grade ?? 0).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-4 rounded-full bg-slate-200">
                              <div
                                className="h-4 rounded-full bg-sky-500"
                                style={{ width: `${trend.attendance_rate ?? 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-slate-600 w-16 text-right">
                              {(trend.attendance_rate ?? 0).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 text-center py-8">No trend data available.</p>
                )}
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4">Key Insights</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
                    <p className="text-xs text-emerald-600 uppercase tracking-wide mb-1">Best Performing Period</p>
                    <p className="text-lg font-bold text-emerald-900">
                      {trendData.length > 0
                        ? trendData.reduce((best, current) =>
                            current.average_grade > best.average_grade ? current : best
                          ).period
                        : "N/A"}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                    <p className="text-xs text-amber-600 uppercase tracking-wide mb-1">Needs Attention</p>
                    <p className="text-lg font-bold text-amber-900">
                      {trendData.length > 0
                        ? trendData.reduce((worst, current) =>
                            current.average_grade < worst.average_grade ? current : worst
                          ).period
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
