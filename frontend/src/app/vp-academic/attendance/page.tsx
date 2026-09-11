"use client";

import React, { useEffect, useState } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = "/api/vp-academic";
const api = authFetchFor("VP_ACADEMIC");

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

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState<"students" | "classes" | "teachers">("students");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [teacherAttendance, setTeacherAttendance] = useState<TeacherAttendanceRecord[]>([]);
  const [classAttendanceSummary, setClassAttendanceSummary] = useState<ClassAttendanceSummary[]>([]);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [showModal, setShowModal] = useState(false);
  const [studentsList, setStudentsList] = useState<Array<{ student_id: number; full_name: string; class_id: number | null; class_name: string }>>([]);
  const [formData, setFormData] = useState({
    student_id: "",
    status: "PRESENT" as "PRESENT" | "ABSENT" | "LATE",
    remarks: "",
  });

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === "students") {
        const [attendanceRes, classesRes] = await Promise.all([
          api(`${API_BASE}/academic/attendance?class_id=${selectedClass}&date=${selectedDate}`),
          api(`${API_BASE}/classes`),
        ]);

        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          setAttendance(Array.isArray(attendanceData) ? attendanceData : []);
        }
        if (classesRes.ok) {
          const classesData = await classesRes.json();
          setClasses(Array.isArray(classesData.classes) ? classesData.classes : Array.isArray(classesData) ? classesData : []);
        }
      } else if (activeTab === "classes") {
        const [classesRes, summaryRes] = await Promise.all([
          api(`${API_BASE}/classes`),
          api(`${API_BASE}/academic/attendance/summary?date=${selectedDate}`),
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
          const attendanceRes = await api(`${API_BASE}/academic/attendance?date=${selectedDate}`);
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
          api(`${API_BASE}/teachers`),
          api(`${API_BASE}/teachers/attendance?date=${selectedDate}`),
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

  useEffect(() => {
    fetchData();
  }, [activeTab, selectedClass, selectedDate]);

  async function loadStudents() {
    try {
      const res = await api(`${API_BASE}/students`);
      if (res.ok) {
        const data = await res.json();
        const list = (data.all || []).map((s: any) => ({
          student_id: s.student_id,
          full_name: s.user?.full_name || `Student #${s.student_id}`,
          class_id: s.current_class?.class_id ?? null,
          class_name: s.current_class?.class_name || "Unassigned",
        }));
        setStudentsList(list);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClass) {
      alert("Please select a class before recording attendance.");
      return;
    }
    if (!formData.student_id) {
      alert("Please choose a student.");
      return;
    }
    try {
      const res = await api(`${API_BASE}/academic/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: parseInt(formData.student_id),
          class_id: parseInt(selectedClass),
          date: selectedDate,
          status: formData.status,
          remarks: formData.remarks,
        }),
      });
      if (!res.ok) throw new Error("Failed to record attendance");
      setShowModal(false);
      setFormData({ student_id: "", status: "PRESENT", remarks: "" });
      fetchData();
    } catch (error) {
      console.error(error);
      alert("Failed to record attendance.");
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "PRESENT":
        return "bg-emerald-50 text-emerald-700";
      case "ABSENT":
        return "bg-rose-50 text-rose-700";
      case "LATE":
        return "bg-amber-50 text-amber-700";
      default:
        return "bg-slate-50 text-slate-700";
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

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Management</h1>
          <p className="mt-1 text-sm text-slate-500">View and manage attendance records for students, classes, and teachers</p>
        </div>
        {activeTab === "students" && (
          <button
            onClick={() => {
              setFormData({ student_id: "", status: "PRESENT", remarks: "" });
              setShowModal(true);
              loadStudents();
            }}
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            Record Attendance
          </button>
        )}
      </div>

      <div className="mb-6 border-b border-slate-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("students")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "students"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Student Attendance
          </button>
          <button
            onClick={() => setActiveTab("classes")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "classes"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Class Summary
          </button>
          <button
            onClick={() => setActiveTab("teachers")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "teachers"
                ? "border-b-2 border-emerald-600 text-emerald-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Teacher Attendance
          </button>
        </nav>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        {activeTab === "students" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">All Classes</option>
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
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-900">{attendanceStats.present}</p>
                <p className="text-xs text-emerald-600">Present</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-rose-900">{attendanceStats.absent}</p>
                <p className="text-xs text-rose-600">Absent</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-900">{attendanceStats.late}</p>
                <p className="text-xs text-amber-600">Late</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-600 text-white">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{attendanceStats.total}</p>
                <p className="text-xs text-slate-600">Total</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            {activeTab === "students" && (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Student</th>
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Remarks</th>
                    <th className="px-6 py-4">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.map((record) => (
                    <tr key={record.record_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{record.student_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{record.class_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(record.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>
                          {getStatusIcon(record.status)}
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{record.remarks || "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{record.recorded_by}</td>
                    </tr>
                  ))}
                  {attendance.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                        No attendance records found for the selected date and class.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "classes" && (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Class</th>
                    <th className="px-6 py-4">Total Students</th>
                    <th className="px-6 py-4">Present</th>
                    <th className="px-6 py-4">Absent</th>
                    <th className="px-6 py-4">Late</th>
                    <th className="px-6 py-4">Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {classAttendanceSummary.map((summary) => (
                    <tr key={summary.class_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{summary.class_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{summary.total_students}</td>
                      <td className="px-6 py-4 text-sm text-emerald-600 font-medium">{summary.present_count}</td>
                      <td className="px-6 py-4 text-sm text-rose-600 font-medium">{summary.absent_count}</td>
                      <td className="px-6 py-4 text-sm text-amber-600 font-medium">{summary.late_count}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 rounded-full bg-slate-200">
                            <div
                              className={`h-2 rounded-full ${summary.attendance_rate >= 75 ? "bg-emerald-500" : "bg-amber-500"}`}
                              style={{ width: `${summary.attendance_rate}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-slate-900 w-16 text-right">
                            {(summary.attendance_rate ?? 0).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {classAttendanceSummary.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                        No class attendance data available for the selected date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {activeTab === "teachers" && (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-6 py-4">Teacher</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Remarks</th>
                    <th className="px-6 py-4">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teacherAttendance.map((record) => (
                    <tr key={record.record_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{record.teacher_name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{teachers.find(t => t.teacher_id === record.teacher_id)?.department || "N/A"}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{new Date(record.date).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(record.status)}`}>
                          {getStatusIcon(record.status)}
                          {record.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{record.remarks || "-"}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{record.recorded_by}</td>
                    </tr>
                  ))}
                  {teacherAttendance.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
                        No teacher attendance records found for the selected date.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Record Attendance Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Record Attendance</h2>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Student</label>
                <select
                  required
                  value={formData.student_id}
                  onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="">
                    {selectedClass
                      ? "Select a student..."
                      : "Select a class filter first..."}
                  </option>
                  {(selectedClass
                    ? studentsList.filter((s) => String(s.class_id) === String(selectedClass))
                    : studentsList
                  ).map((s) => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.full_name} &mdash; {s.class_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  required
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                >
                  <option value="PRESENT">Present</option>
                  <option value="ABSENT">Absent</option>
                  <option value="LATE">Late</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows={3}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Record Attendance
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
