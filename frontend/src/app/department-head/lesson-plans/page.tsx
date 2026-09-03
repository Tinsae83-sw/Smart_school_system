"use client";

import React, { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/department-head";
const api = authFetchFor("DEPARTMENT_HEAD");

type LessonPlan = {
  plan_id: number;
  teacher_name: string;
  teacher_id: number;
  subject: string;
  class: string;
  title: string;
  objectives: string[];
  materials: string[];
  activities: string[];
  assessment?: string;
  status: string;
  submitted_date: string;
  reviewed_at?: string;
  reviewed_by?: string;
  review_comments?: string;
  week_number?: number;
  term: string;
};

export default function LessonPlansPage() {
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("SUBMITTED");
  const [selectedPlan, setSelectedPlan] = useState<LessonPlan | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [notice, setNotice] = useState<{ type: "error" | "success"; text: string } | null>(null);

  async function fetchLessonPlans() {
    setLoading(true);
    try {
      const token = localStorage.getItem("dept_head_token");
      const res = await api(`${API_BASE}/lesson-plans?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLessonPlans(data);
      }
    } catch (error) {
      console.error("Error fetching lesson plans:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLessonPlans();
  }, [filter]);

  async function handleReview(planId: number, status: string, comments: string) {
    setNotice(null);
    try {
      const token = localStorage.getItem("dept_head_token");
      const res = await api(`${API_BASE}/lesson-plans/${planId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ status, review_comments: comments })
      });

      let errText = "";
      try {
        const data = await res.json();
        if (data?.error) errText = data.error;
      } catch {
        /* no body */
      }

      if (!res.ok) {
        setNotice({ type: "error", text: errText || `Review failed (${res.status}).` });
        return;
      }

      setNotice({ type: "success", text: `Lesson plan ${status.toLowerCase()}.` });
      setShowReviewModal(false);
      setSelectedPlan(null);
      fetchLessonPlans();
    } catch (error) {
      console.error("Error reviewing lesson plan:", error);
      setNotice({ type: "error", text: "Could not reach the server to review this plan." });
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Lesson Plans</h1>
        <p className="mt-1 text-sm text-slate-500">Review and approve lesson plans from teachers</p>
      </div>

      {notice && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${
          notice.type === "success"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-rose-200 bg-rose-50 text-rose-700"
        }`}>
          {notice.text}
        </div>
      )}

      <div className="mb-6 flex gap-2">
        {["SUBMITTED", "APPROVED", "REJECTED"].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filter === status
                ? "bg-orange-600 text-white"
                : "bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        </div>
      ) : lessonPlans.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-200">
          <p className="text-slate-500">No lesson plans found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lessonPlans.map((plan) => (
            <div key={plan.plan_id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 hover:border-orange-300 transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-slate-900">{plan.title}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      plan.status === "SUBMITTED" ? "bg-amber-50 text-amber-700" :
                      plan.status === "APPROVED" ? "bg-emerald-50 text-emerald-700" :
                      "bg-rose-50 text-rose-700"
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                    <span>{plan.teacher_name}</span>
                    <span>•</span>
                    <span>{plan.class}</span>
                    <span>•</span>
                    <span>{plan.subject}</span>
                    <span>•</span>
                    <span>Week {plan.week_number}</span>
                    <span>•</span>
                    <span>{plan.term}</span>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs font-medium text-slate-700">Objectives:</p>
                    <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
                      {(plan.objectives || []).slice(0, 2).map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                      {(plan.objectives || []).length > 2 && <li className="text-slate-400">+{(plan.objectives || []).length - 2} more</li>}
                    </ul>
                  </div>
                  {plan.review_comments && (
                    <div className="mt-3 rounded-lg bg-slate-50 p-3">
                      <p className="text-xs font-medium text-slate-700">Review Comments:</p>
                      <p className="mt-1 text-sm text-slate-600">{plan.review_comments}</p>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => { setSelectedPlan(plan); setShowReviewModal(true); }}
                    className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
                    disabled={plan.status !== "SUBMITTED"}
                  >
                    Review
                  </button>
                  <p className="text-xs text-slate-400 text-center">
                    {new Date(plan.submitted_date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">Review Lesson Plan</h2>
            <div className="mt-4 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700">Title</p>
                <p className="text-slate-900">{selectedPlan.title}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Teacher</p>
                <p className="text-slate-900">{selectedPlan.teacher_name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Class & Subject</p>
                <p className="text-slate-900">{selectedPlan.class} - {selectedPlan.subject}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Objectives</p>
                <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
                  {(selectedPlan.objectives || []).map((obj, i) => <li key={i}>{obj}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Materials</p>
                <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
                  {(selectedPlan.materials || []).map((mat, i) => <li key={i}>{mat}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Activities</p>
                <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
                  {(selectedPlan.activities || []).map((act, i) => <li key={i}>{act}</li>)}
                </ul>
              </div>
              {selectedPlan.assessment && (
                <div>
                  <p className="text-sm font-medium text-slate-700">Assessment</p>
                  <p className="text-sm text-slate-600">{selectedPlan.assessment}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700">Review Comments</label>
                <textarea
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  rows={3}
                  placeholder="Enter your feedback..."
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => handleReview(selectedPlan.plan_id, "APPROVED", "")}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Approve
                </button>
                <button
                  onClick={() => {
                    const comments = (document.querySelector("textarea") as HTMLTextAreaElement)?.value || "";
                    handleReview(selectedPlan.plan_id, "REJECTED", comments);
                  }}
                  className="flex-1 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition"
                >
                  Reject
                </button>
                <button
                  onClick={() => { setShowReviewModal(false); setSelectedPlan(null); }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
