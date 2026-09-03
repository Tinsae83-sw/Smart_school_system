"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, clearAuth } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

type SchoolClass = {
  class_id: number;
  class_name: string;
  academic_year: string;
  student_count?: number;
};

type ClassSubject = {
  class_subject_id: number;
  class_id: number;
  subject_id: number;
  credit_hour: number;
  school_class?: SchoolClass;
  subject?: {
    subject_id: number;
    subject_name: string;
    subject_code: string;
  };
};

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassSubject[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken("TEACHER");
    if (!token) {
      router.push("/login");
      return;
    }
    loadClasses(token);
  }, [router]);

  async function loadClasses(token: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/teacher/classes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth("TEACHER");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setClasses(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">My Classes</h1>
        {classes.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-slate-600">No classes available.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls: any) => (
              <div key={cls.class_subject_id || cls.class_id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:shadow-md transition-shadow">
                <h2 className="text-xl font-semibold text-slate-900">{cls.school_class?.class_name || cls.class_name || 'Unknown Class'}</h2>
                <p className="text-slate-600 mt-2">{cls.subject?.subject_name || 'Unknown Subject'}</p>
                <p className="text-sm text-slate-500 mt-1">Academic Year: {cls.school_class?.academic_year || cls.academic_year || 'N/A'}</p>
                <p className="text-sm text-slate-500 mt-1">Credit Hours: {cls.credit_hour || 'N/A'}</p>
                {cls.student_count !== undefined && (
                  <p className="text-sm text-slate-500 mt-1">Students: {cls.student_count}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
