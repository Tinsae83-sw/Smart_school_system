"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/ptsa";
const api = authFetchFor("PTSA_REPRESENTATIVE");

type FeedbackItem = {
  feedback_id: number;
  recipient: string;
  recipient_role: string;
  subject: string;
  message: string;
  category: string;
  status: string;
  submitted_date: string;
  response?: string;
};

type Announcement = {
  announcement_id: number;
  title: string;
  message: string;
  created_by: string;
  created_at: string;
  target_audience: string;
};

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
  
  const [newFeedback, setNewFeedback] = useState({
    recipient: "principal",
    recipient_role: "Principal",
    subject: "",
    message: "",
    category: "General",
  });
  
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    message: "",
    target_audience: "ALL",
  });

  useEffect(() => {
    loadCommunicationData();
  }, []);

  async function loadCommunicationData() {
    setLoading(true);
    try {
      const [feedbackRes, announcementsRes] = await Promise.all([
        api(`${API_BASE}/feedback`),
        api(`${API_BASE}/announcements`),
      ]);

      if (feedbackRes.ok) setFeedback(await feedbackRes.json());
      if (announcementsRes.ok) setAnnouncements(await announcementsRes.json());
    } catch (error) {
      console.error("Error loading communication data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback() {
    if (!newFeedback.subject || !newFeedback.message) {
      alert("Please fill in subject and message.");
      return;
    }
    
    try {
      await api(`${API_BASE}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newFeedback),
      });
      setNewFeedback({ recipient: "principal", recipient_role: "Principal", subject: "", message: "", category: "General" });
      setShowFeedbackForm(false);
      loadCommunicationData();
      alert("Feedback submitted successfully!");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    }
  }

  async function postAnnouncement() {
    if (!newAnnouncement.title || !newAnnouncement.message) {
      alert("Please fill in title and message.");
      return;
    }
    
    try {
      await api(`${API_BASE}/announcements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAnnouncement),
      });
      setNewAnnouncement({ title: "", message: "", target_audience: "ALL" });
      setShowAnnouncementForm(false);
      loadCommunicationData();
      alert("Announcement posted successfully!");
    } catch (error) {
      console.error("Error posting announcement:", error);
      alert("Failed to post announcement. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Communication & Feedback</h1>
          <p className="text-sm text-slate-500 mt-1">Send feedback and manage PTSA communications</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFeedbackForm(true)}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
          >
            Submit Feedback
          </button>
          <button
            onClick={() => setShowAnnouncementForm(true)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Post Announcement
          </button>
        </div>
      </div>

      {showFeedbackForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Submit Feedback</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Recipient</label>
              <select
                value={newFeedback.recipient}
                onChange={(e) => setNewFeedback({...newFeedback, recipient: e.target.value, recipient_role: e.target.value === "principal" ? "Principal" : e.target.value === "vp_academic" ? "VP Academic" : "VP Admin"})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
              >
                <option value="principal">Principal</option>
                <option value="vp_academic">VP Academic</option>
                <option value="vp_admin">VP Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={newFeedback.category}
                onChange={(e) => setNewFeedback({...newFeedback, category: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
              >
                <option value="General">General</option>
                <option value="Academic">Academic</option>
                <option value="Financial">Financial</option>
                <option value="Facility">Facility</option>
                <option value="Policy">Policy</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
              <input
                type="text"
                value={newFeedback.subject}
                onChange={(e) => setNewFeedback({...newFeedback, subject: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                placeholder="Feedback subject"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
              <textarea
                value={newFeedback.message}
                onChange={(e) => setNewFeedback({...newFeedback, message: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-none"
                rows={4}
                placeholder="Your feedback message..."
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={submitFeedback}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
            >
              Submit Feedback
            </button>
            <button
              onClick={() => setShowFeedbackForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showAnnouncementForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Post PTSA Announcement</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, title: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                placeholder="Announcement title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
              <select
                value={newAnnouncement.target_audience}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, target_audience: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
              >
                <option value="ALL">All Parents</option>
                <option value="PTSA">PTSA Members Only</option>
                <option value="GRADE_9_10">Grade 9-10 Parents</option>
                <option value="GRADE_11_12">Grade 11-12 Parents</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
              <textarea
                value={newAnnouncement.message}
                onChange={(e) => setNewAnnouncement({...newAnnouncement, message: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-none"
                rows={4}
                placeholder="Announcement message..."
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={postAnnouncement}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
            >
              Post Announcement
            </button>
            <button
              onClick={() => setShowAnnouncementForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500">Loading communication data...</div>
        </div>
      ) : (
        <>
          {/* My Feedback */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">My Feedback</h2>
            <div className="space-y-3">
              {feedback.map((item) => (
                <div key={item.feedback_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{item.subject}</p>
                      <p className="text-xs text-slate-500 mt-1">To: {item.recipient_role} • {item.category}</p>
                      <p className="text-sm text-slate-600 mt-2">{item.message}</p>
                      {item.response && (
                        <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                          <p className="text-xs font-semibold text-emerald-700 mb-1">Response:</p>
                          <p className="text-sm text-emerald-800">{item.response}</p>
                        </div>
                      )}
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      item.status === "Pending" ? "bg-amber-50 text-amber-700" :
                      item.status === "Reviewed" ? "bg-blue-50 text-blue-700" :
                      "bg-emerald-50 text-emerald-700"
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{new Date(item.submitted_date).toLocaleDateString()}</p>
                </div>
              ))}
              {feedback.length === 0 && (
                <p className="text-sm text-slate-400">No feedback submitted yet.</p>
              )}
            </div>
          </div>

          {/* School Announcements */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">School Announcements</h2>
            <div className="space-y-3">
              {announcements.map((announcement) => (
                <div key={announcement.announcement_id} className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{announcement.title}</p>
                      <p className="text-xs text-slate-500 mt-1">By: {announcement.created_by} • {announcement.target_audience}</p>
                      <p className="text-sm text-slate-600 mt-2">{announcement.message}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{new Date(announcement.created_at).toLocaleDateString()}</p>
                </div>
              ))}
              {announcements.length === 0 && (
                <p className="text-sm text-slate-400">No announcements available.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
