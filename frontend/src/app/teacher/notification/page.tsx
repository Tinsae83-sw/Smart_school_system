"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function NotificationPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadNotifications(savedToken);
  }, [router]);

  async function loadNotifications(token: string) {
    try {
      const data = await authFetch("/api/teacher/notifications", {}, token);
      setNotifications(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleMarkAsRead(notificationId: number) {
    try {
      await authFetch(`/api/teacher/notifications/${notificationId}/read`, {
        method: "PUT"
      }, token);
      loadNotifications(token);
    } catch (e) { console.error(e); }
  }

  async function handleMarkAllAsRead() {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_sent);
      await Promise.all(
        unreadNotifications.map(n => 
          authFetch(`/api/teacher/notifications/${n.notification_id}/read`, {
            method: "PUT"
          }, token)
        )
      );
      loadNotifications(token);
    } catch (e) { console.error(e); }
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case "ASSIGNMENT": return "📝";
      case "EXAM": return "📋";
      case "ATTENDANCE": return "📅";
      case "GRADE": return "📊";
      case "MESSAGE": return "💬";
      case "SYSTEM": return "⚙️";
      default: return "🔔";
    }
  }

  function getNotificationColor(type: string) {
    switch (type) {
      case "ASSIGNMENT": return "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700";
      case "EXAM": return "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700";
      case "ATTENDANCE": return "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700";
      case "GRADE": return "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700";
      case "MESSAGE": return "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-700";
      case "SYSTEM": return "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
      default: return "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
    }
  }

  const filteredNotifications = filter === "unread" 
    ? notifications.filter(n => !n.is_sent)
    : notifications;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Notifications</h1>

        {/* Filter Tabs */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-2 mb-6 inline-flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-xl font-medium transition ${
              filter === "all"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setFilter("unread")}
            className={`px-4 py-2 rounded-xl font-medium transition ${
              filter === "unread"
                ? "bg-emerald-600 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
            }`}
          >
            Unread ({notifications.filter(n => !n.is_sent).length})
          </button>
        </div>

        {/* Mark All as Read */}
        {notifications.some(n => !n.is_sent) && (
          <div className="mb-6">
            <button
              onClick={handleMarkAllAsRead}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
            >
              Mark all as read
            </button>
          </div>
        )}

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <p className="text-slate-500 dark:text-slate-400">No notifications found</p>
            </div>
          ) : (
            filteredNotifications.map((notification: any) => (
              <div
                key={notification.notification_id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border p-6 transition ${
                  !notification.is_sent
                    ? "border-emerald-200 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-900/30"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {notification.content.split(':')[0] || 'Notification'}
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 mt-1">{notification.content}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                          {new Date(notification.sent_at).toLocaleString()}
                        </p>
                      </div>
                      {!notification.is_sent && (
                        <button
                          onClick={() => handleMarkAsRead(notification.notification_id)}
                          className="ml-4 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-sm font-semibold hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
