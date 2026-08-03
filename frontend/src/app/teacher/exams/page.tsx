"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function ExamsPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadExams(savedToken);
  }, [router]);

  async function loadExams(token: string) {
    try {
      const data = await authFetch("/api/teacher/exams", {}, token);
      setExams(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Exams</h1>
        <div className="space-y-4">
          {exams.map((exam: any) => (
            <div key={exam.exam_id} className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-xl font-semibold">{exam.title}</h2>
              <p className="text-slate-600 mt-2">{exam.subject?.subject_name || exam.subject}</p>
              <p className="text-sm text-slate-500 mt-2">Date: {new Date(exam.exam_date).toLocaleDateString()} | Max Score: {exam.max_score}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
