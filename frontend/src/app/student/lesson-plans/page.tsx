"use client";

import { useEffect, useState } from "react";
import { useStudent } from "../StudentContext";

interface LessonPlan {
  lesson_plan_id: number;
  title: string;
  subject_name: string;
  subject_code?: string;
  class_name: string;
  teacher_name: string;
  teacher_avatar?: string | null;
  term: string;
  week_number?: number;
  objectives: string[];
  materials: string[];
  activities: string[];
  assessment?: string;
  status: string;
  submitted_at: string;
}

export default function StudentLessonPlansPage() {
  const { authFetch, profile } = useStudent();
  const [lessonPlans, setLessonPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [selectedTerm, setSelectedTerm] = useState("ALL");
  const [viewingPlan, setViewingPlan] = useState<LessonPlan | null>(null);

  useEffect(() => {
    loadLessonPlans();
  }, []);

  async function loadLessonPlans() {
    try {
      setLoading(true);
      const data = await authFetch("/api/student/lesson-plans");
      setLessonPlans(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.message || "Failed to load lesson plans");
    } finally {
      setLoading(false);
    }
  }

  // Get distinct subjects and terms for filter dropdowns
  const subjects = Array.from(new Set(lessonPlans.map((p) => p.subject_name))).filter(Boolean);
  const terms = Array.from(new Set(lessonPlans.map((p) => p.term))).filter(Boolean);

  const filteredPlans = lessonPlans.filter((p) => {
    const matchesSubject = selectedSubject === "ALL" || p.subject_name === selectedSubject;
    const matchesTerm = selectedTerm === "ALL" || p.term === selectedTerm;
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.subject_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.objectives.some((obj) => obj.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.assessment && p.assessment.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSubject && matchesTerm && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Class Lesson Plans</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review weekly curriculum objectives, lesson activities, and assessments prepared by your teachers.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="w-full md:w-80 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topics, objectives, teachers..."
            className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3.5 top-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Subjects</option>
            {subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>

          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            <option value="ALL">All Terms</option>
            {terms.map((t) => (
              <option key={t} value={t}>
                Term {t}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={loadLessonPlans}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-3 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Loading your class lesson plans...</p>
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
          <p className="text-sm font-medium text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={loadLessonPlans}
            className="mt-3 px-4 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Try Again
          </button>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">No Lesson Plans Found</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {lessonPlans.length === 0
              ? "Your teachers haven't uploaded lesson plans for your class yet."
              : "No lesson plans matched your filter criteria."}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan) => (
            <div
              key={plan.lesson_plan_id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                {/* Subject & Term Badges */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                    {plan.subject_name}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {plan.week_number ? `Week ${plan.week_number}` : ""} · Term {plan.term}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
                  {plan.title}
                </h3>

                {/* Teacher Info */}
                <div className="flex items-center gap-2 mb-4 text-xs text-slate-500 dark:text-slate-400">
                  <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-[10px] text-slate-700 dark:text-slate-300">
                    {plan.teacher_name.charAt(0)}
                  </div>
                  <span>{plan.teacher_name}</span>
                </div>

                {/* Objectives Preview */}
                {plan.objectives && plan.objectives.length > 0 && (
                  <div className="mb-4 space-y-1.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Key Objectives
                    </p>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      {plan.objectives.slice(0, 2).map((obj, i) => (
                        <li key={i} className="line-clamp-1 flex items-start gap-1.5">
                          <span className="text-sky-500 mt-0.5">•</span>
                          <span>{obj}</span>
                        </li>
                      ))}
                      {plan.objectives.length > 2 && (
                        <li className="text-[11px] text-slate-400 italic">
                          +{plan.objectives.length - 2} more objectives
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Card Footer Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 mt-4 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Class {plan.class_name}
                </span>
                <button
                  type="button"
                  onClick={() => setViewingPlan(plan)}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-xs font-semibold transition"
                >
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {viewingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-700 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300">
                    {viewingPlan.subject_name}
                  </span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {viewingPlan.week_number ? `Week ${viewingPlan.week_number} · ` : ""}Term {viewingPlan.term}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {viewingPlan.title}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Teacher: {viewingPlan.teacher_name} · Class: {viewingPlan.class_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPlan(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Learning Objectives */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Learning Objectives
              </h4>
              <ul className="space-y-1.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4">
                {viewingPlan.objectives && viewingPlan.objectives.length > 0 ? (
                  viewingPlan.objectives.map((obj, i) => (
                    <li key={i} className="text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2">
                      <span className="text-sky-500 font-bold">•</span>
                      <span>{obj}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-400 italic">No specific objectives listed</li>
                )}
              </ul>
            </div>

            {/* Activities */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                Planned Class Activities
              </h4>
              <ul className="space-y-1.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl p-4">
                {viewingPlan.activities && viewingPlan.activities.length > 0 ? (
                  viewingPlan.activities.map((act, i) => (
                    <li key={i} className="text-xs text-slate-700 dark:text-slate-200 flex items-start gap-2">
                      <span className="text-emerald-500 font-bold">{i + 1}.</span>
                      <span>{act}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-slate-400 italic">No activities listed</li>
                )}
              </ul>
            </div>

            {/* Materials & Resources */}
            {viewingPlan.materials && viewingPlan.materials.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Materials & Readings
                </h4>
                <div className="flex flex-wrap gap-2">
                  {viewingPlan.materials.map((mat, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
                    >
                      📖 {mat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Assessment & Homework */}
            {viewingPlan.assessment && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Assessment & Tasks
                </h4>
                <div className="bg-amber-50/60 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-xs text-slate-800 dark:text-slate-200 whitespace-pre-line">
                  {viewingPlan.assessment}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingPlan(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition"
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
