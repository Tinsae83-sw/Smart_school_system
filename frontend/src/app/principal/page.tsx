"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { principalTranslations } from "@/translations/principal";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/principal";

type DashboardMetrics = {
  total_enrollment: number;
  attendance_rate: number;
  staff_count: number;
  average_grades_by_level: Record<string, string>;
  financial_health: {
    total_budget: number;
    spent: number;
    remaining: number;
    utilization_rate: string;
  } | null;
  academic_year: string;
};

type KPIData = {
  national_exam_performance: {
    egsece_pass_rate: number;
    esslce_pass_rate: number;
    school_ranking: number;
    total_schools_in_district: number;
  };
  budget_utilization: {
    utilization_rate: string;
  } | null;
  teacher_student_ratio: number;
};

type ComplianceData = {
  overall_status: string;
  items: Record<string, { status: string; last_checked: Date }>;
};

type StaffMember = {
  user_id: number;
  full_name: string;
  role: string;
  employee_id: string;
  department?: string;
  status: string;
  email: string;
  phone_number?: string;
};

type RecentAlert = {
  type: string;
  message: string;
  priority: string;
  created_at: string;
};

type SchoolProfile = {
  school_name: string;
  principal_name: string;
  address: string;
  school_type: string;
  grades_offered: string;
  student_capacity: number;
  mission_statement: string;
  vision_statement: string;
};

type Department = {
  department_id: number;
  name: string;
  code: string;
  head_of_department?: { user: { full_name: string } };
  is_active: boolean;
};

function formatNumber(value: number | undefined) {
  if (value === undefined || value === null) return "0";
  return value.toLocaleString();
}

function formatCurrency(value: number | undefined) {
  if (value === undefined || value === null) return "ETB 0";
  return `ETB ${value.toLocaleString()}`;
}

export default function PrincipalDashboardPage() {
  const { language } = useLanguage();
  const t = principalTranslations[language];
  
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [alerts, setAlerts] = useState<RecentAlert[]>([]);
  const [schoolProfile, setSchoolProfile] = useState<SchoolProfile | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [dashboardRes, kpiRes, complianceRes, staffRes, alertsRes, settingsRes, deptRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard`),
        fetch(`${API_BASE}/kpi`),
        fetch(`${API_BASE}/compliance`),
        fetch(`${API_BASE}/staff/senior`),
        fetch(`${API_BASE}/alerts`),
        fetch(`${API_BASE}/settings`),
        fetch(`${API_BASE}/departments`),
      ]);

      const results = await Promise.allSettled([
        dashboardRes.json(),
        kpiRes.json(),
        complianceRes.json(),
        staffRes.json(),
        alertsRes.json(),
        settingsRes.json(),
        deptRes.json(),
      ]);

      if (results[0].status === 'fulfilled') setMetrics(results[0].value);
      if (results[1].status === 'fulfilled') setKpi(results[1].value);
      if (results[2].status === 'fulfilled') setCompliance(results[2].value);
      if (results[3].status === 'fulfilled') setStaff(results[3].value);
      if (results[4].status === 'fulfilled') setAlerts(results[4].value);
      if (results[5].status === 'fulfilled') setSchoolProfile(results[5].value);
      if (results[6].status === 'fulfilled') setDepartments(results[6].value);

    } catch (error) {
      console.error(error);
      setStatusMessage(t.unableToLoad);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'COMPLIANT': return 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
      case 'WARNING': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      case 'NON_COMPLIANT': return 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300';
      default: return 'bg-slate-50 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300';
      case 'MEDIUM': return 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
      default: return 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-navy-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">{t.loadingDashboard}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with School Profile */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.yekatitSchool}</h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400 text-sm">
              {schoolProfile?.principal_name ? `${t.principal}: ${schoolProfile.principal_name}` : t.welcomeBack}
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-900/30 px-2 py-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                {schoolProfile?.address ? schoolProfile.address.replace('Addis Ababa, ', '') : 'Ethiopia'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-900/30 px-2 py-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                {schoolProfile?.school_type || t.schoolType} ({schoolProfile?.grades_offered || t.gradesOffered})
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-orange-900/30 px-2 py-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                {metrics?.academic_year || '2024-2025'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/principal/settings" className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t.editProfile}
            </Link>
          </div>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">{statusMessage}</div>
      )}

      {/* KPI Cards */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
              </svg>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{t.totalEnrollment}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatNumber(metrics?.total_enrollment)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.studentsRegistered}</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{t.attendanceRate}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{metrics?.attendance_rate ? `${metrics.attendance_rate}%` : '0%'}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.averageDailyAttendance}</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{t.staffCount}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{formatNumber(metrics?.staff_count)}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.teacherStudentRatio}: {kpi?.teacher_student_ratio ? kpi.teacher_student_ratio.toFixed(1) : 'N/A'}</p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A8.6 8.6 0 0112 12.75a8.6 8.6 0 018.25-8.25v.75" />
              </svg>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">{t.budgetUtilization}</span>
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-white">{metrics?.financial_health?.utilization_rate ? `${metrics.financial_health.utilization_rate}%` : '0%'}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{formatCurrency(metrics?.financial_health?.spent)} of {formatCurrency(metrics?.financial_health?.total_budget)} {t.spent}</p>
        </div>
      </section>

      {/* National Exam Performance */}
      {kpi?.national_exam_performance && (
        <section className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.nationalExamPerformance}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.nationalExamSubtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 dark:bg-sky-900/30 px-3 py-1 text-sm font-medium text-sky-700 dark:text-sky-300">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                {t.rank} #{kpi.national_exam_performance.school_ranking} {t.of} {kpi.national_exam_performance.total_schools_in_district}
              </span>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.egsecePassRate}</span>
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{kpi.national_exam_performance.egsece_pass_rate}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${kpi.national_exam_performance.egsece_pass_rate}%` }} />
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.esslcePassRate}</span>
                <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{kpi.national_exam_performance.esslce_pass_rate}%</span>
              </div>
              <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full transition-all" style={{ width: `${kpi.national_exam_performance.esslce_pass_rate}%` }} />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Compliance Status */}
      {compliance && (
        <section className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.complianceStatus}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.complianceSubtitle}</p>
            </div>
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${getComplianceColor(compliance.overall_status)}`}>
              {compliance.overall_status}
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Object.entries(compliance.items).map(([key, item]) => (
              <div key={key} className="rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  <span className={`h-2 w-2 rounded-full ${item.status === 'COMPLIANT' ? 'bg-orange-500' : item.status === 'WARNING' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getComplianceColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          {/* Academic Performance by Grade Level */}
          {metrics?.average_grades_by_level && Object.keys(metrics.average_grades_by_level).length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.academicPerformance}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t.averageGrade}</p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(metrics.average_grades_by_level).map(([level, avg]) => (
                  <div key={level} className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4 text-center">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.grade} {level}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{avg}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.averageGrade}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Departments Overview */}
          {departments.length > 0 && (
            <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.departments}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t.activeDepartments}</p>
                </div>
                <Link href="/principal/departments" className="rounded-xl bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 transition">
                  {t.manage}
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {departments.slice(0, 6).map((dept) => (
                  <div key={dept.department_id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-navy-300 dark:hover:border-navy-600 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{dept.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{dept.code || 'N/A'}</p>
                      </div>
                      <span className={`h-2 w-2 rounded-full ${dept.is_active ? 'bg-orange-500' : 'bg-rose-500'}`} />
                    </div>
                    {dept.head_of_department && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        Head: {dept.head_of_department.user.full_name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Staff Overview */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.seniorStaff}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">VPs and Department Heads</p>
              </div>
              <Link href="/principal/staff-management" className="rounded-xl bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 transition">
                {t.viewAllStaff}
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Role</th>
                    <th className="pb-3 pr-4">Department</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {staff.slice(0, 6).map((member) => (
                    <tr key={member.user_id}>
                      <td className="py-3 pr-4 text-sm font-medium text-slate-900 dark:text-white">{member.full_name}</td>
                      <td className="py-3 pr-4 text-sm text-slate-500 dark:text-slate-400">{member.role.replace(/_/g, ' ')}</td>
                      <td className="py-3 pr-4 text-sm text-slate-500 dark:text-slate-400">{member.department || "N/A"}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${member.status === "ACTIVE" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${member.status === "ACTIVE" ? "bg-orange-500" : "bg-rose-500"}`} />
                          {member.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {staff.length === 0 && <p className="py-4 text-center text-sm text-slate-400 dark:text-slate-500">No senior staff members found.</p>}
            </div>
          </div>

          {/* Recent Alerts */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.recentAlerts}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pending actions requiring attention</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-900/30 px-3 py-1 text-sm font-medium text-rose-700 dark:text-rose-300">
                {alerts.length} Pending
              </span>
            </div>
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert, index) => (
                <div key={index} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-navy-300 dark:hover:border-navy-600 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white text-sm">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${getPriorityColor(alert.priority)}`}>
                          {alert.priority}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">{alert.type.replace(/_/g, ' ')}</span>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{new Date(alert.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
              {alerts.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No pending alerts.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Link href="/principal/staff-management" className="flex items-center gap-3 rounded-xl bg-navy-50 dark:bg-navy-900/30 px-4 py-3 text-sm font-medium text-navy-700 dark:text-navy-300 hover:bg-navy-100 dark:hover:bg-navy-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>
                Manage Senior Staff
              </Link>
              <Link href="/principal/settings" className="flex items-center gap-3 rounded-xl bg-orange-50 dark:bg-orange-900/30 px-4 py-3 text-sm font-medium text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                School Settings
              </Link>
              <Link href="/principal/financial" className="flex items-center gap-3 rounded-xl bg-purple-50 dark:bg-purple-900/30 px-4 py-3 text-sm font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A8.6 8.6 0 0112 12.75a8.6 8.6 0 018.25-8.25v.75" /></svg>
                Financial Oversight
              </Link>
              <Link href="/principal/governance" className="flex items-center gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.642A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
                Governance & PTSA
              </Link>
              <Link href="/principal/communications" className="flex items-center gap-3 rounded-xl bg-sky-50 dark:bg-sky-900/30 px-4 py-3 text-sm font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.848 8.25l1.536.887M7.848 8.25a3 3 0 11-5.196-3 3 3 0 015.196 3zm1.536.887a2.165 2.165 0 011.083 1.839c.005.351.01.704.015 1.055m-1.536-.887C2.212 9.55 2.212 9.55 2.212 9.55s0 0 0 0c0 .558.005 1.117.015 1.666m1.536-.887V8.25m0 0l.375-.375m-.375.375h-.375m1.536-.887h1.536m-1.536.887-.375.375m.375-.375h.375m-3.75 3.75h.008v.008h-.008v-.008zm0 0h.008v.008h-.008v-.008z" /></svg>
                Send Announcements
              </Link>
              <Link href="/principal/reports" className="flex items-center gap-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                Reports & Compliance
              </Link>
              <Link href="/principal/grievances" className="flex items-center gap-3 rounded-xl bg-slate-100 dark:bg-slate-700/50 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                Grievances & Discipline
              </Link>
            </div>
          </div>

          {/* Financial Health Summary */}
          {metrics?.financial_health && (
            <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Financial Health</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Budget Utilization</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{metrics.financial_health.utilization_rate || '0%'}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${metrics.financial_health.utilization_rate || '0%'}` }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{formatCurrency(metrics.financial_health.remaining)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Remaining</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatCurrency(metrics.financial_health.spent)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Spent</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* System Status */}
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">System Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Backend API</span>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${metrics ? "bg-orange-500" : "bg-rose-500"}`} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{metrics ? "Online" : "Offline"}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Database</span>
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${metrics ? "bg-orange-500" : "bg-rose-500"}`} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{metrics ? "Connected" : "Disconnected"}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600 dark:text-slate-400">Academic Year</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{metrics?.academic_year || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
