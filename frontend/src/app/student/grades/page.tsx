"use client";

import { useContext, useEffect, useState } from "react";
import { StudentContext } from "../StudentContext";
import { useRouter } from "next/navigation";
import { clearAllAuth } from "@/lib/auth";
import {
  BarChart3,
  Award,
  TrendingUp,
  GraduationCap,
  BookOpen,
  FileText,
  Download,
  Star,
  Calculator,
  Plus,
  Trash2,
  Sparkles,
} from "lucide-react";

interface Grade {
  mark_id: number;
  type: string;
  score: number;
  letter_grade: string | null;
  subject: string;
  subject_code: string;
  teacher_name: string;
  graded_at: string;
}

interface SubmissionGrade {
  submission_id: number;
  assignment_title: string;
  subject: string;
  teacher_name: string;
  score: number | null;
  max_score: number;
  grade: string | null;
  feedback: string | null;
  submitted_at: string;
}

interface SubjectGrades {
  subject_name: string;
  subject_code: string;
  teacher_name: string;
  grades: Grade[];
  submissions: SubmissionGrade[];
}

interface TranscriptSubject {
  subject_id: number;
  subject_name: string;
  subject_code: string;
  credit_hour: number;
  teacher_name: string;
  final_score: number;
  letter_grade: string;
  grade_points: number;
  earned_points: number;
  marks: { type: string; score: number; letter_grade: string | null }[];
}

interface Transcript {
  student: {
    name: string;
    student_number: string;
    email: string;
    class: string;
    grade_level: number;
    enrollment_date: string;
  };
  academic_summary: {
    cumulative_gpa: number;
    total_credit_hours: number;
    credits_earned: number;
    academic_standing: string;
    class_rank: number;
    total_class_students: number;
  };
  subjects: TranscriptSubject[];
  attendance: { present: number; total: number; percentage: number | string };
  conduct: { conduct: string; rating: number; remarks: string };
  verification_code: string;
  generated_at: string;
}

type TabType = "grades" | "performance" | "transcript" | "simulator";

interface SimCourse {
  id: string;
  name: string;
  credits: number;
  grade: string;
}

export default function StudentGrades() {
  const { authFetch } = useContext(StudentContext);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("grades");
  const [loading, setLoading] = useState(true);
  const [subjectGrades, setSubjectGrades] = useState<SubjectGrades[]>([]);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // GPA Simulator State
  const [simCourses, setSimCourses] = useState<SimCourse[]>([
    { id: "1", name: "Mathematics", credits: 4, grade: "A" },
    { id: "2", name: "English Language", credits: 3, grade: "A" },
    { id: "3", name: "Physics / Chemistry", credits: 4, grade: "B+" },
    { id: "4", name: "Biology / Social Studies", credits: 3, grade: "A" },
  ]);
  const [targetGpa, setTargetGpa] = useState<string>("3.80");

  useEffect(() => {
    loadAll();
  }, [authFetch]);

  async function loadAll() {
    setLoading(true);
    try {
      const [gradesRes, transcriptRes, perfRes] = await Promise.allSettled([
        authFetch("/api/student/grades"),
        authFetch("/api/student/transcript"),
        authFetch("/api/student/performance"),
      ]);

      // Grades
      if (gradesRes.status === "fulfilled") {
        const data = gradesRes.value;
        const subjectMap = new Map<string, SubjectGrades>();
        if (data.studentMarks && Array.isArray(data.studentMarks)) {
          data.studentMarks.forEach((mark: Grade) => {
            const key = `${mark.subject_code}-${mark.teacher_name}`;
            if (!subjectMap.has(key)) {
              subjectMap.set(key, {
                subject_name: mark.subject,
                subject_code: mark.subject_code,
                teacher_name: mark.teacher_name,
                grades: [],
                submissions: [],
              });
            }
            subjectMap.get(key)!.grades.push(mark);
          });
        }
        if (data.submissions && Array.isArray(data.submissions)) {
          data.submissions.forEach((sub: SubmissionGrade) => {
            const key = `${sub.subject}-${sub.teacher_name}`;
            if (!subjectMap.has(key)) {
              subjectMap.set(key, {
                subject_name: sub.subject,
                subject_code: "",
                teacher_name: sub.teacher_name,
                grades: [],
                submissions: [],
              });
            }
            subjectMap.get(key)!.submissions.push(sub);
          });
        }
        setSubjectGrades(Array.from(subjectMap.values()));
      }

      // Transcript
      if (transcriptRes.status === "fulfilled") setTranscript(transcriptRes.value);

      // Performance
      if (perfRes.status === "fulfilled") setPerformance(perfRes.value);

      setError(null);
    } catch (err: any) {
      if (
        err.message?.includes("Invalid or expired token") ||
        err.message?.includes("No token provided") ||
        err.message?.includes("Session expired")
      ) {
        clearAllAuth();
        router.push("/login");
        return;
      }
      setError(err.message || "Failed to load grades");
    } finally {
      setLoading(false);
    }
  }

  function getGradeColor(letterGrade: string | null): string {
    if (!letterGrade) return "text-slate-500 dark:text-slate-400";
    const grade = letterGrade.toUpperCase();
    if (grade.startsWith("A")) return "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20";
    if (grade.startsWith("B")) return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20";
    if (grade.startsWith("C")) return "text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20";
    if (grade.startsWith("D")) return "text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20";
    return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20";
  }

  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      TEST: "Test",
      MID: "Midterm",
      FINAL: "Final Exam",
      ASSIGNMENT: "Assignment",
      OTHER: "Other",
    };
    return labels[type] || type;
  }

  function getGpaColor(gpa: number): string {
    if (gpa >= 3.7) return "text-emerald-600 dark:text-emerald-400";
    if (gpa >= 3.0) return "text-blue-600 dark:text-blue-400";
    if (gpa >= 2.0) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-200 dark:border-slate-600 border-t-sky-600 dark:border-t-sky-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">Loading grades...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
        <p className="text-red-600 dark:text-red-400 font-medium">{error}</p>
        <button
          onClick={loadAll}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Grades & Academic Record</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            View your grades, GPA, class rank, and official transcript.
          </p>
        </div>
        <button
          onClick={loadAll}
          className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition flex items-center gap-2 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* GPA Quick View Banner */}
      {transcript?.academic_summary && (
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 p-6 text-white shadow-xl">
          <div className="absolute top-0 right-0 -mt-6 -mr-6 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sky-200 text-xs font-semibold uppercase tracking-wider">Cumulative GPA</p>
              <p className="text-4xl font-black mt-1">{transcript.academic_summary.cumulative_gpa}</p>
              <p className="text-sky-200 text-xs mt-1">/ 4.00</p>
            </div>
            <div>
              <p className="text-sky-200 text-xs font-semibold uppercase tracking-wider">Class Rank</p>
              <p className="text-4xl font-black mt-1">
                #{transcript.academic_summary.class_rank}
              </p>
              <p className="text-sky-200 text-xs mt-1">of {transcript.academic_summary.total_class_students} students</p>
            </div>
            <div>
              <p className="text-sky-200 text-xs font-semibold uppercase tracking-wider">Credit Hours</p>
              <p className="text-4xl font-black mt-1">{transcript.academic_summary.total_credit_hours}</p>
              <p className="text-sky-200 text-xs mt-1">Total credits</p>
            </div>
            <div>
              <p className="text-sky-200 text-xs font-semibold uppercase tracking-wider">Academic Standing</p>
              <p className="text-base font-bold mt-1 leading-tight">{transcript.academic_summary.academic_standing}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
        {([
          { id: "grades", label: "Subject Grades", icon: <BarChart3 className="w-4 h-4" /> },
          { id: "performance", label: "Performance", icon: <TrendingUp className="w-4 h-4" /> },
          { id: "transcript", label: "Official Transcript", icon: <GraduationCap className="w-4 h-4" /> },
          { id: "simulator", label: "GPA Simulator", icon: <Calculator className="w-4 h-4" /> },
        ] as { id: TabType; label: string; icon: React.ReactNode }[]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 flex-1 justify-center px-4 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab.id
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:block">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── GRADES TAB ── */}
      {activeTab === "grades" && (
        <div className="space-y-6">
          {subjectGrades.length === 0 ? (
            <div className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center">
              <BarChart3 className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Grades Available</h3>
              <p className="text-slate-500 dark:text-slate-400">
                Your grades will appear here once they are posted by your teachers.
              </p>
            </div>
          ) : (
            subjectGrades.map((subject, index) => (
              <div
                key={`${subject.subject_code}-${index}`}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden"
              >
                <div className="bg-gradient-to-r from-sky-500 to-sky-600 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-white">{subject.subject_name}</h2>
                      <p className="text-sky-100 text-sm mt-1">
                        {subject.subject_code && `${subject.subject_code} • `}{subject.teacher_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sky-100 text-sm">
                        {subject.grades.length + subject.submissions.length} Grade
                        {subject.grades.length + subject.submissions.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  {/* Assessment Marks */}
                  {subject.grades.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                        Assessment Grades
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-700">
                              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Type</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Score</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Grade</th>
                              <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600 dark:text-slate-400">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subject.grades.map((grade) => (
                              <tr key={grade.mark_id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                                <td className="py-3 px-4">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                    {getTypeLabel(grade.type)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm font-medium text-slate-900 dark:text-white">
                                  {grade.score.toFixed(2)}
                                </td>
                                <td className="py-3 px-4">
                                  {grade.letter_grade ? (
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getGradeColor(grade.letter_grade)}`}>
                                      {grade.letter_grade}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm text-slate-500 dark:text-slate-400">
                                  {new Date(grade.graded_at).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Assignment Submissions */}
                  {subject.submissions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide mb-3">
                        Assignment Grades
                      </h3>
                      <div className="space-y-3">
                        {subject.submissions.map((sub) => (
                          <div
                            key={sub.submission_id}
                            className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium text-slate-900 dark:text-white">{sub.assignment_title}</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                  Score: {sub.score !== null ? sub.score.toFixed(2) : "N/A"} / {sub.max_score.toFixed(2)}
                                </p>
                                {sub.feedback && (
                                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 italic">
                                    Feedback: "{sub.feedback}"
                                  </p>
                                )}
                              </div>
                              <div className="ml-4 text-right">
                                {sub.grade ? (
                                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${getGradeColor(sub.grade)}`}>
                                    {sub.grade}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 text-sm">Pending</span>
                                )}
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                  {new Date(sub.submitted_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {subject.grades.length === 0 && subject.submissions.length === 0 && (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <p>No grades posted yet for this subject.</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── PERFORMANCE TAB ── */}
      {activeTab === "performance" && (
        <div className="space-y-6">
          {performance ? (
            <>
              {/* Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Overall GPA", value: performance.gpa || transcript?.academic_summary?.cumulative_gpa || "N/A", color: "text-blue-600 dark:text-blue-400" },
                  { label: "Class Rank", value: `#${performance.class_rank || transcript?.academic_summary?.class_rank || "N/A"}`, color: "text-violet-600 dark:text-violet-400" },
                  { label: "Attendance Rate", value: `${performance.attendance_rate || transcript?.attendance?.percentage || 0}%`, color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Subjects Passing", value: `${performance.subjects_passing || subjectGrades.length}/${performance.total_subjects || subjectGrades.length}`, color: "text-amber-600 dark:text-amber-400" },
                ].map((stat) => (
                  <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{stat.label}</p>
                    <p className={`text-3xl font-bold mt-2 ${stat.color}`}>{stat.value}</p>
                  </div>
                ))}
              </div>

              {/* Trend info from transcript subjects */}
              {transcript?.subjects && transcript.subjects.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-blue-100 dark:border-blue-800">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      Subject Performance Overview
                    </h2>
                  </div>
                  <div className="p-6 space-y-4">
                    {transcript.subjects.map((subj) => (
                      <div key={subj.subject_id} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{subj.subject_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{subj.teacher_name}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-sm font-bold px-2 py-0.5 rounded-lg ${getGradeColor(subj.letter_grade)}`}>
                              {subj.letter_grade}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subj.final_score}%</p>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              subj.final_score >= 80
                                ? "bg-emerald-500"
                                : subj.final_score >= 60
                                ? "bg-blue-500"
                                : subj.final_score >= 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(subj.final_score, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <TrendingUp className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <p className="text-slate-500 dark:text-slate-400">Performance data unavailable at this time.</p>
            </div>
          )}
        </div>
      )}

      {/* ── TRANSCRIPT TAB ── */}
      {activeTab === "transcript" && (
        <div className="space-y-6">
          {transcript ? (
            <>
              {/* Print / Download Button */}
              <div className="flex justify-end">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rounded-xl text-sm font-semibold hover:bg-slate-700 dark:hover:bg-slate-300 transition"
                >
                  <Download className="w-4 h-4" />
                  Print Transcript
                </button>
              </div>

              {/* Transcript Document */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden print:shadow-none print:border print:border-slate-300">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-black text-white p-8 text-center">
                  <GraduationCap className="w-12 h-12 mx-auto mb-2 text-amber-400" />
                  <h1 className="text-2xl font-black uppercase tracking-wider">Official Academic Transcript</h1>
                  <p className="text-slate-300 mt-1">Smart School System — EduConnect</p>
                </div>

                <div className="p-6 space-y-6">
                  {/* Student Info */}
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-5 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-600">
                    {[
                      { label: "Full Name", value: transcript.student.name },
                      { label: "Student Number", value: transcript.student.student_number },
                      { label: "Class", value: transcript.student.class },
                      { label: "Grade Level", value: `Grade ${transcript.student.grade_level}` },
                      { label: "Email", value: transcript.student.email },
                      { label: "Enrollment Date", value: transcript.student.enrollment_date ? new Date(transcript.student.enrollment_date).toLocaleDateString() : "N/A" },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">{item.value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Academic Summary */}
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                      <Star className="w-5 h-5 text-amber-500" />
                      Academic Summary
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: "Cumulative GPA", value: transcript.academic_summary.cumulative_gpa, suffix: "/ 4.00" },
                        { label: "Class Rank", value: `#${transcript.academic_summary.class_rank}`, suffix: `of ${transcript.academic_summary.total_class_students}` },
                        { label: "Credit Hours", value: transcript.academic_summary.total_credit_hours, suffix: "credits" },
                        { label: "Academic Standing", value: transcript.academic_summary.academic_standing, suffix: "" },
                      ].map((item) => (
                        <div key={item.label} className="rounded-xl border border-slate-200 dark:border-slate-600 p-4 bg-white dark:bg-slate-800">
                          <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">{item.label}</p>
                          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{item.value}</p>
                          {item.suffix && <p className="text-xs text-slate-400 dark:text-slate-500">{item.suffix}</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Subject Table */}
                  {transcript.subjects.length > 0 && (
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-sky-500" />
                        Subject Records
                      </h2>
                      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 dark:bg-slate-700">
                            <tr>
                              {["Subject", "Code", "Teacher", "Credit Hrs", "Avg Score", "Grade", "Points"].map((h) => (
                                <th key={h} className="text-left py-3 px-4 font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {transcript.subjects.map((subj, i) => (
                              <tr key={subj.subject_id} className={`border-t border-slate-100 dark:border-slate-700 ${i % 2 === 0 ? "" : "bg-slate-50/50 dark:bg-slate-700/30"}`}>
                                <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">{subj.subject_name}</td>
                                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{subj.subject_code}</td>
                                <td className="py-3 px-4 text-slate-500 dark:text-slate-400">{subj.teacher_name}</td>
                                <td className="py-3 px-4 text-center text-slate-900 dark:text-white">{subj.credit_hour}</td>
                                <td className="py-3 px-4 text-center font-semibold text-slate-900 dark:text-white">{subj.final_score}%</td>
                                <td className="py-3 px-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${getGradeColor(subj.letter_grade)}`}>
                                    {subj.letter_grade}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center text-slate-900 dark:text-white">{subj.earned_points.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-slate-100 dark:bg-slate-700 font-bold">
                            <tr>
                              <td colSpan={3} className="py-3 px-4 text-slate-900 dark:text-white text-sm">TOTAL</td>
                              <td className="py-3 px-4 text-center text-slate-900 dark:text-white">{transcript.academic_summary.total_credit_hours}</td>
                              <td className="py-3 px-4" />
                              <td className="py-3 px-4 text-slate-900 dark:text-white">GPA: {transcript.academic_summary.cumulative_gpa}</td>
                              <td className="py-3 px-4 text-center text-slate-900 dark:text-white">
                                {transcript.subjects.reduce((s, x) => s + x.earned_points, 0).toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Attendance + Conduct */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-600 p-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Attendance Record</h3>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-slate-600 dark:text-slate-400">Overall Rate</span>
                        <span className="font-bold text-slate-900 dark:text-white">{transcript.attendance.percentage}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${Math.min(Number(transcript.attendance.percentage), 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                        {transcript.attendance.present} present / {transcript.attendance.total} total days
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-600 p-4">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Conduct</h3>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl text-xl font-black ${getGradeColor(transcript.conduct.conduct)}`}>
                          {transcript.conduct.conduct}
                        </span>
                        <p className="text-sm text-slate-600 dark:text-slate-300 flex-1">{transcript.conduct.remarks}</p>
                      </div>
                    </div>
                  </div>

                  {/* Verification */}
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 p-4 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Verification Code</p>
                    <p className="text-base font-mono font-bold text-slate-900 dark:text-white mt-1">{transcript.verification_code}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      Generated: {new Date(transcript.generated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Transcript Unavailable</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your official transcript will be available once grades are recorded.
              </p>
            </div>
          )}
        </div>
      )}
      {/* ── SIMULATOR TAB ── */}
      {activeTab === "simulator" && (() => {
        const gradeScale: Record<string, number> = {
          "A+": 4.0, "A": 4.0, "A-": 3.7,
          "B+": 3.3, "B": 3.0, "B-": 2.7,
          "C+": 2.3, "C": 2.0, "C-": 1.7,
          "D": 1.0, "F": 0.0,
        };

        const totalSimCredits = simCourses.reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
        const totalSimPoints = simCourses.reduce(
          (sum, c) => sum + (Number(c.credits) || 0) * (gradeScale[c.grade] ?? 0),
          0
        );
        const simSemesterGpa = totalSimCredits > 0 ? (totalSimPoints / totalSimCredits).toFixed(2) : "0.00";

        // Projected Cumulative
        const currentCredits = transcript?.academic_summary?.total_credit_hours || 0;
        const currentPoints = (transcript?.academic_summary?.cumulative_gpa || 0) * currentCredits;
        const projectedTotalCredits = currentCredits + totalSimCredits;
        const projectedCumulativeGpa =
          projectedTotalCredits > 0
            ? ((currentPoints + totalSimPoints) / projectedTotalCredits).toFixed(2)
            : simSemesterGpa;

        const target = parseFloat(targetGpa) || 3.8;
        const requiredPoints = target * projectedTotalCredits - currentPoints;
        const requiredAvg = totalSimCredits > 0 ? (requiredPoints / totalSimCredits).toFixed(2) : "N/A";

        function addCourse() {
          setSimCourses([
            ...simCourses,
            { id: Date.now().toString(), name: `Course ${simCourses.length + 1}`, credits: 3, grade: "A" },
          ]);
        }

        function removeCourse(id: string) {
          setSimCourses(simCourses.filter((c) => c.id !== id));
        }

        function updateCourse(id: string, field: keyof SimCourse, val: any) {
          setSimCourses(
            simCourses.map((c) => (c.id === id ? { ...c, [field]: val } : c))
          );
        }

        function loadFromTranscript() {
          if (!transcript?.subjects?.length) return;
          setSimCourses(
            transcript.subjects.map((s, idx) => ({
              id: `${idx}`,
              name: s.subject_name,
              credits: s.credit_hour || 3,
              grade: s.letter_grade || "A",
            }))
          );
        }

        return (
          <div className="space-y-6">
            {/* Simulator Header / Summary Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white shadow-xl">
              <div className="absolute top-0 right-0 -mt-6 -mr-6 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
              <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-emerald-200 text-xs font-semibold uppercase tracking-wider">Simulated Term GPA</p>
                  <p className="text-4xl font-black mt-1">{simSemesterGpa}</p>
                  <p className="text-emerald-200 text-xs mt-1">From {totalSimCredits} credits</p>
                </div>
                <div>
                  <p className="text-emerald-200 text-xs font-semibold uppercase tracking-wider">Projected Cumulative</p>
                  <p className="text-4xl font-black mt-1">{projectedCumulativeGpa}</p>
                  <p className="text-emerald-200 text-xs mt-1">/ 4.00 Scale</p>
                </div>
                <div>
                  <p className="text-emerald-200 text-xs font-semibold uppercase tracking-wider">Target Goal GPA</p>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="number"
                      step="0.05"
                      min="0.0"
                      max="4.0"
                      value={targetGpa}
                      onChange={(e) => setTargetGpa(e.target.value)}
                      className="w-20 px-2 py-1 rounded-lg bg-white/20 text-white font-bold text-xl border border-white/30 focus:outline-none"
                    />
                  </div>
                  <p className="text-emerald-200 text-xs mt-1">
                    Req. Term Avg: <span className="font-bold text-white">{requiredAvg}</span>
                  </p>
                </div>
                <div>
                  <p className="text-emerald-200 text-xs font-semibold uppercase tracking-wider">Projected Honors</p>
                  <p className="text-base font-bold mt-1 leading-tight">
                    {Number(projectedCumulativeGpa) >= 3.8
                      ? "🏆 High Honors"
                      : Number(projectedCumulativeGpa) >= 3.5
                      ? "🎖️ Honors"
                      : Number(projectedCumulativeGpa) >= 2.0
                      ? "👍 Good Standing"
                      : "⚠️ Academic Warning"}
                  </p>
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">What-If Grade Simulator</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Experiment with different grade combinations to plan your semester target.
                </p>
              </div>
              <div className="flex gap-2">
                {transcript?.subjects?.length ? (
                  <button
                    onClick={loadFromTranscript}
                    className="px-3.5 py-2 text-xs font-semibold bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center gap-1.5"
                  >
                    <BookOpen className="w-4 h-4 text-sky-500" />
                    Load My Enrolled Courses
                  </button>
                ) : null}
                <button
                  onClick={addCourse}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Course
                </button>
              </div>
            </div>

            {/* Simulated Course Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-3 px-4 text-left font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider">
                        Course Name
                      </th>
                      <th className="py-3 px-4 text-center font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider w-32">
                        Credit Hours
                      </th>
                      <th className="py-3 px-4 text-center font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider w-36">
                        Predicted Grade
                      </th>
                      <th className="py-3 px-4 text-center font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider w-32">
                        Grade Points
                      </th>
                      <th className="py-3 px-4 text-center font-semibold text-slate-600 dark:text-slate-400 text-xs uppercase tracking-wider w-20">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {simCourses.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                        <td className="py-3 px-4">
                          <input
                            type="text"
                            value={c.name}
                            onChange={(e) => updateCourse(c.id, "name", e.target.value)}
                            className="w-full px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min="1"
                            max="6"
                            value={c.credits}
                            onChange={(e) => updateCourse(c.id, "credits", parseInt(e.target.value) || 1)}
                            className="w-20 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-center font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <select
                            value={c.grade}
                            onChange={(e) => updateCourse(c.id, "grade", e.target.value)}
                            className="w-28 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            {["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D", "F"].map((g) => (
                              <option key={g} value={g}>
                                {g} ({gradeScale[g].toFixed(1)})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-700 dark:text-slate-300">
                          {((Number(c.credits) || 0) * (gradeScale[c.grade] ?? 0)).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => removeCourse(c.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition"
                            title="Remove course"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 dark:bg-slate-700/50 font-bold border-t border-slate-200 dark:border-slate-700">
                    <tr>
                      <td className="py-3 px-4 text-slate-900 dark:text-white">Total Simulated</td>
                      <td className="py-3 px-4 text-center text-slate-900 dark:text-white">{totalSimCredits} credits</td>
                      <td className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">
                        Term GPA: {simSemesterGpa}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-900 dark:text-white">
                        {totalSimPoints.toFixed(2)} pts
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
