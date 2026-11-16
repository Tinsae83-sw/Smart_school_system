"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { DEPARTMENT_HEAD_API_BASE } from "@/lib/api";
import { getToken } from "@/lib/auth";

type TeacherPerformance = {
  teacher_id: number;
  full_name: string;
  average_score: number;
  total_grades: number;
  attendance_records_marked: number;
  performance_score: number;
};

export default function TeacherPerformancePage() {
  const { teacherId } = useParams<{ teacherId: string }>();
  const [performance, setPerformance] = useState<TeacherPerformance | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const id = Number(teacherId);

    async function fetchPerformance() {
      if (!Number.isInteger(id) || id <= 0) {
        setError("Invalid teacher ID.");
        setLoading(false);
        return;
      }

      const token = getToken("DEPARTMENT_HEAD");
      if (!token) {
        setError("Your session has expired. Please sign in again.");
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(
          `${DEPARTMENT_HEAD_API_BASE}/teachers/${id}/performance`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(`Unable to load teacher performance (${response.status}).`);
        }

        setPerformance(await response.json());
      } catch (fetchError) {
        if (!controller.signal.aborted) {
          setError(fetchError instanceof Error ? fetchError.message : "Unable to load teacher performance.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchPerformance();
    return () => controller.abort();
  }, [teacherId]);

  return (
    <div className="space-y-6">
      <Link
        href="/department-head/teachers"
        className="inline-flex items-center text-sm font-medium text-orange-700 hover:text-orange-800"
      >
        &larr; Back to teachers
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900">Teacher Performance</h1>
        {performance && <p className="mt-1 text-sm text-slate-500">{performance.full_name}</p>}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        </div>
      ) : error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : performance ? (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Performance score", value: `${performance.performance_score}%` },
            { label: "Average student score", value: `${performance.average_score}%` },
            { label: "Grades recorded", value: performance.total_grades },
            { label: "Attendance records marked", value: performance.attendance_records_marked },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900">{item.value}</p>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
