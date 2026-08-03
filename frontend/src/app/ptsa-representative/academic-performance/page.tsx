"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/ptsa";

type GradeSummary = {
  grade_level: number;
  subject: string;
  average_grade: number;
  student_count: number;
};

type GradeDistribution = {
  grade_level: number;
  a_count: number;
  b_count: number;
  c_count: number;
  d_count: number;
  f_count: number;
};

type AttendanceSummary = {
  grade_level: number;
  attendance_rate: number;
  total_students: number;
};

type ConductSummary = {
  grade_level: number;
  excellent_count: number;
  good_count: number;
  needs_improvement_count: number;
};

type NationalExamResult = {
  exam_type: string;
  year: number;
  school_average: number;
  national_average: number;
  pass_rate: number;
};

type PerformanceTrend = {
  subject: string;
  year: number;
  average_score: number;
};

export default function AcademicPerformancePage() {
  const [gradeSummaries, setGradeSummaries] = useState<GradeSummary[]>([]);
  const [gradeDistributions, setGradeDistributions] = useState<GradeDistribution[]>([]);
  const [attendanceSummaries, setAttendanceSummaries] = useState<AttendanceSummary[]>([]);
  const [conductSummaries, setConductSummaries] = useState<ConductSummary[]>([]);
  const [nationalExamResults, setNationalExamResults] = useState<NationalExamResult[]>([]);
  const [performanceTrends, setPerformanceTrends] = useState<PerformanceTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);

  useEffect(() => {
    loadAcademicData();
  }, []);

  async function loadAcademicData() {
    setLoading(true);
    try {
      const [gradesRes, distributionsRes, attendanceRes, conductRes, examsRes, trendsRes] = await Promise.all([
        fetch(`${API_BASE}/academic/grade-summaries`),
        fetch(`${API_BASE}/academic/grade-distributions`),
        fetch(`${API_BASE}/academic/attendance-summaries`),
        fetch(`${API_BASE}/academic/conduct-summaries`),
        fetch(`${API_BASE}/academic/national-exam-results`),
        fetch(`${API_BASE}/academic/performance-trends`),
      ]);

      if (gradesRes.ok) setGradeSummaries(await gradesRes.json());
      if (distributionsRes.ok) setGradeDistributions(await distributionsRes.json());
      if (attendanceRes.ok) setAttendanceSummaries(await attendanceRes.json());
      if (conductRes.ok) setConductSummaries(await conductRes.json());
      if (examsRes.ok) setNationalExamResults(await examsRes.json());
      if (trendsRes.ok) setPerformanceTrends(await trendsRes.json());
    } catch (error) {
      console.error("Error loading academic data:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredGrades = selectedGrade 
    ? gradeSummaries.filter(g => g.grade_level === selectedGrade)
    : gradeSummaries;

  const filteredAttendance = selectedGrade
    ? attendanceSummaries.filter(a => a.grade_level === selectedGrade)
    : attendanceSummaries;

  const filteredConduct = selectedGrade
    ? conductSummaries.filter(c => c.grade_level === selectedGrade)
    : conductSummaries;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Academic Performance Monitoring</h1>
          <p className="text-sm text-slate-500 mt-1">School-wide academic overview (Read-Only)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedGrade(null)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              selectedGrade === null
                ? "bg-teal-600 text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All Grades
          </button>
          {[9, 10, 11, 12].map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                selectedGrade === grade
                  ? "bg-teal-600 text-white"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Grade {grade}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500">Loading academic data...</div>
        </div>
      ) : (
        <>
          {/* Grade Summary Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredGrades.map((summary) => (
              <div key={`${summary.grade_level}-${summary.subject}`} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Grade {summary.grade_level}
                  </span>
                  <span className="text-xs text-slate-400">{summary.student_count} students</span>
                </div>
                <p className="text-lg font-semibold text-slate-900">{summary.subject}</p>
                <p className="text-3xl font-bold text-teal-600 mt-2">{summary.average_grade.toFixed(1)}%</p>
              </div>
            ))}
          </div>

          {/* Grade Distribution */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Grade Distribution</h2>
            <div className="space-y-4">
              {gradeDistributions.filter(d => !selectedGrade || d.grade_level === selectedGrade).map((dist) => (
                <div key={dist.grade_level} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-900">Grade {dist.grade_level}</span>
                    <span className="text-sm text-slate-500">
                      Total: {dist.a_count + dist.b_count + dist.c_count + dist.d_count + dist.f_count}
                    </span>
                  </div>
                  <div className="flex gap-2 h-8">
                    <div 
                      className="bg-emerald-500 rounded-l-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(dist.a_count / (dist.a_count + dist.b_count + dist.c_count + dist.d_count + dist.f_count)) * 100}%` }}
                    >
                      A: {dist.a_count}
                    </div>
                    <div 
                      className="bg-blue-500 flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(dist.b_count / (dist.a_count + dist.b_count + dist.c_count + dist.d_count + dist.f_count)) * 100}%` }}
                    >
                      B: {dist.b_count}
                    </div>
                    <div 
                      className="bg-amber-500 flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(dist.c_count / (dist.a_count + dist.b_count + dist.c_count + dist.d_count + dist.f_count)) * 100}%` }}
                    >
                      C: {dist.c_count}
                    </div>
                    <div 
                      className="bg-orange-500 flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(dist.d_count / (dist.a_count + dist.b_count + dist.c_count + dist.d_count + dist.f_count)) * 100}%` }}
                    >
                      D: {dist.d_count}
                    </div>
                    <div 
                      className="bg-red-500 rounded-r-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(dist.f_count / (dist.a_count + dist.b_count + dist.c_count + dist.d_count + dist.f_count)) * 100}%` }}
                    >
                      F: {dist.f_count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Attendance Summary</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {filteredAttendance.map((summary) => (
                <div key={summary.grade_level} className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <p className="text-sm font-medium text-slate-600">Grade {summary.grade_level}</p>
                  <p className="text-2xl font-bold text-slate-900 mt-2">{summary.attendance_rate.toFixed(1)}%</p>
                  <p className="text-xs text-slate-500 mt-1">{summary.total_students} students</p>
                  <div className="mt-3 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${summary.attendance_rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Conduct Summary */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Conduct Summary</h2>
            <div className="space-y-4">
              {filteredConduct.map((summary) => (
                <div key={summary.grade_level} className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-slate-900">Grade {summary.grade_level}</p>
                    <div className="flex gap-4 text-sm">
                      <span className="text-emerald-600 font-medium">Excellent: {summary.excellent_count}</span>
                      <span className="text-blue-600 font-medium">Good: {summary.good_count}</span>
                      <span className="text-amber-600 font-medium">Needs Improvement: {summary.needs_improvement_count}</span>
                    </div>
                  </div>
                  <div className="flex gap-2 h-6">
                    <div 
                      className="bg-emerald-500 rounded-l-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(summary.excellent_count / (summary.excellent_count + summary.good_count + summary.needs_improvement_count)) * 100}%` }}
                    >
                      Excellent
                    </div>
                    <div 
                      className="bg-blue-500 flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(summary.good_count / (summary.excellent_count + summary.good_count + summary.needs_improvement_count)) * 100}%` }}
                    >
                      Good
                    </div>
                    <div 
                      className="bg-amber-500 rounded-r-lg flex items-center justify-center text-xs font-bold text-white"
                      style={{ width: `${(summary.needs_improvement_count / (summary.excellent_count + summary.good_count + summary.needs_improvement_count)) * 100}%` }}
                    >
                      Needs Improvement
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* National Exam Results */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">National Exam Results (Grade 10 & 12)</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Exam Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Year</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">School Average</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">National Average</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Pass Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {nationalExamResults.map((result) => (
                    <tr key={`${result.exam_type}-${result.year}`} className="border-b border-slate-100">
                      <td className="py-3 px-4 text-sm text-slate-900">{result.exam_type}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{result.year}</td>
                      <td className="py-3 px-4 text-sm font-medium text-teal-600">{result.school_average.toFixed(1)}%</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{result.national_average.toFixed(1)}%</td>
                      <td className="py-3 px-4 text-sm font-medium text-emerald-600">{result.pass_rate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Performance Trends */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Subject Performance Trends (3 Years)</h2>
            <div className="space-y-4">
              {Object.entries(
                performanceTrends.reduce((acc: Record<string, PerformanceTrend[]>, trend: PerformanceTrend) => {
                  const subject = trend.subject;
                  if (!acc[subject]) acc[subject] = [];
                  acc[subject].push(trend);
                  return acc;
                }, {})
              ).map(([subject, trends]: [string, PerformanceTrend[]]) => (
                <div key={subject} className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <p className="font-medium text-slate-900 mb-3">{subject}</p>
                  <div className="space-y-2">
                    {trends.map((trend) => (
                      <div key={`${subject}-${trend.year}`} className="flex items-center gap-4">
                        <span className="w-16 text-sm text-slate-600">{trend.year}</span>
                        <div className="flex-1 h-6 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-teal-400 to-teal-600 rounded-full flex items-center justify-end pr-2 transition-all"
                            style={{ width: `${trend.average_score}%` }}
                          >
                            <span className="text-xs font-bold text-white">{trend.average_score.toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
