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
  "w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20";
const labelCls = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

const initialForm = {
  // Personal
  first_name: "",
  middle_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "MALE",
  nationality: "Ethiopian",
  religion: "",
  home_address: "",
  // Contact
  email: "",
  phone_number: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  // Academic
  grade_level: "9",
  department_id: "",
  admission_date: new Date().toISOString().split("T")[0],
  // Guardian / Parent
  guardian_name: "",
  relationship: "FATHER",
  guardian_phone: "",
  guardian_email: "",
  guardian_password: "",
  // System
  username: "",
  password: "",
  send_credentials: true,
  terms_agreed: false,
};

export default function RegisterStudentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ student?: string; parent?: string | null } | null>(null);
  const [formData, setFormData] = useState(initialForm);

  function set(key: keyof typeof initialForm, value: any) {
    setFormData((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    setSuccess(null);
    setCredentials(null);

    if (!formData.terms_agreed) {
      setErrors(["You must agree to the terms and conditions."]);
      setSaving(false);
      return;
    }

    const payload = {
      ...formData,
      full_name: [formData.first_name, formData.middle_name, formData.last_name].filter(Boolean).join(" ").trim(),
      department_id: formData.department_id ? parseInt(formData.department_id, 10) : null,
    };

    try {
      const res = await fetch(`${API}/registration/students`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
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
      setCredentials({
        student: data.password || null,
        parent: data.parent_created ? data.parent_password : null,
      });
      setFormData(initialForm);
    } catch (err) {
      console.error(err);
      setErrors(["Unable to reach the server. Check the backend connection."]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Register New Student</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Creates the student account (and an optional parent/guardian account) and enrols them into a class.
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
        <div className="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300 space-y-1">
          <p className="font-semibold">{success}</p>
          {credentials?.student && (
            <p>
              Student credentials — Email: <span className="font-mono">{formData.email || "—"}</span>, Password:{" "}
              <span className="font-mono font-bold">{credentials.student}</span>
            </p>
          )}
          {credentials?.parent && (
            <p>
              Parent credentials — Email: <span className="font-mono">{formData.guardian_email}</span>, Password:{" "}
              <span className="font-mono font-bold">{credentials.parent}</span>
            </p>
          )}
          <p className="text-xs opacity-80">
            Credentials have been logged to the backend console (mock email). Give them to the student/parent for first
            login.
          </p>
          <button className="mt-2 underline" onClick={() => router.push("/registration/students")}>
            Go to student register →
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Personal Information */}
        <section className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
            Personal Information
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>First Name *</label>
              <input required minLength={2} className={inputCls} value={formData.first_name} onChange={(e) => set("first_name", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Middle Name</label>
              <input className={inputCls} value={formData.middle_name} onChange={(e) => set("middle_name", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Last Name *</label>
              <input required minLength={2} className={inputCls} value={formData.last_name} onChange={(e) => set("last_name", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelCls}>Date of Birth *</label>
              <input required type="date" className={inputCls} value={formData.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Gender *</label>
              <select required className={inputCls} value={formData.gender} onChange={(e) => set("gender", e.target.value)}>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Nationality</label>
              <input className={inputCls} value={formData.nationality} onChange={(e) => set("nationality", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Religion</label>
              <select className={inputCls} value={formData.religion} onChange={(e) => set("religion", e.target.value)}>
                <option value="">Select Religion</option>
                <option value="Orthodox">Orthodox</option>
                <option value="Muslim">Muslim</option>
                <option value="Protestant">Protestant</option>
                <option value="Catholic">Catholic</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Home Address</label>
              <textarea rows={2} maxLength={200} className={inputCls} value={formData.home_address} onChange={(e) => set("home_address", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Section 2: Contact Information */}
        <section className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
            Contact Information
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Email Address *</label>
              <input required type="email" className={inputCls} value={formData.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input className={inputCls} placeholder="+2519XXXXXXXX" value={formData.phone_number} onChange={(e) => set("phone_number", e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Emergency Contact Name</label>
              <input className={inputCls} value={formData.emergency_contact_name} onChange={(e) => set("emergency_contact_name", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Emergency Contact Phone</label>
              <input className={inputCls} placeholder="09XXXXXXXX" value={formData.emergency_contact_phone} onChange={(e) => set("emergency_contact_phone", e.target.value)} />
            </div>
          </div>
        </section>

        {/* Section 3: Academic Information */}
        <section className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
            Academic Information
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Grade Level *</label>
              <select required className={inputCls} value={formData.grade_level} onChange={(e) => set("grade_level", e.target.value)}>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
                <option value="11">Grade 11</option>
                <option value="12">Grade 12</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Department ID</label>
              <input type="number" className={inputCls} value={formData.department_id} onChange={(e) => set("department_id", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Admission Date *</label>
            <input required type="date" className={inputCls} value={formData.admission_date} onChange={(e) => set("admission_date", e.target.value)} />
          </div>
        </section>

        {/* Section 4: Guardian / Parent Information */}
        <section className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
            Guardian / Parent Information
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            If a guardian email is provided, a parent account will be created and linked to this student, and credentials will be
            sent to that email.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Parent / Guardian Name</label>
              <input className={inputCls} value={formData.guardian_name} onChange={(e) => set("guardian_name", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Relationship</label>
              <select className={inputCls} value={formData.relationship} onChange={(e) => set("relationship", e.target.value)}>
                <option value="FATHER">Father</option>
                <option value="MOTHER">Mother</option>
                <option value="GUARDIAN">Guardian</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Parent Phone</label>
              <input className={inputCls} placeholder="09XXXXXXXX" value={formData.guardian_phone} onChange={(e) => set("guardian_phone", e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Parent Email</label>
              <input type="email" className={inputCls} value={formData.guardian_email} onChange={(e) => set("guardian_email", e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Parent Password</label>
            <input type="password" className={inputCls} value={formData.guardian_password} onChange={(e) => set("guardian_password", e.target.value)} placeholder="Leave blank for auto-generated" />
            <p className="text-xs text-slate-500 mt-1">Default password will be used if left blank</p>
          </div>
        </section>

        {/* Section 5: System Settings */}
        <section className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 pb-2">
            System Settings
          </h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Username</label>
              <input className={inputCls} value={formData.username} onChange={(e) => set("username", e.target.value)} placeholder="Auto-generated if blank" />
            </div>
            <div>
              <label className={labelCls}>Student Password</label>
              <input type="password" className={inputCls} value={formData.password} onChange={(e) => set("password", e.target.value)} placeholder="Leave blank for auto-generated" />
              <p className="text-xs text-slate-500 mt-1">Default password will be used if left blank</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={formData.send_credentials} onChange={(e) => set("send_credentials", e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">Send credentials via email (mocked: logged to backend console)</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" required checked={formData.terms_agreed} onChange={(e) => set("terms_agreed", e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300">I agree to the terms and conditions *</span>
            </label>
          </div>
        </section>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => router.push("/registration/students")} className="rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 transition">
            {saving ? "Registering…" : "Register Student"}
          </button>
        </div>
      </form>
    </div>
  );
}
