"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch, computeLetterGrade, Toast } from "../shared";

interface SchoolClass {
  class_id?: number;
  class_name: string;
  academic_year: string;
}

interface ClassSubject {
  class_subject_id: number;
  class_id: number;
  school_class?: SchoolClass;
  subject?: {
    subject_id: number;
    subject_name: string;
  };
}

interface Student {
  student_id: number;
  student_number: string;
  user?: { full_name: string; email: string };
  full_name?: string;
}

const ASSESSMENT_TYPES = [
  { id: "TEST", label: "Continuous Assessment (CA Test)", defaultMax: 20 },
  { id: "MID", label: "Midterm Examination", defaultMax: 30 },
  { id: "FINAL", label: "Final Examination", defaultMax: 50 },
  { id: "ASSIGNMENT", label: "Assignment Assessment", defaultMax: 20 },
  { id: "OTHER", label: "Practical / Participation / Other", defaultMax: 10 },
];

export default function GradePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<ClassSubject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [selectedAssessmentType, setSelectedAssessmentType] = useState<string>("TEST");
  const [maxScore, setMaxScore] = useState<number>(20);

  const [students, setStudents] = useState<Student[]>([]);
  const [scores, setScores] = useState<Record<number, { score: string; remarks: string }>>({});
  const [existingMarks, setExistingMarks] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submittingApproval, setSubmittingApproval] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [gradeStatus, setGradeStatus] = useState<"DRAFT" | "SUBMITTED" | "APPROVED">("DRAFT");
  const [toast, setToast] = useState<Toast | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

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
        const firstClassId = data[0].class_id || data[0].school_class?.class_id || data[0].class_subject_id;
        setSelectedClassId(firstClassId);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to load classes", "error");
    } finally {
      setLoading(false);
    }
  }

  // Load students & existing marks when selectedClassId changes
  useEffect(() => {
    if (selectedClassId && token) {
      loadClassData(selectedClassId);
    }
  }, [selectedClassId, token]);

  // Update default maxScore when assessment type changes
  useEffect(() => {
    const found = ASSESSMENT_TYPES.find((t) => t.id === selectedAssessmentType);
    if (found) {
      setMaxScore(found.defaultMax);
    }
  }, [selectedAssessmentType]);

  async function loadClassData(classId: number) {
    setStudentsLoading(true);
    setValidationErrors([]);
    try {
      // 1. Fetch class roster
      const rosterData = await authFetch(`/api/teacher/classes/${classId}/roster`, {}, token);
      const studentList: Student[] = rosterData.students || rosterData || [];
      setStudents(Array.isArray(studentList) ? studentList : []);

      // 2. Fetch existing grades
      const gradesData = await authFetch(`/api/teacher/grades/${classId}`, {}, token);
      const marksList = gradesData?.student_marks || [];
      setExistingMarks(marksList);

      // Initialize scores for current assessment type
      const initialScores: Record<number, { score: string; remarks: string }> = {};
      studentList.forEach((st) => {
        const studentMarkRecord = marksList.find((m: any) => m.student_id === st.student_id);
        const existingScore = studentMarkRecord?.marks?.[selectedAssessmentType];
        initialScores[st.student_id] = {
          score: existingScore !== undefined && existingScore !== null ? String(existingScore) : "",
          remarks: "",
        };
      });
      setScores(initialScores);
    } catch (e: any) {
      showToast(e.message || "Failed to load class grades and students", "error");
    } finally {
      setStudentsLoading(false);
    }
  }

  // Synchronize scores input whenever assessment type changes
  useEffect(() => {
    if (students.length > 0) {
      const newScores: Record<number, { score: string; remarks: string }> = {};
      students.forEach((st) => {
        const studentMarkRecord = existingMarks.find((m: any) => m.student_id === st.student_id);
        const existingScore = studentMarkRecord?.marks?.[selectedAssessmentType];
        newScores[st.student_id] = {
          score: existingScore !== undefined && existingScore !== null ? String(existingScore) : "",
          remarks: "",
        };
      });
      setScores(newScores);
    }
  }, [selectedAssessmentType, existingMarks]);

  function handleScoreChange(studentId: number, value: string) {
    setScores((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        score: value,
      },
    }));
  }

  function validateGrades(): boolean {
    const errors: string[] = [];
    if (!selectedClassId) errors.push("Please select a class.");
    if (students.length === 0) errors.push("No students enrolled in this class.");

    let hasEmpty = false;
    let hasOutOfRange = false;

    students.forEach((st) => {
      const val = scores[st.student_id]?.score;
      if (val === "" || val === undefined) {
        hasEmpty = true;
      } else {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0 || num > maxScore) {
          hasOutOfRange = true;
        }
      }
    });

    if (hasEmpty) {
      errors.push("All student scores must be entered before saving.");
    }
    if (hasOutOfRange) {
      errors.push(`Scores must be between 0 and the maximum score of ${maxScore}.`);
    }

    setValidationErrors(errors);
    return errors.length === 0;
  }

  async function handleSaveGrades(submitForApproval: boolean = false) {
    if (!validateGrades()) return;

    if (submitForApproval) {
      setSubmittingApproval(true);
    } else {
      setSaving(true);
    }

    try {
      const gradeEntries = students.map((st) => ({
        student_id: st.student_id,
        type: selectedAssessmentType,
        score: parseFloat(scores[st.student_id]?.score || "0"),
        class_id: selectedClassId,
      }));

      await authFetch(
        "/api/teacher/grades/bulk",
        {
          method: "POST",
          body: JSON.stringify({ grades: gradeEntries }),
        },
        token
      );

      if (submitForApproval) {
        setGradeStatus("SUBMITTED");
        showToast("Grades officially submitted to Department Head for approval!", "success");
      } else {
        showToast("Grades saved as draft successfully!", "success");
      }

      // Reload updated marks
      if (selectedClassId) {
        const gradesData = await authFetch(`/api/teacher/grades/${selectedClassId}`, {}, token);
        setExistingMarks(gradesData?.student_marks || []);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to save grades", "error");
    } finally {
      setSaving(false);
      setSubmittingApproval(false);
      setShowConfirmModal(false);
    }
  }

  const selectedClass = classes.find(
    (c) => (c.class_id || c.school_class?.class_id || c.class_subject_id) === selectedClassId
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 dark:border-slate-600 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading classes & grading portal...</p>
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

      {/* Confirmation Modal before Final Approval Submission */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Submit Grades for Approval?
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                You are about to submit the {selectedAssessmentType} grades for{" "}
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {selectedClass?.school_class?.class_name || "selected class"}
                </span>{" "}
                to the Department Head. Once approved, grades become final and cannot be modified without departmental authorization.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingApproval}
                onClick={() => handleSaveGrades(true)}
                className="px-5 py-2 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20"
              >
                {submittingApproval ? "Submitting..." : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Grade Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Continuous Assessment (CA) & Exam Entry with Department Head Approval
          </p>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status:</span>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              gradeStatus === "APPROVED"
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                : gradeStatus === "SUBMITTED"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
            }`}
          >
            {gradeStatus}
          </span>
        </div>
      </div>

      {/* Step 1 & Step 2: Class & Assessment Config Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Step 1: Select Class */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Step 1: Select Class *
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

          {/* Step 2: Select Grade Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Step 2: Assessment Type *
            </label>
            <select
              value={selectedAssessmentType}
              onChange={(e) => setSelectedAssessmentType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            >
              {ASSESSMENT_TYPES.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Max Score Setting */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Maximum Score *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="100"
                value={maxScore}
                onChange={(e) => setMaxScore(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
              <span className="text-xs font-semibold text-slate-400">PTS</span>
            </div>
          </div>
        </div>
      </div>

      {/* Validation Errors Alert */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <ul className="list-disc list-inside space-y-1">
            {validationErrors.map((err, i) => (
              <li key={i} className="text-sm text-red-600 dark:text-red-400">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Step 3: Enter Scores Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* Table Actions Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h2 className="font-bold text-slate-900 dark:text-white text-lg">
              Step 3: Enter Student Scores
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Grading {selectedAssessmentType} (Max: {maxScore} pts) · {students.length} students
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={saving || studentsLoading}
              onClick={() => handleSaveGrades(false)}
              className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            >
              {saving ? "Saving Draft..." : "Save Draft"}
            </button>
            <button
              type="button"
              disabled={submittingApproval || studentsLoading}
              onClick={() => {
                if (validateGrades()) {
                  setShowConfirmModal(true);
                }
              }}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20"
            >
              Submit for Approval
            </button>
          </div>
        </div>

        {/* Roster / Score Entry */}
        {studentsLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Loading student roster...</p>
            </div>
          </div>
        ) : students.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-slate-500 dark:text-slate-400 font-medium">No students found in this class.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700/50 text-left border-b border-slate-200 dark:border-slate-700">
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">#</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student Name</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student ID</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                    Score (out of {maxScore})
                  </th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Percentage</th>
                  <th className="px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">Letter Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {students.map((st, idx) => {
                  const scoreVal = scores[st.student_id]?.score;
                  const numScore = parseFloat(scoreVal || "0");
                  const hasValue = scoreVal !== "" && scoreVal !== undefined && !isNaN(numScore);
                  const pct = hasValue ? Math.round((numScore / maxScore) * 100) : null;
                  const letter = hasValue ? computeLetterGrade(numScore, maxScore) : "-";
                  const isInvalid = hasValue && (numScore < 0 || numScore > maxScore);

                  return (
                    <tr key={st.student_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40 transition">
                      <td className="px-5 py-4 text-sm text-slate-400 font-medium">{idx + 1}</td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">
                          {st.user?.full_name || st.full_name || "Student"}
                        </p>
                        <p className="text-xs text-slate-400">{st.user?.email || ""}</p>
                      </td>
                      <td className="px-5 py-4 text-sm text-slate-500 dark:text-slate-400 font-mono">
                        {st.student_number || `STU-${st.student_id}`}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <input
                            type="number"
                            min="0"
                            max={maxScore}
                            step="0.5"
                            value={scoreVal ?? ""}
                            onChange={(e) => handleScoreChange(st.student_id, e.target.value)}
                            placeholder="0.0"
                            className={`w-24 text-center rounded-xl border px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 transition ${
                              isInvalid
                                ? "border-red-400 bg-red-50 text-red-700 focus:ring-red-500"
                                : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-emerald-500"
                            }`}
                          />
                          <span className="text-xs text-slate-400 font-medium">/{maxScore}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                          {pct !== null ? `${pct}%` : "-"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                            letter === "A"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : letter === "B"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : letter === "C"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : letter === "D"
                              ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                              : letter === "F"
                              ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                              : "text-slate-400"
                          }`}
                        >
                          {letter}
                        </span>
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
  );
}
