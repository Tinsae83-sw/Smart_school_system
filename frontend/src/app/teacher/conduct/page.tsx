"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch, Toast } from "../shared";

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

interface ConductEntry {
  conduct_id?: number;
  grade: "A" | "B" | "C" | "D" | "F" | "";
  rating: number; // 1 to 5
  comments: string;
  existingComments?: {
    comment_id: number;
    comment: string;
    subject?: string;
    created_at?: string;
    teacher?: { user?: { full_name: string } };
  }[];
}

const GRADE_OPTIONS: ("A" | "B" | "C" | "D" | "F")[] = ["A", "B", "C", "D", "F"];

export default function ConductPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<ClassSubject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [term, setTerm] = useState("1");
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString());

  const [students, setStudents] = useState<Student[]>([]);
  const [conductMap, setConductMap] = useState<Record<number, ConductEntry>>({});

  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [individualSaving, setIndividualSaving] = useState<Record<number, boolean>>({});
  const [addingCommentFor, setAddingCommentFor] = useState<number | null>(null);
  const [newCommentText, setNewCommentText] = useState("");
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

  useEffect(() => {
    if (selectedClassId && token) {
      loadClassStudentsAndConduct(selectedClassId, term, academicYear);
    }
  }, [selectedClassId, term, academicYear, token]);

  async function loadClassStudentsAndConduct(classId: number, t: string, year: string) {
    setStudentsLoading(true);
    try {
      // 1. Load students roster
      const rosterData = await authFetch(`/api/teacher/classes/${classId}/roster`, {}, token);
      const studentList: Student[] = rosterData.students || rosterData || [];
      setStudents(Array.isArray(studentList) ? studentList : []);

      // 2. Load existing conduct records
      const conductData = await authFetch(
        `/api/teacher/conduct/${classId}?term=${t}&academic_year=${year}`,
        {},
        token
      );
      const existingList = Array.isArray(conductData) ? conductData : [];

      // Initialize conductMap
      const newMap: Record<number, ConductEntry> = {};
      studentList.forEach((st) => {
        const found = existingList.find((c: any) => c.student_id === st.student_id);
        if (found) {
          newMap[st.student_id] = {
            conduct_id: found.conduct_id,
            grade: (found.grade || "B") as any,
            rating: found.rating || 4,
            comments: found.comments || "",
            existingComments: found.conduct_comments || [],
          };
        } else {
          newMap[st.student_id] = {
            grade: "B",
            rating: 4,
            comments: "",
            existingComments: [],
          };
        }
      });
      setConductMap(newMap);
    } catch (e: any) {
      showToast(e.message || "Failed to load conduct records", "error");
    } finally {
      setStudentsLoading(false);
    }
  }

  function handleFieldChange(studentId: number, field: keyof ConductEntry, value: any) {
    setConductMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value,
      },
    }));
  }

  // Save individual student conduct
  async function handleSaveIndividual(studentId: number) {
    const entry = conductMap[studentId];
    if (!entry.grade) {
      showToast("Please select a conduct grade before saving.", "error");
      return;
    }
    if (entry.comments.length > 500) {
      showToast("Behavioral comment exceeds 500 character limit.", "error");
      return;
    }

    setIndividualSaving((prev) => ({ ...prev, [studentId]: true }));
    try {
      const res = await authFetch(
        "/api/teacher/conduct",
        {
          method: "POST",
          body: JSON.stringify({
            student_id: studentId,
            term,
            academic_year: academicYear,
            grade: entry.grade,
            rating: entry.rating,
            comments: entry.comments,
          }),
        },
        token
      );

      setConductMap((prev) => ({
        ...prev,
        [studentId]: {
          ...prev[studentId],
          conduct_id: res?.conduct_id || prev[studentId]?.conduct_id,
        },
      }));

      showToast("Conduct grade saved successfully!", "success");
    } catch (e: any) {
      showToast(e.message || "Failed to save conduct", "error");
    } finally {
      setIndividualSaving((prev) => ({ ...prev, [studentId]: false }));
    }
  }

  // Save all students conduct in bulk
  async function handleSaveAll() {
    // Validation
    const invalidEntry = Object.values(conductMap).find(
      (entry) => !entry.grade || entry.comments.length > 500
    );
    if (invalidEntry) {
      showToast("All students must have a grade selected and comments under 500 characters.", "error");
      return;
    }

    setBulkSaving(true);
    try {
      const submissions = students.map((st) => {
        const entry = conductMap[st.student_id] || { grade: "B", rating: 4, comments: "" };
        return {
          student_id: st.student_id,
          term,
          academic_year: academicYear,
          grade: entry.grade,
          rating: entry.rating,
          comments: entry.comments,
        };
      });

      await authFetch(
        "/api/teacher/conduct/bulk",
        {
          method: "POST",
          body: JSON.stringify({ grades: submissions }),
        },
        token
      );

      showToast("All conduct grades saved successfully!", "success");
      if (selectedClassId) {
        loadClassStudentsAndConduct(selectedClassId, term, academicYear);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to save conduct grades", "error");
    } finally {
      setBulkSaving(false);
    }
  }

  // Add behavioral observation note to existing conduct entry
  async function handleAddComment(studentId: number, conductId: number) {
    if (!newCommentText.trim()) return;
    if (newCommentText.length > 500) {
      showToast("Comment exceeds 500 character limit.", "error");
      return;
    }

    try {
      const created = await authFetch(
        `/api/teacher/conduct/${conductId}/comment`,
        {
          method: "POST",
          body: JSON.stringify({
            comment: newCommentText.trim(),
            subject: "Behavioral Progress Observation",
          }),
        },
        token
      );

      setConductMap((prev) => {
        const studentEntry = prev[studentId];
        return {
          ...prev,
          [studentId]: {
            ...studentEntry,
            existingComments: [created, ...(studentEntry.existingComments || [])],
          },
        };
      });

      setNewCommentText("");
      setAddingCommentFor(null);
      showToast("Observation comment added!", "success");
    } catch (e: any) {
      showToast(e.message || "Failed to add comment", "error");
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
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading conduct management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
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
            Conduct & Behavioral Evaluation
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Track student discipline, assign conduct ratings (A–F), and record behavioral notes
          </p>
        </div>

        <button
          type="button"
          disabled={bulkSaving || studentsLoading || students.length === 0}
          onClick={handleSaveAll}
          className="rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 disabled:opacity-50"
        >
          {bulkSaving ? "Saving All..." : "Save All Students"}
        </button>
      </div>

      {/* Filter / Config Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-3">
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

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Academic Term *
            </label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            >
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="3">Term 3</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Academic Year *
            </label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Student Conduct List */}
      {studentsLoading ? (
        <div className="flex items-center justify-center py-20 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading student conduct records...</p>
          </div>
        </div>
      ) : students.length === 0 ? (
        <div className="py-20 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400 font-medium">No students enrolled in this class.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {students.map((st) => {
            const entry = conductMap[st.student_id] || { grade: "B", rating: 4, comments: "" };
            const isSaving = individualSaving[st.student_id] || false;
            const charCount = (entry.comments || "").length;

            return (
              <div
                key={st.student_id}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Student Basic Info */}
                  <div className="lg:w-1/4">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {st.user?.full_name || st.full_name || "Student"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                      {st.student_number || `STU-${st.student_id}`}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{st.user?.email || ""}</p>

                    <div className="mt-4 flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rating:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleFieldChange(st.student_id, "rating", star)}
                            className="text-lg leading-none transition hover:scale-110 focus:outline-none"
                          >
                            <span className={star <= entry.rating ? "text-amber-400" : "text-slate-300 dark:text-slate-600"}>
                              ★
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Grade Selector & Comment Textarea */}
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                        Conduct Grade (A to F)
                      </label>
                      <div className="flex items-center gap-2">
                        {GRADE_OPTIONS.map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => handleFieldChange(st.student_id, "grade", g)}
                            className={`w-10 h-10 rounded-xl font-bold text-sm transition border ${
                              entry.grade === g
                                ? g === "A"
                                  ? "bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-500/20"
                                  : g === "B"
                                  ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20"
                                  : g === "C"
                                  ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/20"
                                  : g === "D"
                                  ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/20"
                                  : "bg-red-600 border-red-600 text-white shadow-md shadow-red-500/20"
                                : "bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                            }`}
                          >
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Behavioral Remarks & Teacher Notes
                        </label>
                        <span className={`text-xs ${charCount > 500 ? "text-red-500 font-bold" : "text-slate-400"}`}>
                          {charCount} / 500 characters
                        </span>
                      </div>
                      <textarea
                        rows={2}
                        maxLength={500}
                        value={entry.comments || ""}
                        onChange={(e) => handleFieldChange(st.student_id, "comments", e.target.value)}
                        placeholder="Write behavioral observations, attitude notes, disciplinary remarks..."
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                      />
                    </div>

                    {/* Display existing comments / log */}
                    {entry.existingComments && entry.existingComments.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                          Observation History:
                        </p>
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {entry.existingComments.map((ec) => (
                            <div
                              key={ec.comment_id}
                              className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-2.5 text-xs text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700"
                            >
                              <div className="flex items-center justify-between font-medium text-slate-500 dark:text-slate-400 mb-1">
                                <span>{ec.teacher?.user?.full_name || "Teacher"}</span>
                                <span>{ec.created_at ? new Date(ec.created_at).toLocaleDateString() : ""}</span>
                              </div>
                              <p>{ec.comment}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions & Comment Modal Trigger */}
                  <div className="lg:w-44 flex flex-col gap-2 pt-4 lg:pt-0">
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => handleSaveIndividual(st.student_id)}
                      className="w-full rounded-xl bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white px-4 py-2 text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save Record"}
                    </button>

                    {entry.conduct_id && (
                      <button
                        type="button"
                        onClick={() => {
                          setAddingCommentFor(st.student_id);
                          setNewCommentText("");
                        }}
                        className="w-full rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 px-4 py-2 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                      >
                        + Add Observation
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Add Observation Form */}
                {addingCommentFor === st.student_id && entry.conduct_id && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Append Observation Log
                      </span>
                      <span className="text-xs text-slate-400">{newCommentText.length} / 500</span>
                    </div>
                    <textarea
                      rows={2}
                      maxLength={500}
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Note down specific incident, commendation, or improvement..."
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setAddingCommentFor(null)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddComment(st.student_id, entry.conduct_id!)}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Save Observation
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
