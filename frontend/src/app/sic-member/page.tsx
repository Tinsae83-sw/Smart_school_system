"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/sic";

type DashboardData = {
  sip: {
    plan_name: string;
    progress: number;
    status: string;
    goals_count: number;
  };
  upcoming_meetings: Array<{
    meeting_id: number;
    title: string;
    scheduled_date: string;
    scheduled_time: string;
    location: string;
    is_attending: boolean;
  }>;
  recent_actions: Array<{
    action_log_id: number;
    action_type: string;
    description: string;
    created_at: string;
  }>;
  kpi_summary: {
    student_pass_rate: number;
    teacher_attendance_rate: number;
    student_retention_rate: number;
    community_satisfaction: number;
  };
  improvement_budget: {
    allocated: number;
    spent: number;
    remaining: number;
  } | null;
  academic_year: string;
};

type RecommendationItem = {
  recommendation_id: number;
  title: string;
  priority: string;
  status: string;
  submitted_at: string;
};

function formatNumber(value: number | undefined) {
  if (value === undefined || value === null) return "0";
  return value.toLocaleString();
}

export default function SICMemberDashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [dashboardRes, recommendationsRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard`),
        fetch(`${API_BASE}/recommendations`),
      ]);

      if (!dashboardRes.ok) {
        throw new Error("Unable to fetch SIC dashboard data.");
      }

      const dashboardData = await dashboardRes.json();
      setDashboardData(dashboardData);

      if (recommendationsRes.ok) {
        const recommendationsData = await recommendationsRes.json();
        setRecommendations(recommendationsData);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage("Unable to load SIC dashboard. Check backend connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const statCards = [
    { label: "SIP Progress", value: dashboardData?.sip.progress ? `${dashboardData.sip.progress}%` : "0%", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>, color: "bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" },
    { label: "SIP Goals", value: dashboardData?.sip.goals_count ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" },
    { label: "Upcoming Meetings", value: dashboardData?.upcoming_meetings.length ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>, color: "bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400" },
    { label: "Student Pass Rate", value: dashboardData?.kpi_summary.student_pass_rate ? `${dashboardData.kpi_summary.student_pass_rate}%` : "0%", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg>, color: "bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400" },
    { label: "Teacher Attendance", value: dashboardData?.kpi_summary.teacher_attendance_rate ? `${dashboardData.kpi_summary.teacher_attendance_rate}%` : "0%", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 5.472m0 0a9 9 0 10-11.683 0" /></svg>, color: "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" },
    { label: "Budget Remaining", value: dashboardData?.improvement_budget ? `ETB ${formatNumber(dashboardData.improvement_budget.remaining)}` : "N/A", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, color: "bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">SIC Member Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Welcome back. Here is your school improvement overview.</p>
      </div>

      {statusMessage && (
        <div className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">{statusMessage}</div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-white dark:bg-slate-800 p-5 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                {card.icon}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{typeof card.value === 'number' ? formatNumber(card.value) : card.value}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">School Improvement Plan</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Current SIP status and progress</p>
              </div>
              <Link href="/sic-member/sip" className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
                View details
              </Link>
            </div>
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white text-sm">{dashboardData?.sip.plan_name || 'No Active SIP'}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{dashboardData?.academic_year || '2024-2025'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    dashboardData?.sip.status === 'Completed' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                    dashboardData?.sip.status === 'On Track' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                    dashboardData?.sip.status === 'Behind' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                    'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {dashboardData?.sip.status || 'Not Started'}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${dashboardData?.sip.progress || 0}%` }} />
                  </div>
                  <span className="text-xs text-slate-600 dark:text-slate-400">{dashboardData?.sip.progress || 0}%</span>
                </div>
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{dashboardData?.sip.goals_count || 0} goals defined</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recommendations</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{recommendations.length} pending review</p>
              </div>
              <Link href="/sic-member/recommendations" className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                Review
              </Link>
            </div>
            <div className="space-y-3">
              {recommendations.slice(0, 5).map((rec) => (
                <div key={rec.recommendation_id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-rose-300 dark:hover:border-rose-600 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-sm">{rec.title}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{rec.priority} priority</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${rec.status === "Pending" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"}`}>
                      {rec.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{new Date(rec.submitted_at).toLocaleDateString()}</p>
                </div>
              ))}
              {recommendations.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No pending recommendations.</p>}
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Upcoming Meetings</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{dashboardData?.upcoming_meetings.length || 0} scheduled</p>
              </div>
              <Link href="/sic-member/meetings" className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {dashboardData?.upcoming_meetings.slice(0, 3).map((meeting) => (
                <div key={meeting.meeting_id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-rose-300 dark:hover:border-rose-600 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white text-sm">{meeting.title}</p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{meeting.location || 'TBD'}</p>
                    </div>
                    {meeting.is_attending && (
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                        Attending
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">{new Date(meeting.scheduled_date).toLocaleDateString()} at {meeting.scheduled_time}</p>
                </div>
              ))}
              {(!dashboardData?.upcoming_meetings || dashboardData.upcoming_meetings.length === 0) && <p className="text-sm text-slate-400 dark:text-slate-500">No upcoming meetings scheduled.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              <Link href="/sic-member/sip" className="flex items-center gap-3 rounded-xl bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm font-medium text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                View SIP details
              </Link>
              <Link href="/sic-member/recommendations" className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018c0 1.602 1.123 2.995 2.707 3.228A48.394 48.394 0 007.5 18.5" /></svg>
                Submit recommendation
              </Link>
              <Link href="/sic-member/monitoring" className="flex items-center gap-3 rounded-xl bg-purple-50 dark:bg-purple-900/30 px-4 py-3 text-sm font-medium text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>
                View school performance
              </Link>
              <Link href="/sic-member/meetings" className="flex items-center gap-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 px-4 py-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>
                Meeting schedule
              </Link>
              <Link href="/sic-member/needs-assessment" className="flex items-center gap-3 rounded-xl bg-sky-50 dark:bg-sky-900/30 px-4 py-3 text-sm font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
                Needs assessment
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">System Status</h2>
            <div className="mt-4 flex items-center gap-3">
              <span className={`flex h-3 w-3 rounded-full ${loading ? "bg-amber-400" : dashboardData ? "bg-emerald-500" : "bg-rose-500"}`} />
              <span className="text-sm text-slate-600 dark:text-slate-400">{loading ? "Connecting..." : dashboardData ? "Backend online" : "Backend offline"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
