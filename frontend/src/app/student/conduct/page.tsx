"use client";

import { useEffect, useState } from "react";
import { useStudent } from "../StudentContext";
import { GraduationCap, Star, Award, TrendingUp, Calendar } from "lucide-react";

export default function StudentConduct() {
  const { authFetch } = useStudent();
  const [conduct, setConduct] = useState<any>(null);
  const [conductHistory, setConductHistory] = useState<any[]>([]);
  const [peerEvaluations, setPeerEvaluations] = useState<any[]>([]);
  const [selectedEvalId, setSelectedEvalId] = useState<number | null>(null);
  const [peerResults, setPeerResults] = useState<any>(null);
  const [reviewScore, setReviewScore] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [selectedRevieweeId, setSelectedRevieweeId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConduct();
    loadConductHistory();
    loadPeerEvaluations();
  }, []);

  async function loadConduct() {
    try {
      const data = await authFetch("/api/student/conduct");
      setConduct(data.length ? data[0] : null);
    } catch {
      setConduct(null);
    }
    setLoading(false);
  }

  async function loadConductHistory() {
    try {
      const data = await authFetch("/api/student/conduct/history");
      setConductHistory(data || []);
    } catch {
      setConductHistory([]);
    }
  }

  async function loadPeerEvaluations() {
    try {
      const data = await authFetch("/api/student/peer-evaluations");
      setPeerEvaluations(data);
      if (data.length && !selectedEvalId) {
        setSelectedEvalId(data[0].evaluation_id);
      }
    } catch {
      setPeerEvaluations([]);
    }
  }

  async function loadPeerResults(evaluationId: number) {
    try {
      const data = await authFetch(`/api/student/peer-evaluations/${evaluationId}/results`);
      setPeerResults(data);
    } catch {
      setPeerResults(null);
    }
  }

  const selectedEval = peerEvaluations.find((e) => e.evaluation_id === selectedEvalId);

  async function handleSubmitReview() {
    if (!selectedEvalId || !selectedRevieweeId) return;
    try {
      await authFetch(`/api/student/peer-evaluations/${selectedEvalId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          reviewee_id: selectedRevieweeId,
          score: reviewScore,
          comments: reviewComment,
        }),
      });
      setFeedback("Review submitted successfully!");
      setReviewScore(0);
      setReviewComment("");
      setSelectedRevieweeId(null);
      loadPeerEvaluations();
    } catch (error) {
      setFeedback((error as Error).message);
    }
  }

  function getGradeColor(grade: string) {
    switch (grade) {
      case "A": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "B": return "bg-blue-100 text-blue-700 border-blue-200";
      case "C": return "bg-amber-100 text-amber-700 border-amber-200";
      case "D": return "bg-orange-100 text-orange-700 border-orange-200";
      case "F": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading conduct data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <GraduationCap className="w-8 h-8 text-emerald-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Conduct & Peer Evaluation</h1>
          <p className="text-sm text-slate-500 mt-1">View your conduct grade and participate in peer evaluations.</p>
        </div>
      </div>

      {feedback && (
        <div className={`rounded-2xl p-4 text-sm ${feedback.includes("success") ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
          {feedback}
        </div>
      )}

      {/* Current Conduct Grade */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <Award className="w-6 h-6 text-emerald-600" />
          <h2 className="text-lg font-semibold text-slate-900">Current Conduct Grade</h2>
        </div>
        {conduct ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-5 border border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Grade</p>
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-2xl font-bold ${getGradeColor(conduct.conduct || "B")}`}>
                  {conduct.conduct || "N/A"}
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-5 border border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Rating</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-6 h-6 ${
                        (conduct.rating || 4) >= star ? 'text-amber-400 fill-current' : 'text-slate-300'
                      }`}
                    />
                  ))}
                  <span className="ml-2 text-lg font-semibold text-slate-700">{conduct.rating || 4}/5</span>
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-5 border border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Term</p>
                <p className="text-lg font-semibold text-slate-900">Term {conduct.term || "N/A"}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-5 border border-slate-100">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Academic Year</p>
                <p className="text-lg font-semibold text-slate-900">{conduct.academic_year || "N/A"}</p>
              </div>
            </div>
            {conduct.notes && (
              <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">Teacher Remarks</p>
                <p className="text-sm text-slate-700">{conduct.notes}</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <Award className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <p className="text-sm text-slate-500">No conduct grade has been assigned yet.</p>
          </div>
        )}
      </div>

      {/* Conduct History */}
      {conductHistory.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-900">Conduct History</h2>
          </div>
          <div className="space-y-3">
            {conductHistory.map((history: any, index: number) => (
              <div key={index} className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-100 p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold ${getGradeColor(history.grade || "B")}`}>
                    {history.grade || "N/A"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Term {history.term} - {history.academic_year}</p>
                    <p className="text-xs text-slate-500">Graded: {new Date(history.graded_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${
                        (history.rating || 4) >= star ? 'text-amber-400 fill-current' : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FR-S26, S27: Peer Evaluations */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Peer Evaluations</h2>
        
        {peerEvaluations.length > 0 ? (
          <div className="space-y-4">
            {/* Evaluation Selector */}
            <div className="space-y-2">
              {peerEvaluations.map((evaluation) => (
                <button
                  key={evaluation.evaluation_id}
                  onClick={() => { setSelectedEvalId(evaluation.evaluation_id); setPeerResults(null); }}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition ${
                    evaluation.evaluation_id === selectedEvalId
                      ? "border-sky-600 bg-sky-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="font-semibold text-slate-900 text-sm">{evaluation.title}</p>
                  <p className="text-xs text-slate-500 mt-1">Due {evaluation.due_date} &middot; {evaluation.status}</p>
                </button>
              ))}
            </div>

            {selectedEval && (
              <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-4">
                {/* FR-S26: Questions */}
                {selectedEval.questions && selectedEval.questions.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Evaluation Criteria</p>
                    <ul className="list-disc list-inside text-sm text-slate-700 space-y-1">
                      {selectedEval.questions.map((q: string, i: number) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* FR-S27: Submit Review */}
                {selectedEval.status === "OPEN" && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <p className="text-sm font-medium text-slate-700">Evaluate a peer</p>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Select peer</label>
                      <select
                        value={selectedRevieweeId || ""}
                        onChange={(e) => setSelectedRevieweeId(Number(e.target.value))}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900"
                      >
                        <option value="">Choose a classmate...</option>
                        {classmates.map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Score (0-10)</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        value={reviewScore}
                        onChange={(e) => setReviewScore(Number(e.target.value))}
                        className="w-24 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Comments</label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900"
                        placeholder="Share your evaluation..."
                      />
                    </div>

                    <button
                      onClick={handleSubmitReview}
                      disabled={!selectedRevieweeId}
                      className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
                    >
                      Submit review
                    </button>
                  </div>
                )}

                {/* FR-S28: View Released Results */}
                {selectedEval.released && (
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-slate-700">Results (released)</p>
                      <button
                        onClick={() => loadPeerResults(selectedEval.evaluation_id)}
                        className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                      >
                        View my results
                      </button>
                    </div>
                    {peerResults?.my_results?.length > 0 ? (
                      <div className="space-y-2">
                        {peerResults.my_results.map((result: any, i: number) => (
                          <div key={i} className="rounded-xl bg-white border border-slate-200 p-3">
                            <p className="text-sm font-semibold text-slate-900">From {result.reviewer_name}</p>
                            <p className="text-xs text-slate-500">Score: {result.score}/10</p>
                            {result.comments && <p className="text-sm text-slate-600 mt-1">{result.comments}</p>}
                          </div>
                        ))}
                      </div>
                    ) : peerResults ? (
                      <p className="text-sm text-slate-500">No results available for you yet.</p>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No peer evaluations are assigned right now.</p>
        )}
      </div>
    </div>
  );
}
