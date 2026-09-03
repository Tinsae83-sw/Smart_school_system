"use client";

import { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/sic";
const api = authFetchFor("SIC_MEMBER");

type KPIData = {
  academic_performance: {
    student_pass_rate: number;
    grade_10_pass_rate: number;
    grade_12_pass_rate: number;
    year_over_year_change: number;
  };
  attendance: {
    student_attendance_rate: number;
    teacher_attendance_rate: number;
    year_over_year_change: number;
  };
  retention: {
    student_retention_rate: number;
    teacher_retention_rate: number;
    year_over_year_change: number;
  };
  community: {
    parent_satisfaction: number;
    student_satisfaction: number;
    community_engagement_score: number;
  };
};

type AcademicPerformanceData = {
  [key: string]: {
    total_students: number;
    average_score: number;
    pass_rate: number;
    subject_breakdown: {
      [key: string]: number;
    };
  };
};

type FinancialProgress = {
  budget_summary: {
    total_amount: number;
    allocated_amount: number;
    spent_amount: number;
    remaining_amount: number;
    utilization_rate: string;
  };
  recent_expenditures: Array<{
    expenditure_id: number;
    description: string;
    amount: number;
    expenditure_date: string;
  }>;
  breakdown: any;
};

export default function MonitoringPage() {
  const [activeTab, setActiveTab] = useState<"kpis" | "academic" | "financial">("kpis");
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [academicData, setAcademicData] = useState<AcademicPerformanceData | null>(null);
  const [financialData, setFinancialData] = useState<FinancialProgress | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    try {
      const [kpiRes, academicRes, financialRes] = await Promise.all([
        api(`${API_BASE}/monitoring/kpis`),
        api(`${API_BASE}/monitoring/academic-performance`),
        api(`${API_BASE}/monitoring/financial-progress`)
      ]);

      if (kpiRes.ok) {
        const data = await kpiRes.json();
        setKpiData(data);
      }

      if (academicRes.ok) {
        const data = await academicRes.json();
        setAcademicData(data);
      }

      if (financialRes.ok) {
        const data = await financialRes.json();
        setFinancialData(data);
      }
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading monitoring data...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Monitoring & Evaluation</h1>
        <p className="mt-1 text-sm text-slate-500">Track school performance and key indicators</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("kpis")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "kpis"
                ? "text-rose-600 border-b-2 border-rose-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Key Performance Indicators
          </button>
          <button
            onClick={() => setActiveTab("academic")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "academic"
                ? "text-rose-600 border-b-2 border-rose-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Academic Performance
          </button>
          <button
            onClick={() => setActiveTab("financial")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "financial"
                ? "text-rose-600 border-b-2 border-rose-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Financial Progress
          </button>
        </nav>
      </div>

      {/* KPIs Tab */}
      {activeTab === "kpis" && kpiData && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Academic Performance Card */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Academic Performance</p>
                  <p className="text-xs text-slate-500">Overall pass rate</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{kpiData.academic_performance.student_pass_rate}%</p>
              <p className={`text-xs mt-1 ${kpiData.academic_performance.year_over_year_change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {kpiData.academic_performance.year_over_year_change >= 0 ? "+" : ""}{kpiData.academic_performance.year_over_year_change}% YoY
              </p>
            </div>

            {/* Attendance Card */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Attendance</p>
                  <p className="text-xs text-slate-500">Student attendance</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{kpiData.attendance.student_attendance_rate}%</p>
              <p className={`text-xs mt-1 ${kpiData.attendance.year_over_year_change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {kpiData.attendance.year_over_year_change >= 0 ? "+" : ""}{kpiData.attendance.year_over_year_change}% YoY
              </p>
            </div>

            {/* Retention Card */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 5.472m0 0a9 9 0 10-11.683 0" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Retention</p>
                  <p className="text-xs text-slate-500">Student retention</p>
                </div>
              </div>
              <p className="text-3xl font-bold text-slate-900">{kpiData.retention.student_retention_rate}%</p>
              <p className={`text-xs mt-1 ${kpiData.retention.year_over_year_change >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {kpiData.retention.year_over_year_change >= 0 ? "+" : ""}{kpiData.retention.year_over_year_change}% YoY
              </p>
            </div>
          </div>

          {/* Detailed KPI Breakdown */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Academic Performance Details</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Grade 10 Pass Rate</span>
                  <span className="text-sm font-semibold text-slate-900">{kpiData.academic_performance.grade_10_pass_rate}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Grade 12 Pass Rate</span>
                  <span className="text-sm font-semibold text-slate-900">{kpiData.academic_performance.grade_12_pass_rate}%</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold text-slate-900 mb-4">Community Satisfaction</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Parent Satisfaction</span>
                  <span className="text-sm font-semibold text-slate-900">{kpiData.community.parent_satisfaction}/5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Student Satisfaction</span>
                  <span className="text-sm font-semibold text-slate-900">{kpiData.community.student_satisfaction}/5</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Community Engagement</span>
                  <span className="text-sm font-semibold text-slate-900">{kpiData.community.community_engagement_score}/5</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Academic Performance Tab */}
      {activeTab === "academic" && academicData && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(academicData).map(([grade, data]) => (
              <div key={grade} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-1">{grade.replace('_', ' ')}</h3>
                <p className="text-xs text-slate-500 mb-4">{data.total_students} students</p>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-slate-500">Average Score</p>
                    <p className="text-2xl font-bold text-slate-900">{data.average_score}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Pass Rate</p>
                    <p className="text-2xl font-bold text-emerald-600">{data.pass_rate}%</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Subject Breakdown */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Subject Performance Breakdown</h3>
            <div className="space-y-4">
              {Object.entries(academicData).map(([grade, data]) => (
                <div key={grade}>
                  <h4 className="text-sm font-semibold text-slate-900 mb-2">{grade.replace('_', ' ')}</h4>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(data.subject_breakdown).map(([subject, score]) => (
                      <div key={subject} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                        <span className="text-sm text-slate-600">{subject}</span>
                        <span className="text-sm font-semibold text-slate-900">{score}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Financial Progress Tab */}
      {activeTab === "financial" && financialData && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Budget Summary</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Total Budget</p>
                <p className="text-2xl font-bold text-slate-900">ETB {financialData.budget_summary.total_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Allocated</p>
                <p className="text-2xl font-bold text-blue-600">ETB {financialData.budget_summary.allocated_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Spent</p>
                <p className="text-2xl font-bold text-rose-600">ETB {financialData.budget_summary.spent_amount.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Remaining</p>
                <p className="text-2xl font-bold text-emerald-600">ETB {financialData.budget_summary.remaining_amount.toLocaleString()}</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-xs text-slate-500 mb-1">Utilization Rate</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: financialData.budget_summary.utilization_rate }} />
                </div>
                <span className="text-sm font-semibold text-slate-900">{financialData.budget_summary.utilization_rate}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Recent Expenditures</h3>
            {financialData.recent_expenditures.length === 0 ? (
              <p className="text-sm text-slate-400">No recent expenditures recorded.</p>
            ) : (
              <div className="space-y-3">
                {financialData.recent_expenditures.map((exp) => (
                  <div key={exp.expenditure_id} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{exp.description}</p>
                      <p className="text-xs text-slate-500">{new Date(exp.expenditure_date).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm font-semibold text-rose-600">-ETB {exp.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
