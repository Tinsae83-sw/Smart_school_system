"use client";

import { useEffect, useState } from "react";
import { useParent } from "../ParentContext";
import { MOCK_ASSIGNMENTS } from "../mockData";

export default function AssignmentsPage() {
  const { selectedChildId, selectedChild, authFetch } = useParent();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "open" | "submitted" | "graded">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!selectedChildId) return;
    loadAssignments();
  }, [selectedChildId]);

  async function loadAssignments() {
    try {
      const data = await authFetch(`/api/parent/children/${selectedChildId}/assignments`);
      setAssignments(data);
    } catch {
      setAssignments(MOCK_ASSIGNMENTS);
    }
  }

  // FR-P28: Check for missed deadlines
  const missedDeadlines = assignments.filter(
    (a) => a.status === "CLOSED" && !a.submission
  );

  const filteredAssignments = filter === "all"
    ? assignments
    : assignments.filter((a) => {
        if (filter === "open") return a.status === "OPEN";
        if (filter === "submitted") return a.status === "SUBMITTED";
        if (filter === "graded") return a.status === "GRADED";
        return true;
      });

  const openCount = assignments.filter((a) => a.status === "OPEN").length;
  const submittedCount = assignments.filter((a) => a.status === "SUBMITTED").length;
  const gradedCount = assignments.filter((a) => a.status === "GRADED").length;

  function getStatusStyle(status: string) {
    switch (status) {
      case "OPEN": return "bg-blue-100 text-blue-700 border-blue-200";
      case "SUBMITTED": return "bg-amber-100 text-amber-700 border-amber-200";
      case "GRADED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "CLOSED": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Assignment Monitoring</h1>
        <p className="text-sm text-slate-500 mt-1">
          {selectedChild?.full_name || "Student"} &middot; {selectedChild?.class_name || ""}
        </p>
      </div>

      {/* FR-P28: Missed Deadline Alerts */}
      {missedDeadlines.length > 0 && (
        <div className="rounded-2xl bg-red-50 border border-red-100 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-red-800">Missed Assignment Deadlines</p>
              <p className="text-sm text-red-700 mt-1">
                {missedDeadlines.length} assignment{missedDeadlines.length > 1 ? "s" : ""} past due without submission.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {missedDeadlines.map((a) => (
                  <span key={a.assignment_id} className="rounded-lg bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                    {a.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
          <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">Open</p>
          <p className="text-3xl font-bold text-blue-700 mt-1">{openCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
          <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Submitted</p>
          <p className="text-3xl font-bold text-amber-700 mt-1">{submittedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center">
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Graded</p>
          <p className="text-3xl font-bold text-emerald-700 mt-1">{gradedCount}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "All" },
          { key: "open", label: "Open" },
          { key: "submitted", label: "Submitted" },
          { key: "graded", label: "Graded" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              filter === tab.key
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* FR-P25: Assignment List */}
      {filteredAssignments.length > 0 ? (
        <div className="space-y-3">
          {filteredAssignments.map((assignment) => {
            const isExpanded = expandedId === assignment.assignment_id;
            return (
              <div key={assignment.assignment_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div
                  className="px-6 py-4 cursor-pointer hover:bg-slate-50 transition"
                  onClick={() => setExpandedId(isExpanded ? null : assignment.assignment_id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">{assignment.title}</h3>
                      {/* FR-P26: Due dates */}
                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <span className="text-sm text-slate-500">
                          Due: <span className="font-medium">{new Date(assignment.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </span>
                        {assignment.max_score && (
                          <span className="text-sm text-slate-500">
                            Max: <span className="font-medium">{assignment.max_score}pts</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-xl px-3 py-1.5 text-xs font-bold border ${getStatusStyle(assignment.status)}`}>
                        {assignment.status}
                      </span>
                      <svg className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-6 pb-5 border-t border-slate-100">
                    {assignment.description && (
                      <div className="mt-4">
                        <p className="text-sm font-medium text-slate-700 mb-1">Description</p>
                        <p className="text-sm text-slate-600">{assignment.description}</p>
                      </div>
                    )}

                    {/* FR-P27: Submitted files and teacher feedback */}
                    {assignment.submission && (
                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl bg-slate-50 p-4">
                          <p className="text-sm font-medium text-slate-700 mb-2">Submission</p>
                          <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <a href={assignment.submission.file_url} className="text-sm text-emerald-600 font-medium hover:underline">
                              {assignment.submission.file_url}
                            </a>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Submitted: {new Date(assignment.submission.submitted_at).toLocaleString()}
                            {assignment.submission.is_late && (
                              <span className="ml-2 text-red-600 font-semibold">(Late)</span>
                            )}
                          </p>
                        </div>

                        {assignment.submission.score != null && (
                          <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-emerald-800">Grade</p>
                                <p className="text-2xl font-bold text-emerald-700 mt-1">
                                  {assignment.submission.score}/{assignment.max_score}
                                </p>
                              </div>
                              {assignment.submission.grade && (
                                <span className="rounded-xl bg-emerald-200 px-3 py-1.5 text-lg font-bold text-emerald-800">
                                  {assignment.submission.grade}
                                </span>
                              )}
                            </div>
                          </div>
                        )}

                        {assignment.submission.feedback && (
                          <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                            <div className="flex items-start gap-2">
                              <svg className="w-5 h-5 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                              <div>
                                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Teacher Feedback</p>
                                <p className="mt-1 text-sm text-slate-700">{assignment.submission.feedback}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-slate-500">No assignments available for this filter.</p>
        </div>
      )}
    </div>
  );
}
