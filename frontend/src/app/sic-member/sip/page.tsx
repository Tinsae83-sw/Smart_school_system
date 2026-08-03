"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/sic";

type SIPItem = {
  sip_id: number;
  plan_name: string;
  academic_year: string;
  status: string;
  goals: any;
  action_items: any;
  created_at: string;
  updated_at: string;
};

type ProgressItem = {
  progress_id: number;
  sip_id: number;
  goal_description: string;
  progress_percentage: number;
  status: string;
  target_date: string;
};

type FeedbackItem = {
  feedback_id: number;
  sip_id: number;
  submitted_by: number;
  feedback: string;
  submitted_at: string;
};

export default function SIPManagementPage() {
  const [sip, setSip] = useState<SIPItem | null>(null);
  const [progressItems, setProgressItems] = useState<ProgressItem[]>([]);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showAmendmentForm, setShowAmendmentForm] = useState(false);
  
  const [newFeedback, setNewFeedback] = useState({
    sip_id: 0,
    feedback: ""
  });

  const [newAmendment, setNewAmendment] = useState({
    sip_id: 0,
    amendment_title: "",
    amendment_description: "",
    priority: "MEDIUM"
  });

  async function fetchSIP() {
    setLoading(true);
    try {
      const [sipRes, progressRes, feedbackRes] = await Promise.all([
        fetch(`${API_BASE}/sip/current`),
        fetch(`${API_BASE}/sip/progress`),
        fetch(`${API_BASE}/sip/feedback`)
      ]);

      if (sipRes.ok) {
        const sipData = await sipRes.json();
        setSip(sipData);
        if (sipData.sip_id) {
          setNewFeedback(prev => ({ ...prev, sip_id: sipData.sip_id }));
          setNewAmendment(prev => ({ ...prev, sip_id: sipData.sip_id }));
        }
      }

      if (progressRes.ok) {
        const progressData = await progressRes.json();
        setProgressItems(progressData.progress_items || []);
      }

      if (feedbackRes.ok) {
        const feedbackData = await feedbackRes.json();
        setFeedback(feedbackData);
      }
    } catch (error) {
      console.error("Error fetching SIP data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSIP();
  }, []);

  async function submitFeedback(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/sip/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFeedback)
      });
      if (res.ok) {
        setShowFeedbackForm(false);
        setNewFeedback(prev => ({ ...prev, feedback: "" }));
        fetchSIP();
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  }

  async function proposeAmendment(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/sip/amendments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAmendment)
      });
      if (res.ok) {
        setShowAmendmentForm(false);
        setNewAmendment({
          sip_id: sip?.sip_id || 0,
          amendment_title: "",
          amendment_description: "",
          priority: "MEDIUM"
        });
        alert("Amendment proposed successfully!");
      }
    } catch (error) {
      console.error("Error proposing amendment:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading SIP data...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">School Improvement Plan Management</h1>
        <p className="mt-1 text-sm text-slate-500">Monitor and manage the school improvement plan</p>
      </div>

      {!sip ? (
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
          <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Active SIP</h3>
          <p className="text-sm text-slate-500">There is currently no active School Improvement Plan for this academic year.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SIP Overview */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{sip.plan_name}</h2>
                <p className="text-sm text-slate-500 mt-1">Academic Year: {sip.academic_year}</p>
                <p className="text-xs text-slate-400 mt-1">Last updated: {new Date(sip.updated_at).toLocaleDateString()}</p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${
                sip.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                sip.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' :
                'bg-amber-50 text-amber-700'
              }`}>
                {sip.status}
              </span>
            </div>

            {/* Goals Summary */}
            {sip.goals && Array.isArray(sip.goals) && sip.goals.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Goals</h3>
                <div className="space-y-2">
                  {sip.goals.map((goal: any, index: number) => {
                    const goalText = typeof goal === 'object' 
                      ? (goal.description || goal.goal || goal.target || JSON.stringify(goal))
                      : goal;
                    return (
                      <div key={index} className="rounded-lg bg-slate-50 p-3">
                        <p className="text-sm text-slate-700">{goalText}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Progress Tracking */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-lg font-bold text-slate-900">Progress Tracking</h2>
              <button
                onClick={() => setShowAmendmentForm(!showAmendmentForm)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition"
              >
                Propose Amendment
              </button>
            </div>

            {showAmendmentForm && (
              <form onSubmit={proposeAmendment} className="mb-6 rounded-xl bg-rose-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Propose SIP Amendment</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={newAmendment.amendment_title}
                      onChange={(e) => setNewAmendment(prev => ({ ...prev, amendment_title: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      value={newAmendment.amendment_description}
                      onChange={(e) => setNewAmendment(prev => ({ ...prev, amendment_description: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      rows={3}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
                    <select
                      value={newAmendment.priority}
                      onChange={(e) => setNewAmendment(prev => ({ ...prev, priority: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
                      Submit Proposal
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAmendmentForm(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            {progressItems.length === 0 ? (
              <p className="text-sm text-slate-400">No progress items available.</p>
            ) : (
              <div className="space-y-3">
                {progressItems.map((item) => (
                  <div key={item.progress_id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="font-medium text-slate-900 text-sm">{item.goal_description}</p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        item.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' :
                        item.status === 'ON_TRACK' ? 'bg-blue-50 text-blue-700' :
                        item.status === 'DELAYED' ? 'bg-rose-50 text-rose-700' :
                        'bg-slate-50 text-slate-700'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${item.progress_percentage}%` }} />
                      </div>
                      <span className="text-xs text-slate-600">{item.progress_percentage}%</span>
                    </div>
                    <p className="text-xs text-slate-400">Target: {new Date(item.target_date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Feedback Section */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-lg font-bold text-slate-900">SIC Feedback</h2>
              <button
                onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Submit Feedback
              </button>
            </div>

            {showFeedbackForm && (
              <form onSubmit={submitFeedback} className="mb-6 rounded-xl bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Submit SIP Feedback</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Your Feedback</label>
                    <textarea
                      value={newFeedback.feedback}
                      onChange={(e) => setNewFeedback(prev => ({ ...prev, feedback: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      rows={4}
                      placeholder="Share your observations, concerns, or suggestions about the SIP implementation..."
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFeedbackForm(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            {feedback.length === 0 ? (
              <p className="text-sm text-slate-400">No feedback submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {feedback.map((item) => (
                  <div key={item.feedback_id} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-sm text-slate-700">{item.feedback}</p>
                    <p className="mt-2 text-xs text-slate-400">Submitted: {new Date(item.submitted_at).toLocaleString()}</p>
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
