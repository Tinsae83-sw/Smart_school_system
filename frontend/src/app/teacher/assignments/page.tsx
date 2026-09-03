"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, clearAuth } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function AssignmentsPage() {
  const router = useRouter();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken("TEACHER");
    if (!token) {
      router.push("/login");
      return;
    }
    loadAssignments(token);
  }, [router]);

  async function loadAssignments(token: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/teacher/assignments`, {
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
      setAssignments(data || []);
    } catch (e) { 
      console.error(e);
      setAssignments([]);
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Assignments</h1>
        
        {assignments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <p className="text-slate-500">No assignments created yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment: any) => {
              const dueDate = new Date(assignment.due_date);
              const isOverdue = dueDate < new Date();
              const submissionCount = assignment.submissions?.length || 0;
              const gradedCount = assignment.submissions?.filter((s: any) => s.grade)?.length || 0;
              
              return (
                <div key={assignment.assignment_id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                          {assignment.class_subject?.school_class?.class_name}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-xs font-medium text-slate-500">
                          {assignment.class_subject?.subject?.subject_name}
                        </span>
                      </div>
                      <h2 className="text-xl font-semibold text-slate-900">{assignment.title}</h2>
                      <p className="text-slate-600 mt-2">{assignment.description}</p>
                      
                      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-slate-500">
                        <span>Due: {dueDate.toLocaleDateString()}</span>
                        <span>Max Score: {assignment.max_score}</span>
                        {isOverdue && (
                          <span className="text-red-600 font-medium">Overdue</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2">
                      <div className="bg-slate-50 rounded-xl px-4 py-2 text-center">
                        <p className="text-2xl font-bold text-slate-900">{submissionCount}</p>
                        <p className="text-xs text-slate-500">Submissions</p>
                      </div>
                      {gradedCount > 0 && (
                        <div className="bg-emerald-50 rounded-xl px-4 py-2 text-center">
                          <p className="text-2xl font-bold text-emerald-700">{gradedCount}</p>
                          <p className="text-xs text-emerald-600">Graded</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
