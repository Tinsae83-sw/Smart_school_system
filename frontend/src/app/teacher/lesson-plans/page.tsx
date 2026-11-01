"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch, Toast } from "../shared";

interface ClassSubject {
  class_subject_id: number;
  class_id: number;
  school_class?: { class_name: string };
  subject?: { subject_name: string };
}

interface LessonPlan {
  lesson_plan_id: number;
  title: string;
  objectives: string[];
  materials: string[];
  activities: string[];
  assessment?: string;
  week_number?: number;
  term: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  review_comments?: string;
  submitted_at?: string;
  reviewed_at?: string;
  class_subject?: ClassSubject;
}

export default function LessonPlansPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<ClassSubject[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & form state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<LessonPlan | null>(null);
  const [viewingPlan, setViewingPlan] = useState<LessonPlan | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [submittingApprovalId, setSubmittingApprovalId] = useState<number | null>(null);

  const [form, setForm] = useState({
    class_subject_id: "",
    title: "",
    term: "1",
    week_number: "1",
    objectives: "",
    materials: "",
    activities: "",
    assessment: "",
  });

  const [formErrors, setFormErrors] = useState<string[]>([]);
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
    loadData(savedToken);
  }, [router]);

  async function loadData(tok: string) {
    try {
      const [classesData, plansData] = await Promise.all([
        authFetch("/api/teacher/classes", {}, tok),
        authFetch("/api/teacher/lesson-plans", {}, tok),
      ]);

      const classList = Array.isArray(classesData) ? classesData : [];
      setClasses(classList);

      const plansList = Array.isArray(plansData) ? plansData : [];
      setLessonPlans(plansList);
    } catch (e: any) {
      showToast(e.message || "Failed to load lesson plans", "error");
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingPlan(null);
    setForm({
      class_subject_id: classes[0]?.class_subject_id ? String(classes[0].class_subject_id) : "",
      title: "",
      term: "1",
      week_number: "1",
      objectives: "",
      materials: "",
      activities: "",
      assessment: "",
    });
    setFormErrors([]);
    setModalOpen(true);
  }

  function openEditModal(plan: LessonPlan) {
    if (plan.status === "APPROVED") {
      showToast("Approved lesson plans cannot be edited.", "error");
      return;
    }
    setEditingPlan(plan);
    setForm({
      class_subject_id: String(plan.class_subject?.class_subject_id || ""),
      title: plan.title,
      term: plan.term || "1",
      week_number: plan.week_number ? String(plan.week_number) : "1",
      objectives: Array.isArray(plan.objectives) ? plan.objectives.join("\n") : String(plan.objectives || ""),
      materials: Array.isArray(plan.materials) ? plan.materials.join("\n") : String(plan.materials || ""),
      activities: Array.isArray(plan.activities) ? plan.activities.join("\n") : String(plan.activities || ""),
      assessment: plan.assessment || "",
    });
    setFormErrors([]);
    setModalOpen(true);
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    const errors: string[] = [];

    if (!form.title.trim()) errors.push("Lesson plan title is required.");
    if (!form.class_subject_id) errors.push("Please select a class/subject.");
    if (!form.objectives.trim()) errors.push("Learning objectives are required.");
    if (!form.materials.trim()) errors.push("Teaching materials/resources are required.");
    if (!form.activities.trim()) errors.push("Teaching activities are required.");
    if (!form.assessment.trim()) errors.push("Assessment method is required.");

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors([]);
    setFormSubmitting(true);

    try {
      const payload = {
        class_subject_id: parseInt(form.class_subject_id),
        title: form.title.trim(),
        term: form.term,
        week_number: parseInt(form.week_number) || 1,
        objectives: form.objectives.split("\n").map((s) => s.trim()).filter(Boolean),
        materials: form.materials.split("\n").map((s) => s.trim()).filter(Boolean),
        activities: form.activities.split("\n").map((s) => s.trim()).filter(Boolean),
        assessment: form.assessment.trim(),
      };

      if (editingPlan) {
        await authFetch(`/api/teacher/lesson-plans/${editingPlan.lesson_plan_id}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        }, token);
        showToast("Lesson plan updated successfully!", "success");
      } else {
        await authFetch("/api/teacher/lesson-plans", {
          method: "POST",
          body: JSON.stringify(payload),
        }, token);
        showToast("Lesson plan created successfully!", "success");
      }

      setModalOpen(false);
      const updatedList = await authFetch("/api/teacher/lesson-plans", {}, token);
      setLessonPlans(Array.isArray(updatedList) ? updatedList : []);
    } catch (e: any) {
      showToast(e.message || "Failed to save lesson plan", "error");
    } finally {
      setFormSubmitting(false);
    }
  }

  // Submit plan for Department Head approval
  async function handleSubmitForApproval(planId: number) {
    setSubmittingApprovalId(planId);
    try {
      await authFetch(`/api/teacher/lesson-plans/${planId}/submit`, { method: "POST" }, token);
      showToast("Lesson plan submitted to Department Head for review!", "success");

      setLessonPlans((prev) =>
        prev.map((p) => (p.lesson_plan_id === planId ? { ...p, status: "PENDING" } : p))
      );
    } catch (e: any) {
      showToast(e.message || "Failed to submit lesson plan", "error");
    } finally {
      setSubmittingApprovalId(null);
    }
  }

  function getStatusBadge(status: LessonPlan["status"]) {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            ✓ Approved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            ✕ Needs Revision
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            ◷ Pending Approval
          </span>
        );
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 dark:border-slate-600 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading lesson plans...</p>
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
            Lesson Plans
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Curriculum tracking, pedagogical preparation, and departmental reviews
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20"
        >
          + Create Lesson Plan
        </button>
      </div>

      {/* List of Lesson Plans */}
      {lessonPlans.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Lesson Plans Submitted</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1 mb-4 text-sm">
            Prepare and submit your weekly lesson plans for Department Head evaluation.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition"
          >
            Create First Plan
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {lessonPlans.map((plan) => (
            <div
              key={plan.lesson_plan_id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col justify-between transition hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                    {plan.class_subject?.school_class?.class_name || "Class"} — {plan.class_subject?.subject?.subject_name || "Subject"}
                  </span>
                  {getStatusBadge(plan.status)}
                </div>

                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-3">
                  {plan.title}
                </h2>
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                  <span>Term: {plan.term || "1"}</span>
                  <span>•</span>
                  <span>Week: {plan.week_number || "1"}</span>
                </div>

                {/* Review comments if rejected */}
                {plan.status === "REJECTED" && plan.review_comments && (
                  <div className="mt-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 text-xs text-red-700 dark:text-red-300">
                    <p className="font-semibold mb-1">Department Head Feedback:</p>
                    <p>{plan.review_comments}</p>
                  </div>
                )}

                {/* Summary previews */}
                <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Objectives:</span>{" "}
                    {Array.isArray(plan.objectives)
                      ? plan.objectives.slice(0, 2).join("; ") + (plan.objectives.length > 2 ? "..." : "")
                      : plan.objectives}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">Activities:</span>{" "}
                    {Array.isArray(plan.activities)
                      ? plan.activities.slice(0, 2).join("; ") + (plan.activities.length > 2 ? "..." : "")
                      : plan.activities}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setViewingPlan(plan)}
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 transition"
                >
                  View Details →
                </button>

                <div className="flex items-center gap-2">
                  {plan.status !== "APPROVED" && (
                    <button
                      type="button"
                      onClick={() => openEditModal(plan)}
                      className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                    >
                      Edit
                    </button>
                  )}

                  {plan.status === "REJECTED" && (
                    <button
                      type="button"
                      disabled={submittingApprovalId === plan.lesson_plan_id}
                      onClick={() => handleSubmitForApproval(plan.lesson_plan_id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition"
                    >
                      Resubmit
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ───────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-6 md:p-8 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {editingPlan ? "Edit Lesson Plan" : "Create New Lesson Plan"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                ✕
              </button>
            </div>

            {formErrors.length > 0 && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                <ul className="list-disc list-inside space-y-1">
                  {formErrors.map((err, i) => (
                    <li key={i} className="text-sm text-red-600 dark:text-red-400 font-medium">
                      {err}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <form onSubmit={handleSavePlan} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Lesson Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Photosynthesis and Cellular Respiration Lab"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Class & Subject *
                  </label>
                  <select
                    value={form.class_subject_id}
                    onChange={(e) => setForm({ ...form, class_subject_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {classes.map((cls) => (
                      <option key={cls.class_subject_id} value={cls.class_subject_id}>
                        {cls.school_class?.class_name} — {cls.subject?.subject_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Term
                  </label>
                  <select
                    value={form.term}
                    onChange={(e) => setForm({ ...form, term: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="1">Term 1</option>
                    <option value="2">Term 2</option>
                    <option value="3">Term 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Week Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="52"
                    value={form.week_number}
                    onChange={(e) => setForm({ ...form, week_number: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Learning Objectives (one per line) *
                </label>
                <textarea
                  rows={3}
                  value={form.objectives}
                  onChange={(e) => setForm({ ...form, objectives: e.target.value })}
                  placeholder="- Understand the chemical equation of photosynthesis&#10;- Identify the role of chlorophyll"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Materials & Resources (one per line) *
                </label>
                <textarea
                  rows={2}
                  value={form.materials}
                  onChange={(e) => setForm({ ...form, materials: e.target.value })}
                  placeholder="- Biology Textbook Chapter 4&#10;- Microscope slides and leaf samples"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Teaching Activities & Procedures *
                </label>
                <textarea
                  rows={3}
                  value={form.activities}
                  onChange={(e) => setForm({ ...form, activities: e.target.value })}
                  placeholder="1. Introduction lecture (15 mins)&#10;2. Group lab experiment (25 mins)&#10;3. Class discussion & Q&A (10 mins)"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Assessment & Evaluation Method *
                </label>
                <input
                  type="text"
                  value={form.assessment}
                  onChange={(e) => setForm({ ...form, assessment: e.target.value })}
                  placeholder="e.g., Short quiz at end of period and lab worksheet evaluation"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-md disabled:opacity-50"
                >
                  {formSubmitting ? "Saving..." : editingPlan ? "Update Plan" : "Create & Submit Plan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DETAILS MODAL ────────────────────────────────────────────────── */}
      {viewingPlan && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{viewingPlan.title}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {viewingPlan.class_subject?.school_class?.class_name} · Term {viewingPlan.term} · Week {viewingPlan.week_number}
                </p>
              </div>
              {getStatusBadge(viewingPlan.status)}
            </div>

            <div className="space-y-3 pt-2 text-xs text-slate-700 dark:text-slate-300">
              <div>
                <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">Objectives</p>
                <ul className="list-disc list-inside space-y-1">
                  {(Array.isArray(viewingPlan.objectives) ? viewingPlan.objectives : [viewingPlan.objectives]).map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">Resources & Materials</p>
                <ul className="list-disc list-inside space-y-1">
                  {(Array.isArray(viewingPlan.materials) ? viewingPlan.materials : [viewingPlan.materials]).map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>

              <div>
                <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">Activities & Procedure</p>
                <ul className="list-disc list-inside space-y-1">
                  {(Array.isArray(viewingPlan.activities) ? viewingPlan.activities : [viewingPlan.activities]).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>

              {viewingPlan.assessment && (
                <div>
                  <p className="font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-1">Assessment</p>
                  <p>{viewingPlan.assessment}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setViewingPlan(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
