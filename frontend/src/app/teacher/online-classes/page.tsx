"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function OnlineClassesPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [onlineClasses, setOnlineClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadOnlineClasses(savedToken);
  }, [router]);

  async function loadOnlineClasses(token: string) {
    try {
      const data = await authFetch("/api/teacher/online-classes", {}, token);
      setOnlineClasses(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Online Classes</h1>
        <div className="space-y-4">
          {onlineClasses.map((meeting: any) => (
            <div key={meeting.meeting_id} className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold">{meeting.topic}</h2>
              <p className="text-slate-600 mt-2">Scheduled: {new Date(meeting.scheduled_at).toLocaleString()}</p>
              <p className="text-sm text-slate-500 mt-2">Provider: {meeting.provider} | Status: {meeting.status}</p>
              {meeting.link && (
                <a href={meeting.link} target="_blank" rel="noopener" className="inline-block mt-3 text-indigo-600 hover:underline">
                  Join Meeting
                </a>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
