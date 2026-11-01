"use client";

import React, { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAcademicTranslations } from "@/translations/vp-academic";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/vp-academic";

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
  const { language } = useLanguage();
  const t = vpAcademicTranslations[language];
  const [activeTab, setActiveTab] = useState<"subjects" | "teachers" | "classes" | "trends">("subjects");
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [teacherPerformance, setTeacherPerformance] = useState<TeacherPerformance[]>([]);
  const [classPerformance, setClassPerformance] = useState<ClassPerformance[]>([]);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchSubjectPerformance() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/academic/grade-distribution`);
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
      const res = await fetch(`${API_BASE}/teachers/performance`);
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
      const res = await fetch(`${API_BASE}/academic/grades`);
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
      const res = await fetch(`${API_BASE}/exams/comparison`);
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
        return "bg-orange-500";
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
    if (score >= 80) return "text-orange-600 dark:text-orange-400";
    if (score >= 60) return "text-sky-600 dark:text-sky-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-rose-600 dark:text-rose-400";
  }

  const COLORS = {
    A: "#f97316",
    B: "#0ea5e9",
    C: "#f59e0b",
    D: "#f97316",
    F: "#ef4444"
  };

  const gradeChartData = subjectPerformance.map(subject => ({
    name: subject.subject_name,
    average: subject.average_score,
    passRate: subject.pass_rate
  }));

  const teacherChartData = teacherPerformance.map(teacher => ({
    name: teacher.teacher_name,
    averageGrade: teacher.average_student_grade,
    passRate: teacher.pass_rate
  }));

  const classGradeChartData = classPerformance.map(cls => ({
    name: cls.class_name,
    averageGrade: cls.average_grade,
    attendanceRate: cls.attendance_rate
  }));

  const trendChartData = trendData.map(trend => ({
    period: trend.period,
    averageGrade: trend.average_grade,
    attendanceRate: trend.attendance_rate
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.performanceAnalyticsTitle}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{t.comprehensiveAnalysis}</p>
      </div>

      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("subjects")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "subjects"
                ? "border-b-2 border-orange-600 dark:border-orange-400 text-orange-600 dark:text-orange-400"
                : "text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {t.subjectPerformance}
          </button>
          <button
            onClick={() => setActiveTab("teachers")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "teachers"
                ? "border-b-2 border-orange-600 dark:border-orange-400 text-orange-600 dark:text-orange-400"
                : "text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {t.teacherPerformance}
          </button>
          <button
            onClick={() => setActiveTab("classes")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "classes"
                ? "border-b-2 border-orange-600 dark:border-orange-400 text-orange-600 dark:text-orange-400"
                : "text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {t.classPerformance}
          </button>
          <button
            onClick={() => setActiveTab("trends")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "trends"
                ? "border-b-2 border-orange-600 dark:border-orange-400 text-orange-600 dark:text-orange-400"
                : "text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {t.trendsComparisons}
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === "subjects" && (
            <div className="space-y-6">
              {subjectPerformance.length > 0 && (
                <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t.subjectPerformanceOverview}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={gradeChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                      <XAxis dataKey="name" className="text-xs text-slate-600 dark:text-slate-400" />
                      <YAxis className="text-xs text-slate-600 dark:text-slate-400" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgb(255 255 255)",
                          border: "1px solid rgb(226 232 240)",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Bar dataKey="average" fill="#10b981" name={`${t.averageScore} (%)`} />
                      <Bar dataKey="passRate" fill="#0ea5e9" name={`${t.passRateLabel} (%)`} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid gap-6 lg:grid-cols-2">
                {subjectPerformance.map((subject) => (
                  <div key={subject.subject_name} className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{subject.subject_name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-300">{subject.total_students} {t.studentsLabel.toLowerCase()}</p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 mb-4">
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-300 uppercase tracking-wide">{t.averageScore}</p>
                        <p className={`text-2xl font-bold ${getPerformanceColor(subject.average_score)}`}>
                          {(subject.average_score ?? 0).toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-300 uppercase tracking-wide">{t.passRateLabel}</p>
                        <p className={`text-2xl font-bold ${getPerformanceColor(subject.pass_rate)}`}>
                          {(subject.pass_rate ?? 0).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-300 uppercase tracking-wide mb-2">{t.gradeDistribution}</p>
                      <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                          <Pie
                            data={Object.entries(subject.grade_distribution).map(([grade, count]) => ({
                              name: grade,
                              value: count
                            }))}
                            cx="50%"
                            cy="50%"
                            outerRadius={60}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {Object.keys(subject.grade_distribution).map((grade) => (
                              <Cell key={grade} fill={COLORS[grade as keyof typeof COLORS]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </div>
              {subjectPerformance.length === 0 && (
                <div className="rounded-2xl bg-white dark:bg-slate-800 p-12 text-center text-sm text-slate-400 dark:text-slate-500">
                  {t.noSubjectPerformanceData}
                </div>
              )}
            </div>
          )}

          {activeTab === "teachers" && (
            <div className="space-y-6">
              {teacherPerformance.length > 0 && (
                <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t.teacherPerformanceOverview}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={teacherChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                      <XAxis dataKey="name" className="text-xs text-slate-600 dark:text-slate-400" />
                      <YAxis className="text-xs text-slate-600 dark:text-slate-400" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgb(255 255 255)",
                          border: "1px solid rgb(226 232 240)",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Bar dataKey="averageGrade" fill="#10b981" name={`${t.avgGrade} (%)`} />
                      <Bar dataKey="passRate" fill="#0ea5e9" name={`${t.passRateLabel} (%)`} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-300">
                        <th className="px-6 py-4">{t.teacherLabel}</th>
                        <th className="px-6 py-4">{t.departmentLabel}</th>
                        <th className="px-6 py-4">{t.studentsLabel}</th>
                        <th className="px-6 py-4">{t.subjects}</th>
                        <th className="px-6 py-4">{t.avgGrade}</th>
                        <th className="px-6 py-4">{t.passRateLabel}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {teacherPerformance.map((teacher) => (
                        <tr key={teacher.teacher_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{teacher.teacher_name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{teacher.department}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{teacher.total_students}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{teacher.subjects_taught}</td>
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
                          <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                            {t.noTeacherPerformanceData}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === "classes" && (
            <div className="space-y-6">
              {classPerformance.length > 0 && (
                <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t.classPerformanceOverview}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={classGradeChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                      <XAxis dataKey="name" className="text-xs text-slate-600 dark:text-slate-400" />
                      <YAxis className="text-xs text-slate-600 dark:text-slate-400" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgb(255 255 255)",
                          border: "1px solid rgb(226 232 240)",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Bar dataKey="averageGrade" fill="#10b981" name={`${t.averageGrade} (%)`} />
                      <Bar dataKey="attendanceRate" fill="#0ea5e9" name={`${t.attendanceRateLabel} (%)`} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {classPerformance.map((cls) => (
                  <div key={cls.class_name} className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{cls.class_name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-300">{cls.total_students} {t.studentsLabel.toLowerCase()}</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-slate-500 dark:text-slate-300">{t.averageGrade}</p>
                          <p className={`text-sm font-semibold ${getPerformanceColor(cls.average_grade)}`}>
                            {(cls.average_grade ?? 0).toFixed(1)}%
                          </p>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className={`h-2 rounded-full ${(cls.average_grade ?? 0) >= 60 ? "bg-orange-500" : "bg-rose-500"}`}
                            style={{ width: `${cls.average_grade ?? 0}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-slate-500 dark:text-slate-300">{t.attendanceRateLabel}</p>
                          <p className={`text-sm font-semibold ${getPerformanceColor(cls.attendance_rate)}`}>
                            {(cls.attendance_rate ?? 0).toFixed(1)}%
                          </p>
                        </div>
                        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className={`h-2 rounded-full ${(cls.attendance_rate ?? 0) >= 75 ? "bg-orange-500" : "bg-amber-500"}`}
                            style={{ width: `${cls.attendance_rate ?? 0}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
                        <p className="text-xs text-slate-500 dark:text-slate-300 mb-1">{t.topSubject}</p>
                        <p className="text-sm font-medium text-orange-700 dark:text-orange-300">{cls.top_performing_subject}</p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-300 mb-1">{t.needsImprovementSubject}</p>
                        <p className="text-sm font-medium text-rose-700 dark:text-rose-300">{cls.needs_improvement_subject}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {classPerformance.length === 0 && (
                <div className="rounded-2xl bg-white dark:bg-slate-800 p-12 text-center text-sm text-slate-400 dark:text-slate-500">
                  {t.noClassPerformanceData}
                </div>
              )}
            </div>
          )}

          {activeTab === "trends" && (
            <div className="space-y-6">
              {trendData.length > 0 && (
                <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t.performanceTrendsOverTime}</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendChartData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                      <XAxis dataKey="period" className="text-xs text-slate-600 dark:text-slate-400" />
                      <YAxis className="text-xs text-slate-600 dark:text-slate-400" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgb(255 255 255)",
                          border: "1px solid rgb(226 232 240)",
                          borderRadius: "8px"
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="averageGrade" stroke="#10b981" strokeWidth={2} name={`${t.averageGrade} (%)`} />
                      <Line type="monotone" dataKey="attendanceRate" stroke="#0ea5e9" strokeWidth={2} name={`${t.attendanceRateLabel} (%)`} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t.keyInsights}</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 p-4">
                    <p className="text-xs text-orange-600 dark:text-orange-400 uppercase tracking-wide mb-1">{t.bestPerformingPeriod}</p>
                    <p className="text-lg font-bold text-orange-900 dark:text-orange-300">
                      {trendData.length > 0
                        ? trendData.reduce((best, current) =>
                            current.average_grade > best.average_grade ? current : best
                          ).period
                        : t.notProvided}
                    </p>
                  </div>
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4">
                    <p className="text-xs text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">{t.needsAttention}</p>
                    <p className="text-lg font-bold text-amber-900 dark:text-amber-300">
                      {trendData.length > 0
                        ? trendData.reduce((worst, current) =>
                            current.average_grade < worst.average_grade ? current : worst
                          ).period
                        : t.notProvided}
                    </p>
                  </div>
                </div>
              </div>

              {trendData.length === 0 && (
                <div className="rounded-2xl bg-white dark:bg-slate-800 p-12 text-center text-sm text-slate-400 dark:text-slate-500">
                  {t.noTrendData}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
