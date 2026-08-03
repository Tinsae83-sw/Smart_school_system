"use client";

import { useEffect, useState } from "react";
import { useStudent } from "../StudentContext";

export default function StudentNotifications() {
  const { authFetch } = useStudent();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [filter, setFilter] = useState<"ALL" | "ASSIGNMENT" | "GRADE" | "ATTENDANCE" | "MESSAGE" | "SYSTEM" | "EVALUATION">("ALL");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
    try {
      const data = await authFetch("/api/student/notifications");
      setNotifications(data);
    } catch {
      setNotifications([]);
    }
  }

  async function handleMarkRead(notificationId: number) {
    try {
      await authFetch("/api/student/notifications/read", {
        method: "POST",
        body: JSON.stringify({ notificationId }),
      });
      loadNotifications();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleMarkAllRead() {
    const unread = notifications.filter((n) => !n.read);
    for (const n of unread) {
      await handleMarkRead(n.id);
    }
  }

  const types = ["ALL", "ASSIGNMENT", "GRADE", "ATTENDANCE", "MESSAGE", "SYSTEM", "EVALUATION"] as const;
  const filtered = filter === "ALL" ? notifications : notifications.filter((n) => n.type === filter);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500 mt-1">Stay on top of deadlines and announcements.</p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition"
          >
            Mark all read ({unreadCount})
          </button>
        )}
      </div>

      {/* FR-S33: Filter by type */}
      <div className="flex gap-2 flex-wrap">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
              filter === type
                ? "bg-sky-600 text-white"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Notification List */}
      <div className="space-y-3">
        {filtered.length > 0 ? (
          filtered.map((notification) => (
            <div key={notification.id} className={`bg-white rounded-2xl border p-5 shadow-sm transition ${
              notification.read ? "border-slate-200" : "border-sky-200 bg-sky-50/30"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    notification.type === "ASSIGNMENT" ? "bg-amber-50 text-amber-700" :
                    notification.type === "GRADE" ? "bg-emerald-50 text-emerald-700" :
                    notification.type === "ATTENDANCE" ? "bg-blue-50 text-blue-700" :
                    notification.type === "MESSAGE" ? "bg-purple-50 text-purple-700" :
                    notification.type === "EVALUATION" ? "bg-orange-50 text-orange-700" :
                    "bg-slate-50 text-slate-700"
                  }`}>
                    {notification.type === "ASSIGNMENT" ? "A" :
                     notification.type === "GRADE" ? "G" :
                     notification.type === "ATTENDANCE" ? "AT" :
                     notification.type === "MESSAGE" ? "M" :
                     notification.type === "EVALUATION" ? "E" : "S"}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 text-sm">{notification.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{notification.content}</p>
                    <p className="mt-2 text-xs text-slate-400">{new Date(notification.sent_at).toLocaleString()}</p>
                    {notification.type === "EVALUATION" && notification.metadata?.evaluation_url && (
                      <a
                        href={notification.metadata.evaluation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 transition"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Complete Evaluation
                      </a>
                    )}
                  </div>
                </div>
                {/* FR-S34: Mark as read */}
                {!notification.read && (
                  <button
                    onClick={() => handleMarkRead(notification.id)}
                    className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700 transition whitespace-nowrap"
                  >
                    Mark read
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500">No notifications match the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
