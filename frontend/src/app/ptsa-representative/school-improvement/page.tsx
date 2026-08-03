"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/ptsa";

type SchoolImprovementPlan = {
  plan_id: number;
  title: string;
  description: string;
  goals: string[];
  start_date: string;
  end_date: string;
  status: string;
};

type SIPProgress = {
  initiative_id: number;
  initiative_name: string;
  description: string;
  status: string;
  completion_percentage: number;
  target_date: string;
};

type SICMeetingMinutes = {
  meeting_id: number;
  meeting_date: string;
  title: string;
  summary: string;
  key_decisions: string[];
  action_items: string[];
};

type AnnualReport = {
  report_id: number;
  year: number;
  academic_summary: string;
  financial_summary: string;
  infrastructure_summary: string;
  recommendations: string[];
  generated_at: string;
};

export default function SchoolImprovementPage() {
  const [sip, setSip] = useState<SchoolImprovementPlan | null>(null);
  const [sipProgress, setSipProgress] = useState<SIPProgress[]>([]);
  const [sicMinutes, setSicMinutes] = useState<SICMeetingMinutes[]>([]);
  const [annualReports, setAnnualReports] = useState<AnnualReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");

  useEffect(() => {
    loadSICData();
  }, []);

  async function loadSICData() {
    setLoading(true);
    try {
      const [sipRes, progressRes, minutesRes, reportsRes] = await Promise.all([
        fetch(`${API_BASE}/sic/improvement-plan`),
        fetch(`${API_BASE}/sic/progress`),
        fetch(`${API_BASE}/sic/meeting-minutes`),
        fetch(`${API_BASE}/sic/annual-reports`),
      ]);

      if (sipRes.ok) setSip(await sipRes.json());
      if (progressRes.ok) setSipProgress(await progressRes.json());
      if (minutesRes.ok) setSicMinutes(await minutesRes.json());
      if (reportsRes.ok) setAnnualReports(await reportsRes.json());
    } catch (error) {
      console.error("Error loading SIC data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function submitFeedback() {
    if (!feedbackText.trim()) return;
    
    try {
      await fetch(`${API_BASE}/sic/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: feedbackText }),
      });
      setFeedbackText("");
      setShowFeedbackForm(false);
      alert("Feedback submitted successfully!");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("Failed to submit feedback. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">School Improvement Committee Oversight</h1>
          <p className="text-sm text-slate-500 mt-1">Monitor school improvement initiatives and plans</p>
        </div>
        <button
          onClick={() => setShowFeedbackForm(true)}
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
        >
          Submit Feedback
        </button>
      </div>

      {showFeedbackForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Submit Feedback on School Improvement Plan</h2>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Provide your feedback or suggestions on the school improvement plan..."
            className="w-full rounded-xl border border-slate-200 p-4 text-sm text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-none"
            rows={4}
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={submitFeedback}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
            >
              Submit Feedback
            </button>
            <button
              onClick={() => setShowFeedbackForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500">Loading school improvement data...</div>
        </div>
      ) : (
        <>
          {/* School Improvement Plan */}
          {sip && (
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">School Improvement Plan</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${
                  sip.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                }`}>
                  {sip.status}
                </span>
              </div>
              <p className="text-slate-900 font-medium mb-2">{sip.title}</p>
              <p className="text-sm text-slate-600 mb-4">{sip.description}</p>
              
              <div className="mb-4">
                <p className="text-sm font-semibold text-slate-900 mb-2">Goals:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                  {sip.goals.map((goal, index) => (
                    <li key={index}>{goal}</li>
                  ))}
                </ul>
              </div>
              
              <div className="flex gap-4 text-sm text-slate-500">
                <span>Start: {new Date(sip.start_date).toLocaleDateString()}</span>
                <span>End: {new Date(sip.end_date).toLocaleDateString()}</span>
              </div>
            </div>
          )}

          {/* SIP Progress */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Improvement Initiative Progress</h2>
            <div className="space-y-4">
              {sipProgress.map((initiative) => (
                <div key={initiative.initiative_id} className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{initiative.initiative_name}</p>
                      <p className="text-xs text-slate-500 mt-1">{initiative.description}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      initiative.status === "On Track" ? "bg-emerald-50 text-emerald-700" :
                      initiative.status === "Behind" ? "bg-amber-50 text-amber-700" :
                      "bg-blue-50 text-blue-700"
                    }`}>
                      {initiative.status}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600">Progress</span>
                      <span className="text-xs font-semibold text-slate-900">{initiative.completion_percentage}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          initiative.status === "On Track" ? "bg-emerald-500" :
                          initiative.status === "Behind" ? "bg-amber-500" :
                          "bg-blue-500"
                        }`}
                        style={{ width: `${initiative.completion_percentage}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">Target: {new Date(initiative.target_date).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SIC Meeting Minutes */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">SIC Meeting Minutes</h2>
            <div className="space-y-4">
              {sicMinutes.map((minutes) => (
                <div key={minutes.meeting_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{minutes.title}</p>
                      <p className="text-xs text-slate-400 mt-1">{new Date(minutes.meeting_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{minutes.summary}</p>
                  
                  {minutes.key_decisions.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold text-slate-900 mb-1">Key Decisions:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                        {minutes.key_decisions.map((decision, index) => (
                          <li key={index}>{decision}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {minutes.action_items.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-900 mb-1">Action Items:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                        {minutes.action_items.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
              {sicMinutes.length === 0 && (
                <p className="text-sm text-slate-400">No meeting minutes available.</p>
              )}
            </div>
          </div>

          {/* Annual School Reports */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Annual School Reports</h2>
            <div className="space-y-4">
              {annualReports.map((report) => (
                <div key={report.report_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">Annual Report {report.year}</p>
                      <p className="text-xs text-slate-400 mt-1">Generated: {new Date(report.generated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 mb-1">Academic Summary:</p>
                      <p className="text-sm text-slate-600">{report.academic_summary}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 mb-1">Financial Summary:</p>
                      <p className="text-sm text-slate-600">{report.financial_summary}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 mb-1">Infrastructure Summary:</p>
                      <p className="text-sm text-slate-600">{report.infrastructure_summary}</p>
                    </div>
                    {report.recommendations.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-900 mb-1">Recommendations:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-slate-600">
                          {report.recommendations.map((rec, index) => (
                            <li key={index}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {annualReports.length === 0 && (
                <p className="text-sm text-slate-400">No annual reports available.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
