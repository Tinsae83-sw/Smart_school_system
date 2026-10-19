"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function SettingsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadSettings(savedToken);
  }, [router]);

  async function loadSettings(token: string) {
    try {
      const data = await authFetch("/api/teacher/settings", {}, token);
      setSettings(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Settings</h1>
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Account Preferences</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300">Email Notifications</label>
                <select
                  value={settings?.email_notifications ?? true}
                  className="mt-1 w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-white"
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-700 dark:text-slate-300">Language</label>
                <select
                  value={settings?.language ?? "en"}
                  className="mt-1 w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-white"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
