"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetchFor } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000") + "/api/ptsa";
const api = authFetchFor("PTSA_REPRESENTATIVE");

type Child = {
  student_id: number;
  full_name: string;
  student_number: string;
  class_name: string;
  grade_level: number;
};

type GradeData = {
  subject: string;
  assignment: string;
  score: number;
  max_score: number;
  letter_grade: string;
  date: string;
};

type AttendanceData = {
  date: string;
  status: string;
  subject?: string;
};

type ConductData = {
  term: string;
  conduct_grade: string;
  comments: string;
};

export default function StudentDataPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [grades, setGrades] = useState<GradeData[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);
  const [conduct, setConduct] = useState<ConductData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadChildData(selectedChild.student_id);
    }
  }, [selectedChild]);

  async function loadChildren() {
    setLoading(true);
    try {
      const res = await api(`${API_BASE}/my-children`);
      if (res.ok) {
        const data = await res.json();
        setChildren(data);
        if (data.length > 0) setSelectedChild(data[0]);
      }
    } catch (error) {
      console.error("Error loading children:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadChildData(studentId: number) {
    try {
      const [gradesRes, attendanceRes, conductRes] = await Promise.all([
        api(`${API_BASE}/my-children/${studentId}/grades`),
        api(`${API_BASE}/my-children/${studentId}/attendance`),
        api(`${API_BASE}/my-children/${studentId}/conduct`),
      ]);

      if (gradesRes.ok) setGrades(await gradesRes.json());
      if (attendanceRes.ok) setAttendance(await attendanceRes.json());
      if (conductRes.ok) setConduct(await conductRes.json());
    } catch (error) {
      console.error("Error loading child data:", error);
    }
  }

  if (!children || children.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-slate-500 font-medium">No Children Linked</p>
          <p className="text-sm text-slate-400 mt-1">You don't have any children linked to your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Children's Data</h1>
        <p className="text-sm text-slate-500 mt-1">View your children's academic information</p>
      </div>

      {/* Child Selector */}
      <div className="flex gap-2">
        {children.map((child) => (
          <button
            key={child.student_id}
            onClick={() => setSelectedChild(child)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              selectedChild?.student_id === child.student_id
                ? "bg-teal-600 text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {child.full_name}
          </button>
        ))}
      </div>

      {selectedChild && (
        <>
          {/* Child Info Card */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{selectedChild.full_name}</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {selectedChild.student_number} â€¢ Grade {selectedChild.grade_level} â€¢ {selectedChild.class_name}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Average Grade</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">
                {grades.length > 0 
                  ? (grades.reduce((sum, g) => sum + (g.score / g.max_score * 100), 0) / grades.length).toFixed(1)
                  : "â€”"}%
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Attendance Rate</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {attendance.length > 0 
                  ? ((attendance.filter(a => a.status === "PRESENT").length / attendance.length) * 100).toFixed(1)
                  : "â€”"}%
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Latest Conduct</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">
                {conduct.length > 0 ? conduct[conduct.length - 1].conduct_grade : "â€”"}
              </p>
            </div>
          </div>

          {/* Grades */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Grades</h2>
            <div className="space-y-3">
              {grades.slice(0, 10).map((grade, index) => (
                <div key={index} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{grade.subject}</p>
                      <p className="text-xs text-slate-500 mt-1">{grade.assignment}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{grade.score}/{grade.max_score}</p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        grade.letter_grade === "A" ? "bg-emerald-50 text-emerald-700" :
                        grade.letter_grade === "B" ? "bg-blue-50 text-blue-700" :
                        grade.letter_grade === "C" ? "bg-amber-50 text-amber-700" :
                        "bg-rose-50 text-rose-700"
                      }`}>
                        {grade.letter_grade}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">{new Date(grade.date).toLocaleDateString()}</p>
                </div>
              ))}
              {grades.length === 0 && (
                <p className="text-sm text-slate-400">No grades available.</p>
              )}
            </div>
          </div>

          {/* Attendance */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Attendance Record</h2>
            <div className="space-y-3">
              {attendance.slice(0, 10).map((record, index) => (
                <div key={index} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{new Date(record.date).toLocaleDateString()}</p>
                      {record.subject && (
                        <p className="text-xs text-slate-500 mt-1">{record.subject}</p>
                      )}
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      record.status === "PRESENT" ? "bg-emerald-50 text-emerald-700" :
                      record.status === "ABSENT" ? "bg-rose-50 text-rose-700" :
                      "bg-amber-50 text-amber-700"
                    }`}>
                      {record.status}
                    </span>
                  </div>
                </div>
              ))}
              {attendance.length === 0 && (
                <p className="text-sm text-slate-400">No attendance records available.</p>
              )}
            </div>
          </div>

          {/* Conduct */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Conduct Records</h2>
            <div className="space-y-3">
              {conduct.map((record, index) => (
                <div key={index} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{record.term}</p>
                      <p className="text-sm text-slate-600 mt-1">{record.comments}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      record.conduct_grade === "Excellent" ? "bg-emerald-50 text-emerald-700" :
                      record.conduct_grade === "Good" ? "bg-blue-50 text-blue-700" :
                      "bg-amber-50 text-amber-700"
                    }`}>
                      {record.conduct_grade}
                    </span>
                  </div>
                </div>
              ))}
              {conduct.length === 0 && (
                <p className="text-sm text-slate-400">No conduct records available.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
