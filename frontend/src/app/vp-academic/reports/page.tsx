"use client";

import React, { useEffect, useState } from "react";
import { vpAcademicApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAcademicTranslations } from "@/translations/vp-academic";

type GradeData = {
  student_id: number;
  student_name: string;
  class_name: string;
  subject_name: string;
  score: number;
  letter_grade: string;
};

type AttendanceData = {
  class_name: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  attendance_rate: number;
};

type AtRiskStudent = {
  student_id: number;
  student_name: string;
  class_name: string;
  risk_level: string;
  average_grade: number;
  attendance_rate: number;
};

export default function ReportsPage() {
  const { language } = useLanguage();
  const t = vpAcademicTranslations[language];
  const [activeTab, setActiveTab] = useState<"grades" | "attendance" | "at-risk">("grades");
  const [grades, setGrades] = useState<GradeData[]>([]);
  const [attendance, setAttendance] = useState<AttendanceData[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [reportType, setReportType] = useState("");
  const [reportParams, setReportParams] = useState({
    class_id: "",
    subject_id: "",
    start_date: "",
    end_date: "",
  });

  async function fetchGrades() {
    setLoading(true);
    try {
      const res = await vpAcademicApi.get('/academic/grades');
      if (!res.ok) throw new Error("Failed to fetch grades");
      const data = await res.json();
      
      // Transform backend data to frontend format
      const transformedGrades = data.map((g: any) => ({
        student_id: g.submission?.student?.student_id || 0,
        student_name: g.submission?.student?.user?.full_name || 'Unknown',
        class_name: g.submission?.student?.current_class?.class_name || 'Unknown',
        subject_name: g.submission?.assignment?.class_subject?.subject?.subject_name || 'Unknown',
        score: Number(g.score) || 0,
        letter_grade: g.letter_grade || 'N/A'
      }));
      
      setGrades(transformedGrades);
    } catch (error) {
      console.error(error);
      setGrades([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAttendance() {
    setLoading(true);
    try {
      const res = await vpAcademicApi.get('/academic/attendance');
      if (!res.ok) throw new Error("Failed to fetch attendance");
      const data = await res.json();
      
      // Transform backend data to frontend format
      const transformedAttendance = {
        class_name: 'Overall',
        total_students: data.total_records || 0,
        present_count: data.present || 0,
        absent_count: data.absent || 0,
        attendance_rate: data.attendance_rate || 0
      };
      
      setAttendance([transformedAttendance]);
    } catch (error) {
      console.error(error);
      setAttendance([]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchAtRiskStudents() {
    setLoading(true);
    try {
      const res = await vpAcademicApi.get('/academic/at-risk');
      if (!res.ok) throw new Error("Failed to fetch at-risk students");
      const data = await res.json();
      
      // Transform backend data to frontend format
      const transformedStudents = data.map((s: any) => {
        const avgGrade = s.average_grade || 0;
        const attRate = s.attendance_rate || 0;
        
        let riskLevel = 'LOW';
        if (avgGrade < 60 || attRate < 80) riskLevel = 'HIGH';
        else if (avgGrade < 70 || attRate < 85) riskLevel = 'MEDIUM';
        
        return {
          student_id: s.student_id || 0,
          student_name: s.student?.user?.full_name || 'Unknown',
          class_name: s.student?.current_class?.class_name || 'Unknown',
          risk_level: riskLevel,
          average_grade: avgGrade,
          attendance_rate: attRate
        };
      });
      
      setAtRiskStudents(transformedStudents);
    } catch (error) {
      console.error(error);
      setAtRiskStudents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab === "grades") fetchGrades();
    else if (activeTab === "attendance") fetchAttendance();
    else if (activeTab === "at-risk") fetchAtRiskStudents();
  }, [activeTab]);

  async function handleGenerateReport() {
    try {
      const res = await vpAcademicApi.post('/academic/reports', {
        type: reportType,
        ...reportParams,
      });
      if (!res.ok) throw new Error("Failed to generate report");
      const data = await res.json();
      alert(`${t.reportGenerated} ${data.message || ""}`);
      setShowGenerateModal(false);
    } catch (error) {
      console.error(error);
      alert(t.failedGenerateReport);
    }
  }

  async function handleGenerateTranscript(studentId: number) {
    try {
      const res = await vpAcademicApi.post('/academic/transcripts', {
        student_id: studentId,
      });
      if (!res.ok) throw new Error("Failed to generate transcript");
      alert(t.transcriptGenerated);
    } catch (error) {
      console.error(error);
      alert(t.failedGenerateTranscript);
    }
  }

  function getRiskLevelColor(level: string) {
    switch (level) {
      case "HIGH":
        return "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300";
      case "MEDIUM":
        return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300";
      case "LOW":
        return "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300";
      default:
        return "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
    }

    function getRiskLevelLabel(level: string) {
      switch (level) {
        case "HIGH":
          return t.highRisk;
        case "MEDIUM":
          return t.mediumRisk;
        case "LOW":
          return t.lowRisk;
        default:
          return level;
      }
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.academicReportsTitle}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.viewGenerateReports}</p>
        </div>
        <button
          onClick={() => {
            setReportType("");
            setReportParams({ class_id: "", subject_id: "", start_date: "", end_date: "" });
            setShowGenerateModal(true);
          }}
          className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
        >
          {t.generateReport}
        </button>
      </div>

      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("grades")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "grades"
                ? "border-b-2 border-orange-600 dark:border-orange-400 text-orange-600 dark:text-orange-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.schoolWideGrades}
          </button>
          <button
            onClick={() => setActiveTab("attendance")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "attendance"
                ? "border-b-2 border-orange-600 dark:border-orange-400 text-orange-600 dark:text-orange-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.attendanceSummary}
          </button>
          <button
            onClick={() => setActiveTab("at-risk")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "at-risk"
                ? "border-b-2 border-orange-600 dark:border-orange-400 text-orange-600 dark:text-orange-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.atRiskStudents}
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          {activeTab === "grades" && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-4">{t.studentLabel}</th>
                    <th className="px-6 py-4">{t.classLabel}</th>
                    <th className="px-6 py-4">{t.subjectLabel}</th>
                    <th className="px-6 py-4">{t.score}</th>
                    <th className="px-6 py-4">{t.letterGrade}</th>
                    <th className="px-6 py-4">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {grades.length > 0 ? grades.map((grade, index) => (
                    <tr key={`${grade.student_id}-${grade.subject_name}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{grade.student_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{grade.class_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{grade.subject_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{grade.score}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded-full bg-orange-50 dark:bg-orange-900/30 px-2.5 py-1 text-xs font-medium text-orange-700 dark:text-orange-300">
                          {grade.letter_grade}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleGenerateTranscript(grade.student_id)}
                          className="rounded-lg bg-sky-50 dark:bg-sky-900/30 px-3 py-1.5 text-xs font-medium text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition"
                        >
                          {t.transcript}
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                        {t.noGradeData}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-4">{t.classLabel}</th>
                    <th className="px-6 py-4">{t.totalRecords}</th>
                    <th className="px-6 py-4">{t.present}</th>
                    <th className="px-6 py-4">{t.absent}</th>
                    <th className="px-6 py-4">{t.attendanceRateLabel}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {attendance.length > 0 ? attendance.map((att) => (
                    <tr key={att.class_name} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{att.class_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{att.total_students}</td>
                      <td className="px-6 py-4 text-sm text-orange-600 dark:text-orange-400">{att.present_count}</td>
                      <td className="px-6 py-4 text-sm text-rose-600 dark:text-rose-400">{att.absent_count}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className="h-2 rounded-full bg-orange-500"
                              style={{ width: `${att.attendance_rate}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-900 dark:text-white">{att.attendance_rate.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                        {t.noAttendanceData}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "at-risk" && (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-4">{t.studentLabel}</th>
                    <th className="px-6 py-4">{t.classLabel}</th>
                    <th className="px-6 py-4">{t.averageGrade}</th>
                    <th className="px-6 py-4">{t.attendanceRateLabel}</th>
                    <th className="px-6 py-4">{t.riskLevel}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {atRiskStudents.length > 0 ? atRiskStudents.map((student) => (
                    <tr key={student.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{student.student_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{student.class_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{student.average_grade.toFixed(1)}%</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{student.attendance_rate.toFixed(1)}%</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${getRiskLevelColor(student.risk_level)}`}>
                          {getRiskLevelLabel(student.risk_level)}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                        {t.noAtRiskStudents}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Generate Report Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-800 p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.generateReport}</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.reportType}</label>
                <select
                  required
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">{t.selectReportType}</option>
                  <option value="academic_performance">{t.academicPerformance}</option>
                  <option value="attendance_report">{t.attendanceReport}</option>
                  <option value="grade_distribution">{t.gradeDistribution}</option>
                  <option value="subject_performance">{t.subjectPerformance}</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.startDate}</label>
                  <input
                    type="date"
                    value={reportParams.start_date}
                    onChange={(e) => setReportParams({ ...reportParams, start_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.endDate}</label>
                  <input
                    type="date"
                    value={reportParams.end_date}
                    onChange={(e) => setReportParams({ ...reportParams, end_date: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  {t.cancel}
                </button>
                <button
                  onClick={handleGenerateReport}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
                >
                  {t.generateReport}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
