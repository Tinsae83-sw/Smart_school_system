"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function ReportsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadReports(savedToken);
  }, [router]);

  async function loadReports(token: string) {
    try {
      const data = await authFetch("/api/teacher/reports/class/1", {}, token);
      setReports(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Reports</h1>
        <div className="space-y-4">
          {reports.map((report: any) => (
            <div key={report.report_id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{report.title}</h2>
              <p className="text-slate-600 dark:text-slate-300 mt-2">{report.type}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Generated: {new Date(report.generated_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
