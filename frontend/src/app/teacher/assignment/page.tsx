"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import {
  authFetch,
  computeLetterGrade,
  formatDisplayDate,
  formatDisplayDateTime,
  Toast,
} from "../shared";

interface ClassSubject {
  class_subject_id: number;
  class_id: number;
  school_class?: { class_id?: number; class_name: string };
  subject?: { subject_id?: number; subject_name: string };
}

interface StudentRosterItem {
  student_id: number;
  student_number: string;
  user?: {
    user_id: number;
    full_name: string;
    email: string;
    phone_number?: string;
  };
}

interface Submission {
  submission_id: number;
  student_id: number;
  content?: string;
  file_url?: string;
  submitted_at: string;
  student?: {
    student_number?: string;
    user?: { full_name: string; email: string };
    full_name?: string;
  };
  grade?: {
    grade_id?: number;
    score: number;
    letter_grade?: string;
    feedback?: string;
  };
}

interface Assignment {
  assignment_id: number;
  class_subject_id: number;
  student_id?: number | null;
  student?: {
    student_id: number;
    student_number?: string;
    user?: { full_name: string; email: string };
  };
  title: string;
  description?: string;
  due_date: string;
  max_score: number;
  class_subject?: ClassSubject;
  submissions?: Submission[];
}

interface IndividualAssignmentDraft {
  student_id: number;
  student_name: string;
  student_number: string;
  title: string;
  description: string;
  max_score: string;
  due_date: string;
}

export default function AssignmentPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [activeTab, setActiveTab] = useState<"list" | "create" | "grade">("list");
  const [classes, setClasses] = useState<ClassSubject[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Scope mode: "class" for one or multiple classes, "individual" for different titles per student
  const [assignmentScope, setAssignmentScope] = useState<"class" | "individual">("class");

  // Multi-class selection state
  const [selectedClassSubjectIds, setSelectedClassSubjectIds] = useState<number[]>([]);

  // Base Form State
  const [createForm, setCreateForm] = useState({
    title: "",
    due_date: "",
    max_score: "100",
    description: "",
    allow_resubmission: false,
    resubmission_deadline: "",
    max_resubmissions: "1",
  });

  // Individual Students State
  const [individualClassSubjectId, setIndividualClassSubjectId] = useState<number | "">("");
  const [classRoster, setClassRoster] = useState<StudentRosterItem[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [individualDrafts, setIndividualDrafts] = useState<Record<number, IndividualAssignmentDraft>>({});

  // Validation States
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [createErrors, setCreateErrors] = useState<string[]>([]);
  const [createLoading, setCreateLoading] = useState(false);

  // Assignment List Filter & Search State
  const [listSearch, setListSearch] = useState("");
  const [listClassFilter, setListClassFilter] = useState<string>("ALL");
  const [listScopeFilter, setListScopeFilter] = useState<"ALL" | "CLASS" | "INDIVIDUAL">("ALL");

  // Grade Submissions State
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<number | null>(null);
  const [gradingState, setGradingState] = useState<
    Record<number, { score: string; feedback: string; isSaving?: boolean }>
  >({});

  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (text: string, type: Toast["type"]) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadData(savedToken);
  }, [router]);

  async function loadData(tok: string) {
    try {
      const [classesData, assignmentsData] = await Promise.all([
        authFetch("/api/teacher/classes", {}, tok),
        authFetch("/api/teacher/assignments", {}, tok),
      ]);

      const classList: ClassSubject[] = Array.isArray(classesData) ? classesData : [];
      setClasses(classList);

      if (classList.length > 0) {
        setSelectedClassSubjectIds([classList[0].class_subject_id]);
        setIndividualClassSubjectId(classList[0].class_subject_id);
        loadClassRoster(classList[0].class_id, tok);
      }

      const assignList: Assignment[] = Array.isArray(assignmentsData) ? assignmentsData : [];
      setAssignments(assignList);
      if (assignList.length > 0) {
        setSelectedAssignmentId(assignList[0].assignment_id);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to load teacher portal data", "error");
    } finally {
      setLoading(false);
    }
  }

  // Load roster when teacher changes class in Individual Mode
  async function loadClassRoster(classId: number, tok = token) {
    if (!classId || !tok) return;
    setRosterLoading(true);
    try {
      const roster = await authFetch(`/api/teacher/classes/${classId}/roster`, {}, tok);
      const studentList: StudentRosterItem[] = Array.isArray(roster) ? roster : [];
      setClassRoster(studentList);
      // Reset selected individual drafts when class changes
      setIndividualDrafts({});
    } catch (e: any) {
      showToast(e.message || "Failed to load class roster", "error");
    } finally {
      setRosterLoading(false);
    }
  }

  // Handle class change in Individual mode
  function handleIndividualClassChange(classSubjectId: number) {
    setIndividualClassSubjectId(classSubjectId);
    const selectedCS = classes.find((c) => c.class_subject_id === classSubjectId);
    if (selectedCS) {
      loadClassRoster(selectedCS.class_id);
    }
  }

  // Toggle student selection in individual mode
  function toggleStudentSelection(student: StudentRosterItem) {
    setIndividualDrafts((prev) => {
      const copy = { ...prev };
      if (copy[student.student_id]) {
        delete copy[student.student_id];
      } else {
        copy[student.student_id] = {
          student_id: student.student_id,
          student_name: student.user?.full_name || `Student #${student.student_id}`,
          student_number: student.student_number || `STU-${student.student_id}`,
          title: createForm.title ? `${createForm.title} - ${student.user?.full_name?.split(" ")[0] || "Custom"}` : "",
          description: createForm.description,
          max_score: createForm.max_score || "100",
          due_date: createForm.due_date || "",
        };
      }
      return copy;
    });
  }

  // Select all / deselect all students
  function handleSelectAllStudents(select: boolean) {
    if (!select) {
      setIndividualDrafts({});
      return;
    }
    const newDrafts: Record<number, IndividualAssignmentDraft> = {};
    classRoster.forEach((student) => {
      newDrafts[student.student_id] = {
        student_id: student.student_id,
        student_name: student.user?.full_name || `Student #${student.student_id}`,
        student_number: student.student_number || `STU-${student.student_id}`,
        title: createForm.title ? `${createForm.title} - ${student.user?.full_name?.split(" ")[0] || "Topic"}` : "",
        description: createForm.description,
        max_score: createForm.max_score || "100",
        due_date: createForm.due_date || "",
      };
    });
    setIndividualDrafts(newDrafts);
  }

  // Reload assignments
  async function reloadAssignments() {
    try {
      const data = await authFetch("/api/teacher/assignments", {}, token);
      setAssignments(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showToast(e.message || "Failed to refresh assignments", "error");
    }
  }

  // Live validation checks
  const validationErrors = useMemo(() => {
    const errors: Record<string, string> = {};

    if (assignmentScope === "class") {
      if (selectedClassSubjectIds.length === 0) {
        errors.classes = "Please select at least one class to receive this assignment.";
      }
      if (!createForm.title.trim()) {
        errors.title = "Assignment title is required.";
      } else if (createForm.title.trim().length < 3) {
        errors.title = "Title must be at least 3 characters.";
      } else if (createForm.title.trim().length > 200) {
        errors.title = "Title cannot exceed 200 characters.";
      }
    } else {
      // Individual mode
      if (!individualClassSubjectId) {
        errors.individualClass = "Please choose a class to assign students from.";
      }
      const draftList = Object.values(individualDrafts);
      if (draftList.length === 0) {
        errors.students = "Select at least one student to give an individual assignment.";
      } else {
        draftList.forEach((d) => {
          if (!d.title || d.title.trim().length < 3) {
            errors[`student_${d.student_id}_title`] = `Title for ${d.student_name} must be at least 3 characters.`;
          }
          if (d.max_score) {
            const score = parseFloat(d.max_score);
            if (isNaN(score) || score <= 0 || score > 1000) {
              errors[`student_${d.student_id}_score`] = `Score for ${d.student_name} must be between 1 and 1000.`;
            }
          }
        });
      }
    }

    // Common due date
    if (!createForm.due_date) {
      errors.due_date = "Due date is required.";
    } else {
      const dueDateObj = new Date(createForm.due_date);
      if (isNaN(dueDateObj.getTime())) {
        errors.due_date = "Please enter a valid date.";
      } else if (dueDateObj <= new Date()) {
        errors.due_date = "Due date must be set in the future.";
      }
    }

    // Common max score
    const numMax = parseFloat(createForm.max_score);
    if (!createForm.max_score || isNaN(numMax) || numMax <= 0 || numMax > 1000) {
      errors.max_score = "Maximum score must be a number between 1 and 1000.";
    }

    // Resubmission deadline check
    if (createForm.allow_resubmission && createForm.resubmission_deadline) {
      const resubDate = new Date(createForm.resubmission_deadline);
      const dueDateObj = new Date(createForm.due_date);
      if (!isNaN(resubDate.getTime()) && !isNaN(dueDateObj.getTime()) && resubDate <= dueDateObj) {
        errors.resubmission = "Resubmission deadline must be after the original due date.";
      }
    }

    return errors;
  }, [assignmentScope, selectedClassSubjectIds, createForm, individualClassSubjectId, individualDrafts]);

  // Handle Form Submission
  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();

    // Mark all touched
    const touched: Record<string, boolean> = {
      title: true,
      due_date: true,
      max_score: true,
      classes: true,
      individualClass: true,
      students: true,
    };
    setTouchedFields(touched);

    const errorList = Object.values(validationErrors);
    if (errorList.length > 0) {
      setCreateErrors(errorList);
      showToast("Please correct the highlighted validation errors.", "error");
      return;
    }

    setCreateErrors([]);
    setCreateLoading(true);

    try {
      if (assignmentScope === "class") {
        // Multi-Class / Single Class Creation
        const payload = {
          class_subject_ids: selectedClassSubjectIds,
          title: createForm.title.trim(),
          description: createForm.description.trim() || null,
          due_date: new Date(createForm.due_date).toISOString(),
          max_score: parseFloat(createForm.max_score),
          attachments: [],
          allow_resubmission: createForm.allow_resubmission,
          resubmission_deadline: createForm.allow_resubmission && createForm.resubmission_deadline
            ? new Date(createForm.resubmission_deadline).toISOString()
            : null,
          max_resubmissions: parseInt(createForm.max_resubmissions) || 1,
        };

        const res = await authFetch("/api/teacher/assignments", { method: "POST", body: JSON.stringify(payload) }, token);

        const count = res?.count || (Array.isArray(res) ? res.length : 1);
        showToast(
          count > 1
            ? `Successfully created assignment across ${count} classes!`
            : "Assignment created successfully!",
          "success"
        );
      } else {
        // Individual Student Assignments with Different Titles
        const selectedDrafts = Object.values(individualDrafts);
        const individualPayload = selectedDrafts.map((d) => ({
          student_id: d.student_id,
          title: d.title.trim(),
          description: d.description.trim() || createForm.description.trim() || null,
          max_score: d.max_score ? parseFloat(d.max_score) : parseFloat(createForm.max_score),
          due_date: d.due_date ? new Date(d.due_date).toISOString() : new Date(createForm.due_date).toISOString(),
        }));

        const payload = {
          class_subject_id: individualClassSubjectId,
          due_date: new Date(createForm.due_date).toISOString(),
          max_score: parseFloat(createForm.max_score),
          description: createForm.description.trim() || null,
          allow_resubmission: createForm.allow_resubmission,
          individual_assignments: individualPayload,
        };

        const res = await authFetch("/api/teacher/assignments", { method: "POST", body: JSON.stringify(payload) }, token);

        showToast(
          `Successfully published ${res?.count || individualPayload.length} individual assignments with custom titles!`,
          "success"
        );
      }

      // Reset form
      setCreateForm({
        title: "",
        due_date: "",
        max_score: "100",
        description: "",
        allow_resubmission: false,
        resubmission_deadline: "",
        max_resubmissions: "1",
      });
      setIndividualDrafts({});
      setTouchedFields({});

      await reloadAssignments();
      setActiveTab("list");
    } catch (e: any) {
      showToast(e.message || "Failed to create assignment(s)", "error");
    } finally {
      setCreateLoading(false);
    }
  }

  // Handle Delete Assignment
  async function handleDeleteAssignment(assignmentId: number) {
    if (!confirm("Are you sure you want to delete this assignment? All submissions will also be deleted.")) {
      return;
    }

    try {
      await authFetch(`/api/teacher/assignments/${assignmentId}`, { method: "DELETE" }, token);
      showToast("Assignment deleted successfully!", "success");
      setAssignments((prev) => prev.filter((a) => a.assignment_id !== assignmentId));
      if (selectedAssignmentId === assignmentId) {
        setSelectedAssignmentId(assignments[0]?.assignment_id || null);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to delete assignment", "error");
    }
  }

  // Selected Assignment for Grading
  const selectedAssignment = assignments.find((a) => a.assignment_id === selectedAssignmentId);

  useEffect(() => {
    if (selectedAssignment && selectedAssignment.submissions) {
      const initial: Record<number, { score: string; feedback: string }> = {};
      selectedAssignment.submissions.forEach((sub) => {
        initial[sub.submission_id] = {
          score: sub.grade?.score !== undefined ? String(sub.grade.score) : "",
          feedback: sub.grade?.feedback || "",
        };
      });
      setGradingState(initial);
    }
  }, [selectedAssignmentId, assignments]);

  // Handle Grade Submission
  async function handleGradeSubmission(submissionId: number) {
    if (!selectedAssignment) return;

    const gState = gradingState[submissionId];
    if (!gState || gState.score === "") {
      showToast("Please enter a numeric score.", "error");
      return;
    }

    const scoreNum = parseFloat(gState.score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > selectedAssignment.max_score) {
      showToast(`Score must be a number between 0 and ${selectedAssignment.max_score}.`, "error");
      return;
    }

    setGradingState((prev) => ({
      ...prev,
      [submissionId]: { ...prev[submissionId], isSaving: true },
    }));

    try {
      const letter = computeLetterGrade(scoreNum, selectedAssignment.max_score);
      await authFetch(
        `/api/teacher/assignments/${selectedAssignment.assignment_id}/grade`,
        {
          method: "POST",
          body: JSON.stringify({
            submission_id: submissionId,
            score: scoreNum,
            letter_grade: letter,
            feedback: gState.feedback.trim(),
          }),
        },
        token
      );

      showToast("Submission graded successfully!", "success");
      await reloadAssignments();
    } catch (e: any) {
      showToast(e.message || "Failed to submit grade", "error");
    } finally {
      setGradingState((prev) => ({
        ...prev,
        [submissionId]: { ...prev[submissionId], isSaving: false },
      }));
    }
  }

  // Filtered Assignments List
  const filteredAssignments = useMemo(() => {
    return assignments.filter((assign) => {
      // Scope Filter
      if (listScopeFilter === "CLASS" && assign.student_id !== null && assign.student_id !== undefined) {
        return false;
      }
      if (listScopeFilter === "INDIVIDUAL" && (assign.student_id === null || assign.student_id === undefined)) {
        return false;
      }

      // Class Subject Filter
      if (listClassFilter !== "ALL" && assign.class_subject_id !== Number(listClassFilter)) {
        return false;
      }

      // Search Query
      if (listSearch.trim()) {
        const query = listSearch.toLowerCase();
        const titleMatch = assign.title.toLowerCase().includes(query);
        const descMatch = assign.description?.toLowerCase().includes(query);
        const studentMatch =
          assign.student?.user?.full_name?.toLowerCase().includes(query) ||
          assign.student?.student_number?.toLowerCase().includes(query);
        const classMatch = assign.class_subject?.school_class?.class_name?.toLowerCase().includes(query);
        const subjectMatch = assign.class_subject?.subject?.subject_name?.toLowerCase().includes(query);

        return Boolean(titleMatch || descMatch || studentMatch || classMatch || subjectMatch);
      }

      return true;
    });
  }, [assignments, listScopeFilter, listClassFilter, listSearch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 dark:border-slate-600 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading assignments portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-2xl border px-5 py-4 shadow-xl max-w-md animate-in slide-in-from-right-4 duration-300 ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200"
              : "bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-900 dark:text-red-200"
          }`}
        >
          <div className="text-lg">
            {toast.type === "success" ? "✓" : "⚠️"}
          </div>
          <span className="text-sm font-medium leading-relaxed">{toast.text}</span>
        </div>
      )}

      {/* Top Header & Navigation Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>📚</span> Assignments & Assessments
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Create multi-class coursework, assign individualized topics to students, and grade submissions.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === "list"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All Assignments ({assignments.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("create")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                activeTab === "create"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <span>+</span> Create Assignment
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("grade")}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                activeTab === "grade"
                  ? "bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Grade Submissions
            </button>
          </div>
        </div>
      </div>

      {/* ── TAB 1: ALL ASSIGNMENTS LIST ────────────────────────────────────────── */}
      {activeTab === "list" && (
        <div className="space-y-6">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm flex flex-col md:flex-row items-center gap-4">
            <div className="flex-1 w-full">
              <input
                type="text"
                placeholder="Search by title, student name, class or subject..."
                value={listSearch}
                onChange={(e) => setListSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <select
                value={listScopeFilter}
                onChange={(e) => setListScopeFilter(e.target.value as any)}
                className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Scopes</option>
                <option value="CLASS">Class-wide Only</option>
                <option value="INDIVIDUAL">Individual Student Only</option>
              </select>

              <select
                value={listClassFilter}
                onChange={(e) => setListClassFilter(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">All Classes & Subjects</option>
                {classes.map((cls) => (
                  <option key={cls.class_subject_id} value={cls.class_subject_id}>
                    {cls.school_class?.class_name} • {cls.subject?.subject_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Assignments Grid */}
          {filteredAssignments.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-2xl mb-3">
                📋
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No assignments found</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                {assignments.length === 0
                  ? "You haven't created any assignments yet. Switch to 'Create Assignment' to publish your first coursework."
                  : "No assignments match the selected filter or search term."}
              </p>
              {assignments.length === 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab("create")}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-sm"
                >
                  Create First Assignment
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredAssignments.map((assign) => {
                const totalSubmissions = assign.submissions?.length || 0;
                const gradedSubmissions =
                  assign.submissions?.filter((s) => s.grade !== null && s.grade !== undefined).length || 0;
                const isOverdue = new Date(assign.due_date) < new Date();
                const isIndividual = Boolean(assign.student_id);

                return (
                  <div
                    key={assign.assignment_id}
                    className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Badge row: Class vs Individual */}
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        {isIndividual ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <span>👤</span> Individual Task
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <span>🏫</span> Class Assignment
                          </span>
                        )}

                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            isOverdue
                              ? "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800"
                              : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                          }`}
                        >
                          {isOverdue ? "Deadline Passed" : "Active"}
                        </span>
                      </div>

                      {/* Targeted Student if individual */}
                      {isIndividual && assign.student && (
                        <div className="mt-2 mb-3 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900 rounded-xl p-2.5">
                          <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">
                            Assigned to Student
                          </p>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {assign.student.user?.full_name || "Assigned Student"}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            {assign.student.student_number || `ID: ${assign.student.student_id}`}
                          </p>
                        </div>
                      )}

                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1 line-clamp-2">
                        {assign.title}
                      </h3>

                      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                        {assign.class_subject?.school_class?.class_name} • {assign.class_subject?.subject?.subject_name}
                      </div>

                      {assign.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                          {assign.description}
                        </p>
                      )}

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Due:</span>{" "}
                          {formatDisplayDate(assign.due_date)}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">Max:</span>{" "}
                          {assign.max_score} pts
                        </div>
                      </div>

                      {/* Submissions tracker */}
                      <div className="mt-3 bg-slate-50 dark:bg-slate-700/50 p-2.5 rounded-xl">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          <span>Submissions</span>
                          <span>
                            {gradedSubmissions} / {totalSubmissions} Graded
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-600 overflow-hidden">
                          <div
                            className="h-1.5 rounded-full bg-emerald-500 transition-all duration-300"
                            style={{
                              width: `${
                                totalSubmissions > 0 ? (gradedSubmissions / totalSubmissions) * 100 : 0
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteAssignment(assign.assignment_id)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition"
                      >
                        Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAssignmentId(assign.assignment_id);
                          setActiveTab("grade");
                        }}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                      >
                        Grade ({totalSubmissions})
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: CREATE ASSIGNMENT ────────────────────────────────────────── */}
      {activeTab === "create" && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 md:p-8 shadow-sm max-w-4xl">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Create New Assignment
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Publish coursework for multiple classes at once, or assign individual custom topics to specific students.
            </p>
          </div>

          {/* Validation Alert Banner */}
          {createErrors.length > 0 && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-red-800 dark:text-red-300 font-bold text-sm mb-2">
                <span>⚠️</span> Validation Errors:
              </div>
              <ul className="list-disc list-inside space-y-1">
                {createErrors.map((err, i) => (
                  <li key={i} className="text-xs text-red-700 dark:text-red-400 font-medium">
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={handleCreateAssignment} className="space-y-6">
            {/* 1. Target Scope Switcher */}
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                Assignment Target Scope *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setAssignmentScope("class")}
                  className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                    assignmentScope === "class"
                      ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <div className="text-2xl">🏫</div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      Entire Class / Multiple Classes
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Distribute the same assignment across one or several classes you teach
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAssignmentScope("individual")}
                  className={`p-4 rounded-xl border text-left transition flex items-start gap-3 ${
                    assignmentScope === "individual"
                      ? "border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 ring-2 ring-purple-500"
                      : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <div className="text-2xl">👤</div>
                  <div>
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      Individual Students (Different Titles)
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Assign customized topics and individual titles to specific students
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* ── SCOPE A: MULTI-CLASS SELECTION ── */}
            {assignmentScope === "class" && (
              <div className="bg-slate-50 dark:bg-slate-700/40 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                    Select Target Classes *
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedClassSubjectIds(classes.map((c) => c.class_subject_id))}
                      className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedClassSubjectIds([])}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Select one or more classes to publish this assignment simultaneously.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {classes.map((cls) => {
                    const isChecked = selectedClassSubjectIds.includes(cls.class_subject_id);
                    return (
                      <label
                        key={cls.class_subject_id}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                          isChecked
                            ? "bg-white dark:bg-slate-800 border-emerald-500 shadow-sm"
                            : "bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-600 hover:border-slate-300"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClassSubjectIds([...selectedClassSubjectIds, cls.class_subject_id]);
                            } else {
                              setSelectedClassSubjectIds(
                                selectedClassSubjectIds.filter((id) => id !== cls.class_subject_id)
                              );
                            }
                            setTouchedFields((prev) => ({ ...prev, classes: true }));
                          }}
                          className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                        />
                        <div className="text-xs">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {cls.school_class?.class_name}
                          </span>
                          <span className="text-slate-500 dark:text-slate-400">
                            {cls.subject?.subject_name}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {touchedFields.classes && validationErrors.classes && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {validationErrors.classes}
                  </p>
                )}
              </div>
            )}

            {/* ── SCOPE B: INDIVIDUAL STUDENTS SELECTION & TITLE ASSIGNMENT ── */}
            {assignmentScope === "individual" && (
              <div className="bg-purple-50/50 dark:bg-slate-700/40 p-5 rounded-2xl border border-purple-100 dark:border-slate-700 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Step 1: Choose Class & Subject *
                    </label>
                    <select
                      value={individualClassSubjectId}
                      onChange={(e) => handleIndividualClassChange(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {classes.map((cls) => (
                        <option key={cls.class_subject_id} value={cls.class_subject_id}>
                          {cls.school_class?.class_name} • {cls.subject?.subject_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Search Students in Class
                    </label>
                    <input
                      type="text"
                      placeholder="Filter by student name or ID..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Student Selection Quick Buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-purple-100 dark:border-slate-700">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Step 2: Select Students & Assign Individual Titles ({Object.keys(individualDrafts).length} selected)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectAllStudents(true)}
                      className="text-xs text-purple-600 dark:text-purple-400 font-semibold hover:underline"
                    >
                      Select All ({classRoster.length})
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleSelectAllStudents(false)}
                      className="text-xs text-slate-500 dark:text-slate-400 hover:underline"
                    >
                      Clear Selection
                    </button>
                  </div>
                </div>

                {rosterLoading ? (
                  <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400">
                    Loading class student roster...
                  </div>
                ) : classRoster.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500 dark:text-slate-400">
                    No students currently enrolled in this class.
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto space-y-3 pr-1">
                    {classRoster
                      .filter((s) => {
                        if (!studentSearchTerm.trim()) return true;
                        const term = studentSearchTerm.toLowerCase();
                        return (
                          s.user?.full_name?.toLowerCase().includes(term) ||
                          s.student_number?.toLowerCase().includes(term)
                        );
                      })
                      .map((student) => {
                        const isSelected = Boolean(individualDrafts[student.student_id]);
                        const draft = individualDrafts[student.student_id];

                        return (
                          <div
                            key={student.student_id}
                            className={`p-3.5 rounded-xl border transition ${
                              isSelected
                                ? "bg-white dark:bg-slate-800 border-purple-400 dark:border-purple-600 shadow-sm"
                                : "bg-white/60 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <label className="flex items-center gap-2.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleStudentSelection(student)}
                                  className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                />
                                <div>
                                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                    {student.user?.full_name || `Student #${student.student_id}`}
                                  </span>
                                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                                    {student.student_number || `STU-${student.student_id}`}
                                  </span>
                                </div>
                              </label>

                              {isSelected && (
                                <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded-md">
                                  Custom Topic Active
                                </span>
                              )}
                            </div>

                            {/* Specific title input for this individual student */}
                            {isSelected && draft && (
                              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
                                <div>
                                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                                    Individual Title for {student.user?.full_name?.split(" ")[0]} *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    value={draft.title}
                                    placeholder={`e.g. Case Study Topic for ${student.user?.full_name}`}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setIndividualDrafts((prev) => ({
                                        ...prev,
                                        [student.student_id]: { ...draft, title: val },
                                      }));
                                    }}
                                    className={`w-full rounded-lg border px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                      !draft.title || draft.title.trim().length < 3
                                        ? "border-red-300 dark:border-red-700 bg-red-50/20"
                                        : "border-slate-200 dark:border-slate-600 bg-slate-50/50 dark:bg-slate-700/50"
                                    }`}
                                  />
                                  {(!draft.title || draft.title.trim().length < 3) && (
                                    <p className="text-[10px] text-red-500 mt-0.5">
                                      Title must be between 3 and 200 characters.
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}

                {touchedFields.students && validationErrors.students && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                    {validationErrors.students}
                  </p>
                )}
              </div>
            )}

            {/* ── BASE COMMON ASSIGNMENT DETAILS ── */}
            <div className="space-y-6 pt-2">
              {/* Title field (for class-wide mode or default prefix for individual mode) */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {assignmentScope === "class"
                    ? "Assignment Title *"
                    : "Base Title / Project Theme (Optional Default)"}
                </label>
                <input
                  type="text"
                  required={assignmentScope === "class"}
                  value={createForm.title}
                  onBlur={() => setTouchedFields((prev) => ({ ...prev, title: true }))}
                  onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                  placeholder={
                    assignmentScope === "class"
                      ? "e.g., Midterm Project: Ecosystems Research Report"
                      : "e.g., Biology Individual Case Studies (Used as default prefix)"
                  }
                  className={`w-full rounded-xl border px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition ${
                    touchedFields.title && validationErrors.title
                      ? "border-red-500 focus:ring-red-500 bg-red-50/30 dark:bg-red-950/20"
                      : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 focus:ring-emerald-500"
                  }`}
                />
                <div className="flex items-center justify-between text-xs mt-1">
                  {touchedFields.title && validationErrors.title ? (
                    <span className="text-red-600 dark:text-red-400 font-medium">
                      {validationErrors.title}
                    </span>
                  ) : (
                    <span className="text-slate-400">Must be between 3 and 200 characters</span>
                  )}
                  <span className="text-slate-400 font-mono">{createForm.title.length}/200</span>
                </div>
              </div>

              {/* Due Date & Max Score */}
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Due Date & Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={createForm.due_date}
                    onBlur={() => setTouchedFields((prev) => ({ ...prev, due_date: true }))}
                    onChange={(e) => setCreateForm({ ...createForm, due_date: e.target.value })}
                    className={`w-full rounded-xl border px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition ${
                      touchedFields.due_date && validationErrors.due_date
                        ? "border-red-500 focus:ring-red-500 bg-red-50/30 dark:bg-red-950/20"
                        : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 focus:ring-emerald-500"
                    }`}
                  />
                  {touchedFields.due_date && validationErrors.due_date ? (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                      {validationErrors.due_date}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">Due date must be in the future.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Maximum Points *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    required
                    value={createForm.max_score}
                    onBlur={() => setTouchedFields((prev) => ({ ...prev, max_score: true }))}
                    onChange={(e) => setCreateForm({ ...createForm, max_score: e.target.value })}
                    className={`w-full rounded-xl border px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 transition ${
                      touchedFields.max_score && validationErrors.max_score
                        ? "border-red-500 focus:ring-red-500 bg-red-50/30 dark:bg-red-950/20"
                        : "border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 focus:ring-emerald-500"
                    }`}
                  />
                  {touchedFields.max_score && validationErrors.max_score ? (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                      {validationErrors.max_score}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-400 mt-1">Score scale (1 - 1000 points).</p>
                  )}
                </div>
              </div>

              {/* Instructions / Description */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Instructions & Grading Rubric
                </label>
                <textarea
                  rows={4}
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Specify requirements, submission format, and grading criteria..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
                <div className="flex justify-end text-xs text-slate-400 mt-1 font-mono">
                  {createForm.description.length}/2000
                </div>
              </div>

              {/* Resubmission Options */}
              <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createForm.allow_resubmission}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, allow_resubmission: e.target.checked })
                    }
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Allow Resubmission
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enable students to submit revised drafts if needed.
                    </p>
                  </div>
                </label>

                {createForm.allow_resubmission && (
                  <div className="grid gap-4 md:grid-cols-2 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Resubmission Deadline
                      </label>
                      <input
                        type="datetime-local"
                        value={createForm.resubmission_deadline}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, resubmission_deadline: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                      {validationErrors.resubmission && (
                        <p className="text-xs text-red-500 mt-1">{validationErrors.resubmission}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                        Max Resubmissions Allowed
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={createForm.max_resubmissions}
                        onChange={(e) =>
                          setCreateForm({ ...createForm, max_resubmissions: e.target.value })
                        }
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab("list")}
                className="px-5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createLoading}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {createLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <span>
                    {assignmentScope === "class"
                      ? selectedClassSubjectIds.length > 1
                        ? `Publish to ${selectedClassSubjectIds.length} Classes`
                        : "Publish Assignment"
                      : `Publish ${Object.keys(individualDrafts).length} Individual Assignments`}
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── TAB 3: GRADE SUBMISSIONS ────────────────────────────────────────── */}
      {activeTab === "grade" && (
        <div className="space-y-6">
          {/* Assignment Picker */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Select Assignment to Grade
            </label>
            <select
              value={selectedAssignmentId || ""}
              onChange={(e) => setSelectedAssignmentId(Number(e.target.value))}
              className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition text-sm font-medium"
            >
              {assignments.map((a) => (
                <option key={a.assignment_id} value={a.assignment_id}>
                  {a.student_id ? "👤 [Individual] " : "🏫 [Class] "}
                  {a.title} ({a.class_subject?.school_class?.class_name} • Due: {formatDisplayDate(a.due_date)})
                </option>
              ))}
            </select>
          </div>

          {/* Submissions List */}
          {selectedAssignment ? (
            <div className="space-y-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {selectedAssignment.student_id ? (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                        Individual Assignment
                      </span>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
                        Class Assignment
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      Due: {formatDisplayDateTime(selectedAssignment.due_date)}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {selectedAssignment.title}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Class: {selectedAssignment.class_subject?.school_class?.class_name} • Subject:{" "}
                    {selectedAssignment.class_subject?.subject?.subject_name} • Max:{" "}
                    {selectedAssignment.max_score} pts
                  </p>
                </div>

                <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl px-4 py-2.5 text-center">
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    Submissions
                  </div>
                  <div className="text-lg font-bold text-emerald-800 dark:text-emerald-200">
                    {selectedAssignment.submissions?.filter((s) => s.grade).length || 0} /{" "}
                    {selectedAssignment.submissions?.length || 0} Graded
                  </div>
                </div>
              </div>

              {!selectedAssignment.submissions || selectedAssignment.submissions.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">
                    No student submissions recorded yet for this assignment.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedAssignment.submissions.map((sub) => {
                    const gState = gradingState[sub.submission_id] || { score: "", feedback: "" };
                    const isSaving = gState.isSaving || false;
                    const numScore = parseFloat(gState.score);
                    const hasValidScore =
                      !isNaN(numScore) && numScore >= 0 && numScore <= selectedAssignment.max_score;
                    const letter = hasValidScore
                      ? computeLetterGrade(numScore, selectedAssignment.max_score)
                      : "-";

                    return (
                      <div
                        key={sub.submission_id}
                        className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col lg:flex-row justify-between gap-6"
                      >
                        {/* Student and Submission Info */}
                        <div className="lg:w-1/2 space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                {sub.student?.user?.full_name || sub.student?.full_name || "Student"}
                              </h3>
                              <p className="text-xs text-slate-400 font-mono">
                                {sub.student?.student_number || `STU-${sub.student_id}`}
                              </p>
                            </div>
                            <span className="text-xs text-slate-400">
                              Submitted: {formatDisplayDateTime(sub.submitted_at)}
                            </span>
                          </div>

                          {sub.content && (
                            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 text-sm text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                              <p className="text-xs font-semibold text-slate-400 mb-1">Student Work / Text:</p>
                              <p className="whitespace-pre-line">{sub.content}</p>
                            </div>
                          )}

                          {sub.file_url && (
                            <a
                              href={sub.file_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              <span>📎</span> View Attached Submission Document
                            </a>
                          )}
                        </div>

                        {/* Grading Box */}
                        <div className="lg:w-1/2 bg-slate-50/50 dark:bg-slate-700/30 rounded-xl p-4 border border-slate-100 dark:border-slate-700 flex flex-col justify-between gap-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                  Score (out of {selectedAssignment.max_score})
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max={selectedAssignment.max_score}
                                    step="0.5"
                                    value={gState.score}
                                    onChange={(e) =>
                                      setGradingState({
                                        ...gradingState,
                                        [sub.submission_id]: {
                                          ...gState,
                                          score: e.target.value,
                                        },
                                      })
                                    }
                                    placeholder="0"
                                    className={`w-28 rounded-xl border px-3 py-2 text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                                      gState.score !== "" && !hasValidScore
                                        ? "border-red-500 focus:ring-red-500 bg-red-50/40"
                                        : "border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-emerald-500"
                                    }`}
                                  />
                                  <span className="text-xs text-slate-400">
                                    / {selectedAssignment.max_score} pts
                                  </span>
                                </div>
                                {gState.score !== "" && !hasValidScore && (
                                  <p className="text-[11px] text-red-500 mt-1">
                                    Score must be between 0 and {selectedAssignment.max_score}.
                                  </p>
                                )}
                              </div>

                              <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 text-center">
                                  Grade
                                </label>
                                <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-emerald-600 dark:text-emerald-400">
                                  {letter}
                                </span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                Feedback / Teacher Comments
                              </label>
                              <textarea
                                rows={2}
                                value={gState.feedback}
                                onChange={(e) =>
                                  setGradingState({
                                    ...gradingState,
                                    [sub.submission_id]: {
                                      ...gState,
                                      feedback: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Constructive feedback to student..."
                                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              disabled={isSaving || (gState.score !== "" && !hasValidScore)}
                              onClick={() => handleGradeSubmission(sub.submission_id)}
                              className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
                            >
                              {isSaving ? "Saving..." : sub.grade ? "Update Grade" : "Save Grade"}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <p className="text-slate-500 dark:text-slate-400">Please select an assignment to view submissions.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
