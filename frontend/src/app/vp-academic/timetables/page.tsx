"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { vpAcademicApi } from "@/lib/api";

type SemesterEvent = {
  event_id?: number;
  event_type: "mid-term" | "test" | "final" | "meeting" | "other";
  title: string;
  description?: string;
  event_date: string;
  start_time: string;
  end_time: string;
  class_name?: string;
  subject_name?: string;
  location?: string;
  is_active: boolean;
};

type ClassSchedule = {
  schedule_id?: number;
  class_id: number;
  subject_id: number;
  teacher_id?: number;
  day_of_week: string;
  period: number;
  room_number?: string;
  start_time: string;
  end_time: string;
  subject?: {
    subject_id: number;
    subject_name: string;
    credit_hour: number;
  };
  teacher?: {
    teacher_id: number;
    user: {
      full_name: string;
    };
  };
};

type SchoolClass = {
  class_id: number;
  class_name: string;
};

type Subject = {
  subject_id: number;
  subject_name: string;
  credit_hour: number;
};

type Teacher = {
  teacher_id: number;
  user: {
    full_name: string;
  };
};

const EVENT_TYPES = [
  { value: "mid-term", label: "Mid-Term Exam", color: "emerald" },
  { value: "test", label: "Test", color: "emerald" },
  { value: "final", label: "Final Exam", color: "emerald" },
  { value: "meeting", label: "Meeting", color: "emerald" },
  { value: "other", label: "Other Event", color: "emerald" },
] as const;

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];
const PERIOD_DURATION = 42; // minutes

export default function TimetablesPage() {
  const [activeTab, setActiveTab] = useState<"semester" | "schedule">("semester");
  const [events, setEvents] = useState<SemesterEvent[]>([]);
  const [schedules, setSchedules] = useState<ClassSchedule[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SemesterEvent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const fetchDataRef = useRef<{ isFetching: boolean }>({ isFetching: false });
  const [formData, setFormData] = useState({
    event_type: "test" as SemesterEvent["event_type"],
    title: "",
    description: "",
    event_date: "",
    start_time: "08:00",
    end_time: "09:00",
    class_name: "",
    subject_name: "",
    location: "",
  });
  const [scheduleFormData, setScheduleFormData] = useState({
    class_id: "",
    subject_id: "",
    teacher_id: "",
    day_of_week: "Monday",
    period: 1,
    room_number: "",
  });

  const fetchData = useCallback(async () => {
    if (fetchDataRef.current.isFetching) return;
    fetchDataRef.current.isFetching = true;
    setLoading(true);
    try {
      const [eventsRes, schedulesRes, classesRes, subjectsRes, teachersRes] = await Promise.all([
        vpAcademicApi.get('/semester-events'),
        vpAcademicApi.get(`/timetable/individual/class/${selectedClass || "all"}`),
        vpAcademicApi.get(`/../admin/classes`),
        vpAcademicApi.get(`/../admin/subjects`),
        vpAcademicApi.get('/teachers'),
      ]);

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events || data || []);
      }
      if (schedulesRes.ok) {
        const data = await schedulesRes.json();
        setSchedules(data || []);
      }
      if (classesRes.ok) {
        const data = await classesRes.json();
        setClasses(data.classes || []);
      }
      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        setSubjects(data.subjects || data);
      }
      if (teachersRes.ok) {
        const data = await teachersRes.json();
        setTeachers(data || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
      fetchDataRef.current.isFetching = false;
    }
  }, [selectedClass]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await vpAcademicApi.post('/semester-events', {
        event_type: formData.event_type,
        title: formData.title,
        description: formData.description,
        event_date: formData.event_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        class_name: formData.class_name || null,
        subject_name: formData.subject_name || null,
        location: formData.location || null,
      });
      if (!res.ok) throw new Error("Failed to create event");
      setShowModal(false);
      setFormData({
        event_type: "test",
        title: "",
        description: "",
        event_date: "",
        start_time: "08:00",
        end_time: "09:00",
        class_name: "",
        subject_name: "",
        location: "",
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to create event:", error);
      alert("Failed to create event.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const startHour = 8;
      const startMinute = (parseInt(scheduleFormData.period) - 1) * PERIOD_DURATION;
      const endMinute = startMinute + PERIOD_DURATION;

      const formatTime = (hour: number, minutes: number) => {
        const totalMinutes = hour * 60 + minutes;
        const h = Math.floor(totalMinutes / 60);
        const m = totalMinutes % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      };

      const res = await vpAcademicApi.put('/timetable/assign-teacher', {
        class_id: parseInt(scheduleFormData.class_id),
        subject_id: parseInt(scheduleFormData.subject_id),
        teacher_id: parseInt(scheduleFormData.teacher_id),
        day_of_week: scheduleFormData.day_of_week,
        period: parseInt(scheduleFormData.period),
        room_number: scheduleFormData.room_number,
        start_time: formatTime(startHour, startMinute),
        end_time: formatTime(startHour, endMinute),
      });
      if (!res.ok) throw new Error("Failed to create schedule");
      setShowModal(false);
      setScheduleFormData({
        class_id: "",
        subject_id: "",
        teacher_id: "",
        day_of_week: "Monday",
        period: 1,
        room_number: "",
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to create schedule:", error);
      alert("Failed to create schedule.");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Calculate number of periods needed for a subject based on credit hours
  function calculatePeriods(creditHour: number): number {
    return Math.ceil((creditHour * 60) / PERIOD_DURATION);
  }

  function getScheduleForSlot(day: string, period: number) {
    const schedule = schedules.find((s) => s.day_of_week === day && s.period === period);
    return schedule;
  }

  function handleAutoGenerateSchedule() {
    setShowGenerateModal(true);
  }

  async function confirmGenerateSchedule() {
    setShowGenerateModal(false);
    setIsGenerating(true);
    try {
      const res = await vpAcademicApi.post('/timetable/auto-generate', {});
      if (!res.ok) {
        const data = await res.json();
        const errorMessage = data.error || "Failed to generate timetable";
        
        // Show detailed error message
        if (data.details) {
          const details = data.details.map((d: any) => `${d.class} - ${d.subject}`).join('\n');
          alert(`${errorMessage}\n\nMissing teachers for:\n${details}`);
        } else {
          alert(errorMessage);
        }
        throw new Error(errorMessage);
      }
      alert("Timetable generated successfully!");
      await fetchData();
    } catch (error) {
      console.error("Failed to generate timetable:", error);
    } finally {
      setIsGenerating(false);
    }
  }

  function handleDeleteEvent(event: SemesterEvent) {
    setSelectedEvent(event);
    setShowDeleteModal(true);
  }

  async function confirmDeleteEvent() {
    if (!selectedEvent?.event_id) return;
    try {
      const res = await vpAcademicApi.delete(`/semester-events/${selectedEvent.event_id}`);
      if (res.ok) {
        setShowDeleteModal(false);
        setSelectedEvent(null);
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
      alert("Failed to delete event.");
    }
  }

  function getEventColor(eventType: string) {
    const eventConfig = EVENT_TYPES.find(e => e.value === eventType);
    return eventConfig?.color || "gray";
  }

  function getEventLabel(eventType: string) {
    const eventConfig = EVENT_TYPES.find(e => e.value === eventType);
    return eventConfig?.label || eventType;
  }

  // Filter events
  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (event.class_name && event.class_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (event.subject_name && event.subject_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = !filterType || event.event_type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Sort events by date
  const sortedEvents = [...filteredEvents].sort((a, b) => 
    new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
  );

  // Calculate stats
  const stats = {
    total: events.length,
    midTerm: events.filter(e => e.event_type === "mid-term").length,
    tests: events.filter(e => e.event_type === "test").length,
    finals: events.filter(e => e.event_type === "final").length,
    meetings: events.filter(e => e.event_type === "meeting").length,
    other: events.filter(e => e.event_type === "other").length,
  };

  const colorClasses: Record<string, { bg: string; text: string; darkBg: string; darkText: string }> = {
    orange: { bg: "bg-orange-100", text: "text-orange-600", darkBg: "dark:bg-orange-900/30", darkText: "dark:text-orange-400" },
    gray: { bg: "bg-gray-100", text: "text-gray-600", darkBg: "dark:bg-gray-900/30", darkText: "dark:text-gray-400" },
  };

  return (
    <div>
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Timetable Management</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage semester plans and class schedules</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-slate-200 dark:border-slate-700">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("semester")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === "semester"
                  ? "border-orange-500 text-orange-600 dark:text-orange-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              Semester Plan
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === "schedule"
                  ? "border-orange-500 text-orange-600 dark:text-orange-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
              }`}
            >
              Class Schedule
            </button>
          </nav>
        </div>
      </div>

      {activeTab === "semester" ? (
        <>
          <div className="mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Semester Plan</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage mid-terms, tests, finals, meetings, and other semester events</p>
            </div>
          </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6 mb-8">
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Total Events</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.total}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Mid-Terms</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.midTerm}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Tests</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.tests}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Finals</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.finals}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Meetings</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.meetings}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Other</p>
              <p className="text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1">{stats.other}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div className="min-w-[200px]">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
          >
            <option value="">All Event Types</option>
            {EVENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={() => {
            setFormData({
              event_type: "test",
              title: "",
              description: "",
              event_date: "",
              start_time: "08:00",
              end_time: "09:00",
              class_name: "",
              subject_name: "",
              location: "",
            });
            setShowModal(true);
          }}
          className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition shadow-lg shadow-orange-200"
        >
          Add Event
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 dark:border-orange-400 border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Semester Events</h2>
          </div>
          <div className="p-6">
            {sortedEvents.length === 0 ? (
              <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-12">
                {searchQuery || filterType ? "No events match your search." : "No events scheduled yet. Add your first event to get started."}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedEvents.map((event) => {
                  const colors = colorClasses[getEventColor(event.event_type)] || colorClasses.gray;
                  return (
                    <div
                      key={event.event_id}
                      className={`rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-md transition ${colors.bg} dark:${colors.darkBg}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text} dark:${colors.darkBg} dark:${colors.darkText}`}>
                              {getEventLabel(event.event_type)}
                            </span>
                            <h3 className={`text-base font-semibold ${colors.text} dark:${colors.darkText}`}>{event.title}</h3>
                          </div>
                          {event.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{event.description}</p>
                          )}
                          <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              <span>{new Date(event.event_date).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <span>{event.start_time} - {event.end_time}</span>
                            </div>
                            {event.class_name && (
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                <span>{event.class_name}</span>
                              </div>
                            )}
                            {event.subject_name && (
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                </svg>
                                <span>{event.subject_name}</span>
                              </div>
                            )}
                            {event.location && (
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>{event.location}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteEvent(event)}
                          className="rounded-lg bg-red-50 dark:bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
        </>
      ) : (
        <>
          <div className="mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Class Schedule</h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage class schedules with 7 periods per day (42 minutes each)</p>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filter by Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls.class_id} value={cls.class_id}>
                    {cls.class_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 self-end">
              <button
                onClick={handleAutoGenerateSchedule}
                disabled={isGenerating}
                className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-200"
              >
                {isGenerating ? "Generating..." : "Auto Generate"}
              </button>
              <button
                onClick={() => {
                  setScheduleFormData({
                    class_id: "",
                    subject_id: "",
                    teacher_id: "",
                    day_of_week: "Monday",
                    period: 1,
                    room_number: "",
                  });
                  setShowModal(true);
                }}
                className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition shadow-lg shadow-orange-200"
              >
                Add Schedule
              </button>
            </div>
          </div>

          {/* Subject Periods Info */}
          <div className="mb-6 rounded-xl bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 p-4">
            <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-300 mb-2">Subject Period Calculation</h3>
            <p className="text-xs text-orange-700 dark:text-orange-400">
              Each period is {PERIOD_DURATION} minutes. Periods are calculated as: (Credit Hours × 60) ÷ {PERIOD_DURATION}
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              {subjects.slice(0, 5).map((subject) => (
                <div key={subject.subject_id} className="text-xs bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-orange-200 dark:border-orange-700">
                  <span className="font-medium text-orange-900 dark:text-orange-300">{subject.subject_name}</span>
                  <span className="text-orange-700 dark:text-orange-400 ml-2">
                    {calculatePeriods(subject.credit_hour)} periods ({subject.credit_hour} credits)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 dark:border-orange-400 border-t-transparent" />
            </div>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400">
                      <th className="px-6 py-4 w-24">Period</th>
                      <th className="px-6 py-4">Time</th>
                      {DAYS.map((day) => (
                        <th key={day} className="px-6 py-4">
                          {day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {PERIODS.map((period) => {
                      const startHour = 8;
                      const startMinute = (period - 1) * PERIOD_DURATION;
                      const endMinute = startMinute + PERIOD_DURATION;

                      const formatTime = (hour: number, minutes: number) => {
                        const totalMinutes = hour * 60 + minutes;
                        const h = Math.floor(totalMinutes / 60);
                        const m = totalMinutes % 60;
                        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                      };

                      return (
                        <tr key={period}>
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-700/50">
                            {period}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50">
                            {formatTime(startHour, startMinute)} - {formatTime(startHour, endMinute)}
                          </td>
                          {DAYS.map((day) => {
                            const schedule = getScheduleForSlot(day, period);
                            return (
                              <td key={`${day}-${period}`} className="px-6 py-3">
                                {schedule ? (
                                  <div className="rounded-xl bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 p-3 text-xs">
                                    <p className="font-medium text-orange-900 dark:text-orange-300">{schedule.subject?.subject_name || "N/A"}</p>
                                    <p className="text-orange-700 dark:text-orange-400">{schedule.teacher?.user?.full_name || "TBD"}</p>
                                    <p className="text-orange-600 dark:text-orange-500 mt-1">{schedule.room_number || "TBD"}</p>
                                  </div>
                                ) : (
                                  <div className="rounded-xl bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 p-3 text-xs text-orange-400 dark:text-orange-500">
                                    Free
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Event Modal (Semester) */}
      {showModal && activeTab === "semester" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Semester Event</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Event Type *</label>
                <select
                  required
                  value={formData.event_type}
                  onChange={(e) => setFormData({ ...formData, event_type: e.target.value as SemesterEvent["event_type"] })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                >
                  {EVENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                  placeholder="e.g., Mathematics Mid-Term Exam"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                  rows={3}
                  placeholder="Additional details about the event"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={formData.event_date}
                  onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Start Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">End Time *</label>
                  <input
                    type="time"
                    required
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Class (Optional)</label>
                <select
                  value={formData.class_name}
                  onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.class_id} value={cls.class_name}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject (Optional)</label>
                <select
                  value={formData.subject_name}
                  onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.subject_id} value={subject.subject_name}>
                      {subject.subject_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location (Optional)</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                  placeholder="e.g., Room 101, Main Hall"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Adding..." : "Add Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Schedule Modal (Class Schedule) */}
      {showModal && activeTab === "schedule" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Add Class Schedule</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Class *</label>
                <select
                  required
                  value={scheduleFormData.class_id}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, class_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Subject *</label>
                <select
                  required
                  value={scheduleFormData.subject_id}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, subject_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                >
                  <option value="">Select Subject</option>
                  {subjects.map((subject) => (
                    <option key={subject.subject_id} value={subject.subject_id}>
                      {subject.subject_name} ({calculatePeriods(subject.credit_hour)} periods)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teacher *</label>
                <select
                  required
                  value={scheduleFormData.teacher_id}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, teacher_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
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
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Day *</label>
                  <select
                    required
                    value={scheduleFormData.day_of_week}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, day_of_week: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                  >
                    {DAYS.map((day) => (
                      <option key={day} value={day}>
                        {day}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Period *</label>
                  <select
                    required
                    value={scheduleFormData.period}
                    onChange={(e) => setScheduleFormData({ ...scheduleFormData, period: parseInt(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
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
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Room Number</label>
                <input
                  type="text"
                  value={scheduleFormData.room_number}
                  onChange={(e) => setScheduleFormData({ ...scheduleFormData, room_number: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                  placeholder="e.g., Room 101"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Adding..." : "Add Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Delete Event</h2>
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedEvent(null);
                }}
                className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                    Are you sure you want to delete this event?
                  </p>
                  <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-3 border border-slate-200 dark:border-slate-600">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {selectedEvent.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {new Date(selectedEvent.event_date).toLocaleDateString()} at {selectedEvent.start_time}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedEvent(null);
                }}
                className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteEvent}
                disabled={isSubmitting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Generate Confirmation Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Auto Generate Schedule</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-base font-semibold text-slate-900 dark:text-white mb-2">
                    Are you sure you want to auto-generate the schedule?
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                    This will clear all existing schedules and generate a new timetable based on subject credit hours.
                  </p>
                  <div className="rounded-lg bg-orange-50 dark:bg-orange-900/30 p-3 border border-orange-200 dark:border-orange-800">
                    <p className="text-xs font-medium text-orange-900 dark:text-orange-300 mb-1">Schedule Details:</p>
                    <ul className="text-xs text-orange-700 dark:text-orange-400 space-y-1">
                      <li>• 7 periods per day (42 minutes each)</li>
                      <li>• Monday - Friday</li>
                      <li>• Calculated from credit hours</li>
                      <li>• Automatic teacher & room assignment</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmGenerateSchedule}
                disabled={isGenerating}
                className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? "Generating..." : "Generate Schedule"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
