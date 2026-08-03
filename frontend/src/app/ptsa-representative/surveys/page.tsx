"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/ptsa";

type Survey = {
  survey_id: number;
  title: string;
  description: string;
  created_at: string;
  status: string;
  response_count: number;
  target_audience: string;
};

type SurveyQuestion = {
  question_id: number;
  question_text: string;
  question_type: string;
  options?: string[];
};

type SurveyResponse = {
  response_id: number;
  survey_id: number;
  respondent_id: string;
  responses: Record<string, string>;
  submitted_at: string;
};

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [surveyResults, setSurveyResults] = useState<SurveyResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState<number | null>(null);
  
  const [newSurvey, setNewSurvey] = useState({
    title: "",
    description: "",
    target_audience: "ALL",
    questions: [] as SurveyQuestion[],
  });
  
  const [currentQuestion, setCurrentQuestion] = useState({
    question_text: "",
    question_type: "rating",
    options: "",
  });

  useEffect(() => {
    loadSurveysData();
  }, []);

  async function loadSurveysData() {
    setLoading(true);
    try {
      const [surveysRes, resultsRes] = await Promise.all([
        fetch(`${API_BASE}/surveys`),
        fetch(`${API_BASE}/surveys/results`),
      ]);

      if (surveysRes.ok) setSurveys(await surveysRes.json());
      if (resultsRes.ok) setSurveyResults(await resultsRes.json());
    } catch (error) {
      console.error("Error loading surveys data:", error);
    } finally {
      setLoading(false);
    }
  }

  function addQuestion() {
    if (!currentQuestion.question_text.trim()) return;
    
    const question: SurveyQuestion = {
      question_id: Date.now(),
      question_text: currentQuestion.question_text,
      question_type: currentQuestion.question_type,
      options: currentQuestion.question_type === "multiple_choice" 
        ? currentQuestion.options.split(",").map(o => o.trim())
        : undefined,
    };
    
    setNewSurvey({
      ...newSurvey,
      questions: [...newSurvey.questions, question],
    });
    
    setCurrentQuestion({ question_text: "", question_type: "rating", options: "" });
  }

  function removeQuestion(questionId: number) {
    setNewSurvey({
      ...newSurvey,
      questions: newSurvey.questions.filter(q => q.question_id !== questionId),
    });
  }

  async function createSurvey() {
    if (!newSurvey.title || !newSurvey.description || newSurvey.questions.length === 0) {
      alert("Please fill in title, description, and add at least one question.");
      return;
    }
    
    try {
      await fetch(`${API_BASE}/surveys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSurvey),
      });
      setNewSurvey({ title: "", description: "", target_audience: "ALL", questions: [] });
      setShowCreateForm(false);
      loadSurveysData();
      alert("Survey created successfully!");
    } catch (error) {
      console.error("Error creating survey:", error);
      alert("Failed to create survey. Please try again.");
    }
  }

  async function sendSurvey(surveyId: number) {
    try {
      await fetch(`${API_BASE}/surveys/${surveyId}/send`, {
        method: "POST",
      });
      alert("Survey sent successfully!");
    } catch (error) {
      console.error("Error sending survey:", error);
      alert("Failed to send survey. Please try again.");
    }
  }

  const getSurveyResults = (surveyId: number) => {
    return surveyResults.filter(r => r.survey_id === surveyId);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Parent Surveys</h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage parent surveys for feedback</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
        >
          Create Survey
        </button>
      </div>

      {showCreateForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Create New Survey</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                value={newSurvey.title}
                onChange={(e) => setNewSurvey({...newSurvey, title: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                placeholder="Survey title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
              <textarea
                value={newSurvey.description}
                onChange={(e) => setNewSurvey({...newSurvey, description: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-none"
                rows={2}
                placeholder="Survey description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Target Audience</label>
              <select
                value={newSurvey.target_audience}
                onChange={(e) => setNewSurvey({...newSurvey, target_audience: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
              >
                <option value="ALL">All Parents</option>
                <option value="GRADE_9_10">Grade 9-10 Parents</option>
                <option value="GRADE_11_12">Grade 11-12 Parents</option>
                <option value="PTSA">PTSA Members Only</option>
              </select>
            </div>
            
            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-900 mb-3">Questions</h3>
              <div className="space-y-3">
                {newSurvey.questions.map((question) => (
                  <div key={question.question_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{question.question_text}</p>
                      <p className="text-xs text-slate-500">{question.question_type}</p>
                    </div>
                    <button
                      onClick={() => removeQuestion(question.question_id)}
                      className="text-rose-600 hover:text-rose-700"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Question Type</label>
                  <select
                    value={currentQuestion.question_type}
                    onChange={(e) => setCurrentQuestion({...currentQuestion, question_type: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  >
                    <option value="rating">Rating (1-5)</option>
                    <option value="yes_no">Yes/No</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="open_ended">Open Ended</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Question</label>
                  <input
                    type="text"
                    value={currentQuestion.question_text}
                    onChange={(e) => setCurrentQuestion({...currentQuestion, question_text: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                    placeholder="Enter your question"
                  />
                </div>
                {currentQuestion.question_type === "multiple_choice" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Options (comma-separated)</label>
                    <input
                      type="text"
                      value={currentQuestion.options}
                      onChange={(e) => setCurrentQuestion({...currentQuestion, options: e.target.value})}
                      className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                      placeholder="Option 1, Option 2, Option 3"
                    />
                  </div>
                )}
                <button
                  onClick={addQuestion}
                  className="w-full rounded-xl border-2 border-dashed border-slate-300 p-3 text-sm font-medium text-slate-600 hover:border-teal-500 hover:text-teal-600 transition"
                >
                  + Add Question
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={createSurvey}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
            >
              Create Survey
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500">Loading surveys...</div>
        </div>
      ) : (
        <>
          {/* Surveys List */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">My Surveys</h2>
            <div className="space-y-3">
              {surveys.map((survey) => (
                <div key={survey.survey_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          survey.status === "Active" ? "bg-emerald-50 text-emerald-700" :
                          survey.status === "Closed" ? "bg-slate-50 text-slate-700" :
                          "bg-amber-50 text-amber-700"
                        }`}>
                          {survey.status}
                        </span>
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {survey.target_audience}
                        </span>
                      </div>
                      <p className="font-medium text-slate-900 text-sm">{survey.title}</p>
                      <p className="text-sm text-slate-600 mt-1">{survey.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span>Responses: {survey.response_count}</span>
                        <span>Created: {new Date(survey.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {survey.status === "Draft" && (
                        <button
                          onClick={() => sendSurvey(survey.survey_id)}
                          className="rounded-lg bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 transition"
                        >
                          Send Survey
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedSurvey(survey.survey_id)}
                        className="rounded-lg bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                      >
                        View Results
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {surveys.length === 0 && (
                <p className="text-sm text-slate-400">No surveys created yet. Create your first survey to get started.</p>
              )}
            </div>
          </div>

          {/* Survey Results */}
          {selectedSurvey && (
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">Survey Results</h2>
                <button
                  onClick={() => setSelectedSurvey(null)}
                  className="text-slate-500 hover:text-slate-700"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-3">
                {getSurveyResults(selectedSurvey).map((response) => (
                  <div key={response.response_id} className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-slate-900">Response #{response.response_id}</p>
                      <p className="text-xs text-slate-500">{new Date(response.submitted_at).toLocaleDateString()}</p>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(response.responses).map(([question, answer]) => (
                        <div key={question} className="text-sm">
                          <p className="font-medium text-slate-700">{question}</p>
                          <p className="text-slate-600">{answer}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {getSurveyResults(selectedSurvey).length === 0 && (
                  <p className="text-sm text-slate-400">No responses received yet.</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
