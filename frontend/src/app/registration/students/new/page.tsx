"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("registration_token") : null;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const inputCls =
  "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500";
const labelCls = "block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5";

export default function RegisterStudentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    password: "",
    student_number: "",
    enrollment_date: new Date().toISOString().split("T")[0],
    current_class_name: "",
    date_of_birth: "",
    gender: "",
  });

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    setSuccess(null);
    setGeneratedPassword(null);

    try {
      const res = await fetch(`${API}/registration/students`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const details: string[] = [];
        if (Array.isArray(data.details)) details.push(...data.details);
        else if (data.error) details.push(data.error);
        else details.push(`Registration failed (HTTP ${res.status})`);
        setErrors(details);
        return;
      }

      setSuccess(`Student ${data.student_number} registered successfully.`);
      setGeneratedPassword(data.password || null);
      setForm({
        full_name: "",
        email: "",
        phone_number: "",
        password: "",
        student_number: nextStudentNumber(form.student_number),
        enrollment_date: new Date().toISOString().split("T")[0],
        current_class_name: form.current_class_name,
        date_of_birth: "",
        gender: "",
      });
    } catch (err) {
      console.error(err);
      setErrors(["Unable to reach the server. Check the backend connection."]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Register New Student</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Creates the student account and enrols them into a class. All fields marked * are required.
        </p>
      </div>

      {errors.length > 0 && (
        <div className="mb-6 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-4 py-3">
          <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">Please fix the following:</p>
          <ul className="mt-1 list-disc pl-5 text-sm text-rose-700 dark:text-rose-300">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
          <p className="font-semibold">{success}</p>
          {generatedPassword && (
            <p className="mt-1">
              Temporary password: <span className="font-mono font-bold">{generatedPassword}</span> — give this to the
              student for first login.
            </p>
          )}
          <button
            className="mt-2 underline"
            onClick={() => router.push("/registration/students")}
          >
            Go to student register →
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelCls}>Full Name *</label>
            <input
              className={inputCls}
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              placeholder="e.g. Abebe Kebede"
              required
            />
          </div>

          <div>
            <label className={labelCls}>Email *</label>
            <input
              type="email"
              className={inputCls}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="student@school.edu"
              required
            />
          </div>

          <div>
            <label className={labelCls}>Phone</label>
            <input
              className={inputCls}
              value={form.phone_number}
              onChange={(e) => set("phone_number", e.target.value)}
              placeholder="+2519XXXXXXXX"
            />
          </div>

          <div>
            <label className={labelCls}>Student Number *</label>
            <input
              className={`${inputCls} font-mono`}
              value={form.student_number}
              onChange={(e) => set("student_number", e.target.value)}
              placeholder="STU-2026-0001"
              required
            />
            <p className="mt-1 text-xs text-slate-400">Format: STU-YYYY-XXXX</p>
          </div>

          <div>
            <label className={labelCls}>Class *</label>
            <input
              className={inputCls}
              value={form.current_class_name}
              onChange={(e) => set("current_class_name", e.target.value)}
              placeholder="e.g. Grade 9 A"
              required
            />
          </div>

          <div>
            <label className={labelCls}>Enrolment Date *</label>
            <input
              type="date"
              className={inputCls}
              value={form.enrollment_date}
              onChange={(e) => set("enrollment_date", e.target.value)}
              required
            />
          </div>

          <div>
            <label className={labelCls}>Date of Birth</label>
            <input
              type="date"
              className={inputCls}
              value={form.date_of_birth}
              onChange={(e) => set("date_of_birth", e.target.value)}
            />
          </div>

          <div>
            <label className={labelCls}>Gender</label>
            <select className={inputCls} value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option value="">Select…</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>Initial Password *</label>
            <input
              type="text"
              className={`${inputCls} font-mono`}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="min 8 characters"
              required
            />
            <p className="mt-1 text-xs text-slate-400">Give this to the student; they should change it after first login.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 dark:border-slate-700 pt-5">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 transition"
          >
            {saving ? "Registering…" : "Register Student"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/registration/students")}
            className="rounded-xl border border-slate-200 dark:border-slate-600 px-5 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

/** STU-2026-0001 -> STU-2026-0002 (helps bulk registration) */
function nextStudentNumber(current: string): string {
  const m = /^(STU-\d{4}-)(\d{4})$/.exec(current);
  if (!m) return current;
  const n = String(parseInt(m[2], 10) + 1).padStart(4, "0");
  return `${m[1]}${n}`;
}
