"use client";

import React, { useEffect, useState, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/admin";

const GRADE_LEVELS = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12"
];

type AssignedSubject = {
  class_subject_id: number;
  subject_id: number;
  subject_name: string;
  subject_code: string;
  teacher_id: number;
  teacher_name: string;
};

type ClassItem = {
  class_id: number;
  class_name: string;
  academic_year: string;
  homeroom_teacher_id: number;
  homeroom_teacher_name?: string;
  assigned_subjects?: AssignedSubject[];
  student_count?: number;
};

type TeacherItem = {
  teacher_id: number;
  user_id: number;
  employee_id: string;
  department?: string;
  full_name?: string;
  grade_levels?: number[];
};

type SubjectItem = {
  subject_id: number;
  subject_name: string;
  subject_code: string;
};

type RosterStudent = {
  student_id: number;
  user_id: number;
  full_name: string;
  email: string;
  student_number: string;
};

type AssignForm = {
  subject_id: string;
  teacher_id: string;
};

type ClassForm = {
  grade_level: string;
  section: string;
  class_name: string;
  academic_year: string;
  homeroom_teacher_id: string;
};

function parseGradeValue(value: any) {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    const digitsMatch = normalized.match(/(\d{1,2})/);
    if (digitsMatch) {
      return Number(digitsMatch[1]);
    }
  }
  return null;
}

function normalizeGradeLevels(rawLevels: any): number[] {
  if (!Array.isArray(rawLevels)) return [];
  const parsed = rawLevels
    .map((item) => parseGradeValue(item))
    .filter((n): n is number => n !== null && Number.isInteger(n) && n >= 1 && n <= 12);
  return Array.from(new Set(parsed));
}

function extractGradeNumber(className: string) {
  if (!className) return null;
  const normalized = className.trim();

  const patterns = [
    /Grade\s*[:\-]?\s*(\d{1,2})/i,
    /G(?:rade)?\.?\s*[:\-]?\s*(\d{1,2})/i,
    /(?:^|\s)(\d{1,2})(?=\s|$|[A-Za-z])/i
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      const parsed = Number(match[1]);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function AssignSubjectForm({ subjects, teachers, classId, className, onAssigned, onCancel, showToast }: { subjects: SubjectItem[]; teachers: TeacherItem[]; classId: number; className: string; onAssigned: () => void; onCancel: () => void; showToast: (message: string) => void; }) {
  const [assignForm, setAssignForm] = useState<AssignForm>({ subject_id: "", teacher_id: "" });
  const classLevelNumber = React.useMemo(() => extractGradeNumber(className), [className]);

  const eligibleTeachers = classLevelNumber
    ? teachers.filter((teacher) => teacher.grade_levels?.includes(classLevelNumber))
    : teachers;

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE}/class-subject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: classId, subject_id: parseInt(assignForm.subject_id), teacher_id: parseInt(assignForm.teacher_id) })
      });

      if (!response.ok) throw new Error();
      showToast("Subject assigned to class.");
      onAssigned();
    } catch {
      showToast("Failed to assign subject.");
    }
  }

  return (
    <form onSubmit={handleAssign} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
        <select required value={assignForm.subject_id} onChange={(e) => setAssignForm({ ...assignForm, subject_id: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Select subject</option>
          {subjects.map((subject) => (
            <option key={subject.subject_id} value={subject.subject_id}>{subject.subject_name} ({subject.subject_code})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Teacher *</label>
        <select required value={assignForm.teacher_id} onChange={(e) => setAssignForm({ ...assignForm, teacher_id: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Select teacher</option>
          {eligibleTeachers.map((teacher) => (
            <option key={teacher.teacher_id} value={teacher.teacher_id}>{teacher.full_name} ({teacher.employee_id || `ID ${teacher.user_id}`})</option>
          ))}
        </select>
        {classLevelNumber && eligibleTeachers.length === 0 && (
          <p className="mt-2 text-xs text-rose-500">No teachers are eligible for this class level. Update teacher grade levels or create a teacher for this grade.</p>
        )}
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">Assign</button>
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
      </div>
    </form>
  );
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAutoGen, setShowAutoGen] = useState(false);
  const [showRoster, setShowRoster] = useState<number | null>(null);
  const [showAssign, setShowAssign] = useState(false);
  const [editClass, setEditClass] = useState<ClassItem | null>(null);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState<ClassForm>({ grade_level: "", section: "", class_name: "", academic_year: "", homeroom_teacher_id: "" });

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleAutoGenerate(e: React.FormEvent, payload: { grade: string; academic_year: string; max_per_class: number; student_numbers_text: string; }) {
    e.preventDefault();
    try {
      const gradeMatch = payload.grade.match(/(\d+)/);
      const gradeNum = gradeMatch ? Number(gradeMatch[1]) : null;
      if (!gradeNum) throw new Error('Invalid grade');

      const studentNumbers = payload.student_numbers_text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      const res = await fetch(`${API_BASE}/classes/auto-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grade: gradeNum, academic_year: payload.academic_year, max_per_class: payload.max_per_class, student_numbers: studentNumbers })
      });
      if (!res.ok) throw new Error();
      showToastMsg('Classes auto-generated successfully.');
      setShowAutoGen(false);
      fetchClasses();
    } catch (err) {
      showToastMsg('Failed to auto-generate classes.');
    }
  }

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/classes`);
      if (res.ok) setClasses(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const fetchTeachers = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/users?role=TEACHER&status=active`);
      if (res.ok) {
        const data = await res.json();
        setTeachers(data.filter((u: any) => u.teacher_id).map((u: any) => ({
          teacher_id: u.teacher_id,
          user_id: u.user_id,
          employee_id: u.teacher_employee_id || "",
          department: u.teacher_department,
          full_name: u.full_name,
          grade_levels: normalizeGradeLevels(u.teacher_grade_levels)
        })));
      }
    } catch { /* ignore */ }
  }, []);

  const fetchSubjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/subjects`);
      if (res.ok) setSubjects(await res.json());
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchClasses(); fetchTeachers(); fetchSubjects(); }, [fetchClasses, fetchTeachers, fetchSubjects]);

  const eligibleHomeroomTeachers = React.useMemo(() => {
    const match = form.grade_level.match(/(\d+)/);
    const gradeNum = match ? Number(match[1]) : null;
    if (!gradeNum) return teachers;
    const filtered = teachers.filter(t => t.grade_levels && t.grade_levels.includes(gradeNum));
    return filtered.length > 0 ? filtered : teachers;
  }, [form.grade_level, teachers]);

  async function fetchRoster(classId: number) {
    try {
      const res = await fetch(`${API_BASE}/classes/${classId}/roster`);
      if (res.ok) setRoster(await res.json());
      setShowRoster(classId);
    } catch { /* ignore */ }
  }

  function parseClassName(className: string) {
    const match = className.match(/^(Grade \d+)(?:\s*(.*))?$/i);
    if (match) {
      return { grade_level: match[1], section: match[2] || "", class_name: "" };
    }
    return { grade_level: "", section: "", class_name: className };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const computedClassName = form.class_name.trim() || (form.grade_level ? `${form.grade_level}${form.section ? ' ' + form.section.trim() : ''}` : "");
      if (!computedClassName) throw new Error();

      const url = editClass ? `${API_BASE}/classes/${editClass.class_id}` : `${API_BASE}/classes`;
      const method = editClass ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_name: computedClassName, grade_level: form.grade_level, section: form.section, academic_year: form.academic_year, homeroom_teacher_id: parseInt(form.homeroom_teacher_id) })
      });

      if (!res.ok) throw new Error();
      setShowModal(false);
      setEditClass(null);
      setForm({ grade_level: "", section: "", class_name: "", academic_year: "", homeroom_teacher_id: "" });
      showToastMsg(editClass ? "Class updated." : "Class created.");
      fetchClasses();
    } catch {
      showToastMsg("Failed to save class.");
    }
  }

  async function handleDelete(classId: number) {
    if (!confirm("Delete this class? This cannot be undone.")) return;
    try {
      const res = await fetch(`${API_BASE}/classes/${classId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      showToastMsg("Class deleted.");
      fetchClasses();
    } catch {
      showToastMsg("Failed to delete class.");
    }
  }

  function openEdit(cls: ClassItem) {
    const parsed = parseClassName(cls.class_name);
    setEditClass(cls);
    setForm({
      grade_level: parsed.grade_level,
      section: parsed.section,
      class_name: parsed.class_name,
      academic_year: cls.academic_year,
      homeroom_teacher_id: cls.homeroom_teacher_id.toString()
    });
    setShowModal(true);
  }

  return (
    <div>
      {toast && (
        <div className="fixed top-4 right-4 z-50 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white shadow-lg">{toast}</div>
      )}

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Class Management</h1>
          <p className="mt-1 text-sm text-slate-500">Select grades, create classes, and assign subjects with teachers.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setEditClass(null); setForm({ grade_level: "", section: "", class_name: "", academic_year: "", homeroom_teacher_id: "" }); setShowModal(true); }} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">
            Create Class
          </button>
          <button onClick={() => setShowAutoGen(true)} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Auto-generate Classes</button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full rounded-2xl bg-white p-8 text-center text-sm text-slate-400 border border-slate-200">Loading...</div>
        ) : classes.length === 0 ? (
          <div className="col-span-full rounded-2xl bg-white p-8 text-center text-sm text-slate-400 border border-slate-200">No classes created yet.</div>
        ) : (
          classes.map((cls) => (
            <div key={cls.class_id} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200 hover:border-indigo-300 transition">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900">{cls.class_name}</h3>
                  <p className="mt-1 text-sm text-slate-500">Academic Year: {cls.academic_year}</p>
                  <p className="mt-1 text-sm text-slate-500">Enrolled: {cls.student_count ?? 0} students</p>
                  <p className="mt-1 text-sm text-slate-600">Homeroom: {cls.homeroom_teacher_name || "Unassigned"}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">ID: {cls.class_id}</span>
              </div>
              <div className="mt-4 space-y-2">
                {cls.assigned_subjects && cls.assigned_subjects.length > 0 ? (
                  cls.assigned_subjects.map((assignment) => (
                    <div key={assignment.class_subject_id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <p className="font-medium text-slate-900">{assignment.subject_name} ({assignment.subject_code})</p>
                      <p className="text-xs text-slate-500">Teacher: {assignment.teacher_name}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No subjects assigned yet.</p>
                )}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={() => fetchRoster(cls.class_id)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition">Roster</button>
                <button onClick={() => openEdit(cls)} className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-100 transition">Edit</button>
                <button onClick={() => { setSelectedClass(cls); setShowAssign(true); }} className="rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition">Assign Subject</button>
                <button onClick={() => handleDelete(cls.class_id)} className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-100 transition">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {showRoster !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Class Roster</h3>
              <button onClick={() => setShowRoster(null)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {roster.length === 0 ? (
              <p className="text-sm text-slate-500">No students enrolled in this class.</p>
            ) : (
              <table className="min-w-full">
                <thead><tr className="text-left text-xs uppercase tracking-wider text-slate-500"><th className="pb-3">Name</th><th className="pb-3">Student #</th><th className="pb-3">Email</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {roster.map((s) => (
                    <tr key={s.student_id}>
                      <td className="py-2 text-sm font-medium text-slate-900">{s.full_name}</td>
                      <td className="py-2 text-sm text-slate-500">{s.student_number}</td>
                      <td className="py-2 text-sm text-slate-500">{s.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {showAssign && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Assign Subject</h3>
                <p className="text-sm text-slate-500">Class: {selectedClass.class_name}</p>
              </div>
              <button onClick={() => setShowAssign(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <AssignSubjectForm subjects={subjects} teachers={teachers} classId={selectedClass.class_id} className={selectedClass.class_name} onAssigned={() => { setShowAssign(false); setSelectedClass(null); fetchClasses(); }} onCancel={() => setShowAssign(false)} showToast={showToastMsg} />
          </div>
        </div>
      )}

      {showAutoGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">Auto-generate Classes</h3>
            <form onSubmit={(e) => { e.preventDefault(); }} className="mt-4 space-y-4" id="autoGenForm">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Grade *</label>
                <select required defaultValue="" id="auto_grade" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Choose grade</option>
                  {GRADE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year *</label>
                <input id="auto_academic_year" type="text" defaultValue="2025/2026" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Students Per Class *</label>
                <input id="auto_max" type="number" defaultValue={30} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Student Numbers (one per line)</label>
                <textarea id="auto_students" rows={6} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="STU-2026-0001\nSTU-2026-0002"></textarea>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={async () => {
                  const grade = (document.getElementById('auto_grade') as HTMLSelectElement).value;
                  const academic_year = (document.getElementById('auto_academic_year') as HTMLInputElement).value;
                  const max_per_class = Number((document.getElementById('auto_max') as HTMLInputElement).value || 30);
                  const student_numbers_text = (document.getElementById('auto_students') as HTMLTextAreaElement).value || '';
                  await handleAutoGenerate(new Event('submit') as any, { grade, academic_year, max_per_class, student_numbers_text });
                }} className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">Generate</button>
                <button type="button" onClick={() => setShowAutoGen(false)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900">{editClass ? "Edit Class" : "Create Class"}</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Grade Level *</label>
                <select required value={form.grade_level} onChange={(e) => setForm({ ...form, grade_level: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Choose grade</option>
                  {GRADE_LEVELS.map((grade) => (
                    <option key={grade} value={grade}>{grade}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Section</label>
                <input type="text" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} placeholder="e.g. A, B, 1" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Custom Class Name (optional)</label>
                <input type="text" value={form.class_name} onChange={(e) => setForm({ ...form, class_name: e.target.value })} placeholder="Leave empty to use grade + section" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year *</label>
                <input type="text" required value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} placeholder="e.g. 2025/2026" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Homeroom Teacher ID *</label>
                <select required value={form.homeroom_teacher_id} onChange={(e) => setForm({ ...form, homeroom_teacher_id: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">Select homeroom teacher</option>
                  {eligibleHomeroomTeachers.map((teacher) => (
                    <option key={teacher.teacher_id} value={teacher.teacher_id}>{teacher.full_name} ({teacher.employee_id || `ID ${teacher.user_id}`})</option>
                  ))}
                </select>
                {eligibleHomeroomTeachers.length === 0 && (
                  <p className="mt-2 text-xs text-rose-500">No homeroom teachers available for this grade. Assign teacher grade levels first.</p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition">{editClass ? "Save" : "Create"}</button>
                <button type="button" onClick={() => { setShowModal(false); setEditClass(null); }} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
