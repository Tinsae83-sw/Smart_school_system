"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function ClassPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadClasses(savedToken);
  }, [router]);

  async function loadClasses(token: string) {
    try {
      const data = await authFetch("/api/teacher/classes", {}, token);
      setClasses(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadClassStudents(classId: number) {
    try {
      const data = await authFetch(`/api/teacher/classes/${classId}/roster`, {}, token);
      setStudents(data.students || data);
    } catch (e) { console.error(e); }
  }

  function handleClassClick(cls: any) {
    setSelectedClass(cls);
    loadClassStudents(cls.class_id);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">My Classes</h1>

        {!selectedClass ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls: any) => (
              <div
                key={cls.class_id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleClassClick(cls)}
              >
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{cls.class_name}</h2>
                <p className="text-slate-600 dark:text-slate-300 mt-2">{cls.subject?.subject_name || cls.subject}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Room: {cls.room_number}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Students: {cls.student_count || 0}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <button
              onClick={() => setSelectedClass(null)}
              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium"
            >
              ← Back to Classes
            </button>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedClass.class_name}</h2>
              <p className="text-slate-600 dark:text-slate-300 mt-2">{selectedClass.subject?.subject_name || selectedClass.subject}</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Room: {selectedClass.room_number}</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Class Roster ({students.length} students)</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Student ID</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Email</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700 dark:text-slate-300">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student: any) => (
                      <tr key={student.student_id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="py-3 px-4 text-sm text-slate-900 dark:text-white">{student.student_number}</td>
                        <td className="py-3 px-4 text-sm text-slate-900 dark:text-white font-medium">{student.user?.full_name || student.full_name}</td>
                        <td className="py-3 px-4 text-sm text-slate-600 dark:text-slate-400">{student.user?.email || student.email}</td>
                        <td className="py-3 px-4">
                          <span className="rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-3 py-1 text-xs font-semibold">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
