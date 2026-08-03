"use client";

import { useEffect, useState } from "react";
import { useParent } from "../ParentContext";
import { MOCK_CONDUCT, MOCK_PEER_EVALUATIONS } from "../mockData";

export default function ConductPage() {
  const { selectedChildId, selectedChild, authFetch } = useParent();
  const [conduct, setConduct] = useState<any[]>([]);
  const [peerEvaluations, setPeerEvaluations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"conduct" | "peer">("conduct");

  useEffect(() => {
    if (!selectedChildId) return;
    loadConduct();
    loadPeerEvaluations();
  }, [selectedChildId]);

  async function loadConduct() {
    try {
      const data = await authFetch(`/api/parent/children/${selectedChildId}/conduct`);
      setConduct(data);
    } catch {
      setConduct(MOCK_CONDUCT);
    }
  }

  async function loadPeerEvaluations() {
    try {
      const data = await authFetch(`/api/parent/children/${selectedChildId}/peer-evaluations`);
      setPeerEvaluations(data);
    } catch {
      setPeerEvaluations(MOCK_PEER_EVALUATIONS);
    }
  }

  function getConductColor(grade: string): string {
    if (grade.startsWith("A")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (grade.startsWith("B")) return "bg-blue-100 text-blue-700 border-blue-200";
    if (grade.startsWith("C")) return "bg-amber-100 text-amber-700 border-amber-200";
    return "bg-red-100 text-red-700 border-red-200";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Conduct & Peer Evaluations</h1>
        <p className="text-sm text-slate-500 mt-1">
          {selectedChild?.full_name || "Student"} &middot; {selectedChild?.class_name || ""}
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("conduct")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "conduct" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Conduct Grade
        </button>
        <button
          onClick={() => setActiveTab("peer")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "peer" ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
          }`}
        >
          Peer Evaluations
        </button>
      </div>

      {/* FR-P23: Conduct Grade */}
      {activeTab === "conduct" && (
        <div className="space-y-4">
          {conduct.length > 0 ? (
            conduct.map((record) => (
              <div key={`${record.student_id}-${record.class_id}`} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{record.student_name}</h3>
                    <p className="text-sm text-slate-500">Class ID: {record.class_id}</p>
                  </div>
                  <div className={`rounded-xl px-5 py-3 text-2xl font-bold border ${getConductColor(record.conduct)}`}>
                    {record.conduct}
                  </div>
                </div>
                {record.notes && (
                  <div className="rounded-xl bg-slate-50 p-4 mt-2">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Teacher Notes</p>
                    <p className="text-sm text-slate-700">{record.notes}</p>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-slate-500">No conduct records available.</p>
            </div>
          )}
        </div>
      )}

      {/* FR-P24: Peer Evaluation Results */}
      {activeTab === "peer" && (
        <div className="space-y-4">
          {peerEvaluations.length > 0 ? (
            peerEvaluations.map((evaluation) => (
              <div key={evaluation.evaluation_id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">{evaluation.title}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      {evaluation.due_date && (
                        <span className="text-sm text-slate-500">
                          Due: {new Date(evaluation.due_date).toLocaleDateString()}
                        </span>
                      )}
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
                        evaluation.status === "OPEN" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                      }`}>
                        {evaluation.status}
                      </span>
                    </div>
                  </div>
                  {evaluation.released ? (
                    <span className="rounded-xl bg-emerald-100 text-emerald-700 px-3 py-1.5 text-xs font-bold">Results Released</span>
                  ) : (
                    <span className="rounded-xl bg-amber-100 text-amber-700 px-3 py-1.5 text-xs font-bold">Pending Release</span>
                  )}
                </div>

                {evaluation.questions && evaluation.questions.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Evaluation Criteria</p>
                    <div className="flex flex-wrap gap-2">
                      {evaluation.questions.map((q: string, i: number) => (
                        <span key={i} className="rounded-lg bg-slate-100 px-3 py-1 text-xs text-slate-600">{q}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Show results only if released by teacher */}
                {evaluation.released && evaluation.results && evaluation.results.length > 0 ? (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Peer Feedback</p>
                    <div className="space-y-3">
                      {evaluation.results.map((result: any, i: number) => (
                        <div key={i} className="rounded-xl bg-slate-50 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                Review by <span className="text-emerald-600">{result.reviewer_name}</span>
                              </p>
                              {result.comments && (
                                <p className="text-sm text-slate-600 mt-1">&ldquo;{result.comments}&rdquo;</p>
                              )}
                            </div>
                            <div className="rounded-xl bg-emerald-100 px-3 py-2 text-center min-w-[60px]">
                              <p className="text-lg font-bold text-emerald-700">{result.score}</p>
                              <p className="text-xs text-emerald-600">/10</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Average Score */}
                    <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-emerald-800">Average Peer Score</p>
                        <p className="text-xl font-bold text-emerald-700">
                          {(evaluation.results.reduce((sum: number, r: any) => sum + r.score, 0) / evaluation.results.length).toFixed(1)}/10
                        </p>
                      </div>
                    </div>
                  </div>
                ) : !evaluation.released ? (
                  <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
                    <p className="text-sm text-amber-700">Peer evaluation results have not been released by the teacher yet.</p>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-slate-500">No peer evaluations available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
