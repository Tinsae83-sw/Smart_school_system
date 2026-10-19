"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, clearAuth } from "@/lib/auth";

export default function AttendancePage() {
  const router = useRouter();
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassSubject, setSelectedClassSubject] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = getToken("TEACHER");
    if (!token) {
      router.push("/login");
      return;
    }
    loadClasses(token);
  }, [router]);

  async function loadClasses(token: string) {
    try {
      const response = await fetch(`http://localhost:5000/api/teacher/classes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth("TEACHER");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setClasses(data);
      if (data.length > 0) {
        setSelectedClassSubject(data[0].class_subject_id);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadAttendance() {
    if (!selectedClassSubject || !selectedDate) return;
    const token = getToken("TEACHER");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/teacher/attendance?classId=${selectedClassSubject}&date=${selectedDate}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth("TEACHER");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAttendance(data.entries || []);
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    if (selectedClassSubject && selectedDate) {
      loadAttendance();
    }
  }, [selectedClassSubject, selectedDate]);

  async function handleSaveAttendance() {
    setSaving(true);
    setMessage("");
    const token = getToken("TEACHER");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/teacher/attendance`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          class_id: selectedClassSubject,
          date: selectedDate,
          entries: attendance.map(a => ({
            student_id: a.student_id,
            status: a.status,
            remarks: a.remarks || ''
          }))
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth("TEACHER");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setMessage("Attendance saved successfully!");
    } catch (e) {
      setMessage("Failed to save attendance");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function handleStatusChange(studentId: number, status: string) {
    setAttendance(attendance.map(a => 
      a.student_id === studentId ? { ...a, status } : a
    ));
  }

  function handleMarkAllPresent() {
    setAttendance(attendance.map(a => ({ ...a, status: 'PRESENT' })));
  }

  function handleMarkAllAbsent() {
    setAttendance(attendance.map(a => ({ ...a, status: 'ABSENT' })));
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-6">Attendance Management</h1>

        {/* Class and Date Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Select Class</label>
              <select
                value={selectedClassSubject || ''}
                onChange={(e) => setSelectedClassSubject(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {classes.map((cls: any) => (
                  <option key={cls.class_subject_id} value={cls.class_subject_id}>
                    {cls.school_class?.class_name || cls.class_name} - {cls.subject?.subject_name || cls.subject}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Class Attendance</h2>
            <div className="flex gap-2">
              <button
                onClick={handleMarkAllPresent}
                className="rounded-xl bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 text-emerald-700 dark:text-emerald-400 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition text-sm"
              >
                Mark All Present
              </button>
              <button
                onClick={handleMarkAllAbsent}
                className="rounded-xl bg-red-50 dark:bg-red-900/30 px-4 py-2 text-red-700 dark:text-red-400 font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition text-sm"
              >
                Mark All Absent
              </button>
              <button
                onClick={handleSaveAttendance}
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-6 py-2 text-white font-semibold hover:bg-emerald-700 transition disabled:bg-slate-300 dark:disabled:bg-slate-600"
              >
                {saving ? "Saving..." : "Save Attendance"}
              </button>
            </div>
          </div>

          {message && (
            <p className={`mb-4 text-sm ${message.includes("success") ? "text-emerald-600" : "text-red-600"}`}>
              {message}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-200 dark:border-slate-700">
                  <th className="pb-3 px-2 text-slate-700 dark:text-slate-300">Student ID</th>
                  <th className="pb-3 px-2 text-slate-700 dark:text-slate-300">Name</th>
                  <th className="pb-3 px-2 text-center text-slate-700 dark:text-slate-300">Present</th>
                  <th className="pb-3 px-2 text-center text-slate-700 dark:text-slate-300">Absent</th>
                  <th className="pb-3 px-2 text-center text-slate-700 dark:text-slate-300">Late</th>
                  <th className="pb-3 px-2 text-center text-slate-700 dark:text-slate-300">Excused</th>
                  <th className="pb-3 px-2 text-slate-700 dark:text-slate-300">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record: any) => (
                  <tr key={record.student_id} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="py-3 px-2 text-sm text-slate-600 dark:text-slate-400">{record.student_number}</td>
                    <td className="py-3 px-2 text-sm font-medium text-slate-900 dark:text-white">{record.student_name}</td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={record.status === 'PRESENT'}
                        onChange={() => handleStatusChange(record.student_id, 'PRESENT')}
                        className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={record.status === 'ABSENT'}
                        onChange={() => handleStatusChange(record.student_id, 'ABSENT')}
                        className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-red-600 focus:ring-red-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={record.status === 'LATE'}
                        onChange={() => handleStatusChange(record.student_id, 'LATE')}
                        className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-amber-600 focus:ring-amber-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={record.status === 'EXCUSED'}
                        onChange={() => handleStatusChange(record.student_id, 'EXCUSED')}
                        className="w-5 h-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-2">
                      <input
                        type="text"
                        value={record.remarks || ''}
                        onChange={(e) => {
                          setAttendance(attendance.map(a =>
                            a.student_id === record.student_id ? { ...a, remarks: e.target.value } : a
                          ));
                        }}
                        placeholder="Add remarks..."
                        className="w-40 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-6 grid grid-cols-4 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{attendance.filter(a => a.status === 'PRESENT').length}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-500">Present</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-red-700 dark:text-red-400">{attendance.filter(a => a.status === 'ABSENT').length}</p>
              <p className="text-xs text-red-600 dark:text-red-500">Absent</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{attendance.filter(a => a.status === 'LATE').length}</p>
              <p className="text-xs text-amber-600 dark:text-amber-500">Late</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{attendance.filter(a => a.status === 'EXCUSED').length}</p>
              <p className="text-xs text-blue-600 dark:text-blue-500">Excused</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
