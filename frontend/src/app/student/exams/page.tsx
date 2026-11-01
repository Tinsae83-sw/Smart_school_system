"use client";

import { useEffect, useState } from "react";
import { useStudent } from "../StudentContext";
import {
  Calendar,
  Clock,
  FileText,
  Award,
  BookOpen,
  TrendingUp,
  MapPin,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type ExamSchedule = {
  exam_id: number;
  title: string;
  type: string;
  subject_name: string;
  subject_code: string;
  class_name: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  total_marks: number;
  venue: string;
  instructions: string;
  academic_year: string;
  term: string;
};

type ExamResult = {
  result_id?: string | number;
  mark_id?: number;
  title?: string;
  type: string;
  subject_name: string;
  subject_code: string;
  class_name: string;
  teacher_name: string;
  score: number;
  max_score: number;
  percentage: number;
  letter_grade: string | null;
  remarks: string;
  academic_year?: string;
  term?: string;
  graded_at: string;
};

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    FINAL: "Final Exam",
    MID: "Midterm",
    TEST: "Test",
    QUIZ: "Quiz",
  };
  return labels[type] || type;
}

function getTypeBadgeColor(type: string) {
  switch (type) {
    case "FINAL":
      return "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800";
    case "MID":
      return "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-800";
    case "TEST":
      return "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800";
    default:
      return "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600";
  }
}

function getGradeColor(grade: string | null) {
  if (!grade) return "text-slate-500 bg-slate-100 dark:bg-slate-700 dark:text-slate-400";
  const g = grade.toUpperCase();
  if (g.startsWith("A")) return "text-emerald-700 bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400";
  if (g.startsWith("B")) return "text-blue-700 bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400";
  if (g.startsWith("C")) return "text-yellow-700 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400";
  if (g.startsWith("D")) return "text-orange-700 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400";
  return "text-red-700 bg-red-100 dark:bg-red-900/20 dark:text-red-400";
}

function isUpcoming(dateStr: string) {
  return new Date(dateStr) >= new Date();
}

export default function StudentExamsPage() {
  const { authFetch } = useStudent();
  const [activeTab, setActiveTab] = useState<"schedule" | "results">("schedule");
  const [schedule, setSchedule] = useState<ExamSchedule[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedExam, setExpandedExam] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "FINAL" | "MID" | "TEST">("ALL");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [scheduleData, resultsData] = await Promise.allSettled([
        authFetch("/api/student/exams/schedule"),
        authFetch("/api/student/exams/results"),
      ]);
      if (scheduleData.status === "fulfilled") setSchedule(Array.isArray(scheduleData.value) ? scheduleData.value : []);
      if (resultsData.status === "fulfilled") setResults(Array.isArray(resultsData.value) ? resultsData.value : []);
    } catch {
      setSchedule([]);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  const upcomingExams = schedule.filter((e) => isUpcoming(e.exam_date));
  const pastExams = schedule.filter((e) => !isUpcoming(e.exam_date));
  const filteredResults =
    filterType === "ALL" ? results : results.filter((r) => r.type === filterType);

  // Stats for results
  const avgPercentage =
    results.length > 0
      ? (results.reduce((sum, r) => sum + r.percentage, 0) / results.length).toFixed(1)
      : 0;
  const highestScore = results.length > 0 ? Math.max(...results.map((r) => r.percentage)) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-200 dark:border-slate-600 border-t-sky-600 dark:border-t-sky-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400">Loading exam data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 p-6 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Exams</h1>
          </div>
          <p className="text-purple-100">View your exam schedule and personal results.</p>
          {upcomingExams.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-lg px-3 py-1.5 text-sm font-medium">
              <AlertCircle className="w-4 h-4" />
              {upcomingExams.length} upcoming exam{upcomingExams.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {(["schedule", "results"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition capitalize ${
              activeTab === tab
                ? "border-violet-500 text-violet-600 dark:text-violet-400"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {tab === "schedule" ? "📅 Exam Schedule" : "📊 My Results"}
          </button>
        ))}
      </div>

      {/* ── SCHEDULE TAB ── */}
      {activeTab === "schedule" && (
        <div className="space-y-6">
          {/* Upcoming Exams */}
          <section>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Upcoming Exams ({upcomingExams.length})
            </h2>
            {upcomingExams.length > 0 ? (
              <div className="space-y-3">
                {upcomingExams.map((exam) => {
                  const daysLeft = Math.ceil(
                    (new Date(exam.exam_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  const isExpanded = expandedExam === exam.exam_id;
                  return (
                    <div
                      key={exam.exam_id}
                      className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden"
                    >
                      <div className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getTypeBadgeColor(exam.type)}`}>
                                {getTypeLabel(exam.type)}
                              </span>
                              {daysLeft <= 3 && (
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 animate-pulse">
                                  {daysLeft === 0 ? "Today!" : `${daysLeft}d left`}
                                </span>
                              )}
                            </div>
                            <h3 className="font-bold text-slate-900 dark:text-white text-lg">{exam.title}</h3>
                            <p className="text-sm text-violet-600 dark:text-violet-400 font-medium mt-0.5">
                              {exam.subject_name} {exam.subject_code && `• ${exam.subject_code}`}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-slate-900 dark:text-white">
                              {new Date(exam.exam_date).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {exam.start_time && `${exam.start_time}${exam.end_time ? ` – ${exam.end_time}` : ""}`}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500 dark:text-slate-400">
                          {exam.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" /> {exam.duration_minutes} min
                            </span>
                          )}
                          {exam.total_marks && (
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" /> {exam.total_marks} marks
                            </span>
                          )}
                          {exam.venue && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" /> {exam.venue}
                            </span>
                          )}
                        </div>

                        {exam.instructions && (
                          <button
                            onClick={() => setExpandedExam(isExpanded ? null : exam.exam_id)}
                            className="mt-3 flex items-center gap-1 text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 font-medium"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {isExpanded ? "Hide" : "Show"} instructions
                          </button>
                        )}
                      </div>

                      {isExpanded && exam.instructions && (
                        <div className="px-5 pb-5">
                          <div className="rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 p-4">
                            <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-2">
                              Instructions
                            </p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                              {exam.instructions}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 text-center">
                <CheckCircle className="w-12 h-12 mx-auto text-emerald-300 dark:text-emerald-600 mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No upcoming exams scheduled.</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">You're all clear for now!</p>
              </div>
            )}
          </section>

          {/* Past Exams */}
          {pastExams.length > 0 && (
            <section>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                Past Exams ({pastExams.length})
              </h2>
              <div className="space-y-2">
                {pastExams.map((exam) => (
                  <div
                    key={exam.exam_id}
                    className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 opacity-75"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${getTypeBadgeColor(exam.type)}`}>
                            {getTypeLabel(exam.type)}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300">{exam.title}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{exam.subject_name}</p>
                      </div>
                      <p className="text-sm text-slate-400 dark:text-slate-500 flex-shrink-0">
                        {new Date(exam.exam_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {schedule.length === 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">No Exam Schedule Available</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Your exam schedule will appear here once it's published by school administration.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── RESULTS TAB ── */}
      {activeTab === "results" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          {results.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Total Results
                </p>
                <p className="text-4xl font-bold text-slate-900 dark:text-white">{results.length}</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Exams recorded</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Average Score
                </p>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{avgPercentage}%</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Across all exams</p>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Best Score
                </p>
                <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">{highestScore}%</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Highest achieved</p>
              </div>
            </div>
          )}

          {/* Filter */}
          <div className="flex gap-2 flex-wrap">
            {(["ALL", "FINAL", "MID", "TEST"] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  filterType === type
                    ? "bg-violet-600 text-white"
                    : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {type === "ALL" ? "All" : getTypeLabel(type)} ({type === "ALL" ? results.length : results.filter(r => r.type === type).length})
              </button>
            ))}
          </div>

          {/* Results List */}
          {filteredResults.length > 0 ? (
            <div className="space-y-3">
              {filteredResults.map((result, idx) => (
                <div
                  key={result.result_id || result.mark_id || idx}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getTypeBadgeColor(result.type)}`}>
                          {getTypeLabel(result.type)}
                        </span>
                        {result.academic_year && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {result.academic_year} {result.term && `• Term ${result.term}`}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {result.subject_name}
                        {result.subject_code && (
                          <span className="ml-2 text-sm font-normal text-slate-500 dark:text-slate-400">
                            ({result.subject_code})
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {result.teacher_name}
                      </p>
                      {result.remarks && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 italic">
                          "{result.remarks}"
                        </p>
                      )}
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        {result.graded_at
                          ? new Date(result.graded_at).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })
                          : ""}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {result.letter_grade && (
                        <span className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl text-xl font-bold ${getGradeColor(result.letter_grade)}`}>
                          {result.letter_grade}
                        </span>
                      )}
                      <p className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                        {result.score}/{result.max_score}
                      </p>
                      <div className="mt-2">
                        <div className="h-1.5 w-28 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              result.percentage >= 80
                                ? "bg-emerald-500"
                                : result.percentage >= 60
                                ? "bg-blue-500"
                                : result.percentage >= 50
                                ? "bg-amber-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${Math.min(result.percentage, 100)}%` }}
                          />
                        </div>
                        <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mt-0.5">
                          {result.percentage}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
              <TrendingUp className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">No Results Yet</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {filterType === "ALL"
                  ? "Your exam results will appear here once your teachers post them."
                  : `No ${getTypeLabel(filterType)} results available. Try a different filter.`}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
