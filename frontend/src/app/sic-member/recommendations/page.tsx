"use client";

import { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/sic";
const api = authFetchFor("SIC_MEMBER");

type RecommendationItem = {
  recommendation_id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  submitted_at: string;
};

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [newRecommendation, setNewRecommendation] = useState({
    title: "",
    description: "",
    category: "ACADEMIC",
    priority: "MEDIUM"
  });

  async function fetchRecommendations() {
    setLoading(true);
    try {
      const res = await api(`${API_BASE}/recommendations`);
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data);
      }
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      setStatusMessage("Unable to load recommendations. Check backend connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRecommendations();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api(`${API_BASE}/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecommendation)
      });

      if (res.ok) {
        setShowForm(false);
        setNewRecommendation({
          title: "",
          description: "",
          category: "ACADEMIC",
          priority: "MEDIUM"
        });
        setStatusMessage("Recommendation submitted successfully!");
        fetchRecommendations();
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setStatusMessage("Failed to submit recommendation.");
      }
    } catch (error) {
      console.error("Error submitting recommendation:", error);
      setStatusMessage("Error submitting recommendation.");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading recommendations...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recommendations</h1>
          <p className="mt-1 text-sm text-slate-500">Submit and track your recommendations for school improvement</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition"
        >
          {showForm ? "Cancel" : "New Recommendation"}
        </button>
      </div>

      {statusMessage && (
        <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
          statusMessage.includes("success") 
            ? "border-emerald-200 bg-emerald-50 text-emerald-800" 
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          {statusMessage}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Submit New Recommendation</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input
                type="text"
                value={newRecommendation.title}
                onChange={(e) => setNewRecommendation(prev => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={newRecommendation.description}
                onChange={(e) => setNewRecommendation(prev => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                rows={4}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={newRecommendation.category}
                  onChange={(e) => setNewRecommendation(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="ACADEMIC">Academic</option>
                  <option value="INFRASTRUCTURE">Infrastructure</option>
                  <option value="FINANCIAL">Financial</option>
                  <option value="POLICY">Policy</option>
                  <option value="COMMUNITY">Community</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
                <select
                  value={newRecommendation.priority}
                  onChange={(e) => setNewRecommendation(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
                Submit Recommendation
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {recommendations.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
            <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-slate-900 mb-2">No Recommendations Yet</h3>
            <p className="text-sm text-slate-500">Start by submitting your first recommendation for school improvement.</p>
          </div>
        ) : (
          recommendations.map((rec) => (
            <div key={rec.recommendation_id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900">{rec.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{rec.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    rec.priority === 'HIGH' ? 'bg-rose-50 text-rose-700' :
                    rec.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                    'bg-slate-50 text-slate-700'
                  }`}>
                    {rec.priority}
                  </span>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    rec.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                    rec.status === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                    rec.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                    'bg-slate-50 text-slate-700'
                  }`}>
                    {rec.status}
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-700 mb-3">{rec.description}</p>
              <p className="text-xs text-slate-400">Submitted: {new Date(rec.submitted_at).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
