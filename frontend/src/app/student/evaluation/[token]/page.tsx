"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

type EvaluationForm = {
  form_id: number;
  title: string;
  description?: string;
  criteria: {
    sections: {
      name: string;
      weight: number;
      criteria: { id: string; name: string }[];
    }[];
    ratingScale: { value: number; description: string }[];
    evaluationSources?: { source: string; weight: number }[];
    additionalFields: string[];
  };
};

type EvaluationLink = {
  link_id: number;
  token: string;
  teacher: { teacher_id: number; user: { full_name: string } };
  student: { student_id: number; user: { full_name: string } };
  form: EvaluationForm;
  form_type?: string; // "comprehensive" or "simplified"
  expires_at: string;
  used: boolean;
};

export default function StudentEvaluationPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [evaluationLink, setEvaluationLink] = useState<EvaluationLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [additionalFields, setAdditionalFields] = useState<Record<string, string>>({});
  const [simplifiedData, setSimplifiedData] = useState({
    teacher_name: "",
    employee_id: "",
    department: "",
    evaluation_date: "",
    ratings: {
      subject_matter_expertise: 3,
      curriculum_understanding: 3,
      lesson_planning: 3,
      teaching_methodology: 3,
      technology_integration: 3,
      classroom_discipline: 3,
      student_engagement: 3,
      communication_skills: 3,
      assessment_grading: 3,
      professional_conduct: 3,
      attendance_punctuality: 3,
      parent_communication: 3,
      teamwork_collaboration: 3,
      student_support_mentoring: 3,
      school_activity_participation: 3
    },
    strengths: "",
    areas_for_improvement: "",
    evaluator_comments: "",
    overall_recommendation: "Good"
  });

  useEffect(() => {
    async function fetchEvaluationLink() {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/student/evaluation/${token}`);
        if (res.ok) {
          const data = await res.json();
          setEvaluationLink(data.evaluation);
          
          // Initialize scores for all criteria
          const initialScores: Record<string, number> = {};
          data.evaluation.form.criteria.sections.forEach((section: any) => {
            section.criteria.forEach((criterion: any) => {
              initialScores[criterion.id] = 3; // Default to "Good"
            });
          });
          setScores(initialScores);
          
          // Initialize additional fields
          const initialFields: Record<string, string> = {};
          data.evaluation.form.criteria.additionalFields.forEach((field: string) => {
            initialFields[field] = "";
          });
          setAdditionalFields(initialFields);
        } else {
          const errorData = await res.json();
          setError(errorData.error || "Failed to load evaluation");
        }
      } catch (err) {
        setError("Failed to load evaluation");
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      fetchEvaluationLink();
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/student/evaluation/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scores,
          comments: additionalFields.comments || "",
          additional_data: additionalFields
        })
      });

      if (res.ok) {
        alert("Evaluation submitted successfully!");
        setEvaluationLink(null);
      } else {
        const errorData = await res.json();
        alert(errorData.error || "Failed to submit evaluation");
      }
    } catch (err) {
      alert("Failed to submit evaluation");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
          <h2 className="text-xl font-bold text-slate-900">Error</h2>
          <p className="mt-2 text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!evaluationLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
          <h2 className="text-xl font-bold text-slate-900">Evaluation Not Found</h2>
          <p className="mt-2 text-slate-600">This evaluation link may be invalid or expired.</p>
        </div>
      </div>
    );
  }

  if (evaluationLink.used) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200 text-center">
          <h2 className="text-xl font-bold text-slate-900">Already Submitted</h2>
          <p className="mt-2 text-slate-600">This evaluation has already been submitted.</p>
        </div>
      </div>
    );
  }

  const form = evaluationLink.form;
  const ratingScale = form.criteria.ratingScale;
  const isSimplified = evaluationLink.form_type === "simplified";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold text-blue-900">{isSimplified ? "Teacher Evaluation Form" : form.title}</h1>
          {!isSimplified && <p className="mt-2 text-sm text-slate-600">{form.description}</p>}
          <div className="mt-4 flex items-center gap-4 text-sm text-slate-600">
            <span><strong>Teacher:</strong> {evaluationLink.teacher.user.full_name}</span>
            <span><strong>Expires:</strong> {new Date(evaluationLink.expires_at).toLocaleString()}</span>
          </div>
        </div>

        {isSimplified ? (
          <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
            <h2 className="text-xl font-semibold text-blue-900 mb-4">Teacher Information</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Teacher Name</label>
                <input
                  type="text"
                  value={evaluationLink.teacher.user.full_name}
                  readOnly
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Employee ID</label>
                <input
                  type="text"
                  value={simplifiedData.employee_id}
                  onChange={(e) => setSimplifiedData(prev => ({ ...prev, employee_id: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Department</label>
                <input
                  type="text"
                  value={simplifiedData.department}
                  onChange={(e) => setSimplifiedData(prev => ({ ...prev, department: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Evaluation Date</label>
                <input
                  type="date"
                  value={simplifiedData.evaluation_date}
                  onChange={(e) => setSimplifiedData(prev => ({ ...prev, evaluation_date: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <h2 className="text-xl font-semibold text-blue-900 mb-4">Evaluation Criteria</h2>
            <div className="overflow-x-auto mb-8">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="bg-blue-600 text-white px-4 py-3 text-left text-sm font-semibold border border-slate-300">No</th>
                    <th className="bg-blue-600 text-white px-4 py-3 text-left text-sm font-semibold border border-slate-300">Criteria</th>
                    <th className="bg-blue-600 text-white px-4 py-3 text-center text-sm font-semibold border border-slate-300 w-32">Rating (1-5)</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 'subject_matter_expertise', name: 'Subject Matter Expertise' },
                    { id: 'curriculum_understanding', name: 'Curriculum Understanding' },
                    { id: 'lesson_planning', name: 'Lesson Planning' },
                    { id: 'teaching_methodology', name: 'Teaching Methodology' },
                    { id: 'technology_integration', name: 'Technology Integration' },
                    { id: 'classroom_discipline', name: 'Classroom Discipline' },
                    { id: 'student_engagement', name: 'Student Engagement' },
                    { id: 'communication_skills', name: 'Communication Skills' },
                    { id: 'assessment_grading', name: 'Assessment & Grading' },
                    { id: 'professional_conduct', name: 'Professional Conduct' },
                    { id: 'attendance_punctuality', name: 'Attendance & Punctuality' },
                    { id: 'parent_communication', name: 'Parent Communication' },
                    { id: 'teamwork_collaboration', name: 'Teamwork & Collaboration' },
                    { id: 'student_support_mentoring', name: 'Student Support & Mentoring' },
                    { id: 'school_activity_participation', name: 'School Activity Participation' }
                  ].map((criteria, index) => (
                    <tr key={criteria.id}>
                      <td className="border border-slate-300 px-4 py-3 text-sm">{index + 1}</td>
                      <td className="border border-slate-300 px-4 py-3 text-sm">{criteria.name}</td>
                      <td className="border border-slate-300 px-4 py-3 text-center">
                        <select
                          value={simplifiedData.ratings[criteria.id as keyof typeof simplifiedData.ratings]}
                          onChange={(e) => setSimplifiedData(prev => ({
                            ...prev,
                            ratings: {
                              ...prev.ratings,
                              [criteria.id]: parseInt(e.target.value)
                            }
                          }))}
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                          <option value={5}>5</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 mb-8">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Strengths</label>
                <textarea
                  value={simplifiedData.strengths}
                  onChange={(e) => setSimplifiedData(prev => ({ ...prev, strengths: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Areas for Improvement</label>
                <textarea
                  value={simplifiedData.areas_for_improvement}
                  onChange={(e) => setSimplifiedData(prev => ({ ...prev, areas_for_improvement: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
                  rows={4}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-slate-700 mb-2">Evaluator Comments</label>
              <textarea
                value={simplifiedData.evaluator_comments}
                onChange={(e) => setSimplifiedData(prev => ({ ...prev, evaluator_comments: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
                rows={5}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Overall Recommendation</label>
              <select
                value={simplifiedData.overall_recommendation}
                onChange={(e) => setSimplifiedData(prev => ({ ...prev, overall_recommendation: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="Excellent">Excellent</option>
                <option value="Very Good">Very Good</option>
                <option value="Good">Good</option>
                <option value="Needs Improvement">Needs Improvement</option>
                <option value="Unsatisfactory">Unsatisfactory</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Evaluation"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {form.criteria.sections.map((section, sectionIndex) => (
              <div key={sectionIndex} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">{section.name}</h2>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">
                    {section.weight}%
                  </span>
                </div>

                <div className="space-y-4">
                  {section.criteria.map((criterion) => (
                    <div key={criterion.id} className="rounded-xl bg-slate-50 p-4">
                      <label className="block text-sm font-medium text-slate-700 mb-3">
                        {criterion.name}
                      </label>
                      <div className="flex gap-2">
                        {ratingScale.map((rating) => (
                          <button
                            key={rating.value}
                            type="button"
                            onClick={() => setScores(prev => ({ ...prev, [criterion.id]: rating.value }))}
                            className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                              scores[criterion.id] === rating.value
                                ? "border-orange-500 bg-orange-50 text-orange-700"
                                : "border-slate-200 bg-white text-slate-700 hover:border-orange-300"
                            }`}
                          >
                            {rating.value} - {rating.description}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Additional Fields */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Additional Comments</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Comments</label>
                  <textarea
                    value={additionalFields.comments || ""}
                    onChange={(e) => setAdditionalFields(prev => ({ ...prev, comments: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    rows={4}
                    placeholder="Add any additional comments about the teacher..."
                  />
                </div>

                {form.criteria.additionalFields.includes("strengths") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Strengths</label>
                    <textarea
                      value={additionalFields.strengths || ""}
                      onChange={(e) => setAdditionalFields(prev => ({ ...prev, strengths: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      rows={3}
                      placeholder="What are the teacher's strengths?"
                    />
                  </div>
                )}

                {form.criteria.additionalFields.includes("areas_for_improvement") && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Areas for Improvement</label>
                    <textarea
                      value={additionalFields.areas_for_improvement || ""}
                      onChange={(e) => setAdditionalFields(prev => ({ ...prev, areas_for_improvement: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      rows={3}
                      placeholder="What areas could the teacher improve?"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Rating Scale Reference */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Rating Scale</h2>
              <div className="grid gap-2 sm:grid-cols-5">
                {ratingScale.map((rating) => (
                  <div key={rating.value} className="rounded-xl bg-slate-50 p-3 text-center">
                    <div className="text-2xl font-bold text-orange-600">{rating.value}</div>
                    <div className="text-xs text-slate-600">{rating.description}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Evaluation Sources */}
            {form.criteria.evaluationSources && (
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Evaluation Sources</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {form.criteria.evaluationSources.map((source, index) => (
                    <div key={index} className="rounded-xl bg-slate-50 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">{source.source}</span>
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                          {source.weight}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Evaluation"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
