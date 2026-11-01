"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getToken } from "@/lib/auth";
import { authFetch, Toast } from "../shared";

interface SchoolClass {
  class_id: number;
  class_name: string;
  academic_year: string;
  room_number?: string;
  student_count?: number;
}

interface ClassSubject {
  class_subject_id: number;
  class_id: number;
  subject_id: number;
  credit_hour?: number;
  room_number?: string;
  school_class?: SchoolClass;
  class_name?: string;
  academic_year?: string;
  student_count?: number;
  subject?: {
    subject_id: number;
    subject_name: string;
    subject_code?: string;
  };
}

interface StudentRosterItem {
  student_id: number;
  student_number: string;
  user?: { full_name: string; email: string; phone_number?: string };
  full_name?: string;
  email?: string;
  status?: string;
}

export default function ClassesPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<ClassSubject[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected class for roster view
  const [selectedClass, setSelectedClass] = useState<ClassSubject | null>(null);
  const [roster, setRoster] = useState<StudentRosterItem[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);

  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (text: string, type: Toast["type"]) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadClasses(savedToken);
  }, [router]);

  async function loadClasses(tok: string) {
    try {
      const data: ClassSubject[] = await authFetch("/api/teacher/classes", {}, tok);
      setClasses(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showToast(e.message || "Failed to load assigned classes", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelectClass(cls: ClassSubject) {
    setSelectedClass(cls);
    const classId = cls.class_id || cls.school_class?.class_id || cls.class_subject_id;
    setRosterLoading(true);

    try {
      const rosterData = await authFetch(`/api/teacher/classes/${classId}/roster`, {}, token);
      const studentsList = rosterData.students || rosterData || [];
      setRoster(Array.isArray(studentsList) ? studentsList : []);
    } catch (e: any) {
      showToast(e.message || "Failed to load class roster", "error");
      setRoster([]);
    } finally {
      setRosterLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 dark:border-slate-600 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading classes & rosters...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-4 shadow-lg max-w-sm animate-in slide-in-from-right-4 duration-300 ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300"
          }`}
        >
          <span className="text-sm font-medium">{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Class Management & Directory
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Browse your assigned classes, inspect student rosters, and access academic actions
          </p>
        </div>
      </div>

      {!selectedClass ? (
        /* ── GRID OF ASSIGNED CLASSES ──────────────────────────────────── */
        <div>
          {classes.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <svg className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Assigned Classes</h3>
              <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
                You have not been assigned to any academic class sections yet.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((cls) => {
                const className = cls.school_class?.class_name || cls.class_name || "Assigned Class";
                const subjectName = cls.subject?.subject_name || "General Coursework";
                const studentCount = cls.student_count ?? cls.school_class?.student_count ?? 25;
                const year = cls.school_class?.academic_year || cls.academic_year || "Current Year";
                const room = cls.room_number || cls.school_class?.room_number || "Room A-102";

                return (
                  <div
                    key={cls.class_subject_id || cls.class_id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between transition hover:shadow-lg hover:border-emerald-500/50 group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          {subjectName}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          {year}
                        </span>
                      </div>

                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-4 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {className}
                      </h2>

                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <div>
                          <p className="text-slate-400">Students</p>
                          <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                            {studentCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400">Room</p>
                          <p className="text-base font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                            {room}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <button
                        type="button"
                        onClick={() => handleSelectClass(cls)}
                        className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-1.5"
                      >
                        <span>View Class Roster</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ── ROSTER VIEW FOR SELECTED CLASS ────────────────────────────── */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSelectedClass(null)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              ← Back to All Classes
            </button>
          </div>

          {/* Class Banner Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {selectedClass.subject?.subject_name || "Course"}
              </span>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-2">
                {selectedClass.school_class?.class_name || selectedClass.class_name || "Class"} Roster
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {selectedClass.school_class?.academic_year || selectedClass.academic_year || "Academic Year"} · {roster.length} Enrolled Students
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/teacher/attendance"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Mark Attendance
              </Link>
              <Link
                href="/teacher/grade"
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
              >
                Enter Marks
              </Link>
            </div>
          </div>

          {/* Roster Table */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {rosterLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">Loading student roster...</p>
                </div>
              </div>
            ) : roster.length === 0 ? (
              <div className="py-20 text-center">
                <p className="text-slate-500 dark:text-slate-400 font-medium">No students enrolled in this class roster.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 text-left border-b border-slate-200 dark:border-slate-700">
                      <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">#</th>
                      <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student Name</th>
                      <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student ID</th>
                      <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact</th>
                      <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Quick Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {roster.map((st, idx) => {
                      const name = st.user?.full_name || st.full_name || "Student";
                      const email = st.user?.email || st.email || "N/A";
                      const studentId = st.student_number || `STU-${st.student_id}`;

                      return (
                        <tr key={st.student_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                          <td className="px-5 py-4 text-sm text-slate-400 font-medium">{idx + 1}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                {name.charAt(0)}
                              </div>
                              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                                {name}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">
                            {studentId}
                          </td>
                          <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                            {email}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Active
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="inline-flex items-center gap-2">
                              <Link
                                href="/teacher/grade"
                                title="Grade Management"
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
                              >
                                Grade
                              </Link>
                              <Link
                                href="/teacher/conduct"
                                title="Conduct & Behavior"
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
                              >
                                Conduct
                              </Link>
                              <Link
                                href="/teacher/report"
                                title="Academic Transcript"
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition"
                              >
                                Report
                              </Link>
                              <Link
                                href="/teacher/message"
                                title="Send Direct Message"
                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                              >
                                Chat
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
