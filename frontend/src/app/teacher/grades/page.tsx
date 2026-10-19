"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function GradesPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadGrades(savedToken);
  }, [router]);

  async function loadGrades(token: string) {
    try {
      const data = await authFetch("/api/teacher/grades/1", {}, token);
      setGrades(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Grades</h1>
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                <th className="pb-3 text-slate-700 dark:text-slate-300">Student</th>
                <th className="pb-3 text-slate-700 dark:text-slate-300">Subject</th>
                <th className="pb-3 text-slate-700 dark:text-slate-300">Score</th>
                <th className="pb-3 text-slate-700 dark:text-slate-300">Grade</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((grade: any) => (
                <tr key={grade.id} className="border-b border-slate-100 dark:border-slate-700">
                  <td className="py-3 text-slate-900 dark:text-white">{grade.student_name}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">{grade.subject?.subject_name || grade.subject}</td>
                  <td className="py-3 text-slate-600 dark:text-slate-300">{grade.score}/{grade.max_score}</td>
                  <td className="py-3 font-semibold text-slate-900 dark:text-white">{grade.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
