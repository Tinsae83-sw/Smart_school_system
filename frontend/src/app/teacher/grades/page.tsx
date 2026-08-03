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
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Grades</h1>
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b">
                <th className="pb-3">Student</th>
                <th className="pb-3">Subject</th>
                <th className="pb-3">Score</th>
                <th className="pb-3">Grade</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((grade: any) => (
                <tr key={grade.id} className="border-b">
                  <td className="py-3">{grade.student_name}</td>
                  <td className="py-3">{grade.subject?.subject_name || grade.subject}</td>
                  <td className="py-3">{grade.score}/{grade.max_score}</td>
                  <td className="py-3 font-semibold">{grade.grade}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
