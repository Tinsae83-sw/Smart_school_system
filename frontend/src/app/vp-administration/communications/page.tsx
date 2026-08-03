"use client";

import React, { useEffect, useState } from "react";
import { vpAdminApi } from "@/lib/api";

type Announcement = {
  announcement_id: number;
  title: string;
  content: string;
  announcement_type: string;
  target_audience: string;
  created_by: string;
  created_at: string;
  is_active: boolean;
};

type Message = {
  message_id: number;
  sender_name: string;
  receiver_name: string;
  content: string;
  timestamp: string;
  is_read: boolean;
};

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState<"announcements" | "messages">("announcements");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    announcement_type: "GENERAL",
    target_audience: "ALL",
  });

  const announcementTypes = ["GENERAL", "URGENT", "ADMINISTRATIVE", "MAINTENANCE"];
  const targetAudiences = ["ALL", "NON_ACADEMIC_STAFF", "TEACHERS", "STUDENTS", "PARENTS"];

  async function fetchData() {
    setLoading(true);
    try {
      const [annRes, msgRes] = await Promise.all([
        vpAdminApi.get('/announcements'),
        vpAdminApi.get('/messages'),
      ]);

      if (annRes.ok) setAnnouncements(await annRes.json());
      if (msgRes.ok) setMessages(await msgRes.json());
    } catch (error) {
      console.error("Failed to fetch communications data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await vpAdminApi.post('/announcements', formData);

      if (res.ok) {
        setShowModal(false);
        setFormData({ title: "", content: "", announcement_type: "GENERAL", target_audience: "ALL" });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create announcement:", error);
    }
  }

  async function toggleAnnouncement(announcementId: number, currentStatus: boolean) {
    try {
      const res = await vpAdminApi.post(`/announcements/${announcementId}/toggle`, { is_active: !currentStatus });
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to toggle announcement:", error);
    }
  }

  async function deleteAnnouncement(announcementId: number) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const res = await vpAdminApi.delete(`/announcements/${announcementId}`);
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete announcement:", error);
    }
  }

  function getTypeColor(type: string) {
    switch (type) {
      case "URGENT": return "bg-rose-50 text-rose-700";
      case "ADMINISTRATIVE": return "bg-purple-50 text-purple-700";
      case "MAINTENANCE": return "bg-amber-50 text-amber-700";
      default: return "bg-blue-50 text-blue-700";
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Communication & Announcements</h1>
          <p className="mt-1 text-sm text-slate-500">Manage administrative announcements and communications</p>
        </div>
        {activeTab === "announcements" && (
          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            Post Announcement
          </button>
        )}
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("announcements")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "announcements"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Announcements ({announcements.length})
          </button>
          <button
            onClick={() => setActiveTab("messages")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "messages"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Messages ({messages.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <>
          {activeTab === "announcements" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Title</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Type</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Target Audience</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Created By</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                      <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {announcements.map((announcement) => (
                      <tr key={announcement.announcement_id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{announcement.title}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getTypeColor(announcement.announcement_type)}`}>
                            {announcement.announcement_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{announcement.target_audience.replace(/_/g, " ")}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{announcement.created_by}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{new Date(announcement.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${announcement.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-700"}`}>
                            {announcement.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => toggleAnnouncement(announcement.announcement_id, announcement.is_active)}
                              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${announcement.is_active ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                            >
                              {announcement.is_active ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              onClick={() => deleteAnnouncement(announcement.announcement_id)}
                              className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {announcements.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-sm text-slate-400">
                          No announcements found. Click "Post Announcement" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "messages" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">From</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">To</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Message</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {messages.map((message) => (
                      <tr key={message.message_id} className="hover:bg-slate-50">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{message.sender_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{message.receiver_name}</td>
                        <td className="px-6 py-4 text-sm text-slate-700 max-w-xs truncate">{message.content}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{new Date(message.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${message.is_read ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                            {message.is_read ? "Read" : "Unread"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {messages.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400">
                          No messages found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Post New Announcement</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                  <select
                    name="announcement_type"
                    value={formData.announcement_type}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {announcementTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience *</label>
                  <select
                    name="target_audience"
                    value={formData.target_audience}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {targetAudiences.map(audience => (
                      <option key={audience} value={audience}>{audience.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content *</label>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleInputChange}
                  required
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                >
                  Post Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
