"use client";

import { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000") + "/api/principal";

const api = authFetchFor("PRINCIPAL");

type Grievance = {
  grievance_id: number;
  complainant_name: string;
  complainant_type: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  submitted_date: string;
  resolution?: string;
  resolved_date?: string;
};

type DisciplineRecord = {
  record_id: number;
  student_name: string;
  student_id: string;
  infraction: string;
  description: string;
  severity: string;
  action_taken: string;
  action_date: string;
  reported_by: string;
  status: string;
};

export default function GrievancesPage() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [disciplineRecords, setDisciplineRecords] = useState<DisciplineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"grievances" | "discipline">("grievances");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);

  const [resolutionForm, setResolutionForm] = useState({
    resolution: "",
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [grievancesRes, disciplineRes] = await Promise.all([
        api(`${API_BASE}/grievances`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        api(`${API_BASE}/discipline`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      if (grievancesRes.ok) {
        const grievancesData = await grievancesRes.json();
        setGrievances(grievancesData);
      }

      if (disciplineRes.ok) {
        const disciplineData = await disciplineRes.json();
        setDisciplineRecords(disciplineData);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: "Failed to load data." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function handleResolveGrievance(grievance: Grievance) {
    setSelectedGrievance(grievance);
    setResolutionForm({ resolution: grievance.resolution || "" });
    setShowModal(true);
  }

  function handleSubmitResolution(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedGrievance) return;

    api(`${API_BASE}/grievances/${selectedGrievance.grievance_id}/resolve`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(resolutionForm),
    })
      .then((res) => {
        if (res.ok) {
          setStatusMessage({ type: "success", message: "Grievance resolved successfully." });
          setShowModal(false);
          setSelectedGrievance(null);
          fetchData();
        } else {
          setStatusMessage({ type: "error", message: "Failed to resolve grievance." });
        }
      })
      .catch(() => setStatusMessage({ type: "error", message: "Failed to resolve grievance." }));
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Grievances & Discipline</h1>
        <p className="mt-1 text-sm text-slate-500">Manage student grievances and disciplinary records</p>
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
            onClick={() => setActiveTab("grievances")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "grievances"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Grievances ({grievances.length})
          </button>
          <button
            onClick={() => setActiveTab("discipline")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "discipline"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Discipline Records ({disciplineRecords.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500 shadow-sm border border-slate-200">
          Loading...
        </div>
      ) : (
        <>
          {activeTab === "grievances" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Grievances</h2>
                  <p className="text-sm text-slate-500 mt-1">Student and staff complaints and concerns</p>
                </div>
                {grievances.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">No grievances found.</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-3">Complainant</th>
                        <th className="px-6 py-3">Type</th>
                        <th className="px-6 py-3">Subject</th>
                        <th className="px-6 py-3">Category</th>
                        <th className="px-6 py-3">Priority</th>
                        <th className="px-6 py-3">Submitted Date</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {grievances.map((grievance) => (
                        <tr key={grievance.grievance_id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{grievance.complainant_name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{grievance.complainant_type}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{grievance.subject}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{grievance.category}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              grievance.priority === "HIGH" ? "bg-rose-50 text-rose-700" :
                              grievance.priority === "MEDIUM" ? "bg-amber-50 text-amber-700" :
                              "bg-sky-50 text-sky-700"
                            }`}>
                              {grievance.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{new Date(grievance.submitted_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              grievance.status === "RESOLVED" ? "bg-emerald-50 text-emerald-700" :
                              grievance.status === "IN_PROGRESS" ? "bg-sky-50 text-sky-700" :
                              "bg-amber-50 text-amber-700"
                            }`}>
                              {grievance.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {grievance.status !== "RESOLVED" && (
                              <button
                                onClick={() => handleResolveGrievance(grievance)}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                              >
                                Resolve
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === "discipline" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                  <h2 className="text-lg font-bold text-slate-900">Discipline Records</h2>
                  <p className="text-sm text-slate-500 mt-1">Student disciplinary actions and records</p>
                </div>
                {disciplineRecords.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">No discipline records found.</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-6 py-3">Student</th>
                        <th className="px-6 py-3">Student ID</th>
                        <th className="px-6 py-3">Infraction</th>
                        <th className="px-6 py-3">Severity</th>
                        <th className="px-6 py-3">Action Taken</th>
                        <th className="px-6 py-3">Action Date</th>
                        <th className="px-6 py-3">Reported By</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {disciplineRecords.map((record) => (
                        <tr key={record.record_id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900">{record.student_name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{record.student_id}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{record.infraction}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              record.severity === "HIGH" ? "bg-rose-50 text-rose-700" :
                              record.severity === "MEDIUM" ? "bg-amber-50 text-amber-700" :
                              "bg-sky-50 text-sky-700"
                            }`}>
                              {record.severity}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500">{record.action_taken}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{new Date(record.action_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{record.reported_by}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              record.status === "CLOSED" ? "bg-emerald-50 text-emerald-700" :
                              record.status === "ACTIVE" ? "bg-amber-50 text-amber-700" :
                              "bg-slate-50 text-slate-700"
                            }`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Resolution Modal */}
      {showModal && selectedGrievance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Resolve Grievance</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedGrievance(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                âœ•
              </button>
            </div>

            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Complainant</label>
                <p className="text-sm text-slate-900">{selectedGrievance.complainant_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <p className="text-sm text-slate-900">{selectedGrievance.subject}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <p className="text-sm text-slate-600">{selectedGrievance.description}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitResolution} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Resolution</label>
                <textarea
                  rows={4}
                  required
                  value={resolutionForm.resolution}
                  onChange={(e) => setResolutionForm({ resolution: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter resolution details..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedGrievance(null);
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Submit Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
