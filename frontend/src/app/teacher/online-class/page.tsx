"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch, formatDisplayDateTime, Toast } from "../shared";

interface ClassSubject {
  class_subject_id: number;
  class_id: number;
  school_class?: { class_name: string };
  subject?: { subject_name: string };
}

interface OnlineClass {
  online_class_id: number;
  title: string;
  description?: string;
  scheduled_date: string;
  scheduled_time: string;
  duration_minutes: number;
  meeting_link?: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";
  class_subject?: ClassSubject;
}

const PLATFORMS = [
  { id: "google-meet", label: "Google Meet", defaultPrefix: "https://meet.google.com/" },
  { id: "zoom", label: "Zoom Meetings", defaultPrefix: "https://zoom.us/j/" },
  { id: "teams", label: "Microsoft Teams", defaultPrefix: "https://teams.microsoft.com/l/meetup-join/" },
];

export default function OnlineClassPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<ClassSubject[]>([]);
  const [onlineClasses, setOnlineClasses] = useState<OnlineClass[]>([]);
  const [loading, setLoading] = useState(true);

  // Schedule Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [form, setForm] = useState({
    class_subject_id: "",
    title: "",
    platform: "google-meet",
    meeting_link: "",
    scheduled_datetime: "",
    duration_minutes: "60",
    description: "",
  });

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
      const [classesData, onlineData] = await Promise.all([
        authFetch("/api/teacher/classes", {}, tok),
        authFetch("/api/teacher/online-classes", {}, tok),
      ]);

      const classList = Array.isArray(classesData) ? classesData : [];
      setClasses(classList);
      if (classList.length > 0) {
        setForm((prev) => ({
          ...prev,
          class_subject_id: String(classList[0].class_subject_id),
        }));
      }

      const list = Array.isArray(onlineData) ? onlineData : [];
      setOnlineClasses(list);
    } catch (e: any) {
      showToast(e.message || "Failed to load online classes", "error");
    } finally {
      setLoading(false);
    }
  }

  async function reloadClasses() {
    try {
      const data = await authFetch("/api/teacher/online-classes", {}, token);
      setOnlineClasses(Array.isArray(data) ? data : []);
    } catch (e: any) {
      showToast(e.message || "Failed to reload classes", "error");
    }
  }

  function openScheduleModal() {
    const defaultPlatform = PLATFORMS[0];
    const mockCode = Math.random().toString(36).substring(2, 6) + "-" + Math.random().toString(36).substring(2, 6);
    setForm({
      class_subject_id: classes[0]?.class_subject_id ? String(classes[0].class_subject_id) : "",
      title: "",
      platform: defaultPlatform.id,
      meeting_link: `${defaultPlatform.defaultPrefix}${mockCode}`,
      scheduled_datetime: "",
      duration_minutes: "60",
      description: "",
    });
    setFormErrors([]);
    setModalOpen(true);
  }

  function handlePlatformChange(platformId: string) {
    const found = PLATFORMS.find((p) => p.id === platformId);
    const mockCode = Math.random().toString(36).substring(2, 6) + "-" + Math.random().toString(36).substring(2, 6);
    setForm((prev) => ({
      ...prev,
      platform: platformId,
      meeting_link: found ? `${found.defaultPrefix}${mockCode}` : prev.meeting_link,
    }));
  }

  async function handleScheduleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: string[] = [];

    if (!form.title.trim()) errors.push("Class session title is required.");
    if (!form.class_subject_id) errors.push("Please select a class/subject.");
    if (!form.scheduled_datetime) {
      errors.push("Scheduled date and time is required.");
    } else if (new Date(form.scheduled_datetime) <= new Date()) {
      errors.push("Start time must be in the future.");
    }

    if (!form.meeting_link.trim()) {
      errors.push("Meeting link is required.");
    } else {
      try {
        new URL(form.meeting_link.trim());
      } catch {
        errors.push("Meeting link must be a valid URL (starting with http:// or https://).");
      }
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors([]);
    setScheduleLoading(true);

    try {
      const scheduledDate = new Date(form.scheduled_datetime);

      await authFetch(
        "/api/teacher/online-classes",
        {
          method: "POST",
          body: JSON.stringify({
            class_subject_id: parseInt(form.class_subject_id),
            title: form.title.trim(),
            description: `${form.description.trim()} [Platform: ${form.platform}] [Link: ${form.meeting_link.trim()}]`,
            scheduled_date: scheduledDate.toISOString(),
            scheduled_time: scheduledDate.toISOString(),
            duration_minutes: parseInt(form.duration_minutes) || 60,
          }),
        },
        token
      );

      showToast("Online class session scheduled successfully!", "success");
      setModalOpen(false);
      await reloadClasses();
    } catch (e: any) {
      showToast(e.message || "Failed to schedule class", "error");
    } finally {
      setScheduleLoading(false);
    }
  }

  // Start class action
  async function handleStartClass(onlineClassId: number, existingLink?: string) {
    try {
      const link = existingLink || "https://meet.google.com/mock-live-session";
      await authFetch(
        `/api/teacher/online-classes/${onlineClassId}/start`,
        {
          method: "POST",
          body: JSON.stringify({ meeting_link: link, meeting_password: "mock-password" }),
        },
        token
      );

      showToast("Online class is now LIVE!", "success");
      await reloadClasses();
      if (link) {
        window.open(link, "_blank");
      }
    } catch (e: any) {
      showToast(e.message || "Failed to start online class", "error");
    }
  }

  // End class action
  async function handleEndClass(onlineClassId: number) {
    try {
      await authFetch(
        `/api/teacher/online-classes/${onlineClassId}/end`,
        {
          method: "POST",
          body: JSON.stringify({ recording_url: "https://school.mock/recordings/session.mp4" }),
        },
        token
      );

      showToast("Online class session ended.", "info");
      await reloadClasses();
    } catch (e: any) {
      showToast(e.message || "Failed to end class", "error");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 dark:border-slate-600 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Loading virtual classrooms...</p>
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
            Online Classes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Schedule virtual lectures, launch live video rooms, and monitor student attendance
          </p>
        </div>

        <button
          type="button"
          onClick={openScheduleModal}
          className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20"
        >
          + Schedule Online Class
        </button>
      </div>

      {/* Sessions Grid */}
      {onlineClasses.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <svg className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Online Classes Scheduled</h3>
          <p className="text-slate-500 dark:text-slate-400 mt-1 mb-4 text-sm">
            Host distance learning lectures via Google Meet, Zoom, or Microsoft Teams.
          </p>
          <button
            type="button"
            onClick={openScheduleModal}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition"
          >
            Schedule a Class
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {onlineClasses.map((cls) => {
            const isLive = cls.status === "IN_PROGRESS";
            const isEnded = cls.status === "COMPLETED";

            // Extract link from description if meeting_link not set directly
            const linkMatch = cls.description?.match(/\[Link:\s*([^\]]+)\]/);
            const resolvedLink = cls.meeting_link || (linkMatch ? linkMatch[1] : "");

            return (
              <div
                key={cls.online_class_id}
                className={`bg-white dark:bg-slate-800 rounded-2xl border p-6 shadow-sm flex flex-col justify-between transition ${
                  isLive
                    ? "border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500/20"
                    : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                      {cls.class_subject?.school_class?.class_name || "Class"} —{" "}
                      {cls.class_subject?.subject?.subject_name || "Subject"}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isLive
                          ? "bg-emerald-500 text-white animate-pulse"
                          : isEnded
                          ? "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                          : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                      }`}
                    >
                      {isLive && <span className="w-2 h-2 rounded-full bg-white animate-ping" />}
                      {isLive ? "● LIVE NOW" : isEnded ? "Ended" : "Scheduled"}
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-3">
                    {cls.title}
                  </h2>
                  {cls.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                      {cls.description.replace(/\[Platform:[^\]]+\]/, "").replace(/\[Link:[^\]]+\]/, "")}
                    </p>
                  )}

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Start Time:</span>
                      <span>{formatDisplayDateTime(cls.scheduled_date || cls.scheduled_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">Duration:</span>
                      <span>{cls.duration_minutes} minutes</span>
                    </div>
                    {resolvedLink && (
                      <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Room Link:</span>
                        <a
                          href={resolvedLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 hover:underline overflow-hidden text-ellipsis"
                        >
                          {resolvedLink}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end gap-2">
                  {!isEnded && !isLive && (
                    <button
                      type="button"
                      onClick={() => handleStartClass(cls.online_class_id, resolvedLink)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
                    >
                      Start Class (Go Live)
                    </button>
                  )}

                  {isLive && (
                    <>
                      {resolvedLink && (
                        <a
                          href={resolvedLink}
                          target="_blank"
                          rel="noreferrer"
                          className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
                        >
                          Open Meeting Room ↗
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => handleEndClass(cls.online_class_id)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700 transition shadow-sm"
                      >
                        End Class
                      </button>
                    </>
                  )}

                  {isEnded && (
                    <span className="text-xs text-slate-400 italic">Session concluded</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── SCHEDULE MODAL ───────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-xl w-full p-6 md:p-8 shadow-xl border border-slate-200 dark:border-slate-700 space-y-6 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Schedule Online Lecture
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

            <form onSubmit={handleScheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Session Title *
                </label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., Live Q&A: Thermodynamics and Heat Transfer"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
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
                    Video Platform (Mock)
                  </label>
                  <select
                    value={form.platform}
                    onChange={(e) => handlePlatformChange(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Meeting Link *
                </label>
                <input
                  type="url"
                  required
                  value={form.meeting_link}
                  onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                  placeholder="https://meet.google.com/xyz-abc-def"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Date & Start Time *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={form.scheduled_datetime}
                    onChange={(e) => setForm({ ...form, scheduled_datetime: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                    Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    min="15"
                    max="240"
                    value={form.duration_minutes}
                    onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Session Description & Agenda
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Outline topics covered, prerequisites, or preparation notes..."
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
                  disabled={scheduleLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-md disabled:opacity-50"
                >
                  {scheduleLoading ? "Scheduling..." : "Schedule Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
