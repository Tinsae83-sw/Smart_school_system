"use client";

import { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000") + "/api/principal";

const api = authFetchFor("PRINCIPAL");

type Announcement = {
  announcement_id: number;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  target_audience: string;
  status: string;
};

type CreateAnnouncementRequest = {
  title: string;
  content: string;
  target_audience: string;
};

export default function CommunicationsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [formData, setFormData] = useState<CreateAnnouncementRequest>({
    title: "",
    content: "",
    target_audience: "ALL",
  });

  async function fetchAnnouncements() {
    setLoading(true);
    try {
      const res = await api(`${API_BASE}/communications/announcements`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: "Failed to load announcements." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    api(`${API_BASE}/communications/announcements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(formData),
    })
      .then((res) => {
        if (res.ok) {
          setStatusMessage({ type: "success", message: "Announcement created successfully." });
          setShowModal(false);
          setFormData({ title: "", content: "", target_audience: "ALL" });
          fetchAnnouncements();
        } else {
          setStatusMessage({ type: "error", message: "Failed to create announcement." });
        }
      })
      .catch(() => setStatusMessage({ type: "error", message: "Failed to create announcement." }));
  }

  function handleDelete(announcementId: number) {
    if (!confirm("Are you sure you want to delete this announcement?")) return;

    api(`${API_BASE}/communications/announcements/${announcementId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    })
      .then((res) => {
        if (res.ok) {
          setStatusMessage({ type: "success", message: "Announcement deleted successfully." });
          fetchAnnouncements();
        } else {
          setStatusMessage({ type: "error", message: "Failed to delete announcement." });
        }
      })
      .catch(() => setStatusMessage({ type: "error", message: "Failed to delete announcement." }));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Communications</h1>
        <p className="mt-1 text-sm text-slate-500">Send announcements and manage school communications</p>
      </div>

      {statusMessage && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${
          statusMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
        }`}>
          {statusMessage.message}
        </div>
      )}

      {/* Actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Search announcements..."
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select className="rounded-lg border border-slate-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Audiences</option>
            <option value="ALL">All</option>
            <option value="STUDENTS">Students</option>
            <option value="TEACHERS">Teachers</option>
            <option value="PARENTS">Parents</option>
            <option value="STAFF">Staff</option>
          </select>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
        >
          Create Announcement
        </button>
      </div>

      {/* Announcements List */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">No announcements found.</div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-slate-50">
              <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-6 py-3">Title</th>
                <th className="px-6 py-3">Message</th>
                <th className="px-6 py-3">Target Audience</th>
                <th className="px-6 py-3">Created By</th>
                <th className="px-6 py-3">Created At</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {announcements.map((announcement) => (
                <tr key={announcement.announcement_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{announcement.title}</td>
                  <td className="px-6 py-4 text-sm text-slate-500 max-w-md truncate">{announcement.content}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{announcement.target_audience}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{announcement.created_by}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{new Date(announcement.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      announcement.status === "PUBLISHED" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                    }`}>
                      {announcement.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => handleDelete(announcement.announcement_id)}
                      className="text-sm text-rose-600 hover:text-rose-700"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Create Announcement</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                âœ•
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
                <select
                  required
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ALL">All</option>
                  <option value="STUDENTS">Students</option>
                  <option value="TEACHERS">Teachers</option>
                  <option value="PARENTS">Parents</option>
                  <option value="STAFF">Staff</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Publish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
