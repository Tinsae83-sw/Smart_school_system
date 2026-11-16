"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import React, { FormEvent, Suspense, useEffect, useState } from "react";
import { CheckCircle2, GraduationCap, KeyRound, ShieldCheck, UserRound, Users } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { adminTranslations } from "@/translations/admin";
import { AdminUser, cardClass, inputClass, labelClass, readError } from "../shared";

type RegistrableRole = "STUDENT" | "TEACHER" | "PARENT" | "ADMIN";

type SchoolClass = { class_id: number; class_name: string; academic_year: string };

type RegistrationResult = {
  full_name: string;
  email: string;
  password: string;
  role: RegistrableRole;
  linkMessage?: { ok: boolean; text: string };
};

const GRADE_LEVELS = [9, 10, 11, 12];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function generatePassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

function suggestStudentNumber(): string {
  const serial = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `STU-${new Date().getFullYear()}-${serial}`;
}

function initialForm() {
  return {
    full_name: "",
    email: "",
    phone_number: "",
    password: generatePassword(),
    student_number: suggestStudentNumber(),
    enrollment_date: today(),
    current_class_name: "",
    date_of_birth: "",
    gender: "",
    employee_id: "",
    department: "",
    degree_level: "",
    age: "",
    experience_years: "",
    hire_date: today(),
    grade_levels: [] as number[],
    relationship: "",
    address: "",
    preferred_language: "English",
    link_student_user_id: "",
  };
}

function RegisterForm() {
  const { language } = useLanguage();
  const t = adminTranslations[language];
  const searchParams = useSearchParams();
  const requestedRole = searchParams.get("role") as RegistrableRole | null;

  const [role, setRole] = useState<RegistrableRole>(
    requestedRole && ["STUDENT", "TEACHER", "PARENT", "ADMIN"].includes(requestedRole) ? requestedRole : "STUDENT"
  );
  const [form, setForm] = useState(initialForm);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<AdminUser[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RegistrationResult | null>(null);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [classesRes, studentsRes, teachersRes] = await Promise.all([
          adminApi.get("/classes?limit=200"),
          adminApi.get("/users?role=STUDENT"),
          adminApi.get("/users?role=TEACHER"),
        ]);
        if (classesRes.ok) {
          const data = await classesRes.json();
          setClasses(data.classes || data);
        }
        if (studentsRes.ok) {
          setStudents(await studentsRes.json());
        }
        if (teachersRes.ok) {
          const teachers: AdminUser[] = await teachersRes.json();
          const names = teachers.map((teacher) => teacher.teacher_department).filter((d): d is string => !!d);
          setDepartments(Array.from(new Set(names)).sort());
        }
      } catch (err) {
        console.error("Failed to load registration options:", err);
      }
    }
    loadOptions();
  }, []);

  function update<K extends keyof ReturnType<typeof initialForm>>(key: K, value: ReturnType<typeof initialForm>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleGrade(grade: number) {
    setForm((prev) => ({
      ...prev,
      grade_levels: prev.grade_levels.includes(grade)
        ? prev.grade_levels.filter((g) => g !== grade)
        : [...prev.grade_levels, grade].sort((a, b) => a - b),
    }));
  }

  function buildPayload() {
    const base = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      phone_number: form.phone_number.trim() || undefined,
      password: form.password,
      role,
    };
    if (role === "STUDENT") {
      return {
        ...base,
        student_number: form.student_number.trim(),
        enrollment_date: form.enrollment_date,
        current_class_name: form.current_class_name,
        date_of_birth: form.date_of_birth || undefined,
        gender: form.gender || undefined,
      };
    }
    if (role === "TEACHER") {
      return {
        ...base,
        employee_id: form.employee_id.trim(),
        department: form.department.trim(),
        gender: form.gender,
        degree_level: form.degree_level,
        age: Number(form.age),
        experience_years: Number(form.experience_years),
        hire_date: form.hire_date,
        grade_levels: form.grade_levels,
      };
    }
    if (role === "PARENT") {
      return {
        ...base,
        relationship: form.relationship,
        address: form.address.trim() || undefined,
        preferred_language: form.preferred_language,
      };
    }
    return base;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (role === "TEACHER" && form.grade_levels.length === 0) {
      setError(t.selectAtLeastOneGrade);
      return;
    }

    setSubmitting(true);
    try {
      const res = await adminApi.post("/users", buildPayload());
      if (!res.ok) {
        setError(await readError(res, t.requestFailed));
        return;
      }
      const data = await res.json();
      const registration: RegistrationResult = {
        full_name: form.full_name.trim(),
        email: data.email,
        password: data.password,
        role,
      };

      if (role === "PARENT" && form.link_student_user_id) {
        const linkRes = await adminApi.post("/users/link-parent", {
          student_user_id: Number(form.link_student_user_id),
          parent_user_id: data.user_id,
          relationship: form.relationship,
        });
        registration.linkMessage = linkRes.ok
          ? { ok: true, text: t.parentLinked }
          : { ok: false, text: `${t.parentLinkFailed} ${await readError(linkRes, t.requestFailed)}` };
      }

      setResult(registration);
    } catch {
      setError(t.requestFailed);
    } finally {
      setSubmitting(false);
    }
  }

  function startOver() {
    setForm(initialForm());
    setResult(null);
    setError("");
  }

  const roleTabs: { value: RegistrableRole; label: string; icon: React.ElementType }[] = [
    { value: "STUDENT", label: t.student, icon: GraduationCap },
    { value: "TEACHER", label: t.teacher, icon: Users },
    { value: "PARENT", label: t.parent, icon: UserRound },
    { value: "ADMIN", label: t.admin, icon: ShieldCheck },
  ];

  const required = <span className="text-rose-500"> *</span>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.registerTitle}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.registerSubtitle}</p>
      </div>

      {result ? (
        <div className={`${cardClass} p-8 max-w-2xl`}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">{t.registrationSuccess}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{result.full_name} · {roleTabs.find((r) => r.value === result.role)?.label}</p>
            </div>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{t.credentialsNote}</p>
          <dl className="rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 divide-y divide-slate-200 dark:divide-slate-700">
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-sm text-slate-500 dark:text-slate-400">{t.email}</dt>
              <dd className="text-sm font-mono font-medium text-slate-900 dark:text-white">{result.email}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-sm text-slate-500 dark:text-slate-400">{t.password}</dt>
              <dd className="text-sm font-mono font-medium text-slate-900 dark:text-white">{result.password}</dd>
            </div>
          </dl>
          {result.linkMessage && (
            <p className={`mt-4 text-sm ${result.linkMessage.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
              {result.linkMessage.text}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={startOver} className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition">
              {t.registerAnother}
            </button>
            <Link href="/admin/users" className="rounded-xl border border-slate-300 dark:border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              {t.viewUsers}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
            <nav className="flex gap-8 overflow-x-auto">
              {roleTabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = role === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => { setRole(tab.value); setError(""); }}
                    className={`flex items-center gap-2 pb-4 px-1 text-sm font-semibold transition-colors whitespace-nowrap ${
                      isActive
                        ? "text-teal-600 dark:text-teal-400 border-b-2 border-teal-600 dark:border-teal-400"
                        : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
            <section className={`${cardClass} p-6`}>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t.accountDetails}</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>{t.fullName}{required}</label>
                  <input required minLength={3} value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t.email}{required}</label>
                  <input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t.phoneNumber}</label>
                  <input value={form.phone_number} onChange={(e) => update("phone_number", e.target.value)} pattern="\+251[0-9]{9}" placeholder="+251911000000" className={inputClass} />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.phoneHint}</p>
                </div>
                <div>
                  <label className={labelClass}>{t.password}{required}</label>
                  <div className="flex gap-2">
                    <input required minLength={8} value={form.password} onChange={(e) => update("password", e.target.value)} className={`${inputClass} font-mono`} />
                    <button type="button" onClick={() => update("password", generatePassword())} className="mt-1 inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-600 px-3 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                      <KeyRound className="h-4 w-4" />
                      {t.generate}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.passwordHint}</p>
                </div>
              </div>
            </section>

            {role === "STUDENT" && (
              <section className={`${cardClass} p-6`}>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t.studentDetails}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>{t.studentNumber}{required}</label>
                    <input required pattern="STU-\d{4}-\d{4}" value={form.student_number} onChange={(e) => update("student_number", e.target.value)} className={`${inputClass} font-mono`} />
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t.studentNumberHint}</p>
                  </div>
                  <div>
                    <label className={labelClass}>{t.currentClass}{required}</label>
                    <select required value={form.current_class_name} onChange={(e) => update("current_class_name", e.target.value)} className={inputClass}>
                      <option value="">{t.selectClass}</option>
                      {classes.map((c) => (
                        <option key={c.class_id} value={c.class_name}>{c.class_name} ({c.academic_year})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t.enrollmentDate}{required}</label>
                    <input required type="date" value={form.enrollment_date} onChange={(e) => update("enrollment_date", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t.dateOfBirth}</label>
                    <input type="date" value={form.date_of_birth} onChange={(e) => update("date_of_birth", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t.gender}</label>
                    <select value={form.gender} onChange={(e) => update("gender", e.target.value)} className={inputClass}>
                      <option value="">{t.selectGender}</option>
                      <option value="MALE">{t.male}</option>
                      <option value="FEMALE">{t.female}</option>
                    </select>
                  </div>
                </div>
              </section>
            )}

            {role === "TEACHER" && (
              <section className={`${cardClass} p-6`}>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t.teacherDetails}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>{t.employeeId}{required}</label>
                    <input required minLength={3} value={form.employee_id} onChange={(e) => update("employee_id", e.target.value)} placeholder="EMP-0001" className={`${inputClass} font-mono`} />
                  </div>
                  <div>
                    <label className={labelClass}>{t.department}{required}</label>
                    <input required list="admin-departments" value={form.department} onChange={(e) => update("department", e.target.value)} className={inputClass} />
                    <datalist id="admin-departments">
                      {departments.map((d) => <option key={d} value={d} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className={labelClass}>{t.gender}{required}</label>
                    <select required value={form.gender} onChange={(e) => update("gender", e.target.value)} className={inputClass}>
                      <option value="">{t.selectGender}</option>
                      <option value="MALE">{t.male}</option>
                      <option value="FEMALE">{t.female}</option>
                      <option value="OTHER">{t.other}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t.degreeLevel}{required}</label>
                    <select required value={form.degree_level} onChange={(e) => update("degree_level", e.target.value)} className={inputClass}>
                      <option value="">{t.selectDegree}</option>
                      <option value="DIPLOMA">Diploma</option>
                      <option value="BACHELOR">Bachelor</option>
                      <option value="MASTER">Master</option>
                      <option value="PHD">PhD</option>
                      <option value="OTHER">{t.other}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t.age}{required}</label>
                    <input required type="number" min={18} max={80} value={form.age} onChange={(e) => update("age", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t.experienceYears}{required}</label>
                    <input required type="number" min={0} max={50} value={form.experience_years} onChange={(e) => update("experience_years", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>{t.hireDate}{required}</label>
                    <input required type="date" value={form.hire_date} onChange={(e) => update("hire_date", e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <span className={labelClass}>{t.gradeLevels}{required}</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {GRADE_LEVELS.map((grade) => {
                        const selected = form.grade_levels.includes(grade);
                        return (
                          <button
                            key={grade}
                            type="button"
                            onClick={() => toggleGrade(grade)}
                            aria-pressed={selected}
                            className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                              selected
                                ? "border-teal-600 bg-teal-50 text-teal-700 dark:border-teal-400 dark:bg-teal-900/30 dark:text-teal-300"
                                : "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                            }`}
                          >
                            {t.grade} {grade}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {role === "PARENT" && (
              <section className={`${cardClass} p-6`}>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">{t.parentDetails}</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>{t.relationship}{required}</label>
                    <select required value={form.relationship} onChange={(e) => update("relationship", e.target.value)} className={inputClass}>
                      <option value="">{t.selectRelationship}</option>
                      <option value="Father">{t.father}</option>
                      <option value="Mother">{t.mother}</option>
                      <option value="Guardian">{t.guardian}</option>
                      <option value="Other">{t.other}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>{t.preferredLanguage}</label>
                    <select value={form.preferred_language} onChange={(e) => update("preferred_language", e.target.value)} className={inputClass}>
                      <option value="English">English</option>
                      <option value="Amharic">አማርኛ (Amharic)</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>{t.address}</label>
                    <input value={form.address} onChange={(e) => update("address", e.target.value)} className={inputClass} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>{t.linkToStudent}</label>
                    <select value={form.link_student_user_id} onChange={(e) => update("link_student_user_id", e.target.value)} className={inputClass}>
                      <option value="">{t.noStudentLink}</option>
                      {students.map((s) => (
                        <option key={s.user_id} value={s.user_id}>
                          {s.full_name} — {[s.student_number, s.current_class_name].filter(Boolean).join(", ")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>
            )}

            {role === "ADMIN" && (
              <section className={`${cardClass} p-6`}>
                <p className="text-sm text-slate-600 dark:text-slate-300">{t.adminDetailsNote}</p>
              </section>
            )}

            {error && (
              <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">{error}</div>
            )}

            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={submitting} className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-60">
                {submitting ? t.registering : t.register}
              </button>
              <button type="button" onClick={startOver} className="rounded-xl border border-slate-300 dark:border-slate-600 px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
                {t.reset}
              </button>
            </div>
          </form>
        </>
      )}
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
