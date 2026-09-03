"use client";

import React, { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/department-head";
const api = authFetchFor("DEPARTMENT_HEAD");

type GradeDistribution = {
  distribution: { A: number; B: number; C: number; D: number; F: number };
  percentages: { A: number; B: number; C: number; D: number; F: number };
  total: number;
};

type SubjectPerformance = {
  subject: string;
  avg: number;
  trend: string;
};

type AttendanceTrend = {
  month: string;
  rate: number;
};

export default function AnalyticsPage() {
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution | null>(null);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [attendanceTrends, setAttendanceTrends] = useState<AttendanceTrend[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchAnalytics() {
    setLoading(true);
    try {
      const token = localStorage.getItem("dept_head_token");
      const [gradeRes, subjectRes, attendanceRes] = await Promise.all([
        api(`${API_BASE}/academics/grade-distribution`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        api(`${API_BASE}/academics/subject-performance`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        api(`${API_BASE}/academics/attendance-trends`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      if (gradeRes.ok) {
        const data = await gradeRes.json();
        setGradeDistribution(data);
      }
      
      if (subjectRes.ok) {
        const data = await subjectRes.json();
        setSubjectPerformance(data);
      }
      
      if (attendanceRes.ok) {
        const data = await attendanceRes.json();
        setAttendanceTrends(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const gradeColors = {
    A: "bg-emerald-500",
    B: "bg-blue-500",
    C: "bg-amber-500",
    D: "bg-orange-500",
    F: "bg-rose-500"
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Department Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">View detailed performance metrics and trends</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Grade Distribution */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Grade Distribution</h2>
            <p className="mt-1 text-sm text-slate-500">Overview of student performance across all grades</p>
            
            {gradeDistribution && (
              <div className="mt-6">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm text-slate-600">Total Grades: {gradeDistribution.total}</span>
                </div>
                
                <div className="space-y-4">
                  {(["A", "B", "C", "D", "F"] as const).map((grade) => (
                    <div key={grade}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="font-medium text-slate-700">Grade {grade}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-600">{gradeDistribution.distribution[grade]} students</span>
                          <span className="font-semibold text-slate-900">{gradeDistribution.percentages[grade]}%</span>
                        </div>
                      </div>
                      <div className="h-3 w-full rounded-full bg-slate-100">
                        <div
                          className={`h-3 rounded-full ${gradeColors[grade]} transition-all`}
                          style={{ width: `${gradeDistribution.percentages[grade]}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Performance Metrics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {gradeDistribution?.percentages.A || 0}%
                  </p>
                  <p className="text-xs text-slate-500">A Grades</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                  <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {gradeDistribution?.percentages.B || 0}%
                  </p>
                  <p className="text-xs text-slate-500">B Grades</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50">
                  <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {gradeDistribution?.percentages.C || 0}%
                  </p>
                  <p className="text-xs text-slate-500">C Grades</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-50">
                  <svg className="w-6 h-6 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {gradeDistribution?.percentages.F || 0}%
                  </p>
                  <p className="text-xs text-slate-500">F Grades</p>
                </div>
              </div>
            </div>
          </div>

          {/* Subject-wise Performance */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Subject-wise Performance</h2>
            <p className="mt-1 text-sm text-slate-500">Average scores by subject</p>
            
            <div className="mt-6 space-y-4">
              {subjectPerformance.length === 0 ? (
                <p className="text-sm text-slate-400">No subject performance data available.</p>
              ) : (
                subjectPerformance.map((item) => (
                  <div key={item.subject}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{item.subject}</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-medium ${item.trend.startsWith("+") ? "text-emerald-600" : "text-rose-600"}`}>
                          {item.trend}
                        </span>
                        <span className="font-semibold text-slate-900">{item.avg}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-orange-600 transition-all"
                        style={{ width: `${item.avg}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Attendance Trends */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Attendance Trends</h2>
            <p className="mt-1 text-sm text-slate-500">Monthly attendance rates</p>
            
            <div className="mt-6 grid grid-cols-6 gap-2">
              {attendanceTrends.length === 0 ? (
                <p className="col-span-6 text-sm text-slate-400 text-center">No attendance data available.</p>
              ) : (
                attendanceTrends.map((item) => (
                  <div key={item.month} className="text-center">
                    <div className="h-24 rounded-lg bg-slate-100 relative">
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-lg bg-emerald-500 transition-all"
                        style={{ height: `${item.rate}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-700">{item.month}</p>
                    <p className="text-xs text-slate-500">{item.rate}%</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
