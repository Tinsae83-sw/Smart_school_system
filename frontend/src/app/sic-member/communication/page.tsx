"use client";

import { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000") + "/api/sic";
const api = authFetchFor("SIC_MEMBER");

type Recommendation = {
  recommendation_id: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  submitted_by: number;
  submitted_to: number;
  status: string;
  submitted_at: string;
};

type Announcement = {
  announcement_id: number;
  title: string;
  content: string;
  announcement_type: string;
  target_audience: string;
  created_by: number;
  status: string;
  publish_date: string;
};

export default function CommunicationPage() {
  const [activeTab, setActiveTab] = useState<"recommendations" | "announcements">("recommendations");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRecForm, setShowRecForm] = useState(false);
  const [showAnnForm, setShowAnnForm] = useState(false);
  
  const [newRecommendation, setNewRecommendation] = useState({
    title: "",
    description: "",
    category: "ACADEMIC",
    priority: "MEDIUM"
  });

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    announcement_type: "GENERAL",
    target_audience: "ALL"
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [recRes, annRes] = await Promise.all([
        api(`${API_BASE}/recommendations`),
        api(`${API_BASE}/announcements`)
      ]);

      if (recRes.ok) {
        const data = await recRes.json();
        setRecommendations(data);
      }

      if (annRes.ok) {
        const data = await annRes.json();
        setAnnouncements(data);
      }
    } catch (error) {
      console.error("Error fetching communication data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function submitRecommendation(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api(`${API_BASE}/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRecommendation)
      });
      if (res.ok) {
        setShowRecForm(false);
        setNewRecommendation({
          title: "",
          description: "",
          category: "ACADEMIC",
          priority: "MEDIUM"
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error submitting recommendation:", error);
    }
  }

  async function postAnnouncement(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await api(`${API_BASE}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAnnouncement)
      });
      if (res.ok) {
        setShowAnnForm(false);
        setNewAnnouncement({
          title: "",
          content: "",
          announcement_type: "GENERAL",
          target_audience: "ALL"
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error posting announcement:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading communication data...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Communication</h1>
        <p className="mt-1 text-sm text-slate-500">Manage recommendations and announcements</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("recommendations")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "recommendations"
                ? "text-rose-600 border-b-2 border-rose-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Recommendations
          </button>
          <button
            onClick={() => setActiveTab("announcements")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "announcements"
                ? "text-rose-600 border-b-2 border-rose-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Announcements
          </button>
        </nav>
      </div>

      {/* Recommendations Tab */}
      {activeTab === "recommendations" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-lg font-bold text-slate-900">My Recommendations</h2>
              <button
                onClick={() => setShowRecForm(!showRecForm)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition"
              >
                Submit Recommendation
              </button>
            </div>

            {showRecForm && (
              <form onSubmit={submitRecommendation} className="mb-6 rounded-xl bg-rose-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Submit New Recommendation</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={newRecommendation.title}
                      onChange={(e) => setNewRecommendation(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                    <textarea
                      value={newRecommendation.description}
                      onChange={(e) => setNewRecommendation(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      rows={4}
                      placeholder="Provide detailed explanation of your recommendation..."
                      required
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                      <select
                        value={newRecommendation.category}
                        onChange={(e) => setNewRecommendation(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="ACADEMIC">Academic</option>
                        <option value="INFRASTRUCTURE">Infrastructure</option>
                        <option value="FINANCIAL">Financial</option>
                        <option value="STAFF">Staff</option>
                        <option value="POLICY">Policy</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Priority</label>
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
                      Submit
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRecForm(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            {recommendations.length === 0 ? (
              <p className="text-sm text-slate-400">No recommendations submitted yet.</p>
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec) => (
                  <div key={rec.recommendation_id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{rec.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{rec.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          rec.priority === 'HIGH' ? 'bg-rose-50 text-rose-700' :
                          rec.priority === 'MEDIUM' ? 'bg-amber-50 text-amber-700' :
                          'bg-slate-50 text-slate-700'
                        }`}>
                          {rec.priority}
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          rec.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' :
                          rec.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' :
                          'bg-blue-50 text-blue-700'
                        }`}>
                          {rec.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{rec.description}</p>
                    <p className="text-xs text-slate-400">Submitted: {new Date(rec.submitted_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === "announcements" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-lg font-bold text-slate-900">School Announcements</h2>
              <button
                onClick={() => setShowAnnForm(!showAnnForm)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition"
              >
                Post Announcement
              </button>
            </div>

            {showAnnForm && (
              <form onSubmit={postAnnouncement} className="mb-6 rounded-xl bg-rose-50 p-4">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Post New Announcement</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={newAnnouncement.title}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Content</label>
                    <textarea
                      value={newAnnouncement.content}
                      onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      rows={4}
                      placeholder="Enter the announcement content..."
                      required
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                      <select
                        value={newAnnouncement.announcement_type}
                        onChange={(e) => setNewAnnouncement(prev => ({ ...prev, announcement_type: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="GENERAL">General</option>
                        <option value="URGENT">Urgent</option>
                        <option value="EVENT">Event</option>
                        <option value="POLICY">Policy</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Target Audience</label>
                      <select
                        value={newAnnouncement.target_audience}
                        onChange={(e) => setNewAnnouncement(prev => ({ ...prev, target_audience: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="ALL">All</option>
                        <option value="STAFF">Staff</option>
                        <option value="STUDENTS">Students</option>
                        <option value="PARENTS">Parents</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
                      Post
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAnnForm(false)}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            {announcements.length === 0 ? (
              <p className="text-sm text-slate-400">No announcements available.</p>
            ) : (
              <div className="space-y-3">
                {announcements.map((ann) => (
                  <div key={ann.announcement_id} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{ann.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{ann.announcement_type}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        ann.announcement_type === 'URGENT' ? 'bg-rose-50 text-rose-700' :
                        'bg-slate-50 text-slate-700'
                      }`}>
                        {ann.target_audience}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 mb-2">{ann.content}</p>
                    <p className="text-xs text-slate-400">Published: {new Date(ann.publish_date).toLocaleString()}</p>
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
