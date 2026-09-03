"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/ptsa";
const api = authFetchFor("PTSA_REPRESENTATIVE");

type Grievance = {
  grievance_id: number;
  category: string;
  description: string;
  status: string;
  submitted_date: string;
  submitted_by: string;
  anonymous: boolean;
  resolution_notes?: string;
  escalated_to?: string;
  escalated_date?: string;
};

export default function GrievancesPage() {
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    loadGrievances();
  }, []);

  async function loadGrievances() {
    setLoading(true);
    try {
      const res = await api(`${API_BASE}/grievances`);
      if (res.ok) setGrievances(await res.json());
    } catch (error) {
      console.error("Error loading grievances:", error);
    } finally {
      setLoading(false);
    }
  }

  async function escalateGrievance(grievanceId: number) {
    const escalateTo = prompt("Enter escalation target (Principal/Woreda Education Office):");
    if (!escalateTo) return;
    
    try {
      await api(`${API_BASE}/grievances/${grievanceId}/escalate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ escalated_to: escalateTo }),
      });
      loadGrievances();
      alert("Grievance escalated successfully!");
    } catch (error) {
      console.error("Error escalating grievance:", error);
      alert("Failed to escalate grievance. Please try again.");
    }
  }

  const filteredGrievances = selectedStatus === "all" 
    ? grievances 
    : grievances.filter(g => g.status === selectedStatus);

  const statusCounts = {
    all: grievances.length,
    Pending: grievances.filter(g => g.status === "Pending").length,
    In_Progress: grievances.filter(g => g.status === "In Progress").length,
    Resolved: grievances.filter(g => g.status === "Resolved").length,
    Escalated: grievances.filter(g => g.status === "Escalated").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Parent & Student Grievance Monitoring</h1>
        <p className="text-sm text-slate-500 mt-1">Track and monitor grievances (Anonymized)</p>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2">
        {Object.keys(statusCounts).map((status) => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              selectedStatus === status
                ? "bg-teal-600 text-white"
                : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {status === "all" ? "All" : status.replace("_", " ")} ({statusCounts[status as keyof typeof statusCounts]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500">Loading grievances...</div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Total</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{statusCounts.all}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Pending</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">{statusCounts.Pending}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">In Progress</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{statusCounts.In_Progress}</p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
              <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Resolved</p>
              <p className="text-3xl font-bold text-emerald-600 mt-2">{statusCounts.Resolved}</p>
            </div>
          </div>

          {/* Grievances List */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Grievance Log</h2>
            <div className="space-y-3">
              {filteredGrievances.map((grievance) => (
                <div key={grievance.grievance_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          grievance.status === "Pending" ? "bg-amber-50 text-amber-700" :
                          grievance.status === "In Progress" ? "bg-blue-50 text-blue-700" :
                          grievance.status === "Resolved" ? "bg-emerald-50 text-emerald-700" :
                          "bg-rose-50 text-rose-700"
                        }`}>
                          {grievance.status}
                        </span>
                        <span className="text-xs text-slate-500">{grievance.category}</span>
                        {grievance.anonymous && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                            Anonymous
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">{grievance.description}</p>
                      
                      {grievance.resolution_notes && (
                        <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                          <p className="text-xs font-semibold text-emerald-700 mb-1">Resolution:</p>
                          <p className="text-sm text-emerald-800">{grievance.resolution_notes}</p>
                        </div>
                      )}
                      
                      {grievance.escalated_to && (
                        <div className="mt-2 p-2 bg-rose-50 rounded-lg border border-rose-100">
                          <p className="text-xs font-semibold text-rose-700">
                            Escalated to: {grievance.escalated_to} on {new Date(grievance.escalated_date!).toLocaleDateString()}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {(grievance.status === "Pending" || grievance.status === "In Progress") && (
                      <button
                        onClick={() => escalateGrievance(grievance.grievance_id)}
                        className="shrink-0 rounded-lg bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 transition"
                      >
                        Escalate
                      </button>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-400">
                      Submitted: {new Date(grievance.submitted_date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-500">
                      {grievance.anonymous ? "Anonymous" : `By: ${grievance.submitted_by}`}
                    </p>
                  </div>
                </div>
              ))}
              {filteredGrievances.length === 0 && (
                <p className="text-sm text-slate-400">No grievances found.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
