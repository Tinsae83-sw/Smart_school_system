"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

type ClassSubject = {
  class_subject_id: number;
  school_class: { class_name: string; academic_year: string };
  subject: { subject_name: string };
};

type LessonPlan = {
  lesson_plan_id: number;
  title: string;
  objectives: string[];
  materials: string[];
  activities: string[];
  assessment?: string;
  week_number?: number;
  term: string;
  status: string;
  submitted_date?: string;
  class_subject?: ClassSubject;
};

export default function LessonPlansPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<ClassSubject[]>([]);
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(true);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  
  // Form state
  const [title, setTitle] = useState("");
  const [objectives, setObjectives] = useState("");
  const [materials, setMaterials] = useState("");
  const [activities, setActivities] = useState("");
  const [assessment, setAssessment] = useState("");
  const [weekNumber, setWeekNumber] = useState("");
  const [term, setTerm] = useState("");

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadData(savedToken);
  }, [router]);

  async function loadData(token: string) {
    try {
      const [classesData, plansData] = await Promise.all([
        authFetch("/api/teacher/classes", {}, token),
        authFetch("/api/teacher/lesson-plans", {}, token)
      ]);
      setClasses(classesData);
      setLessonPlans(plansData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateLessonPlan(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedClass || !title || !objectives || !term) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const data = await authFetch("/api/teacher/lesson-plans", {
        method: "POST",
        body: JSON.stringify({
          class_subject_id: selectedClass,
          title,
          objectives: objectives.split("\n").filter(o => o.trim()),
          materials: materials ? materials.split("\n").filter(m => m.trim()) : [],
          activities: activities ? activities.split("\n").filter(a => a.trim()) : [],
          assessment: assessment || null,
          week_number: weekNumber ? parseInt(weekNumber) : null,
          term
        })
      }, token);

      alert("Lesson plan created successfully!");
      setShowCreateModal(false);
      resetForm();
      loadData(token);
    } catch (e) {
      console.error(e);
      alert("Failed to create lesson plan. Please try again.");
    }
  }

  async function handleSubmitForApproval(planId: number) {
    try {
      await authFetch(`/api/teacher/lesson-plans/${planId}/submit`, {
        method: "POST"
      }, token);
      alert("Lesson plan submitted for approval!");
      loadData(token);
    } catch (e) {
      console.error(e);
      alert("Failed to submit lesson plan. Please try again.");
    }
  }

  function resetForm() {
    setTitle("");
    setObjectives("");
    setMaterials("");
    setActivities("");
    setAssessment("");
    setWeekNumber("");
    setTerm("");
    setSelectedClass(null);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Lesson Plans</h1>
              <p className="text-slate-600">Create and manage your lesson plans</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-white font-semibold hover:from-orange-600 hover:to-orange-700 transition shadow-lg shadow-orange-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Lesson Plan
            </button>
          </div>
        </div>

        {lessonPlans.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No Lesson Plans Yet</h3>
            <p className="text-slate-600 mb-4">Create your first lesson plan to get started</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="rounded-xl bg-orange-500 px-6 py-2 text-white font-semibold hover:bg-orange-600 transition"
            >
              Create Lesson Plan
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lessonPlans.map((plan) => (
              <div key={plan.lesson_plan_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg transition-shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">{plan.title}</h3>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                      plan.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                      plan.status === "APPROVED" ? "bg-emerald-100 text-emerald-700" :
                      plan.status === "SUBMITTED" ? "bg-blue-100 text-blue-700" :
                      "bg-rose-100 text-rose-700"
                    }`}>
                      {plan.status}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>{plan.class_subject?.school_class?.class_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>{plan.class_subject?.subject?.subject_name}</span>
                  </div>
                  {plan.week_number && (
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Week {plan.week_number}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>{plan.term}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 mb-4">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Learning Objectives</p>
                  <ul className="space-y-1">
                    {plan.objectives.slice(0, 2).map((obj, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <svg className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="line-clamp-1">{obj}</span>
                      </li>
                    ))}
                    {plan.objectives.length > 2 && (
                      <li className="text-xs text-slate-400 pl-6">+{plan.objectives.length - 2} more objectives</li>
                    )}
                  </ul>
                </div>

                {plan.submitted_date && (
                  <p className="text-xs text-slate-500 mb-4">
                    Submitted: {new Date(plan.submitted_date).toLocaleDateString()}
                  </p>
                )}

                {plan.status === "PENDING" && (
                  <button
                    onClick={() => handleSubmitForApproval(plan.lesson_plan_id)}
                    className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:from-orange-600 hover:to-orange-700 transition shadow-md shadow-orange-200"
                  >
                    Submit for Approval
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Lesson Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom-4 duration-300">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 z-10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Create Lesson Plan</h2>
                  <p className="text-sm text-slate-500">Fill in the details below</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleCreateLessonPlan} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Class & Subject *</label>
                <select
                  value={selectedClass || ""}
                  onChange={(e) => setSelectedClass(e.target.value ? Number(e.target.value) : null)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                  required
                >
                  <option value="">Select class</option>
                  {classes.map((cls) => (
                    <option key={cls.class_subject_id} value={cls.class_subject_id}>
                      {cls.school_class.class_name} - {cls.subject.subject_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                  placeholder="Lesson plan title"
                  required
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Term *</label>
                  <select
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                    required
                  >
                    <option value="">Select term</option>
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Week Number</label>
                  <input
                    type="number"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                    placeholder="e.g., 1"
                    min="1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Learning Objectives * (one per line)</label>
                <textarea
                  value={objectives}
                  onChange={(e) => setObjectives(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition resize-none"
                  rows={4}
                  placeholder="Students will be able to..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Materials Needed (one per line)</label>
                <textarea
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition resize-none"
                  rows={3}
                  placeholder="Textbooks, handouts, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Activities (one per line)</label>
                <textarea
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition resize-none"
                  rows={3}
                  placeholder="Lesson activities"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Assessment Method</label>
                <textarea
                  value={assessment}
                  onChange={(e) => setAssessment(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition resize-none"
                  rows={2}
                  placeholder="How will you assess learning?"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                  className="flex-1 rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-3 text-sm font-semibold text-white hover:from-orange-600 hover:to-orange-700 transition shadow-lg shadow-orange-200"
                >
                  Create Lesson Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
