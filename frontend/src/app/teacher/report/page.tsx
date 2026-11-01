"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch, formatDisplayDate, Toast } from "../shared";

interface ClassSubject {
  class_subject_id: number;
  class_id: number;
  school_class?: { class_id?: number; class_name: string };
  subject?: { subject_name: string };
}

interface Student {
  student_id: number;
  student_number: string;
  user?: { full_name: string; email: string };
  full_name?: string;
}

export default function ReportPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<ClassSubject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState<"class" | "student">("class");

  // Student report selection
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Loaded reports
  const [classReport, setClassReport] = useState<any>(null);
  const [studentReport, setStudentReport] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
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
      setClasses(data);
      if (data.length > 0) {
        const firstCid = data[0].class_id || data[0].school_class?.class_id || data[0].class_subject_id;
        setSelectedClassId(firstCid);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to load classes", "error");
    } finally {
      setLoading(false);
    }
  }

  // Load students when selectedClassId changes
  useEffect(() => {
    if (selectedClassId && token) {
      loadStudents(selectedClassId);
    }
  }, [selectedClassId, token]);

  async function loadStudents(classId: number) {
    try {
      const rosterData = await authFetch(`/api/teacher/classes/${classId}/roster`, {}, token);
      const studentList = rosterData.students || rosterData || [];
      const list = Array.isArray(studentList) ? studentList : [];
      setStudents(list);
      if (list.length > 0) {
        setSelectedStudentId(list[0].student_id);
      } else {
        setSelectedStudentId(null);
      }
    } catch {
      setStudents([]);
      setSelectedStudentId(null);
    }
  }

  // Generate Report Handler
  async function handleGenerateReport() {
    if (!selectedClassId) {
      showToast("Please select a class.", "error");
      return;
    }

    if (activeTab === "student" && !selectedStudentId) {
      showToast("Please select a student for the individual academic report.", "error");
      return;
    }

    setGenerating(true);
    try {
      if (activeTab === "class") {
        const data = await authFetch(`/api/teacher/reports/class/${selectedClassId}`, {}, token);
        setClassReport(data);
        showToast("Class academic report generated!", "success");
      } else {
        const data = await authFetch(`/api/teacher/reports/student/${selectedStudentId}`, {}, token);
        setStudentReport(data);
        showToast("Student academic transcript report generated!", "success");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to generate report", "error");
    } finally {
      setGenerating(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  const selectedClass = classes.find(
    (c) => (c.class_id || c.school_class?.class_id || c.class_subject_id) === selectedClassId
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 dark:border-slate-600 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Preparing academic reporting engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-4 shadow-lg max-w-sm animate-in slide-in-from-right-4 duration-300 print:hidden ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300"
          }`}
        >
          <span className="text-sm font-medium">{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Academic Reports
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Generate printable class analytics, grade distributions, and student transcripts
          </p>
        </div>

        {(classReport || studentReport) && (
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print / Save PDF
          </button>
        )}
      </div>

      {/* Mode Selector Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 print:hidden">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("class")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "class"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Class Academic Report
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("student")}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition ${
              activeTab === "student"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Individual Student Transcript Report
          </button>
        </div>
      </div>

      {/* Filter / Generator Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm print:hidden">
        <div className="grid gap-6 md:grid-cols-3 items-end">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Class *
            </label>
            <select
              value={selectedClassId || ""}
              onChange={(e) => setSelectedClassId(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            >
              {classes.map((cls) => {
                const cid = cls.class_id || cls.school_class?.class_id || cls.class_subject_id;
                return (
                  <option key={cid} value={cid}>
                    {cls.school_class?.class_name || "Class"} — {cls.subject?.subject_name || "Subject"}
                  </option>
                );
              })}
            </select>
          </div>

          {activeTab === "student" && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Select Student *
              </label>
              <select
                value={selectedStudentId || ""}
                onChange={(e) => setSelectedStudentId(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                {students.map((st) => (
                  <option key={st.student_id} value={st.student_id}>
                    {st.user?.full_name || st.full_name || "Student"} ({st.student_number || `ID: ${st.student_id}`})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <button
              type="button"
              disabled={generating}
              onClick={handleGenerateReport}
              className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
            >
              {generating ? "Analyzing & Generating..." : "Generate Official Report"}
            </button>
          </div>
        </div>
      </div>

      {/* ── TAB 1 DISPLAY: CLASS REPORT ──────────────────────────────────── */}
      {activeTab === "class" && classReport && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm space-y-8">
          {/* Official Report Title Block */}
          <div className="border-b border-slate-200 dark:border-slate-700 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                Official Academic Summary Report
              </p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {classReport.class_name} — {classReport.subject_name}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Generated on: {formatDisplayDate(classReport.generated_at || new Date())}
              </p>
            </div>

            <div className="text-right">
              <span className="inline-flex px-4 py-1.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                Active Term Report
              </span>
            </div>
          </div>

          {/* Metric Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Class Average</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                {classReport.class_average}%
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pass Rate</p>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                {classReport.pass_rate}%
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Enrolled</p>
              <p className="text-3xl font-extrabold text-slate-900 dark:text-white mt-2">
                {classReport.total_students}
              </p>
            </div>
          </div>

          {/* Top Performers Leaderboard */}
          {classReport.top_performers && classReport.top_performers.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-3">
                Top Performing Students
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classReport.top_performers.map((tp: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm"
                  >
                    <span className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-bold text-xs flex items-center justify-center">
                      #{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {tp.name}
                      </p>
                      <p className="text-xs text-slate-400">Score: {tp.average}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subject Performance Breakdown Table */}
          {classReport.subject_performance && classReport.subject_performance.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-3">
                Subject Performance Distribution
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 text-left border-b border-slate-200 dark:border-slate-700">
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Average Score</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Highest Score</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Lowest Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                    {classReport.subject_performance.map((sp: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">{sp.subject}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-emerald-600">{sp.average}%</td>
                        <td className="px-5 py-3.5 text-center text-slate-700 dark:text-slate-300">{sp.highest}%</td>
                        <td className="px-5 py-3.5 text-center text-slate-700 dark:text-slate-300">{sp.lowest}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2 DISPLAY: STUDENT REPORT ────────────────────────────────── */}
      {activeTab === "student" && studentReport && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 shadow-sm space-y-8">
          {/* Transcript Header */}
          <div className="border-b border-slate-200 dark:border-slate-700 pb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                Official Student Academic Transcript
              </p>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {studentReport.student_name}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Student ID: <span className="font-mono font-bold">{studentReport.student_number}</span> · Class: {studentReport.class_name}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-400">Date Issued:</span>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {formatDisplayDate(studentReport.generated_at || new Date())}
              </p>
            </div>
          </div>

          {/* Key Indicators */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cumulative Average</p>
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                {studentReport.overall_average}%
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Attendance Standing</p>
              <p className="text-3xl font-extrabold text-blue-600 dark:text-blue-400 mt-2">
                {studentReport.attendance_rate?.percentage || "100"}%
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {studentReport.attendance_rate?.present_days || 0} of {studentReport.attendance_rate?.total_days || 0} days present
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/30 p-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Conduct Grade</p>
              <p className="text-3xl font-extrabold text-amber-500 mt-2">
                {studentReport.conduct?.grade || "A"}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Rating: {studentReport.conduct?.rating || 5}/5 Stars
              </p>
            </div>
          </div>

          {/* Subject Performance Table */}
          {studentReport.subject_grades && studentReport.subject_grades.length > 0 && (
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base mb-3">
                Coursework & Subject Marks
              </h3>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-700/50 text-left border-b border-slate-200 dark:border-slate-700">
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Subject Course</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Score</th>
                      <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Letter Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                    {studentReport.subject_grades.map((g: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                        <td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-white">{g.subject}</td>
                        <td className="px-5 py-3.5 text-center font-bold text-slate-900 dark:text-white">{g.score}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            {g.letter_grade || "A"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Conduct Comments */}
          {studentReport.conduct?.comments && (
            <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500 mb-1">
                Conduct & Behavioral Evaluation Comments
              </h4>
              <p className="text-sm text-slate-700 dark:text-slate-300">
                {studentReport.conduct.comments}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
