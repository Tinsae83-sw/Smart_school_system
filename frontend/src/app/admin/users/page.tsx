"use client";

import React, { useEffect, useState, useCallback } from "react";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/admin";
const api = authFetchFor("SUPER_ADMIN");

type Approval = {
  user_id: number;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: string;
  status: "PENDING" | "REJECTED" | "ACTIVE" | "SUSPENDED";
  requested_class_id: number | null;
  requested_class_name: string | null;
  requested_relationship: string | null;
  created_at: string;
};

type UserRow = {
  user_id: number;
  full_name: string;
  email: string;
  role: string;
  status: string;
};

type ClassItem = {
  class_id: number;
  class_name: string;
  academic_year: string;
};

type Student = { user_id: number; full_name: string; student_number: string };
type Parent = { user_id: number; full_name: string; relationship: string };

const ROLE_OPTIONS = [
  { value: "STUDENT", label: "Student" },
  { value: "PARENT", label: "Parent" },
  { value: "TEACHER", label: "Teacher" },
  { value: "DEPARTMENT_HEAD", label: "Department Head" },
  { value: "PRINCIPAL", label: "Principal" },
  { value: "VP_ACADEMIC", label: "VP Academic" },
  { value: "VP_ADMINISTRATION", label: "VP Administration" },
  { value: "ADMIN", label: "Admin" },
  { value: "PTSA_REPRESENTATIVE", label: "PTSA Rep" },
  { value: "SIC_MEMBER", label: "SIC Member" },
];

export default function AdminUsersPage() {
  const [tab, setTab] = useState<"approvals" | "create" | "link">("approvals");

  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);

  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loadingApprovals, setLoadingApprovals] = useState(false);
  const [expandedApproval, setExpandedApproval] = useState<number | null>(null);

  const [createdPassword, setCreatedPassword] = useState<string | null>(null);

  const showNotice = useCallback((type: "success" | "error", text: string) => {
    setNotice({ type, text });
    window.setTimeout(() => setNotice(null), 6000);
  }, []);

  const loadClasses = useCallback(async () => {
    try {
      const res = await api(`${API_BASE}/classes`);
      const data = await res.json();
      setClasses(Array.isArray(data) ? data : (data?.classes ?? []));
    } catch {
      /* ignore */
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const res = await api(`${API_BASE}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadApprovals = useCallback(async () => {
    setLoadingApprovals(true);
    try {
      const res = await api(`${API_BASE}/approvals`);
      if (res.ok) {
        const data = await res.json();
        setApprovals(Array.isArray(data) ? data : []);
      } else {
        const body = await res.json().catch(() => ({}));
        showNotice("error", body?.error || "Could not load registration requests.");
      }
    } catch {
      showNotice("error", "Could not load registration requests.");
    } finally {
      setLoadingApprovals(false);
    }
  }, [showNotice]);

  const loadStudents = useCallback(async () => {
    try {
      const res = await api(`${API_BASE}/students`);
      if (res.ok) {
        const data = await res.json();
        setStudents(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadParents = useCallback(async () => {
    try {
      const res = await api(`${API_BASE}/parents`);
      if (res.ok) {
        const data = await res.json();
        setParents(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadApprovals();
    loadUsers();
    loadClasses();
    loadStudents();
  }, [loadApprovals, loadUsers, loadClasses, loadStudents]);

  function refreshLists() {
    loadApprovals();
    loadUsers();
  }

  function handleApprove(a: Approval) {
    setExpandedApproval(a.user_id);
  }

  async function confirmApprove(a: Approval, classId: number | null, studentParentUserId: number | null) {
    const body: any = {
      class_id: classId ?? undefined,
      student_parent_user_id: studentParentUserId ?? undefined,
    };

    try {
      const res = await api(`${API_BASE}/approvals/${a.user_id}/approve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showNotice("success", data?.message || "Registration approved.");
        refreshLists();
        setExpandedApproval(null);
      } else {
        showNotice("error", data?.error || "Could not approve.");
      }
    } catch (e: any) {
      showNotice("error", e?.message || "Could not approve.");
    }
  }

  async function rejectRegistration(a: Approval, reason: string) {
    try {
      const res = await api(`${API_BASE}/approvals/${a.user_id}/approve`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        showNotice("success", data?.message || "Registration rejected.");
        refreshLists();
        setExpandedApproval(null);
      } else {
        showNotice("error", data?.error || "Could not reject.");
      }
    } catch (e: any) {
      showNotice("error", e?.message || "Could not reject.");
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">User Management</h1>
            <p className="text-sm text-slate-500">Create accounts, approve self-service registrations, and link parents.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setTab("approvals")} className={`rounded-xl px-4 py-2 text-sm font-medium ${tab === "approvals" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
              Approvals ({approvals.filter((a) => a.status === "PENDING").length})
            </button>
            <button onClick={() => { setTab("create"); setCreatedPassword(null); }} className={`rounded-xl px-4 py-2 text-sm font-medium ${tab === "create" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
              Create Account
            </button>
            <button onClick={() => { setTab("link"); setCreatedPassword(null); }} className={`rounded-xl px-4 py-2 text-sm font-medium ${tab === "link" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>
              Link Parent
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {notice && (
          <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${notice.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
            {notice.text}
          </div>
        )}

        {createdPassword && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <strong>Important:</strong> Copy this one-time password now — it will not be shown again. Share it securely with the user.
            <div className="mt-2 rounded-lg bg-white px-3 py-2 font-mono text-base font-semibold">{createdPassword}</div>
          </div>
        )}

        {tab === "approvals" && (
          <ApprovalsTab
            approvals={approvals}
            loading={loadingApprovals}
            classes={classes}
            students={students}
            expandedApproval={expandedApproval}
            onToggle={handleApprove}
            onConfirm={confirmApprove}
            onReject={rejectRegistration}
            onRefresh={refreshLists}
          />
        )}

        {tab === "create" && (
          <CreateAccountTab
            classes={classes}
            createdPassword={createdPassword}
            onCreated={setCreatedPassword}
            onNotice={showNotice}
            onDone={refreshLists}
          />
        )}

        {tab === "link" && (
          <LinkParentTab students={students} parents={parents} onNotice={showNotice} loadStudents={loadStudents} loadParents={loadParents} />
        )}

        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">All Accounts</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.user_id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{u.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="px-4 py-3 text-slate-600">{u.role}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${u.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : u.status === "PENDING" ? "bg-amber-100 text-amber-700" : u.status === "REJECTED" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-slate-400">No accounts found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

function ApprovalsTab({ approvals, loading, classes, students, expandedApproval, onToggle, onConfirm, onReject, onRefresh }: {
  approvals: Approval[];
  loading: boolean;
  classes: ClassItem[];
  students: Student[];
  expandedApproval: number | null;
  onToggle: (a: Approval) => void;
  onConfirm: (a: Approval, classId: number | null, studentParentUserId: number | null) => void;
  onReject: (a: Approval, reason: string) => void;
  onRefresh: () => void;
}) {
  const pending = approvals.filter((a) => a.status === "PENDING");
  const rejected = approvals.filter((a) => a.status === "REJECTED");

  const [classId, setClassId] = useState<Record<number, string>>({});
  const [parentStudent, setParentStudent] = useState<Record<number, string>>({});
  const [reason, setReason] = useState<Record<number, string>>({});

  // Prefill the class dropdown with the class the student requested.
  function prefillClass(a: Approval) {
    setClassId((prev) => {
      if (prev[a.user_id] !== undefined) return prev;
      if (a.requested_class_id) return { ...prev, [a.user_id]: String(a.requested_class_id) };
      return prev;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-slate-900">Self-service Registrations</h2>
        <button onClick={onRefresh} className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
          Refresh
        </button>
      </div>

      {loading && <p className="text-sm text-slate-500">Loading requests…</p>}

      {pending.map((a) => {
        const expanded = expandedApproval === a.user_id;
        return (
          <div key={a.user_id} className="mb-3 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-slate-900">{a.full_name}</p>
                <p className="text-sm text-slate-500">{a.email}{a.phone_number ? ` • ${a.phone_number}` : ""}</p>
                <p className="text-xs text-slate-400 mt-1">
                  Role: <span className="font-medium text-slate-600">{a.role}</span>
                  {a.role === "STUDENT" && a.requested_class_name ? ` • Requested class: ${a.requested_class_name}` : ""}
                  {a.role === "PARENT" && a.requested_relationship ? ` • Relationship: ${a.requested_relationship}` : ""}
                </p>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">PENDING</span>
            </div>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => { onToggle(a); if (!expanded) prefillClass(a); }}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                {expanded ? "Cancel review" : "Review & approve"}
              </button>
              {!expanded && (
                <button onClick={() => onReject(a, "")} className="rounded-xl bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100">
                  Reject
                </button>
              )}
            </div>

            {expanded && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                {a.role === "STUDENT" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Assign class</label>
                    <select
                      value={classId[a.user_id] ?? ""}
                      onChange={(e) => setClassId({ ...classId, [a.user_id]: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Select class…</option>
                      {classes.map((c) => (
                        <option key={c.class_id} value={c.class_id}>{c.class_name} ({c.academic_year})</option>
                      ))}
                    </select>
                    {!a.requested_class_id && classes.length === 0 && (
                      <p className="mt-1 text-xs text-amber-600">No classes exist yet. Create one under Class Management first.</p>
                    )}
                  </div>
                )}

                {a.role === "PARENT" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Link this parent to a student (optional)</label>
                    <select
                      value={parentStudent[a.user_id] ?? ""}
                      onChange={(e) => setParentStudent({ ...parentStudent, [a.user_id]: e.target.value })}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">No student (link later)</option>
                      {students.map((s) => (
                        <option key={s.user_id} value={s.user_id}>{s.full_name} ({s.student_number})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => onConfirm(
                      a,
                      a.role === "STUDENT" && classId[a.user_id] ? Number(classId[a.user_id]) : null,
                      a.role === "PARENT" && parentStudent[a.user_id] ? Number(parentStudent[a.user_id]) : null,
                    )}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    Approve
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {pending.length === 0 && !loading && (
        <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
          No pending registrations.
        </p>
      )}

      {rejected.length > 0 && (
        <div className="mt-6">
          <h3 className="mb-2 text-sm font-semibold text-slate-600">Rejected</h3>
          <div className="space-y-2">
            {rejected.map((a) => (
              <div key={a.user_id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                <span className="text-slate-700">{a.full_name} <span className="text-slate-400">({a.email})</span></span>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">REJECTED</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CreateAccountTab({ classes, createdPassword, onCreated, onNotice, onDone }: {
  classes: ClassItem[];
  createdPassword: string | null;
  onCreated: (pw: string) => void;
  onNotice: (t: "success" | "error", s: string) => void;
  onDone: () => void;
}) {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    role: "STUDENT",
    current_class_id: "",
    relationship: "Guardian",
    department: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const role = form.role;
    const body: any = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone_number: form.phone_number.trim() || null,
      role,
    };
    if (role === "STUDENT" && form.current_class_id) body.current_class_id = Number(form.current_class_id);
    if (role === "PARENT") body.relationship = form.relationship || "Guardian";
    if (role === "TEACHER" || role === "DEPARTMENT_HEAD") body.department = form.department || null;

    try {
      const res = await api(`${API_BASE}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onCreated(data.password);
        onNotice("success", `${data.message || "Account created."}`);
        setForm((f) => ({ ...f, full_name: "", email: "", phone_number: "", current_class_id: "", department: "" }));
        onDone();
      } else {
        onNotice("error", data.error || "Could not create account.");
      }
    } catch (e: any) {
      onNotice("error", e?.message || "Could not create account.");
    }
  }

  return (
    <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-4">Create a New Account</h2>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Salem Abebe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="name@example.com" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="+251…" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              {ROLE_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
        </div>

        {form.role === "STUDENT" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class (optional, link later)</label>
            <select value={form.current_class_id} onChange={(e) => setForm({ ...form, current_class_id: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="">Select class…</option>
              {classes.map((c) => (
                <option key={c.class_id} value={c.class_id}>{c.class_name} ({c.academic_year})</option>
              ))}
            </select>
          </div>
        )}

        {form.role === "PARENT" && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
            <select value={form.relationship} onChange={(e) => setForm({ ...form, relationship: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value="Guardian">Guardian</option>
              <option value="Father">Father</option>
              <option value="Mother">Mother</option>
              <option value="Other">Other</option>
            </select>
          </div>
        )}

        {(form.role === "TEACHER" || form.role === "DEPARTMENT_HEAD") && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
            <input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" placeholder="e.g. Science" />
          </div>
        )}

        <button type="submit" className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
          Create Account
        </button>
      </form>
    </div>
  );
}

function LinkParentTab({ students, parents, onNotice, loadStudents, loadParents }: {
  students: Student[];
  parents: Parent[];
  onNotice: (t: "success" | "error", s: string) => void;
  loadStudents: () => void;
  loadParents: () => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [parentId, setParentId] = useState("");
  const [relationship, setRelationship] = useState("Guardian");

  useEffect(() => {
    loadStudents();
    loadParents();
  }, [loadStudents, loadParents]);

  async function link(e: React.FormEvent) {
    e.preventDefault();
    if (!studentId || !parentId) {
      onNotice("error", "Select both a student and a parent.");
      return;
    }
    try {
      const res = await api(`${API_BASE}/users/link-parent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_user_id: Number(studentId),
          parent_user_id: Number(parentId),
          relationship,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onNotice("success", data?.message || "Parent linked to student.");
        setStudentId("");
        setParentId("");
      } else {
        onNotice("error", data?.error || "Could not link.");
      }
    } catch (e: any) {
      onNotice("error", e?.message || "Could not link.");
    }
  }

  return (
    <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-bold text-slate-900 mb-1">Link a Parent to a Student</h2>
      <p className="text-sm text-slate-500 mb-4">Assign a guardian to a student so they can view their child's progress.</p>
      <form onSubmit={link} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Student</label>
          <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select student…</option>
            {students.map((s) => (
              <option key={s.user_id} value={s.user_id}>{s.full_name} ({s.student_number})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Parent</label>
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="">Select parent…</option>
            {parents.map((p) => (
              <option key={p.user_id} value={p.user_id}>{p.full_name} ({p.relationship})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
          <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm">
            <option value="Guardian">Guardian</option>
            <option value="Father">Father</option>
            <option value="Mother">Mother</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <button type="submit" className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
          Link Parent
        </button>
      </form>
    </div>
  );
}