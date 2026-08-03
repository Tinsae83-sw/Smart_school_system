"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function OnlineClassPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [onlineClasses, setOnlineClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduled_date: "",
    scheduled_time: "",
    duration_minutes: 60,
    meeting_link: ""
  });
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadClasses(savedToken);
  }, [router]);

  async function loadClasses(token: string) {
    try {
      const data = await authFetch("/api/teacher/classes", {}, token);
      setClasses(data);
      if (data.length > 0) {
        setSelectedClass(data[0].class_id);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadOnlineClasses() {
    if (!selectedClass) return;
    try {
      const data = await authFetch(`/api/teacher/online-classes?classId=${selectedClass}`, {}, token);
      setOnlineClasses(data || []);
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    if (selectedClass) {
      loadOnlineClasses();
    }
  }, [selectedClass]);

  async function handleCreateOnlineClass(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    try {
      await authFetch("/api/teacher/online-classes", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          class_id: selectedClass
        })
      }, token);
      setMessage("Online class created successfully!");
      setShowCreateForm(false);
      setFormData({
        title: "",
        description: "",
        scheduled_date: "",
        scheduled_time: "",
        duration_minutes: 60,
        meeting_link: ""
      });
      loadOnlineClasses();
    } catch (e) {
      setMessage("Failed to create online class");
      console.error(e);
    }
  }

  async function handleStartClass(classId: number) {
    try {
      await authFetch(`/api/teacher/online-classes/${classId}/start`, {
        method: "POST"
      }, token);
      setMessage("Class started successfully!");
      loadOnlineClasses();
    } catch (e) {
      setMessage("Failed to start class");
      console.error(e);
    }
  }

  async function handleEndClass(classId: number) {
    if (!confirm("Are you sure you want to end this class?")) return;
    try {
      await authFetch(`/api/teacher/online-classes/${classId}/end`, {
        method: "POST"
      }, token);
      setMessage("Class ended successfully!");
      loadOnlineClasses();
    } catch (e) {
      setMessage("Failed to end class");
      console.error(e);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "SCHEDULED": return "bg-blue-100 text-blue-700";
      case "IN_PROGRESS": return "bg-emerald-100 text-emerald-700";
      case "COMPLETED": return "bg-slate-100 text-slate-700";
      case "CANCELLED": return "bg-red-100 text-red-700";
      default: return "bg-slate-100 text-slate-700";
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Online Classes</h1>
        
        {/* Class Selection */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <label className="block text-sm font-medium text-slate-700 mb-1">Select Class</label>
          <select
            value={selectedClass || ''}
            onChange={(e) => setSelectedClass(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {classes.map((cls: any) => (
              <option key={cls.class_id} value={cls.class_id}>
                {cls.class_name} - {cls.subject?.subject_name || cls.subject}
              </option>
            ))}
          </select>
        </div>

        {/* Create Online Class Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 transition"
          >
            {showCreateForm ? "Cancel" : "Schedule New Class"}
          </button>
        </div>

        {/* Create Online Class Form */}
        {showCreateForm && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Schedule Online Class</h2>
            <form onSubmit={handleCreateOnlineClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.scheduled_date}
                    onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                  <input
                    type="time"
                    value={formData.scheduled_time}
                    onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meeting Link</label>
                <input
                  type="url"
                  value={formData.meeting_link}
                  onChange={(e) => setFormData({ ...formData, meeting_link: e.target.value })}
                  placeholder="https://zoom.us/..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 transition"
              >
                Schedule Class
              </button>
            </form>
          </div>
        )}

        {message && (
          <p className={`mb-4 text-sm ${message.includes("success") ? "text-emerald-600" : "text-red-600"}`}>
            {message}
          </p>
        )}

        {/* Online Classes List */}
        <div className="space-y-4">
          {onlineClasses.map((onlineClass: any) => (
            <div key={onlineClass.online_class_id} className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-slate-900">{onlineClass.title}</h3>
                    <span className={`rounded-lg px-3 py-1 text-xs font-semibold ${getStatusColor(onlineClass.status)}`}>
                      {onlineClass.status}
                    </span>
                  </div>
                  <p className="text-slate-600 mb-3">{onlineClass.description}</p>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>Date: {new Date(onlineClass.scheduled_date).toLocaleDateString()}</span>
                    <span>Time: {onlineClass.scheduled_time}</span>
                    <span>Duration: {onlineClass.duration_minutes} min</span>
                  </div>
                  {onlineClass.meeting_link && (
                    <a
                      href={onlineClass.meeting_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-3 text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                    >
                      Join Meeting →
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  {onlineClass.status === "SCHEDULED" && (
                    <button
                      onClick={() => handleStartClass(onlineClass.online_class_id)}
                      className="rounded-xl bg-emerald-50 text-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-100 transition"
                    >
                      Start
                    </button>
                  )}
                  {onlineClass.status === "IN_PROGRESS" && (
                    <button
                      onClick={() => handleEndClass(onlineClass.online_class_id)}
                      className="rounded-xl bg-red-50 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-100 transition"
                    >
                      End
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
