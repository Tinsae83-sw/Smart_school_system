"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/ptsa";

type DashboardMetrics = {
  total_students: number;
  upcoming_meetings: number;
  pending_feedback: number;
  active_discussions: number;
  school_progress_score: number;
  parent_participation: number;
};

type MeetingItem = {
  meeting_id: number;
  title: string;
  date: string;
  location: string;
  status: string;
};

type FeedbackItem = {
  feedback_id: number;
  subject: string;
  category: string;
  status: string;
  submitted_date: string;
};

function formatNumber(value: number | undefined) {
  if (value === undefined || value === null) return "0";
  return value.toLocaleString();
}

export default function PTSARepresentativeDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [dashboardRes, meetingsRes, feedbackRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard`),
        fetch(`${API_BASE}/meetings`),
        fetch(`${API_BASE}/feedback`),
      ]);

      if (!dashboardRes.ok || !meetingsRes.ok || !feedbackRes.ok) {
        throw new Error("Unable to fetch PTSA data.");
      }

      const [dashboardData, meetingsData, feedbackData] = await Promise.all([
        dashboardRes.json(),
        meetingsRes.json(),
        feedbackRes.json(),
      ]);

      setMetrics(dashboardData);
      setMeetings(meetingsData);
      setFeedback(feedbackData);
    } catch (error) {
      console.error(error);
      setStatusMessage("Unable to load PTSA dashboard. Check backend connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const statCards = [
    { label: "Total Students", value: metrics?.total_students ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" /></svg>, color: "bg-sky-50 text-sky-600" },
    { label: "Upcoming Meetings", value: metrics?.upcoming_meetings ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>, color: "bg-emerald-50 text-emerald-600" },
    { label: "Pending Feedback", value: metrics?.pending_feedback ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018c0 1.602 1.123 2.995 2.707 3.228A48.394 48.394 0 007.5 18.5" /></svg>, color: "bg-amber-50 text-amber-600" },
    { label: "Active Discussions", value: metrics?.active_discussions ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>, color: "bg-purple-50 text-purple-600" },
    { label: "School Progress", value: metrics?.school_progress_score ? `${metrics.school_progress_score}%` : "0%", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75z" /></svg>, color: "bg-indigo-50 text-indigo-600" },
    { label: "Parent Participation", value: metrics?.parent_participation ? `${metrics.parent_participation}%` : "0%", icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>, color: "bg-teal-50 text-teal-600" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">PTSA Representative Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back. Here is your PTSA overview.</p>
      </div>

      {statusMessage && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{statusMessage}</div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                {card.icon}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{typeof card.value === 'number' ? formatNumber(card.value) : card.value}</p>
                <p className="text-xs text-slate-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Upcoming Meetings</h2>
                <p className="text-sm text-slate-500">PTSA meetings schedule</p>
              </div>
              <Link href="/ptsa-representative/meetings" className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {meetings.slice(0, 5).map((meeting) => (
                <div key={meeting.meeting_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{meeting.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{meeting.location}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${meeting.status === "Upcoming" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                      {meeting.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{new Date(meeting.date).toLocaleDateString()}</p>
                </div>
              ))}
              {meetings.length === 0 && <p className="text-sm text-slate-400">No upcoming meetings.</p>}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Recent Feedback</h2>
                <p className="text-sm text-slate-500">{feedback.length} pending review</p>
              </div>
              <Link href="/ptsa-representative/feedback" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Review
              </Link>
            </div>
            <div className="space-y-3">
              {feedback.slice(0, 5).map((item) => (
                <div key={item.feedback_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{item.subject}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.category}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${item.status === "Pending" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{new Date(item.submitted_date).toLocaleDateString()}</p>
                </div>
              ))}
              {feedback.length === 0 && <p className="text-sm text-slate-400">No pending feedback.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              <Link href="/ptsa-representative/reports" className="flex items-center gap-3 rounded-xl bg-teal-50 px-4 py-3 text-sm font-medium text-teal-700 hover:bg-teal-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
                View school reports
              </Link>
              <Link href="/ptsa-representative/feedback" className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018c0 1.602 1.123 2.995 2.707 3.228A48.394 48.394 0 007.5 18.5" /></svg>
                Submit feedback
              </Link>
              <Link href="/ptsa-representative/meetings" className="flex items-center gap-3 rounded-xl bg-purple-50 px-4 py-3 text-sm font-medium text-purple-700 hover:bg-purple-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                View meeting minutes
              </Link>
              <Link href="/ptsa-representative/discussions" className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>
                Join discussions
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">System Status</h2>
            <div className="mt-4 flex items-center gap-3">
              <span className={`flex h-3 w-3 rounded-full ${loading ? "bg-amber-400" : metrics ? "bg-emerald-500" : "bg-rose-500"}`} />
              <span className="text-sm text-slate-600">{loading ? "Connecting..." : metrics ? "Backend online" : "Backend offline"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
