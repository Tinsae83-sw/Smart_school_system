"use client";

import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/vp-academic";

type ClassSchedule = {
  schedule_id?: number;
  school_class?: {
    class_id: number;
    class_name: string;
  };
  subject?: {
    subject_id: number;
    subject_name: string;
  };
  teacher?: {
    teacher_id: number;
    user: {
      full_name: string;
    };
  };
  day_of_week: string;
  period: number;
  room_number?: string;
  start_time: string;
  end_time: string;
  is_study_period?: boolean;
};

type SchoolClass = {
  class_id: number;
  class_name: string;
};

type Teacher = {
  teacher_id: number;
  user: {
    full_name: string;
  };
};

type Subject = {
  subject_id: number;
  subject_name: string;
  credit_hour: number;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

export default function TimetablesPage() {
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [formData, setFormData] = useState({
    class_id: "",
    subject_id: "",
    teacher_id: "",
    day_of_week: "Monday",
    period: 1,
    room_number: "",
    start_time: "08:00",
    end_time: "08:45",
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [schedulesRes, classesRes, teachersRes, subjectsRes] = await Promise.all([
        fetch(`${API_BASE}/timetable/individual/class/${selectedClass || "all"}`),
        fetch(`${API_BASE}/../admin/classes`),
        fetch(`${API_BASE}/teachers`),
        fetch(`${API_BASE}/../admin/subjects`),
      ]);

      if (schedulesRes.ok) setSchedules(await schedulesRes.json());
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.classes || []);
      }
      if (teachersRes.ok) setTeachers(await teachersRes.json());
      if (subjectsRes.ok) setSubjects(await subjectsRes.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [selectedClass]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/timetable/assign-teacher`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class_id: parseInt(formData.class_id),
          subject_id: parseInt(formData.subject_id),
          teacher_id: parseInt(formData.teacher_id),
          day_of_week: formData.day_of_week,
          period: formData.period,
          room_number: formData.room_number,
          start_time: formData.start_time,
          end_time: formData.end_time,
        }),
      });
      if (!res.ok) throw new Error("Failed to create schedule");
      setShowModal(false);
      setFormData({
        class_id: "",
        subject_id: "",
        teacher_id: "",
        day_of_week: "Monday",
        period: 1,
        room_number: "",
        start_time: "08:00",
        end_time: "08:45",
      });
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to create schedule.");
    }
  }

  async function handleAutoGenerate() {
    if (!confirm("This will clear all existing schedules and generate a new timetable based on subject credit hours. Continue?")) return;
    
    setIsGenerating(true);
    setGenerationResult(null);
    try {
      const res = await fetch(`${API_BASE}/timetable/auto-generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      
      if (!res.ok) {
        setGenerationResult({ success: false, error: data.error || "Failed to generate timetable" });
        alert(data.error || "Failed to generate timetable");
      } else {
        setGenerationResult(data);
        alert("Timetable generated successfully!");
        fetchData();
      }
    } catch (error) {
      console.error(error);
      setGenerationResult({ success: false, error: "Failed to generate timetable" });
      alert("Failed to generate timetable.");
    } finally {
      setIsGenerating(false);
    }
  }

  function getScheduleForSlot(day: string, period: number) {
    const schedule = schedules.find((s) => s.day_of_week === day && s.period === period);
    
    // If no schedule found for this slot, create a study period
    if (!schedule) {
      const startHour = 8;
      const PERIOD_DURATION_MINUTES = 45;
      const startMinute = (period - 1) * PERIOD_DURATION_MINUTES;
      const endMinute = startMinute + PERIOD_DURATION_MINUTES;
      
      const formatTime = (hour: number, minutes: number) => {
        const totalMinutes = hour * 60 + minutes;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };
      
      return {
        day_of_week: day,
        period,
        room_number: 'Study Hall',
        start_time: formatTime(startHour, startMinute),
        end_time: formatTime(startHour, endMinute),
        is_study_period: true
      };
    }
    
    return schedule;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Timetable Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage class schedules and teacher assignments</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleAutoGenerate}
            disabled={isGenerating}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? "Generating..." : "Auto Generate"}
          </button>
          <button
            onClick={() => {
              setFormData({
                class_id: "",
                subject_id: "",
                teacher_id: "",
                day_of_week: "Monday",
                period: 1,
                room_number: "",
                start_time: "08:00",
                end_time: "08:45",
              });
              setShowModal(true);
            }}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Add Schedule
          </button>
        </div>
      </div>

      {/* Generation Result */}
      {generationResult && generationResult.success && (
        <div className="mb-6 rounded-xl bg-blue-50 border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Generation Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-blue-700">Total Classes:</span>
              <span className="ml-2 font-medium text-blue-900">{generationResult.summary?.total_classes || 0}</span>
            </div>
            <div>
              <span className="text-blue-700">Total Subjects:</span>
              <span className="ml-2 font-medium text-blue-900">{generationResult.summary?.total_subjects || 0}</span>
            </div>
            <div>
              <span className="text-blue-700">Total Teachers:</span>
              <span className="ml-2 font-medium text-blue-900">{generationResult.summary?.total_teachers || 0}</span>
            </div>
            <div>
              <span className="text-blue-700">Periods Scheduled:</span>
              <span className="ml-2 font-medium text-blue-900">{generationResult.summary?.total_periods_scheduled || 0}</span>
            </div>
          </div>
          {generationResult.warnings && generationResult.warnings.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-blue-800 mb-1">Warnings:</h4>
              <ul className="text-xs text-blue-700 list-disc list-inside">
                {generationResult.warnings.map((warning: string, idx: number) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Class</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full max-w-xs rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        >
          <option value="">All Classes</option>
          {classes.map((cls) => (
            <option key={cls.class_id} value={cls.class_id}>
              {cls.class_name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3 w-20">Period</th>
                  {DAYS.map((day) => (
                    <th key={day} className="px-4 py-3">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PERIODS.map((period) => (
                  <tr key={period}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900 bg-slate-50">
                      {period}
                    </td>
                    {DAYS.map((day) => {
                      const schedule = getScheduleForSlot(day, period);
                      return (
                        <td key={`${day}-${period}`} className="px-4 py-2">
                          {schedule ? (
                            schedule.is_study_period ? (
                              <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 text-xs">
                                <p className="font-medium text-amber-900">Study Period</p>
                                <p className="text-amber-700 mt-1">{schedule.room_number || "Study Hall"}</p>
                                <p className="text-amber-600">
                                  {schedule.start_time} - {schedule.end_time}
                                </p>
                              </div>
                            ) : (
                              <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2 text-xs">
                                <p className="font-medium text-emerald-900">{schedule.subject?.subject_name || "N/A"}</p>
                                <p className="text-emerald-700">{schedule.teacher?.user?.full_name || "TBD"}</p>
                                <p className="text-emerald-600 mt-1">{schedule.room_number || "TBD"}</p>
                                <p className="text-emerald-600">
                                  {schedule.start_time} - {schedule.end_time}
                                </p>
                              </div>
                            )
                          ) : (
                            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-xs text-slate-400">
                              Free
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add Schedule</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
                <select
                  required
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.class_id} value={cls.class_id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <select
                  required
                  value={formData.subject_id}
                  onChange={(e) => setFormData({ ...formData, subject_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.subject_id} value={subject.subject_id}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Teacher</label>
                <select
                  required
                  value={formData.teacher_id}
                  onChange={(e) => setFormData({ ...formData, teacher_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">Select Teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.teacher_id} value={teacher.teacher_id}>
                      {teacher.user.full_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Day</label>
                  <select
                    required
                    value={formData.day_of_week}
                    onChange={(e) => setFormData({ ...formData, day_of_week: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Period</label>
                  <select
                    required
                    value={formData.period}
                    onChange={(e) => setFormData({ ...formData, period: parseInt(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {PERIODS.map((period) => (
                      <option key={period} value={period}>
                        Period {period}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Room Number</label>
                <input
                  type="text"
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Add Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
