"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/principal";

type SchoolSettings = {
  school_id: number;
  school_name: string;
  address: string;
  phone: string;
  email: string;
  principal_name: string;
  academic_year: string;
  current_term: string;
  school_type: string;
  grades_offered: string;
  established_year: number;
  student_capacity: number;
  mission_statement?: string;
  vision_statement?: string;
};

type AcademicCalendar = {
  calendar_id: number;
  academic_year: string;
  term_start_date: string;
  term_end_date: string;
  exam_period_start: string;
  exam_period_end: string;
  break_periods: string;
  status: string;
};

type AcademicPolicy = {
  policy_id: number;
  policy_name: string;
  policy_type: string;
  content: string;
  effective_date: string;
};

export default function SchoolSettingsPage() {
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [calendar, setCalendar] = useState<AcademicCalendar | null>(null);
  const [policies, setPolicies] = useState<AcademicPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "academic" | "policies">("general");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const [formData, setFormData] = useState<Partial<SchoolSettings>>({});
  const [calendarFormData, setCalendarFormData] = useState<Partial<AcademicCalendar>>({});
  const [policyFormData, setPolicyFormData] = useState<Partial<AcademicPolicy>>({});

  async function fetchSettings() {
    setLoading(true);
    try {
      const [settingsRes, calendarRes, policiesRes] = await Promise.all([
        fetch(`${API_BASE}/settings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/academic-calendar`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/settings/policies`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }

      if (calendarRes.ok) {
        const calendarData = await calendarRes.json();
        setCalendar(calendarData);
      }

      if (policiesRes.ok) {
        const policiesData = await policiesRes.json();
        setPolicies(policiesData);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: "Failed to load school settings." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  function handleEdit() {
    if (settings) {
      setFormData(settings);
      setShowModal(true);
    }
  }

  function handleEditCalendar() {
    if (calendar) {
      setCalendarFormData(calendar);
      setShowCalendarModal(true);
    }
  }

  function handleAddPolicy() {
    setPolicyFormData({});
    setShowPolicyModal(true);
  }

  function handleEditPolicy(policy: AcademicPolicy) {
    setPolicyFormData(policy);
    setShowPolicyModal(true);
  }

  function handleDeletePolicy(policyId: number) {
    if (confirm("Are you sure you want to delete this policy?")) {
      fetch(`${API_BASE}/settings/policies/${policyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
        .then((res) => {
          if (res.ok) {
            setStatusMessage({ type: "success", message: "Policy deleted successfully." });
            fetchSettings();
          } else {
            setStatusMessage({ type: "error", message: "Failed to delete policy." });
          }
        })
        .catch(() => setStatusMessage({ type: "error", message: "Failed to delete policy." }));
    }
  }

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();

    fetch(`${API_BASE}/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(formData),
    })
      .then((res) => {
        if (res.ok) {
          setStatusMessage({ type: "success", message: "School settings updated successfully." });
          setShowModal(false);
          fetchSettings();
        } else {
          setStatusMessage({ type: "error", message: "Failed to update school settings." });
        }
      })
      .catch(() => setStatusMessage({ type: "error", message: "Failed to update school settings." }));
  }

  function handleSaveCalendar(e: React.FormEvent) {
    e.preventDefault();

    fetch(`${API_BASE}/academic-calendar`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(calendarFormData),
    })
      .then((res) => {
        if (res.ok) {
          setStatusMessage({ type: "success", message: "Academic calendar updated successfully." });
          setShowCalendarModal(false);
          fetchSettings();
        } else {
          setStatusMessage({ type: "error", message: "Failed to update academic calendar." });
        }
      })
      .catch(() => setStatusMessage({ type: "error", message: "Failed to update academic calendar." }));
  }

  function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault();

    const url = policyFormData.policy_id
      ? `${API_BASE}/settings/policies/${policyFormData.policy_id}`
      : `${API_BASE}/settings/policies`;

    const method = policyFormData.policy_id ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(policyFormData),
    })
      .then((res) => {
        if (res.ok) {
          setStatusMessage({ type: "success", message: "Policy saved successfully." });
          setShowPolicyModal(false);
          fetchSettings();
        } else {
          setStatusMessage({ type: "error", message: "Failed to save policy." });
        }
      })
      .catch(() => setStatusMessage({ type: "error", message: "Failed to save policy." }));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">School Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage school information and academic calendar</p>
      </div>

      {statusMessage && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${
          statusMessage.type === "success" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
        }`}>
          {statusMessage.message}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab("general")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "general"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            General Information
          </button>
          <button
            onClick={() => setActiveTab("academic")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "academic"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Academic Calendar
          </button>
          <button
            onClick={() => setActiveTab("policies")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "policies"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            School Policies
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm border border-slate-200">
          Loading...
        </div>
      ) : (
        <>
          {activeTab === "general" && settings && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">School Information</h2>
                  <button
                    onClick={handleEdit}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    Edit Settings
                  </button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">School Name</label>
                    <p className="text-sm text-slate-900">{settings.school_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Principal Name</label>
                    <p className="text-sm text-slate-900">{settings.principal_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <p className="text-sm text-slate-900">{settings.address}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                    <p className="text-sm text-slate-900">{settings.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <p className="text-sm text-slate-900">{settings.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">School Type</label>
                    <p className="text-sm text-slate-900">{settings.school_type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Grades Offered</label>
                    <p className="text-sm text-slate-900">{settings.grades_offered}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Established Year</label>
                    <p className="text-sm text-slate-900">{settings.established_year}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Student Capacity</label>
                    <p className="text-sm text-slate-900">{settings.student_capacity}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Academic Year</label>
                    <p className="text-sm text-slate-900">{settings.academic_year}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Current Term</label>
                    <p className="text-sm text-slate-900">{settings.current_term}</p>
                  </div>
                </div>

                {settings.mission_statement && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mission Statement</label>
                    <p className="text-sm text-slate-900">{settings.mission_statement}</p>
                  </div>
                )}

                {settings.vision_statement && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Vision Statement</label>
                    <p className="text-sm text-slate-900">{settings.vision_statement}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "academic" && calendar && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">Academic Calendar - {calendar.academic_year}</h2>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      calendar.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-50 text-slate-700"
                    }`}>
                      {calendar.status}
                    </span>
                    <button
                      onClick={handleEditCalendar}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                    >
                      Edit Calendar
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Term Start Date</label>
                    <p className="text-sm text-slate-900">{new Date(calendar.term_start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Term End Date</label>
                    <p className="text-sm text-slate-900">{new Date(calendar.term_end_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Exam Period Start</label>
                    <p className="text-sm text-slate-900">{new Date(calendar.exam_period_start).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Exam Period End</label>
                    <p className="text-sm text-slate-900">{new Date(calendar.exam_period_end).toLocaleDateString()}</p>
                  </div>
                </div>

                {calendar.break_periods && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Break Periods</label>
                    <p className="text-sm text-slate-900">{calendar.break_periods}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "policies" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">School Policies</h2>
                  <button
                    onClick={handleAddPolicy}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition"
                  >
                    Add Policy
                  </button>
                </div>
                {policies.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">No policies found. Click "Add Policy" to create one.</div>
                ) : (
                  <div className="space-y-4">
                    {policies.map((policy) => (
                      <div key={policy.policy_id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-slate-900">{policy.policy_name}</h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditPolicy(policy)}
                              className="text-sm text-indigo-600 hover:text-indigo-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeletePolicy(policy.policy_id)}
                              className="text-sm text-rose-600 hover:text-rose-700"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-2">{policy.content}</p>
                        <div className="flex gap-4 text-xs text-slate-400">
                          <span>Type: {policy.policy_type}</span>
                          <span>Effective: {new Date(policy.effective_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Edit School Settings</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">School Name</label>
                  <input
                    type="text"
                    required
                    value={formData.school_name || ""}
                    onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Principal Name</label>
                  <input
                    type="text"
                    required
                    value={formData.principal_name || ""}
                    onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    required
                    value={formData.address || ""}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    required
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">School Type</label>
                  <select
                    required
                    value={formData.school_type || ""}
                    onChange={(e) => setFormData({ ...formData, school_type: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Secondary">Secondary School</option>
                    <option value="High School">High School</option>
                    <option value="Preparatory">Preparatory School</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Grades Offered</label>
                  <input
                    type="text"
                    required
                    value={formData.grades_offered || ""}
                    onChange={(e) => setFormData({ ...formData, grades_offered: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Student Capacity</label>
                  <input
                    type="number"
                    required
                    value={formData.student_capacity || 0}
                    onChange={(e) => setFormData({ ...formData, student_capacity: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
                  <input
                    type="text"
                    required
                    value={formData.academic_year || ""}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Current Term</label>
                  <select
                    required
                    value={formData.current_term || ""}
                    onChange={(e) => setFormData({ ...formData, current_term: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="First Semester">First Semester</option>
                    <option value="Second Semester">Second Semester</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mission Statement</label>
                <textarea
                  rows={3}
                  value={formData.mission_statement || ""}
                  onChange={(e) => setFormData({ ...formData, mission_statement: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Vision Statement</label>
                <textarea
                  rows={3}
                  value={formData.vision_statement || ""}
                  onChange={(e) => setFormData({ ...formData, vision_statement: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Edit Academic Calendar</h2>
              <button
                onClick={() => setShowCalendarModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCalendar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
                <input
                  type="text"
                  required
                  value={calendarFormData.academic_year || ""}
                  onChange={(e) => setCalendarFormData({ ...calendarFormData, academic_year: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 2024-2025"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Term Start Date</label>
                  <input
                    type="date"
                    required
                    value={calendarFormData.term_start_date ? calendarFormData.term_start_date.split('T')[0] : ""}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, term_start_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Term End Date</label>
                  <input
                    type="date"
                    required
                    value={calendarFormData.term_end_date ? calendarFormData.term_end_date.split('T')[0] : ""}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, term_end_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Exam Period Start</label>
                  <input
                    type="date"
                    required
                    value={calendarFormData.exam_period_start ? calendarFormData.exam_period_start.split('T')[0] : ""}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, exam_period_start: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Exam Period End</label>
                  <input
                    type="date"
                    required
                    value={calendarFormData.exam_period_end ? calendarFormData.exam_period_end.split('T')[0] : ""}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, exam_period_end: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Break Periods</label>
                <textarea
                  rows={3}
                  value={calendarFormData.break_periods || ""}
                  onChange={(e) => setCalendarFormData({ ...calendarFormData, break_periods: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., December 20 - January 5, February 8-12"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCalendarModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {policyFormData.policy_id ? "Edit Policy" : "Add Policy"}
              </h2>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Policy Name</label>
                <input
                  type="text"
                  required
                  value={policyFormData.policy_name || ""}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, policy_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Attendance Policy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Policy Type</label>
                <select
                  required
                  value={policyFormData.policy_type || ""}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, policy_type: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="ATTENDANCE">Attendance</option>
                  <option value="GRADING">Grading</option>
                  <option value="DISCIPLINE">Discipline</option>
                  <option value="UNIFORM">Uniform</option>
                  <option value="ACADEMIC">Academic</option>
                  <option value="BEHAVIOR">Behavior</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                <textarea
                  rows={5}
                  required
                  value={policyFormData.content || ""}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, content: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter the policy details..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Effective Date</label>
                <input
                  type="date"
                  required
                  value={policyFormData.effective_date ? policyFormData.effective_date.split('T')[0] : new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, effective_date: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  {policyFormData.policy_id ? "Update Policy" : "Create Policy"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
