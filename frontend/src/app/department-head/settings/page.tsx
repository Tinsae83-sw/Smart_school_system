"use client";

import React, { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000") + "/api/department-head";
const api = authFetchFor("DEPARTMENT_HEAD");

type DepartmentSettings = {
  settings_id: number;
  department: string;
  goals: string[];
  grading_scale: any;
  academic_calendar: any;
  notification_preferences: any;
  created_at: string;
  updated_at: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<DepartmentSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"general" | "grading" | "calendar" | "notifications">("general");

  async function fetchSettings() {
    setLoading(true);
    try {
      const token = localStorage.getItem("dept_head_token");
      const res = await api(`${API_BASE}/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    try {
      const token = localStorage.getItem("dept_head_token");
      const res = await api(`${API_BASE}/settings`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        alert("Settings saved successfully");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Department Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Configure department preferences and goals</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <div className="space-y-1">
            {[
              { id: "general", label: "General", icon: "âš™ï¸" },
              { id: "grading", label: "Grading Scale", icon: "ðŸ“Š" },
              { id: "calendar", label: "Academic Calendar", icon: "ðŸ“…" },
              { id: "notifications", label: "Notifications", icon: "ðŸ””" }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-orange-50 text-orange-700"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            {activeTab === "general" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">General Settings</h2>
                  <p className="mt-1 text-sm text-slate-500">Configure department goals and profile</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Department Name</label>
                  <input
                    type="text"
                    value={settings?.department || ""}
                    disabled
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                  />
                  <p className="mt-1 text-xs text-slate-400">Department name cannot be changed</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Department Goals</label>
                  <textarea
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    rows={4}
                    placeholder="Enter department goals (one per line)"
                    value={settings?.goals?.join("\n") || ""}
                    onChange={(e) => setSettings({
                      ...settings!,
                      goals: e.target.value.split("\n").filter(g => g.trim())
                    })}
                  />
                </div>
              </div>
            )}

            {activeTab === "grading" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Grading Scale</h2>
                  <p className="mt-1 text-sm text-slate-500">Configure grading thresholds for your department</p>
                </div>

                <div className="space-y-4">
                  {[
                    { grade: "A", label: "Excellent", defaultMin: 90 },
                    { grade: "B", label: "Good", defaultMin: 80 },
                    { grade: "C", label: "Satisfactory", defaultMin: 70 },
                    { grade: "D", label: "Needs Improvement", defaultMin: 60 },
                    { grade: "F", label: "Fail", defaultMin: 0 }
                  ].map((item) => (
                    <div key={item.grade} className="flex items-center gap-4">
                      <div className="w-16">
                        <span className="inline-flex items-center justify-center rounded-lg bg-slate-100 px-3 py-2 font-bold text-slate-900">
                          {item.grade}
                        </span>
                      </div>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700">{item.label}</label>
                        <div className="mt-1 flex items-center gap-2">
                          <input
                            type="number"
                            className="w-24 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                            defaultValue={settings?.grading_scale?.[item.grade]?.min || item.defaultMin}
                          />
                          <span className="text-sm text-slate-500">- 100%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "calendar" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Academic Calendar</h2>
                  <p className="mt-1 text-sm text-slate-500">Set important dates and deadlines for your department</p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Current Term</label>
                    <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500">
                      <option value="semester1">Semester 1</option>
                      <option value="semester2">Semester 2</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">Important Deadlines</label>
                    <div className="mt-2 space-y-2">
                      {[
                        { label: "Lesson Plan Submission", date: "" },
                        { label: "Midterm Exam", date: "" },
                        { label: "Final Exam", date: "" },
                        { label: "Grade Submission", date: "" }
                      ].map((deadline, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <input
                            type="text"
                            defaultValue={deadline.label}
                            disabled
                            className="w-48 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500"
                          />
                          <input
                            type="date"
                            className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "notifications" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Notification Preferences</h2>
                  <p className="mt-1 text-sm text-slate-500">Choose which alerts you want to receive</p>
                </div>

                <div className="space-y-4">
                  {[
                    { id: "lesson_plans", label: "Lesson Plan Submissions", description: "Get notified when teachers submit lesson plans" },
                    { id: "exam_approvals", label: "Exam Approvals", description: "Get notified when exams need approval" },
                    { id: "resource_requests", label: "Resource Requests", description: "Get notified about resource request status" },
                    { id: "teacher_leave", label: "Teacher Leave Requests", description: "Get notified when teachers request leave" },
                    { id: "intervention_alerts", label: "Intervention Alerts", description: "Get notified about student intervention needs" },
                    { id: "meeting_reminders", label: "Meeting Reminders", description: "Get reminded about upcoming department meetings" }
                  ].map((pref) => (
                    <div key={pref.id} className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
                      <input
                        type="checkbox"
                        id={pref.id}
                        defaultChecked={true}
                        className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                      />
                      <div className="flex-1">
                        <label htmlFor={pref.id} className="block text-sm font-medium text-slate-900 cursor-pointer">
                          {pref.label}
                        </label>
                        <p className="mt-1 text-xs text-slate-500">{pref.description}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Notification Method</label>
                  <div className="mt-2 flex gap-4">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-orange-600" />
                      <span className="text-sm text-slate-700">Email</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-orange-600" />
                      <span className="text-sm text-slate-700">In-App</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-orange-600" />
                      <span className="text-sm text-slate-700">SMS</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-6 border-t border-slate-200">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="rounded-xl bg-orange-600 px-6 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
