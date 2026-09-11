"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetchFor } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000") + "/api/ptsa";
const api = authFetchFor("PTSA_REPRESENTATIVE");

type Announcement = {
  announcement_id: number;
  title: string;
  message: string;
  created_by: string;
  created_by_role: string;
  created_at: string;
  target_audience: string;
  priority: string;
  is_active: boolean;
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadAnnouncements();
  }, []);

  async function loadAnnouncements() {
    setLoading(true);
    try {
      const res = await api(`${API_BASE}/announcements`);
      if (res.ok) setAnnouncements(await res.json());
    } catch (error) {
      console.error("Error loading announcements:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredAnnouncements = filter === "all" 
    ? announcements 
    : announcements.filter(a => a.priority === filter);

  const priorityCounts = {
    all: announcements.length,
    Urgent: announcements.filter(a => a.priority === "Urgent").length,
    Important: announcements.filter(a => a.priority === "Important").length,
    General: announcements.filter(a => a.priority === "General").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">School Announcements</h1>
        <p className="text-sm text-slate-500 mt-1">View announcements from school administration and PTSA</p>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {Object.keys(priorityCounts).map((priority) => (
          <button
            key={priority}
            onClick={() => setFilter(priority)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === priority
                ? "bg-teal-600 text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {priority} ({priorityCounts[priority as keyof typeof priorityCounts]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500">Loading announcements...</div>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement) => (
            <div key={announcement.announcement_id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      announcement.priority === "Urgent" ? "bg-rose-50 text-rose-700" :
                      announcement.priority === "Important" ? "bg-amber-50 text-amber-700" :
                      "bg-slate-50 text-slate-700"
                    }`}>
                      {announcement.priority}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                      {announcement.created_by_role}
                    </span>
                    {announcement.target_audience !== "ALL" && (
                      <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                        {announcement.target_audience}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{announcement.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    By {announcement.created_by} â€¢ {new Date(announcement.created_at).toLocaleDateString()}
                  </p>
                </div>
                {!announcement.is_active && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    Archived
                  </span>
                )}
              </div>
              <p className="text-slate-700">{announcement.message}</p>
            </div>
          ))}
          {filteredAnnouncements.length === 0 && (
            <div className="rounded-2xl bg-white p-12 shadow-sm border border-slate-200 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-slate-500 font-medium">No announcements found</p>
              <p className="text-sm text-slate-400 mt-1">Check back later for new announcements.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
