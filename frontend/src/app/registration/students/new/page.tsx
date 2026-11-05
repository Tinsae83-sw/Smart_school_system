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
  first_name: "",
  middle_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "MALE",
  nationality: "Ethiopian",
  religion: "",
  home_address: "",
  email: "",
  phone_number: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  grade_level: "9",
  department_id: "",
  admission_date: new Date().toISOString().split("T")[0],
  guardian_name: "",
  relationship: "FATHER",
  guardian_phone: "",
  guardian_email: "",
  guardian_password: "",
  username: "",
  password: "",
  send_credentials: true,
  terms_agreed: false,
};

const STEPS = [
  { title: "Personal Information", subtitle: "Student's basic details" },
  { title: "Contact Information", subtitle: "Phone, email & emergency contact" },
  { title: "Academic Information", subtitle: "Grade, department & admission" },
  { title: "Guardian / Parent", subtitle: "Parent account (optional)" },
  { title: "System Settings", subtitle: "Credentials & terms" },
];

export default function RegisterStudentPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ student?: string | null; parent?: string | null } | null>(null);
  const [formData, setFormData] = useState(initialForm);

  function set(key: keyof typeof initialForm, value: any) {
    setFormData((f) => ({ ...f, [key]: value }));
  }

  // ---- per-step validation (client-side, mirrors backend) ----
  function validateStep(s: number): string[] {
    const e: string[] = [];
    if (s === 0) {
      if (!formData.first_name.trim() || formData.first_name.trim().length < 2) e.push("First name must be at least 2 characters");
      if (!formData.last_name.trim() || formData.last_name.trim().length < 2) e.push("Last name must be at least 2 characters");
      if (!formData.date_of_birth) e.push("Date of birth is required");
      else {
        const d = new Date(formData.date_of_birth);
        if (Number.isNaN(d.getTime())) e.push("Date of birth must be a valid date");
        else if (d.getTime() > Date.now()) e.push("Date of birth must not be in the future");
      }
      if (!["MALE", "FEMALE", "OTHER"].includes(formData.gender)) e.push("Gender is required");
    }
    if (s === 1) {
      if (!formData.email.trim()) e.push("Email is required");
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) e.push("Email must be valid");
      if (formData.phone_number && !/^(\+251|09)[0-9]{8,9}$/.test(formData.phone_number.trim())) {
        e.push("Phone must be in format 09XXXXXXXX or +251XXXXXXXXX");
      }
      if (formData.emergency_contact_phone && !/^(\+251|09)[0-9]{8,9}$/.test(formData.emergency_contact_phone.trim())) {
        e.push("Emergency contact phone must be valid");
      }
    }
    if (s === 2) {
      if (!formData.grade_level) e.push("Grade level is required");
      if (!formData.admission_date) e.push("Admission date is required");
      else if (Number.isNaN(new Date(formData.admission_date).getTime())) e.push("Admission date must be valid");
    }
    if (s === 3) {
      if (formData.guardian_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guardian_email)) {
        e.push("Guardian email must be valid");
      }
      if (formData.guardian_phone && !/^(\+251|09)[0-9]{8,9}$/.test(formData.guardian_phone.trim())) {
        e.push("Guardian phone must be valid");
      }
      if (formData.guardian_password && formData.guardian_password.length < 8) {
        e.push("Guardian password must be at least 8 characters");
      }
    }
    if (s === 4) {
      if (formData.password && formData.password.length < 8) e.push("Student password must be at least 8 characters");
      if (!formData.terms_agreed) e.push("You must agree to the terms and conditions");
    }
    return e;
  }

  function next() {
    const e = validateStep(step);
    if (e.length) {
      setErrors(e);
      return;
    }
    setErrors([]);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prev() {
    setErrors([]);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const e2 = validateStep(step);
    if (e2.length) {
      setErrors(e2);
      return;
    }
    setSaving(true);
    setErrors([]);
    setSuccess(null);
    setCredentials(null);

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
      setStep(0);
    } catch (err) {
      console.error(err);
      setErrors(["Unable to reach the server. Check the backend connection."]);
    } finally {
      setSaving(false);
    }
  }

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Register New Student</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
          Step {step + 1} of {STEPS.length} — {STEPS[step].subtitle}
        </p>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition ${
                  i < step
                    ? "bg-teal-600 text-white"
                    : i === step
                    ? "bg-teal-600 text-white ring-4 ring-teal-100 dark:ring-teal-900/40"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`mt-1 text-[10px] font-medium hidden sm:block ${i === step ? "text-teal-600 dark:text-teal-400" : "text-slate-400 dark:text-slate-500"}`}>
                {s.title.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
          <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
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
              Student credentials — Password: <span className="font-mono font-bold">{credentials.student}</span>
            </p>
          )}
          {credentials?.parent && (
            <p>
              Parent credentials — Password: <span className="font-mono font-bold">{credentials.parent}</span>
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

      <form onSubmit={handleSubmit} className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{STEPS[step].title}</h2>

        {/* Step 0: Personal */}
        {step === 0 && (
          <div className="space-y-4">
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
          </div>
        )}

        {/* Step 1: Contact */}
        {step === 1 && (
          <div className="space-y-4">
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
          </div>
        )}

        {/* Step 2: Academic */}
        {step === 2 && (
          <div className="space-y-4">
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
          </div>
        )}

        {/* Step 3: Guardian */}
        {step === 3 && (
          <div className="space-y-4">
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
          </div>
        )}

        {/* Step 4: System settings */}
        {step === 4 && (
          <div className="space-y-4">
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
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-5">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0 || saving}
            className="rounded-xl border border-slate-200 dark:border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 transition"
          >
            ← Previous
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={next}
              disabled={saving}
              className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 transition"
            >
              Next →
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60 transition"
            >
              {saving ? "Registering…" : "Register Student"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
