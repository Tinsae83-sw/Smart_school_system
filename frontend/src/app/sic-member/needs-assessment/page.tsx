"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/sic";

type NeedsAssessment = {
  assessment_id: number;
  assessment_name: string;
  academic_year: string;
  assessment_type: string;
  questions: any;
  target_audience: string;
  created_by: number;
  status: string;
  created_at: string;
  responses: Array<{
    response_id: number;
    respondent_id: number;
    responses: any;
    submitted_at: string;
  }>;
};

type SelfAssessment = {
  assessment_id: number;
  academic_year: string;
  overall_rating: number;
  strengths: string;
  weaknesses: string;
  opportunities: string;
  threats: string;
  action_plan: string;
  submitted_at: string;
};

export default function NeedsAssessmentPage() {
  const [assessments, setAssessments] = useState<NeedsAssessment[]>([]);
  const [selfAssessment, setSelfAssessment] = useState<SelfAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"assessments" | "self">("assessments");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [newAssessment, setNewAssessment] = useState<{
    assessment_name: string;
    academic_year: string;
    assessment_type: string;
    questions: Array<{ question: string; question_type: string; options: string[] }>;
    target_audience: string;
  }>({
    assessment_name: "",
    academic_year: "2024-2025",
    assessment_type: "GENERAL",
    questions: [],
    target_audience: "ALL"
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [assessmentsRes, selfRes] = await Promise.all([
        fetch(`${API_BASE}/needs-assessments`),
        fetch(`${API_BASE}/self-assessment`)
      ]);

      if (assessmentsRes.ok) {
        const data = await assessmentsRes.json();
        setAssessments(data);
      }

      if (selfRes.ok) {
        const data = await selfRes.json();
        if (data.assessment_id) {
          setSelfAssessment(data);
        }
      }
    } catch (error) {
      console.error("Error fetching needs assessment data:", error);
      setStatusMessage("Unable to load data. Check backend connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/needs-assessments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAssessment)
      });

      if (res.ok) {
        setShowForm(false);
        setNewAssessment({
          assessment_name: "",
          academic_year: "2024-2025",
          assessment_type: "GENERAL",
          questions: [],
          target_audience: "ALL"
        });
        setStatusMessage("Needs assessment created successfully!");
        fetchData();
        setTimeout(() => setStatusMessage(null), 3000);
      } else {
        setStatusMessage("Failed to create needs assessment.");
      }
    } catch (error) {
      console.error("Error creating needs assessment:", error);
      setStatusMessage("Error creating needs assessment.");
    }
  }

  function addQuestion() {
    setNewAssessment(prev => ({
      ...prev,
      questions: [
        ...prev.questions,
        { question: "", question_type: "TEXT", options: [] }
      ]
    }));
  }

  function updateQuestion(index: number, field: string, value: any) {
    setNewAssessment(prev => ({
      ...prev,
      questions: prev.questions.map((q, i) => 
        i === index ? { ...q, [field]: value } : q
      )
    }));
  }

  function removeQuestion(index: number) {
    setNewAssessment(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== index)
    }));
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading needs assessment data...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Needs Assessment</h1>
          <p className="mt-1 text-sm text-slate-500">Create and manage school needs assessments</p>
        </div>
        {activeTab === "assessments" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition"
          >
            {showForm ? "Cancel" : "New Assessment"}
          </button>
        )}
      </div>

      {statusMessage && (
        <div className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
          statusMessage.includes("success") 
            ? "border-emerald-200 bg-emerald-50 text-emerald-800" 
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          {statusMessage}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("assessments")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "assessments"
                ? "text-rose-600 border-b-2 border-rose-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Needs Assessments
          </button>
          <button
            onClick={() => setActiveTab("self")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "self"
                ? "text-rose-600 border-b-2 border-rose-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Self Assessment
          </button>
        </nav>
      </div>

      {activeTab === "assessments" && (
        <div>
          {showForm && (
            <form onSubmit={handleSubmit} className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Create New Needs Assessment</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assessment Name</label>
                  <input
                    type="text"
                    value={newAssessment.assessment_name}
                    onChange={(e) => setNewAssessment(prev => ({ ...prev, assessment_name: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
                    <input
                      type="text"
                      value={newAssessment.academic_year}
                      onChange={(e) => setNewAssessment(prev => ({ ...prev, academic_year: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Assessment Type</label>
                    <select
                      value={newAssessment.assessment_type}
                      onChange={(e) => setNewAssessment(prev => ({ ...prev, assessment_type: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="GENERAL">General</option>
                      <option value="ACADEMIC">Academic</option>
                      <option value="INFRASTRUCTURE">Infrastructure</option>
                      <option value="FINANCIAL">Financial</option>
                      <option value="COMMUNITY">Community</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={newAssessment.target_audience}
                    onChange={(e) => setNewAssessment(prev => ({ ...prev, target_audience: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    <option value="ALL">All</option>
                    <option value="STUDENTS">Students</option>
                    <option value="TEACHERS">Teachers</option>
                    <option value="PARENTS">Parents</option>
                    <option value="STAFF">Staff</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-700">Questions</label>
                    <button
                      type="button"
                      onClick={addQuestion}
                      className="text-sm text-rose-600 hover:text-rose-700 font-medium"
                    >
                      + Add Question
                    </button>
                  </div>
                  {newAssessment.questions.map((q, index) => (
                    <div key={index} className="mb-3 rounded-lg bg-slate-50 p-3">
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          placeholder="Question text"
                          value={q.question}
                          onChange={(e) => updateQuestion(index, "question", e.target.value)}
                          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => removeQuestion(index)}
                          className="rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                        >
                          Remove
                        </button>
                      </div>
                      <select
                        value={q.question_type}
                        onChange={(e) => updateQuestion(index, "question_type", e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                      >
                        <option value="TEXT">Text Answer</option>
                        <option value="RATING">Rating Scale</option>
                        <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                        <option value="YES_NO">Yes/No</option>
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
                    Create Assessment
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {assessments.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
                <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Needs Assessments</h3>
                <p className="text-sm text-slate-500">Create a needs assessment to gather feedback from the school community.</p>
              </div>
            ) : (
              assessments.map((assessment) => (
                <div key={assessment.assessment_id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{assessment.assessment_name}</h3>
                      <p className="text-sm text-slate-500 mt-1">{assessment.assessment_type} • {assessment.target_audience}</p>
                      <p className="text-xs text-slate-400 mt-1">Academic Year: {assessment.academic_year}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${
                      assessment.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                      assessment.status === 'DRAFT' ? 'bg-amber-50 text-amber-700' :
                      'bg-slate-50 text-slate-700'
                    }`}>
                      {assessment.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>{assessment.questions?.length || 0} questions</span>
                    <span>{assessment.responses?.length || 0} responses</span>
                    <span>Created: {new Date(assessment.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "self" && (
        <div>
          {!selfAssessment ? (
            <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
              <svg className="w-16 h-16 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Self Assessment</h3>
              <p className="text-sm text-slate-500">No self-assessment has been completed for the current academic year.</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">School Self Assessment</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Overall Rating</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 rounded-full" style={{ width: `${selfAssessment.overall_rating}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{selfAssessment.overall_rating}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Strengths</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selfAssessment.strengths}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Weaknesses</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selfAssessment.weaknesses}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Opportunities</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selfAssessment.opportunities}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Threats</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selfAssessment.threats}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Action Plan</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selfAssessment.action_plan}</p>
                </div>
                <p className="text-xs text-slate-400">Submitted: {new Date(selfAssessment.submitted_at).toLocaleString()}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
