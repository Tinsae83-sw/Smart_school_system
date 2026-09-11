"use client";

import React, { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000") + "/api/department-head";
const api = authFetchFor("DEPARTMENT_HEAD");

type Evaluation = {
  evaluation_id: number;
  teacher: { user: { full_name: string } };
  department_head: { user: { full_name: string } };
  scores: any;
  overall_score: number;
  strengths?: string;
  areas_for_improvement?: string;
  evaluator_comments?: string;
  overall_recommendation?: string;
  evaluation_date: string;
  submitted_at: string;
};

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
  created_at: string;
  is_active: boolean;
};

export default function EvaluationsPage() {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [forms, setForms] = useState<EvaluationForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"evaluations" | "forms" | "direct">("evaluations");
  const [showSendModal, setShowSendModal] = useState(false);
  const [sendData, setSendData] = useState({
    teacher_id: "",
    student_id: "",
    evaluation_form_id: "",
    message: "",
    form_type: "comprehensive" // "comprehensive" or "simplified"
  });
  const [directEvalData, setDirectEvalData] = useState({
    teacher_id: "",
    teacher_name: "",
    employee_id: "",
    department: "",
    evaluation_date: new Date().toISOString().split('T')[0],
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

  const handleTeacherSelect = (teacherId: string) => {
    const selectedTeacher = teachers.find(t => t.teacher_id === parseInt(teacherId));
    if (selectedTeacher) {
      setDirectEvalData(prev => ({
        ...prev,
        teacher_id: teacherId,
        teacher_name: selectedTeacher.full_name,
        employee_id: selectedTeacher.employee_id || "",
        department: selectedTeacher.department || ""
      }));
    }
  };

  async function handleDirectEvaluationSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const token = localStorage.getItem("dept_head_token");
      const res = await api(`${API_BASE}/evaluations/direct-submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          teacher_id: directEvalData.teacher_id,
          evaluation_date: directEvalData.evaluation_date,
          ratings: directEvalData.ratings,
          strengths: directEvalData.strengths,
          areas_for_improvement: directEvalData.areas_for_improvement,
          evaluator_comments: directEvalData.evaluator_comments,
          overall_recommendation: directEvalData.overall_recommendation
        })
      });
      if (res.ok) {
        const result = await res.json();
        alert(`Evaluation submitted successfully!\nTeacher: ${result.evaluation.teacher_name}\nOverall Score: ${result.evaluation.overall_score}%`);
        // Reset form
        setDirectEvalData({
          teacher_id: "",
          teacher_name: "",
          employee_id: "",
          department: "",
          evaluation_date: new Date().toISOString().split('T')[0],
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
      } else {
        const error = await res.json();
        alert(`Failed to submit evaluation: ${error.error}`);
      }
    } catch (error) {
      console.error("Error submitting evaluation:", error);
      alert("Failed to submit evaluation");
    }
  }
  const [teachers, setTeachers] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  async function fetchData() {
    setLoading(true);
    try {
      const token = localStorage.getItem("dept_head_token");
      const [evalRes, formsRes, teachersRes, studentsRes] = await Promise.all([
        api(`${API_BASE}/evaluations/direct`, { headers: { Authorization: `Bearer ${token}` } }),
        api(`${API_BASE}/evaluations/forms`, { headers: { Authorization: `Bearer ${token}` } }),
        api(`${API_BASE}/teachers`, { headers: { Authorization: `Bearer ${token}` } }),
        api(`${API_BASE}/students`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (evalRes.ok) setEvaluations(await evalRes.json());
      if (formsRes.ok) setForms(await formsRes.json());
      if (teachersRes.ok) {
        const teachersData = await teachersRes.json();
        setTeachers(teachersData.teachers || []);
      }
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        const allStudents = Object.values(studentsData).flat() || [];
        setStudents(allStudents);
      }
    } catch (error) {
      console.error("Error fetching evaluations:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function handleSendToStudent(e: React.FormEvent) {
    e.preventDefault();
    try {
      const token = localStorage.getItem("dept_head_token");
      const res = await api(`${API_BASE}/evaluations/send-to-student`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(sendData)
      });
      if (res.ok) {
        const result = await res.json();
        alert(`Evaluation link sent successfully!\nLink: ${result.evaluation_link}`);
        setShowSendModal(false);
        setSendData({ teacher_id: "", student_id: "", evaluation_form_id: "", message: "", form_type: "comprehensive" });
      }
    } catch (error) {
      console.error("Error sending evaluation:", error);
      alert("Failed to send evaluation");
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Teacher Evaluations</h1>
            <p className="mt-2 text-slate-600">Manage teacher evaluations, create forms, and collect student feedback</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowSendModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:from-orange-700 hover:to-orange-600 transition shadow-md"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
              Send to Student
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Total Evaluations</p>
              <p className="mt-2 text-3xl font-bold">{evaluations.length}</p>
            </div>
            <div className="rounded-xl bg-white/20 p-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium">Active Forms</p>
              <p className="mt-2 text-3xl font-bold">{forms.filter(f => f.is_active).length}</p>
            </div>
            <div className="rounded-xl bg-white/20 p-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Teachers</p>
              <p className="mt-2 text-3xl font-bold">{teachers.length}</p>
            </div>
            <div className="rounded-xl bg-white/20 p-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Students</p>
              <p className="mt-2 text-3xl font-bold">{students.length}</p>
            </div>
            <div className="rounded-xl bg-white/20 p-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 rounded-xl bg-white p-1.5 shadow-sm border border-slate-200 inline-flex">
        <button
          onClick={() => setActiveTab("evaluations")}
          className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${
            activeTab === "evaluations"
              ? "bg-orange-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Evaluations
          </span>
        </button>
        <button
          onClick={() => setActiveTab("forms")}
          className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${
            activeTab === "forms"
              ? "bg-orange-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Evaluation Forms
          </span>
        </button>
        <button
          onClick={() => setActiveTab("direct")}
          className={`rounded-lg px-5 py-2.5 text-sm font-medium transition ${
            activeTab === "direct"
              ? "bg-orange-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Direct Evaluation
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        </div>
      ) : activeTab === "evaluations" ? (
        evaluations.length === 0 ? (
          <div className="rounded-2xl bg-white p-16 text-center shadow-sm border border-slate-200">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
              <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No evaluations found</h3>
            <p className="mt-2 text-slate-600">Start by sending an evaluation to a student</p>
          </div>
        ) : (
          <div className="space-y-4">
            {evaluations.map((evaluation) => (
              <div key={evaluation.evaluation_id} className="group rounded-2xl bg-white p-6 shadow-sm border border-slate-200 hover:shadow-md hover:border-orange-300 transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-900">Direct Teacher Evaluation</h3>
                      <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                        {new Date(evaluation.evaluation_date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center gap-6 text-sm text-slate-600">
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {evaluation.department_head.user.full_name}
                      </span>
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        {evaluation.teacher.user.full_name}
                      </span>
                    </div>
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">Overall Score</span>
                        <span className={`text-lg font-bold ${
                          evaluation.overall_score >= 80 ? 'text-emerald-600' :
                          evaluation.overall_score >= 60 ? 'text-orange-600' :
                          'text-rose-600'
                        }`}>{evaluation.overall_score}%</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            evaluation.overall_score >= 80 ? 'bg-emerald-500' :
                            evaluation.overall_score >= 60 ? 'bg-orange-500' :
                            'bg-rose-500'
                          }`}
                          style={{ width: `${evaluation.overall_score}%` }}
                        />
                      </div>
                    </div>
                    {evaluation.evaluator_comments && (
                      <div className="mt-4 rounded-xl bg-slate-50 p-4">
                        <p className="text-xs font-semibold text-slate-700 mb-2">Comments</p>
                        <p className="text-sm text-slate-600">{evaluation.evaluator_comments}</p>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-slate-400">
                      {new Date(evaluation.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === "direct" ? (
        <form onSubmit={handleDirectEvaluationSubmit} className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
          <h1 className="text-2xl font-bold text-blue-900 mb-6">Teacher Evaluation Form</h1>

          <h2 className="text-xl font-semibold text-blue-900 mb-4">Teacher Information</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Select Teacher</label>
              <select
                value={directEvalData.teacher_id}
                onChange={(e) => handleTeacherSelect(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                required
              >
                <option value="">Select a teacher</option>
                {teachers.map(teacher => (
                  <option key={teacher.teacher_id} value={teacher.teacher_id}>
                    {teacher.full_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Teacher Name</label>
              <input
                type="text"
                value={directEvalData.teacher_name}
                readOnly
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50 text-slate-600"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Employee ID</label>
              <input
                type="text"
                value={directEvalData.employee_id}
                readOnly
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50 text-slate-600"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Department</label>
              <input
                type="text"
                value={directEvalData.department}
                readOnly
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50 text-slate-600"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Evaluation Date</label>
              <input
                type="date"
                value={directEvalData.evaluation_date}
                onChange={(e) => setDirectEvalData(prev => ({ ...prev, evaluation_date: e.target.value }))}
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
                        value={directEvalData.ratings[criteria.id as keyof typeof directEvalData.ratings]}
                        onChange={(e) => setDirectEvalData(prev => ({
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
                value={directEvalData.strengths}
                onChange={(e) => setDirectEvalData(prev => ({ ...prev, strengths: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
                rows={4}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Areas for Improvement</label>
              <textarea
                value={directEvalData.areas_for_improvement}
                onChange={(e) => setDirectEvalData(prev => ({ ...prev, areas_for_improvement: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
                rows={4}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-bold text-slate-700 mb-2">Evaluator Comments</label>
            <textarea
              value={directEvalData.evaluator_comments}
              onChange={(e) => setDirectEvalData(prev => ({ ...prev, evaluator_comments: e.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
              rows={5}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">Overall Recommendation</label>
            <select
              value={directEvalData.overall_recommendation}
              onChange={(e) => setDirectEvalData(prev => ({ ...prev, overall_recommendation: e.target.value }))}
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
            className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Submit Evaluation
          </button>
        </form>
      ) : activeTab === "forms" ? (
        forms.length === 0 ? (
          <div className="rounded-2xl bg-white p-16 text-center shadow-sm border border-slate-200">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
              <svg className="w-8 h-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No evaluation forms found</h3>
            <p className="mt-2 text-slate-600">Create a default form to get started</p>
          </div>
        ) : (
          <div className="space-y-6">
            {forms.map((form) => (
              <div key={form.form_id} className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
                <div className="flex items-start justify-between p-6 border-b border-slate-200">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-900">{form.title}</h3>
                      <span className={`rounded-full px-3 py-1 text-xs font-semibold border ${
                        form.is_active 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : "bg-slate-50 text-slate-600 border-slate-200"
                      }`}>
                        {form.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {form.description && (
                      <p className="mt-2 text-sm text-slate-600">{form.description}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-400">
                      Created {new Date(form.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                {form.criteria?.sections && (
                  <div className="p-6 space-y-6">
                    {form.criteria.sections.map((section, sectionIndex) => (
                      <div key={sectionIndex} className="rounded-xl bg-slate-50 p-5">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-slate-900">{section.name}</h4>
                          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
                            {section.weight}%
                          </span>
                        </div>
                        <div className="space-y-2">
                          {section.criteria.map((criterion, criterionIndex) => (
                            <div key={criterionIndex} className="flex items-center gap-3 text-sm">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-medium text-slate-600">
                                {criterionIndex + 1}
                              </span>
                              <span className="text-slate-700">{criterion.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    
                    {form.criteria.ratingScale && (
                      <div className="rounded-xl bg-slate-50 p-5">
                        <h4 className="font-semibold text-slate-900 mb-3">Rating Scale</h4>
                        <div className="flex gap-3">
                          {form.criteria.ratingScale.map((rating, index) => (
                            <div key={index} className="flex-1 rounded-lg bg-white p-3 text-center border border-slate-200">
                              <div className="text-lg font-bold text-orange-600">{rating.value}</div>
                              <div className="text-xs text-slate-600">{rating.description}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {form.criteria.evaluationSources && (
                      <div className="rounded-xl bg-slate-50 p-5">
                        <h4 className="font-semibold text-slate-900 mb-3">Evaluation Sources</h4>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {form.criteria.evaluationSources.map((source, index) => (
                            <div key={index} className="flex items-center justify-between rounded-lg bg-white p-3 border border-slate-200">
                              <span className="text-sm text-slate-700">{source.source}</span>
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                                {source.weight}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      ) : null}

      {/* Send to Student Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Send Teacher Evaluation to Student</h2>
                <p className="text-sm text-slate-500">Generate a one-time evaluation link for a student</p>
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSendToStudent} className="p-6 space-y-6">
              <h2 className="text-xl font-semibold text-blue-900 border-b border-slate-200 pb-2">Teacher Information</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select Teacher</label>
                  <select
                    value={sendData.teacher_id}
                    onChange={(e) => setSendData(prev => ({ ...prev, teacher_id: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select a teacher</option>
                    {teachers.map(t => (
                      <option key={t.teacher_id} value={t.teacher_id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Employee ID</label>
                  <input
                    type="text"
                    value={sendData.teacher_id ? teachers.find(t => t.teacher_id === parseInt(sendData.teacher_id))?.employee_id || '' : ''}
                    readOnly
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50 text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Department</label>
                  <input
                    type="text"
                    value={sendData.teacher_id ? teachers.find(t => t.teacher_id === parseInt(sendData.teacher_id))?.department || '' : ''}
                    readOnly
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50 text-slate-600"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Evaluation Date</label>
                  <input
                    type="date"
                    value={new Date().toISOString().split('T')[0]}
                    readOnly
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50 text-slate-600"
                  />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-blue-900 border-b border-slate-200 pb-2">Student Information</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Select Student</label>
                  <select
                    value={sendData.student_id}
                    onChange={(e) => setSendData(prev => ({ ...prev, student_id: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="">Select a student</option>
                    {students.map(s => (
                      <option key={s.student_id} value={s.student_id}>{s.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Student Number</label>
                  <input
                    type="text"
                    value={sendData.student_id ? students.find(s => s.student_id === parseInt(sendData.student_id))?.student_number || '' : ''}
                    readOnly
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm bg-slate-50 text-slate-600"
                  />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-blue-900 border-b border-slate-200 pb-2">Evaluation Form</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Form Type</label>
                  <select
                    value={sendData.form_type}
                    onChange={(e) => setSendData(prev => ({ ...prev, form_type: e.target.value }))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    required
                  >
                    <option value="comprehensive">Comprehensive (58 Criteria)</option>
                    <option value="simplified">Simplified (15 Criteria)</option>
                  </select>
                </div>
                {sendData.form_type === "comprehensive" && (
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Evaluation Form</label>
                    <select
                      value={sendData.evaluation_form_id}
                      onChange={(e) => setSendData(prev => ({ ...prev, evaluation_form_id: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      required
                    >
                      <option value="">Select form</option>
                      {forms.filter(f => f.is_active).map(f => (
                        <option key={f.form_id} value={f.form_id}>{f.title}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Message to Student (Optional)</label>
                <textarea
                  value={sendData.message}
                  onChange={(e) => setSendData(prev => ({ ...prev, message: e.target.value }))}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none resize-none"
                  rows={3}
                  placeholder="Add a custom message for the student..."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition"
                >
                  Send Evaluation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
