"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function NotificationsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      setNotifications(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Notifications</h1>
        <div className="space-y-4">
          {notifications.map((notification: any) => (
            <div key={notification.notification_id} className={`bg-white rounded-2xl border p-6 ${notification.read ? "border-slate-200" : "border-indigo-200 bg-indigo-50"}`}>
              <h2 className="text-xl font-semibold">{notification.title}</h2>
              <p className="text-slate-600 mt-2">{notification.message}</p>
              <p className="text-sm text-slate-500 mt-2">{new Date(notification.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
