"use client";

import React, { useEffect, useState } from "react";
import { vpAcademicApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAcademicTranslations } from "@/translations/vp-academic";

type AttendanceRecord = {
  record_id: number;
  student_id: number;
  student_name: string;
  class_name: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  remarks?: string;
  recorded_by: string;
};

type Student = {
  student_id: number;
  user: {
    full_name: string;
  };
  current_class: {
    class_id: number;
    class_name: string;
  };
};

type TeacherAttendanceRecord = {
  record_id: number;
  teacher_id: number;
  teacher_name: string;
  date: string;
  status: "PRESENT" | "ABSENT" | "LATE";
  remarks?: string;
  recorded_by: string;
};

type ClassAttendanceSummary = {
  class_id: number;
  class_name: string;
  total_students: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  attendance_rate: number;
  date: string;
};

type SchoolClass = {
  class_id: number;
  class_name: string;
};

type Teacher = {
  teacher_id: number;
  full_name: string;
  department?: string;
};

type StudentAttendanceHistory = {
  student_id: number;
  student_name: string;
  class_name: string;
  attendance_records: AttendanceRecord[];
  stats: {
    total: number;
    present: number;
    absent: number;
    late: number;
    attendance_rate: number;
  };
};

export default function AttendancePage() {
  const { language } = useLanguage();
  const t = vpAcademicTranslations[language];
  const [activeTab, setActiveTab] = useState<"students" | "classes" | "teachers">("students");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendanceRecord[]>([]);
  const [classAttendanceSummary, setClassAttendanceSummary] = useState<ClassAttendanceSummary[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [selectedStudentHistory, setSelectedStudentHistory] = useState<StudentAttendanceHistory | null>(null);
  const [loadingStudentHistory, setLoadingStudentHistory] = useState(false);

  async function fetchData() {
    setLoading(true);
    try {
      const ADMIN_API = process.env.NEXT_PUBLIC_ADMIN_API || "http://localhost:5000/api";
      
      if (activeTab === "students") {
        const [attendanceRes, classesRes, studentsRes] = await Promise.all([
          vpAcademicApi.get(`/academic/attendance?class_id=${selectedClass}&date=${selectedDate}`),
          fetch(`${ADMIN_API}/admin/classes`),
          fetch(`${ADMIN_API}/admin/students`),
        ]);

        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
        }
        if (classesRes.ok) {
          const classesData = await classesRes.json();
          setClasses(Array.isArray(classesData.classes) ? classesData.classes : Array.isArray(classesData) ? classesData : []);
        }
        if (studentsRes.ok) {
          const studentsData = await studentsRes.json();
          setStudents(Array.isArray(studentsData.students) ? studentsData.students : Array.isArray(studentsData) ? studentsData : []);
        }
      } else if (activeTab === "classes") {
        const [classesRes, summaryRes] = await Promise.all([
          fetch(`${ADMIN_API}/admin/classes`),
          vpAcademicApi.get(`/academic/attendance/summary?date=${selectedDate}`),
        ]);

        if (classesRes.ok) {
          const classesData = await classesRes.json();
          setClasses(Array.isArray(classesData.classes) ? classesData.classes : Array.isArray(classesData) ? classesData : []);
        }
        if (summaryRes.ok) {
          const summaryData = await summaryRes.json();
          setClassAttendanceSummary(Array.isArray(summaryData) ? summaryData : []);
        } else {
          // Fallback: calculate summary from attendance data
          const attendanceRes = await vpAcademicApi.get(`/academic/attendance?date=${selectedDate}`);
          if (attendanceRes.ok) {
            const attendanceData = await attendanceRes.json();
            const records = Array.isArray(attendanceData) ? attendanceData : [];
            const summaryMap = new Map();
            
            records.forEach((record: any) => {
              if (!summaryMap.has(record.class_name)) {
                summaryMap.set(record.class_name, {
                  class_name: record.class_name,
                  total_students: 0,
                  present_count: 0,
                  absent_count: 0,
                  late_count: 0,
                });
              }
              const summary = summaryMap.get(record.class_name);
              summary.total_students++;
              if (record.status === "PRESENT") summary.present_count++;
              else if (record.status === "ABSENT") summary.absent_count++;
              else if (record.status === "LATE") summary.late_count++;
            });
            
            const summary = Array.from(summaryMap.values()).map((s: any) => ({
              ...s,
              attendance_rate: s.total_students > 0 ? (s.present_count / s.total_students) * 100 : 0,
              date: selectedDate,
            }));
            setClassAttendanceSummary(summary);
          }
        }
      } else if (activeTab === "teachers") {
        const [teachersRes, attendanceRes] = await Promise.all([
          fetch(`${ADMIN_API}/admin/teachers`),
          vpAcademicApi.get(`/teachers/attendance?date=${selectedDate}`),
        ]);

        if (teachersRes.ok) {
          const teachersData = await teachersRes.json();
          setTeachers(Array.isArray(teachersData.teachers) ? teachersData.teachers : Array.isArray(teachersData) ? teachersData : []);
        }
        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          setTeacherAttendance(Array.isArray(attendanceData) ? attendanceData : []);
        } else {
          // Fallback: empty array
          setTeacherAttendance([]);
        }
      }
    } catch (error) {
      console.error(error);
      setAttendance([]);
      setTeacherAttendance([]);
      setClassAttendanceSummary([]);
      setClasses([]);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case "PRESENT":
        return t.present;
      case "ABSENT":
        return t.absent;
      case "LATE":
        return t.late;
      case "NOT_RECORDED":
        return t.notRecorded;
      default:
        return status;
    }
  }

  async function fetchStudentAttendanceHistory(studentId: number, studentName: string, className: string) {
    setLoadingStudentHistory(true);
    try {
      const res = await vpAcademicApi.get(`/academic/attendance?student_id=${studentId}`);
      if (res.ok) {
        const data = await res.json();
        const records = Array.isArray(data) ? data : [];
        
        const stats = {
          total: records.length,
          present: records.filter((r: any) => r.status === "PRESENT").length,
          absent: records.filter((r: any) => r.status === "ABSENT").length,
          late: records.filter((r: any) => r.status === "LATE").length,
          attendance_rate: records.length > 0 ? (records.filter((r: any) => r.status === "PRESENT").length / records.length) * 100 : 0,
        };

        setSelectedStudentHistory({
          student_id: studentId,
          student_name: studentName,
          class_name: className,
          attendance_records: records,
          stats,
        });
      }
    } catch (error) {
      console.error(error);
      alert(t.failedFetchHistory);
    } finally {
      setLoadingStudentHistory(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedClass, selectedDate]);

  function getStatusColor(status: string) {
    switch (status) {
      case "PRESENT":
        return "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300";
      case "ABSENT":
        return "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300";
      case "LATE":
        return "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300";
      case "NOT_RECORDED":
        return "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400";
      default:
        return "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300";
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "PRESENT":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "ABSENT":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        );
      case "LATE":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "NOT_RECORDED":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12zm-.75 0h.008v.008h-.008v-.008zm0 3.75h.008v.008H12zm-.75 0h.008v.008h-.008v-.008z" />
          </svg>
        );
      default:
        return null;
    }
  }

  const attendanceStats = {
    present: attendance.filter((a) => a.status === "PRESENT").length,
    absent: attendance.filter((a) => a.status === "ABSENT").length,
    late: attendance.filter((a) => a.status === "LATE").length,
    total: attendance.length,
  };

  // Filter students by selected class and match with attendance records
  const studentsWithAttendance = students
    .filter(s => !selectedClass || s.current_class?.class_id === parseInt(selectedClass))
    .map(student => {
      const attendanceRecord = attendance.find(a => a.student_id === student.student_id);
      return {
        student_id: student.student_id,
        student_name: student.user?.full_name || 'Unknown',
        class_name: student.current_class?.class_name || 'Unknown',
        date: selectedDate,
        status: attendanceRecord?.status || "NOT_RECORDED",
        remarks: attendanceRecord?.remarks,
        recorded_by: attendanceRecord?.recorded_by,
      };
    });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.attendanceManagement}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.viewAttendanceRecords}</p>
        </div>
      </div>

      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("students")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "students"
                ? "border-b-2 border-orange-600 dark:border-orange-400 text-orange-600 dark:text-orange-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.studentAttendance}
          </button>
          <button
            onClick={() => setActiveTab("classes")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "classes"
                ? "border-b-2 border-orange-600 dark:border-orange-400 text-orange-600 dark:text-orange-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.classSummary}
          </button>
          <button
            onClick={() => setActiveTab("teachers")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "teachers"
                ? "border-b-2 border-orange-600 dark:border-orange-400 text-orange-600 dark:text-orange-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.teacherAttendance}
          </button>
        </nav>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.dateLabel}</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        {activeTab === "students" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.classLabelFilter}</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">{t.allClasses}</option>
              {classes.map((cls) => (
                <option key={cls.class_id} value={cls.class_id}>
                  {cls.class_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {activeTab === "students" && attendanceStats.total > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">{attendanceStats.present}</p>
                <p className="text-xs text-orange-600 dark:text-orange-400">{t.present}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-900 dark:text-rose-300">{attendanceStats.absent}</p>
                <p className="text-xs text-rose-600 dark:text-rose-400">{t.absent}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-300">{attendanceStats.late}</p>
                <p className="text-xs text-amber-600 dark:text-amber-400">{t.late}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-600 text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{attendanceStats.total}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">{t.totalAttendance}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === "students" && (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-4">{t.studentLabel}</th>
                    <th className="px-6 py-4">{t.classLabel}</th>
                    <th className="px-6 py-4">{t.dateLabel}</th>
                    <th className="px-6 py-4">{t.status}</th>
                    <th className="px-6 py-4">{t.remarks}</th>
                    <th className="px-6 py-4">{t.recordedBy}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {studentsWithAttendance.map((record) => (
                    <tr key={record.student_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer" onClick={() => fetchStudentAttendanceHistory(record.student_id, record.student_name, record.class_name)}>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                        {record.student_name}
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                        </svg>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{record.class_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{new Date(record.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>
                          {getStatusIcon(record.status)}
                          {getStatusLabel(record.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{record.remarks || "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{record.recorded_by || "-"}</td>
                    </tr>
                  ))}
                  {studentsWithAttendance.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                        {t.noStudentsFound}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "classes" && (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-4">{t.classLabel}</th>
                    <th className="px-6 py-4">{t.totalStudents}</th>
                    <th className="px-6 py-4">{t.present}</th>
                    <th className="px-6 py-4">{t.absent}</th>
                    <th className="px-6 py-4">{t.late}</th>
                    <th className="px-6 py-4">{t.attendanceRateLabel}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {classAttendanceSummary.map((summary) => (
                    <tr key={summary.class_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{summary.class_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{summary.total_students}</td>
                      <td className="px-6 py-4 text-sm text-orange-600 dark:text-orange-400 font-medium">{summary.present_count}</td>
                      <td className="px-6 py-4 text-sm text-rose-600 dark:text-rose-400 font-medium">{summary.absent_count}</td>
                      <td className="px-6 py-4 text-sm text-amber-600 dark:text-amber-400 font-medium">{summary.late_count}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className={`h-2 rounded-full ${summary.attendance_rate >= 75 ? "bg-orange-500" : "bg-amber-500"}`}
                              style={{ width: `${summary.attendance_rate}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white w-16 text-right">
                            {(summary.attendance_rate ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {classAttendanceSummary.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                        {t.noAttendanceData}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "teachers" && (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-4">{t.teacherLabel}</th>
                    <th className="px-6 py-4">{t.departmentLabel}</th>
                    <th className="px-6 py-4">{t.dateLabel}</th>
                    <th className="px-6 py-4">{t.status}</th>
                    <th className="px-6 py-4">{t.remarks}</th>
                    <th className="px-6 py-4">{t.recordedBy}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {teacherAttendance.map((record) => (
                    <tr key={record.record_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{record.teacher_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{teachers.find(t => t.teacher_id === record.teacher_id)?.department || t.notProvided}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{new Date(record.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>
                          {getStatusIcon(record.status)}
                          {getStatusLabel(record.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{record.remarks || "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{record.recorded_by}</td>
                    </tr>
                  ))}
                  {teacherAttendance.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                        {t.noAttendanceRecords}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Student Attendance History Modal */}
      {showStudentModal && selectedStudentHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-slate-800 p-6 max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t.attendanceHistory}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {selectedStudentHistory.student_name} - {selectedStudentHistory.class_name}
                </p>
              </div>
              <button
                onClick={() => setShowStudentModal(false)}
                className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {loadingStudentHistory ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="mb-6 grid gap-4 sm:grid-cols-4">
                  <div className="rounded-xl bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-orange-900 dark:text-orange-300">{selectedStudentHistory.stats.present}</p>
                        <p className="text-xs text-orange-600 dark:text-orange-400">{t.present}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-rose-50 dark:bg-rose-900/30 border border-rose-200 dark:border-rose-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-rose-900 dark:text-rose-300">{selectedStudentHistory.stats.absent}</p>
                        <p className="text-xs text-rose-600 dark:text-rose-400">{t.absent}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-amber-900 dark:text-amber-300">{selectedStudentHistory.stats.late}</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400">{t.late}</p>
                      </div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-sky-900 dark:text-sky-300">{selectedStudentHistory.stats.attendance_rate.toFixed(1)}%</p>
                        <p className="text-xs text-sky-600 dark:text-sky-400">{t.attendanceRateLabel}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Attendance History Table */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50 text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          <th className="px-6 py-4">{t.dateLabel}</th>
                          <th className="px-6 py-4">{t.status}</th>
                          <th className="px-6 py-4">{t.remarks}</th>
                          <th className="px-6 py-4">{t.recordedBy}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {selectedStudentHistory.attendance_records.map((record) => (
                          <tr key={record.record_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-6 py-4 text-sm text-slate-900 dark:text-white">{new Date(record.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>
                                {getStatusIcon(record.status)}
                                {getStatusLabel(record.status)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{record.remarks || "-"}</td>
                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-300">{record.recorded_by}</td>
                          </tr>
                        ))}
                        {selectedStudentHistory.attendance_records.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-12 text-center text-sm text-slate-400 dark:text-slate-500">
                              No attendance records found for this student.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700 mt-6">
                  <button
                    onClick={() => setShowStudentModal(false)}
                    className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
