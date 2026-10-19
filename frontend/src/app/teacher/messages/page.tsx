"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function MessagesPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadMessages(savedToken);
  }, [router]);

  async function loadMessages(token: string) {
    try {
      const data = await authFetch("/api/teacher/messages", {}, token);
      setMessages(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Messages</h1>
        <div className="space-y-4">
          {messages.map((thread: any) => (
            <div key={thread.thread_id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{thread.recipient_name}</h2>
              <p className="text-slate-600 dark:text-slate-300 mt-2">{thread.last_message}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Unread: {thread.unread}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
