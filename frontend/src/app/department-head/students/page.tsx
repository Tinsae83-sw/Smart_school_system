"use client";

import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/department-head";

type AtRiskStudent = {
  student_id: number;
  full_name: string;
  class: string;
  risk_factors: { type: string; subject?: string; score?: number; absences?: number }[];
};

type Intervention = {
  intervention_id: number;
  student_id: number;
  student: { full_name: string; user: { full_name: string } };
  type: string;
  description: string;
  actions: string[];
  start_date: string;
  end_date?: string;
  status: string;
  progress_notes?: string;
  created_at: string;
};

type Student = {
  student_id: number;
  full_name: string;
  email: string;
  class: string;
  enrollment_status: string;
  grade_level: string;
};

type StudentsByClass = {
  [className: string]: Student[];
};

export default function StudentsPage() {
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [studentsByClass, setStudentsByClass] = useState<StudentsByClass>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "at-risk" | "interventions">("all");
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<AtRiskStudent | null>(null);
  const [classFilter, setClassFilter] = useState<string>("");

  async function fetchData() {
    setLoading(true);
    try {
      const token = localStorage.getItem("dept_head_token");
      const url = classFilter ? `${API_BASE}/students?class_id=${classFilter}` : `${API_BASE}/students`;
      const [studentsRes, riskRes, intRes] = await Promise.all([
        fetch(url, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/students/at-risk`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/interventions`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      if (studentsRes.ok) setStudentsByClass(await studentsRes.json());
      if (riskRes.ok) setAtRiskStudents(await riskRes.json());
      if (intRes.ok) setInterventions(await intRes.json());
    } catch (error) {
      console.error("Error fetching student data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [classFilter]);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Support</h1>
          <p className="mt-1 text-sm text-slate-500">Monitor at-risk students and manage intervention plans</p>
        </div>
        {activeTab === "all" && (
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="">All Classes</option>
            {Object.keys(studentsByClass).map(className => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
        )}
      </div>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab("all")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "all"
              ? "bg-orange-600 text-white"
              : "bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          All Students
        </button>
        <button
          onClick={() => setActiveTab("at-risk")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "at-risk"
              ? "bg-orange-600 text-white"
              : "bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          At-Risk Students
        </button>
        <button
          onClick={() => setActiveTab("interventions")}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
            activeTab === "interventions"
              ? "bg-orange-600 text-white"
              : "bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Intervention Plans
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        </div>
      ) : activeTab === "all" ? (
        Object.keys(studentsByClass).length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-200">
            <p className="text-slate-500">No students found in department classes.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(studentsByClass).map(([className, students]) => (
              <div key={className} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">{className}</h3>
                  <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-medium text-orange-700">
                    {students.length} students
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Name</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Email</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Grade Level</th>
                        <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.student_id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-3 px-3 text-sm font-medium text-slate-900">{student.full_name}</td>
                          <td className="py-3 px-3 text-sm text-slate-600">{student.email}</td>
                          <td className="py-3 px-3 text-sm text-slate-600">{student.grade_level}</td>
                          <td className="py-3 px-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              student.enrollment_status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' :
                              student.enrollment_status === 'INACTIVE' ? 'bg-slate-50 text-slate-600' :
                              'bg-amber-50 text-amber-700'
                            }`}>
                              {student.enrollment_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === "at-risk" ? (
        atRiskStudents.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-200">
            <p className="text-slate-500">No at-risk students found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {atRiskStudents.map((student) => (
              <div key={student.student_id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200 hover:border-orange-300 transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-900">{student.full_name}</h3>
                      <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700">
                        At Risk
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{student.class}</p>
                    <div className="mt-3">
                      <p className="text-xs font-medium text-slate-700">Risk Factors:</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {student.risk_factors.map((factor, i) => (
                          <span
                            key={i}
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              factor.type === "ACADEMIC" ? "bg-amber-50 text-amber-700" :
                              factor.type === "ATTENDANCE" ? "bg-rose-50 text-rose-700" :
                              "bg-purple-50 text-purple-700"
                            }`}
                          >
                            {factor.type}
                            {factor.subject && `: ${factor.subject}`}
                            {factor.score && ` (${factor.score}%)`}
                            {factor.absences && ` (${factor.absences} absences)`}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedStudent(student); setShowInterventionModal(true); }}
                    className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
                  >
                    Create Intervention
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        interventions.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-200">
            <p className="text-slate-500">No intervention plans found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {interventions.map((intervention) => (
              <div key={intervention.intervention_id} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-slate-900">{intervention.student.user.full_name}</h3>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        intervention.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" :
                        intervention.status === "COMPLETED" ? "bg-blue-50 text-blue-700" :
                        "bg-slate-50 text-slate-600"
                      }`}>
                        {intervention.status}
                      </span>
                      <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700">
                        {intervention.type}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{intervention.description}</p>
                    <div className="mt-3">
                      <p className="text-xs font-medium text-slate-700">Actions:</p>
                      <ul className="mt-1 list-inside list-disc text-sm text-slate-600">
                        {intervention.actions.slice(0, 2).map((action, i) => <li key={i}>{action}</li>)}
                        {intervention.actions.length > 2 && <li className="text-slate-400">+{intervention.actions.length - 2} more</li>}
                      </ul>
                    </div>
                    {intervention.progress_notes && (
                      <div className="mt-3 rounded-lg bg-slate-50 p-3">
                        <p className="text-xs font-medium text-slate-700">Progress Notes:</p>
                        <p className="mt-1 text-sm text-slate-600">{intervention.progress_notes}</p>
                      </div>
                    )}
                    <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
                      <span>Started: {new Date(intervention.start_date).toLocaleDateString()}</span>
                      {intervention.end_date && <span>Ends: {new Date(intervention.end_date).toLocaleDateString()}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Create Intervention Modal */}
      {showInterventionModal && selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-slate-900">Create Intervention Plan</h2>
            <p className="mt-1 text-sm text-slate-500">For {selectedStudent.full_name}</p>
            <form className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Intervention Type</label>
                <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500">
                  <option value="">Select type</option>
                  <option value="ACADEMIC">Academic</option>
                  <option value="BEHAVIORAL">Behavioral</option>
                  <option value="ATTENDANCE">Attendance</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" rows={3} placeholder="Describe the intervention plan" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Actions (one per line)</label>
                <textarea className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" rows={4} placeholder="Enter action items" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Start Date</label>
                  <input type="date" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">End Date (optional)</label>
                  <input type="date" className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowInterventionModal(false); setSelectedStudent(null); }}
                  className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
                >
                  Create Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
