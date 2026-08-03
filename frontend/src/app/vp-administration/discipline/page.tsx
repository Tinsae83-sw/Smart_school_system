"use client";

import React, { useEffect, useState } from "react";
import { vpAdminApi } from "@/lib/api";

type Incident = {
  incident_id: number;
  incident_type: string;
  reported_by: string;
  incident_date: string;
  incident_time?: string;
  involved_person_name?: string;
  involved_person_type?: string;
  description: string;
  location?: string;
  priority: string;
  status: string;
  action_taken?: string;
  witnesses?: string[];
  severity?: string;
  immediate_action?: string;
  follow_up_required?: string;
  evidence_notes?: string;
  resolution_notes?: string;
  reporter_contact?: string;
};

type DisciplinaryAction = {
  action_id: number;
  student_id: number;
  student_name: string;
  action_type: string;
  reason: string;
  start_date: string;
  end_date?: string;
  duration_days?: number;
  status: string;
  notes?: string;
};

export default function DisciplinePage() {
  const [activeTab, setActiveTab] = useState<"incidents" | "actions">("incidents");
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [disciplinaryActions, setDisciplinaryActions] = useState<DisciplinaryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"incident" | "action">("incident");
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [editingAction, setEditingAction] = useState<DisciplinaryAction | null>(null);
  const [formData, setFormData] = useState({
    incident_type: "",
    incident_date: "",
    incident_time: "",
    involved_person_name: "",
    involved_person_type: "STUDENT",
    description: "",
    location: "",
    priority: "MEDIUM",
    action_taken: "",
    witnesses: "",
    severity: "MEDIUM",
    immediate_action: "",
    follow_up_required: "",
    evidence_notes: "",
    resolution_notes: "",
    reporter_contact: "",
    student_id: "",
    action_type: "",
    reason: "",
    start_date: "",
    end_date: "",
    duration_days: "",
  });

  const incidentTypes = ["STUDENT_MISCONDUCT", "STAFF_MISCONDUCT", "FACILITY_ISSUE", "SAFETY", "BULLYING", "ACADEMIC_DISHONESTY", "PROPERTY_DAMAGE", "OTHER"];
  const personTypes = ["STUDENT", "TEACHER", "NON_ACADEMIC_STAFF", "VISITOR", "PARENT"];
  const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
  const severities = ["MINOR", "MODERATE", "MAJOR", "CRITICAL"];
  const incidentStatuses = ["REPORTED", "UNDER_INVESTIGATION", "RESOLVED", "CLOSED"];
  const actionTypes = ["WARNING", "DETENTION", "SUSPENSION", "PROBATION", "COMMUNITY_SERVICE", "EXPULSION"];
  const actionStatuses = ["PENDING", "APPROVED", "ACTIVE", "COMPLETED", "CANCELLED"];

  async function fetchData() {
    setLoading(true);
    try {
      const [incRes, actRes] = await Promise.all([
        vpAdminApi.get('/incidents'),
        vpAdminApi.get('/disciplinary-actions'),
      ]);

      if (incRes.ok) setIncidents(await incRes.json());
      if (actRes.ok) setDisciplinaryActions(await actRes.json());
    } catch (error) {
      console.error("Failed to fetch discipline data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  function openModal(type: "incident" | "action", incident?: Incident, disciplinaryAction?: DisciplinaryAction) {
    setModalType(type);
    setEditingIncident(null);
    setEditingAction(null);
    
    if (incident && type === "incident") {
      setEditingIncident(incident);
      setFormData({
        incident_type: incident.incident_type,
        incident_date: incident.incident_date,
        incident_time: incident.incident_time || "",
        involved_person_name: incident.involved_person_name || "",
        involved_person_type: incident.involved_person_type || "STUDENT",
        description: incident.description,
        location: incident.location || "",
        priority: incident.priority,
        action_taken: incident.action_taken || "",
        witnesses: incident.witnesses?.join(", ") || "",
        severity: incident.severity || "MEDIUM",
        immediate_action: incident.immediate_action || "",
        follow_up_required: incident.follow_up_required || "",
        evidence_notes: incident.evidence_notes || "",
        resolution_notes: incident.resolution_notes || "",
        reporter_contact: incident.reporter_contact || "",
        student_id: "",
        action_type: "",
        reason: "",
        start_date: "",
        end_date: "",
        duration_days: "",
      });
    } else if (disciplinaryAction && type === "action") {
      setEditingAction(disciplinaryAction);
      setFormData({
        incident_type: "",
        incident_date: "",
        incident_time: "",
        involved_person_name: "",
        involved_person_type: "STUDENT",
        description: "",
        location: "",
        priority: "MEDIUM",
        action_taken: "",
        witnesses: "",
        severity: "MEDIUM",
        immediate_action: "",
        follow_up_required: "",
        evidence_notes: "",
        resolution_notes: "",
        reporter_contact: "",
        student_id: disciplinaryAction.student_id.toString(),
        action_type: disciplinaryAction.action_type,
        reason: disciplinaryAction.reason,
        start_date: disciplinaryAction.start_date,
        end_date: disciplinaryAction.end_date || "",
        duration_days: disciplinaryAction.duration_days?.toString() || "",
      });
    } else {
      setFormData({
        incident_type: "",
        incident_date: "",
        incident_time: "",
        involved_person_name: "",
        involved_person_type: "STUDENT",
        description: "",
        location: "",
        priority: "MEDIUM",
        action_taken: "",
        witnesses: "",
        severity: "MEDIUM",
        immediate_action: "",
        follow_up_required: "",
        evidence_notes: "",
        resolution_notes: "",
        reporter_contact: "",
        student_id: "",
        action_type: "",
        reason: "",
        start_date: "",
        end_date: "",
        duration_days: "",
      });
    }
    setShowModal(true);
  }

  async function handleDeleteIncident(id: number) {
    if (!confirm("Are you sure you want to delete this incident?")) return;
    try {
      await vpAdminApi.delete(`/incidents/${id}`);
      setIncidents(incidents.filter(i => i.incident_id !== id));
    } catch (error) {
      console.error("Failed to delete incident:", error);
    }
  }

  async function handleDeleteDisciplinaryAction(id: number) {
    if (!confirm("Are you sure you want to delete this disciplinary action?")) return;
    try {
      await vpAdminApi.delete(`/disciplinary-actions/${id}`);
      setDisciplinaryActions(disciplinaryActions.filter(a => a.action_id !== id));
    } catch (error) {
      console.error("Failed to delete disciplinary action:", error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      let url = "";
      let method = "POST";
      let payload = {};

      if (modalType === "incident") {
        url = editingIncident 
          ? `/incidents/${editingIncident.incident_id}`
          : '/incidents';
        method = editingIncident ? "put" : "post";
        payload = {
          incident_type: formData.incident_type,
          incident_date: formData.incident_date,
          incident_time: formData.incident_time || null,
          involved_person_name: formData.involved_person_name || null,
          involved_person_type: formData.involved_person_type || null,
          description: formData.description,
          location: formData.location || null,
          priority: formData.priority,
          witnesses: formData.witnesses || null,
          severity: formData.severity,
          immediate_action: formData.immediate_action || null,
          follow_up_required: formData.follow_up_required || null,
          evidence_notes: formData.evidence_notes || null,
          resolution_notes: formData.resolution_notes || null,
          reporter_contact: formData.reporter_contact || null,
        };
      } else if (modalType === "action") {
        url = editingAction 
          ? `/disciplinary-actions/${editingAction.action_id}`
          : '/disciplinary-actions';
        method = editingAction ? "put" : "post";
        payload = {
          student_id: parseInt(formData.student_id),
          action_type: formData.action_type,
          reason: formData.reason,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          duration_days: formData.duration_days ? parseInt(formData.duration_days) : null,
        };
      }

      const res = await vpAdminApi.request(method, url, payload);

      if (res.ok) {
        setShowModal(false);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to submit:", error);
    }
  }

  async function handleIncidentAction(incidentId: number, action: "resolve" | "close") {
    try {
      const res = await vpAdminApi.post(`/incidents/${incidentId}/${action}`, {});
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error(`Failed to ${action} incident:`, error);
    }
  }

  async function handleDisciplinaryActionAction(actionId: number, action: "approve" | "complete") {
    try {
      const res = await vpAdminApi.post(`/disciplinary-actions/${actionId}/${action}`, {});
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error(`Failed to ${action} disciplinary action:`, error);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "REPORTED": return "bg-amber-50 text-amber-700";
      case "UNDER_INVESTIGATION": return "bg-blue-50 text-blue-700";
      case "RESOLVED": return "bg-emerald-50 text-emerald-700";
      case "CLOSED": return "bg-gray-50 text-gray-700";
      case "PENDING": return "bg-amber-50 text-amber-700";
      case "APPROVED": return "bg-emerald-50 text-emerald-700";
      case "ACTIVE": return "bg-blue-50 text-blue-700";
      case "COMPLETED": return "bg-emerald-50 text-emerald-700";
      case "CANCELLED": return "bg-rose-50 text-rose-700";
      default: return "bg-gray-50 text-gray-700";
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case "LOW": return "bg-blue-50 text-blue-700";
      case "MEDIUM": return "bg-amber-50 text-amber-700";
      case "HIGH": return "bg-orange-50 text-orange-700";
      case "URGENT": return "bg-rose-50 text-rose-700";
      default: return "bg-gray-50 text-gray-700";
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Discipline & Incident Management</h1>
          <p className="mt-1 text-sm text-slate-500">Log incidents and manage disciplinary actions</p>
        </div>
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("incidents")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "incidents"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Incidents ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab("actions")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "actions"
                ? "border-b-2 border-purple-600 text-purple-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Disciplinary Actions ({disciplinaryActions.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-500">Loading...</div>
        </div>
      ) : (
        <>
          {activeTab === "incidents" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-slate-200 gap-3">
                <h3 className="text-sm font-semibold text-slate-700">Incident Log</h3>
                <button
                  onClick={() => openModal("incident")}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition w-full sm:w-auto"
                >
                  Log New Incident
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Date</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Time</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Type</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Person</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Role</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Location</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Priority</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Severity</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Status</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Contact</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {incidents.map((incident) => (
                      <tr key={incident.incident_id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs text-slate-600">{incident.incident_date}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{incident.incident_time || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{incident.incident_type.replace(/_/g, " ")}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{incident.involved_person_name || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{incident.involved_person_type?.replace(/_/g, " ") || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{incident.location || "-"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getPriorityColor(incident.priority)}`}>
                            {incident.priority}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">{incident.severity || "-"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(incident.status)}`}>
                            {incident.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600">{incident.reporter_contact || "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openModal("incident", incident)}
                              className="rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteIncident(incident.incident_id)}
                              className="rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {incidents.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-3 py-12 text-center text-xs text-slate-400">
                          No incidents logged. Click "Log New Incident" to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "actions" && (
            <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 border-b border-slate-200 gap-3">
                <h3 className="text-sm font-semibold text-slate-700">Disciplinary Actions</h3>
                <button
                  onClick={() => openModal("action")}
                  className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition w-full sm:w-auto"
                >
                  Assign Action
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Student</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Action</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Reason</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Start</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">End</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Days</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Status</th>
                      <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">Notes</th>
                      <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {disciplinaryActions.map((action) => (
                      <tr key={action.action_id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-xs font-medium text-slate-900">{action.student_name}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{action.action_type.replace(/_/g, " ")}</td>
                        <td className="px-3 py-2 text-xs text-slate-600 max-w-[150px] truncate">{action.reason}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{action.start_date}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{action.end_date || "-"}</td>
                        <td className="px-3 py-2 text-xs text-slate-600">{action.duration_days || "-"}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${getStatusColor(action.status)}`}>
                            {action.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-slate-600 max-w-[100px] truncate">{action.notes || "-"}</td>
                        <td className="px-3 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openModal("action", undefined, action)}
                              className="rounded bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-100 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDisciplinaryAction(action.action_id)}
                              className="rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {disciplinaryActions.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-3 py-12 text-center text-xs text-slate-400">
                          No disciplinary actions assigned.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {modalType === "incident" ? "Log New Incident" : "Assign Disciplinary Action"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {modalType === "incident" && (
                <>
                  {/* Incident Details Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Incident Details
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Incident Type *</label>
                        <select
                          name="incident_type"
                          value={formData.incident_type}
                          onChange={handleInputChange}
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        >
                          <option value="">Select type</option>
                          {incidentTypes.map(type => (
                            <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Severity *</label>
                        <select
                          name="severity"
                          value={formData.severity}
                          onChange={handleInputChange}
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        >
                          {severities.map(sev => (
                            <option key={sev} value={sev}>{sev}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Date & Time Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Date & Time
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                        <input
                          type="date"
                          name="incident_date"
                          value={formData.incident_date}
                          onChange={handleInputChange}
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                        <input
                          type="time"
                          name="incident_time"
                          value={formData.incident_time}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Involved Person Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Involved Person
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                        <input
                          type="text"
                          name="involved_person_name"
                          value={formData.involved_person_name}
                          onChange={handleInputChange}
                          placeholder="e.g., John Doe"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                        <select
                          name="involved_person_type"
                          value={formData.involved_person_type}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        >
                          {personTypes.map(type => (
                            <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Location & Priority Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Location & Priority
                    </h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                        <input
                          type="text"
                          name="location"
                          value={formData.location}
                          onChange={handleInputChange}
                          placeholder="e.g., Classroom 101, Playground"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Priority *</label>
                        <select
                          name="priority"
                          value={formData.priority}
                          onChange={handleInputChange}
                          required
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        >
                          {priorities.map(pri => (
                            <option key={pri} value={pri}>{pri}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Description Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Description
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Incident Description *</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        required
                        rows={4}
                        placeholder="Provide a detailed description of what happened..."
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>

                  {/* Additional Information Section */}
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                      <svg className="h-4 w-4 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Additional Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Witnesses</label>
                        <input
                          type="text"
                          name="witnesses"
                          value={formData.witnesses}
                          onChange={handleInputChange}
                          placeholder="e.g., Jane Smith, Michael Brown"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Immediate Action Taken</label>
                        <textarea
                          name="immediate_action"
                          value={formData.immediate_action}
                          onChange={handleInputChange}
                          rows={2}
                          placeholder="Describe any immediate actions taken..."
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Follow-up Required</label>
                        <textarea
                          name="follow_up_required"
                          value={formData.follow_up_required}
                          onChange={handleInputChange}
                          rows={2}
                          placeholder="Any follow-up actions required..."
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Evidence Notes</label>
                        <textarea
                          name="evidence_notes"
                          value={formData.evidence_notes}
                          onChange={handleInputChange}
                          rows={2}
                          placeholder="Any evidence collected or notes..."
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reporter Contact</label>
                        <input
                          type="text"
                          name="reporter_contact"
                          value={formData.reporter_contact}
                          onChange={handleInputChange}
                          placeholder="e.g., +251 911 123 456"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {modalType === "action" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Student ID *</label>
                    <input
                      type="number"
                      name="student_id"
                      value={formData.student_id}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Action Type *</label>
                    <select
                      name="action_type"
                      value={formData.action_type}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    >
                      <option value="">Select action type</option>
                      {actionTypes.map(type => (
                        <option key={type} value={type}>{type.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Reason *</label>
                    <textarea
                      name="reason"
                      value={formData.reason}
                      onChange={handleInputChange}
                      required
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
                      <input
                        type="date"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleInputChange}
                        required
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                      <input
                        type="date"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Duration (days)</label>
                    <input
                      type="number"
                      name="duration_days"
                      value={formData.duration_days}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
