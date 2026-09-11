"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetchFor } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000") + "/api/ptsa";
const api = authFetchFor("PTSA_REPRESENTATIVE");

type WoredaReport = {
  report_id: number;
  report_type: string;
  title: string;
  submission_date: string;
  status: string;
  summary: string;
  file_url?: string;
};

type PublicMetric = {
  metric_id: number;
  metric_name: string;
  value: string;
  category: string;
  last_updated: string;
};

type PolicyProposal = {
  proposal_id: number;
  title: string;
  description: string;
  category: string;
  status: string;
  submitted_date: string;
  response?: string;
};

export default function CompliancePage() {
  const [woredaReports, setWoredaReports] = useState<WoredaReport[]>([]);
  const [publicMetrics, setPublicMetrics] = useState<PublicMetric[]>([]);
  const [policyProposals, setPolicyProposals] = useState<PolicyProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProposalForm, setShowProposalForm] = useState(false);
  
  const [newProposal, setNewProposal] = useState({
    title: "",
    description: "",
    category: "General",
  });

  useEffect(() => {
    loadComplianceData();
  }, []);

  async function loadComplianceData() {
    setLoading(true);
    try {
      const [reportsRes, metricsRes, proposalsRes] = await Promise.all([
        api(`${API_BASE}/compliance/woreda-reports`),
        api(`${API_BASE}/compliance/public-metrics`),
        api(`${API_BASE}/compliance/policy-proposals`),
      ]);

      if (reportsRes.ok) setWoredaReports(await reportsRes.json());
      if (metricsRes.ok) setPublicMetrics(await metricsRes.json());
      if (proposalsRes.ok) setPolicyProposals(await proposalsRes.json());
    } catch (error) {
      console.error("Error loading compliance data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function submitPolicyProposal() {
    if (!newProposal.title || !newProposal.description) {
      alert("Please fill in title and description.");
      return;
    }
    
    try {
      await api(`${API_BASE}/compliance/policy-proposals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProposal),
      });
      setNewProposal({ title: "", description: "", category: "General" });
      setShowProposalForm(false);
      loadComplianceData();
      alert("Policy proposal submitted successfully!");
    } catch (error) {
      console.error("Error submitting proposal:", error);
      alert("Failed to submit proposal. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compliance & Oversight</h1>
          <p className="text-sm text-slate-500 mt-1">External reporting and transparency monitoring</p>
        </div>
        <button
          onClick={() => setShowProposalForm(true)}
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
        >
          Suggest Policy Change
        </button>
      </div>

      {showProposalForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Submit Policy Change Proposal</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                value={newProposal.title}
                onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                placeholder="Policy change title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={newProposal.category}
                onChange={(e) => setNewProposal({...newProposal, category: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
              >
                <option value="General">General</option>
                <option value="Academic">Academic</option>
                <option value="Discipline">Discipline</option>
                <option value="Attendance">Attendance</option>
                <option value="Examination">Examination</option>
                <option value="Facilities">Facilities</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
              <textarea
                value={newProposal.description}
                onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-none"
                rows={4}
                placeholder="Describe the policy change you're proposing..."
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={submitPolicyProposal}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
            >
              Submit Proposal
            </button>
            <button
              onClick={() => setShowProposalForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500">Loading compliance data...</div>
        </div>
      ) : (
        <>
          {/* Woreda/District Reports */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Woreda/District Reports</h2>
            <div className="space-y-3">
              {woredaReports.map((report) => (
                <div key={report.report_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {report.report_type}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          report.status === "Submitted" ? "bg-emerald-50 text-emerald-700" :
                          report.status === "Pending" ? "bg-amber-50 text-amber-700" :
                          "bg-slate-50 text-slate-700"
                        }`}>
                          {report.status}
                        </span>
                      </div>
                      <p className="font-medium text-slate-900 text-sm">{report.title}</p>
                      <p className="text-sm text-slate-600 mt-2">{report.summary}</p>
                      <p className="text-xs text-slate-400 mt-2">Submitted: {new Date(report.submission_date).toLocaleDateString()}</p>
                    </div>
                    {report.file_url && (
                      <button className="shrink-0 rounded-lg bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 transition">
                        View File
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {woredaReports.length === 0 && (
                <p className="text-sm text-slate-400">No Woreda reports available.</p>
              )}
            </div>
          </div>

          {/* Public Metrics */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Publicly Viewable Metrics</h2>
            <p className="text-sm text-slate-500 mb-4">These metrics are publicly visible to ensure transparency and accountability.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {publicMetrics.map((metric) => (
                <div key={metric.metric_id} className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-700">
                      {metric.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">{metric.metric_name}</p>
                  <p className="text-xl font-bold text-slate-900">{metric.value}</p>
                  <p className="text-xs text-slate-400 mt-2">Updated: {new Date(metric.last_updated).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Policy Proposals */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Policy Change Proposals</h2>
            <div className="space-y-3">
              {policyProposals.map((proposal) => (
                <div key={proposal.proposal_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                          {proposal.category}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          proposal.status === "Under Review" ? "bg-amber-50 text-amber-700" :
                          proposal.status === "Approved" ? "bg-emerald-50 text-emerald-700" :
                          proposal.status === "Rejected" ? "bg-rose-50 text-rose-700" :
                          "bg-slate-50 text-slate-700"
                        }`}>
                          {proposal.status}
                        </span>
                      </div>
                      <p className="font-medium text-slate-900 text-sm">{proposal.title}</p>
                      <p className="text-sm text-slate-600 mt-2">{proposal.description}</p>
                      {proposal.response && (
                        <div className="mt-3 p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                          <p className="text-xs font-semibold text-emerald-700 mb-1">Response:</p>
                          <p className="text-sm text-emerald-800">{proposal.response}</p>
                        </div>
                      )}
                      <p className="text-xs text-slate-400 mt-2">Submitted: {new Date(proposal.submitted_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
              {policyProposals.length === 0 && (
                <p className="text-sm text-slate-400">No policy proposals submitted yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
