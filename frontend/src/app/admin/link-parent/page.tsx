"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { Link2 } from "lucide-react";
import { adminApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { adminTranslations } from "@/translations/admin";
import { AdminUser, cardClass, inputClass, labelClass, readError } from "../shared";

export default function LinkParentPage() {
  const { language } = useLanguage();
  const t = adminTranslations[language];
  const [parents, setParents] = useState<AdminUser[]>([]);
  const [students, setStudents] = useState<AdminUser[]>([]);
  const [parentId, setParentId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [parentsRes, studentsRes] = await Promise.all([
          adminApi.get("/users?role=PARENT"),
          adminApi.get("/users?role=STUDENT"),
        ]);
        if (parentsRes.ok) setParents(await parentsRes.json());
        if (studentsRes.ok) setStudents(await studentsRes.json());
        if (!parentsRes.ok || !studentsRes.ok) {
          setMessage({ ok: false, text: await readError(parentsRes.ok ? studentsRes : parentsRes, t.requestFailed) });
        }
      } catch {
        setMessage({ ok: false, text: t.requestFailed });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [t.requestFailed]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await adminApi.post("/users/link-parent", {
        parent_user_id: Number(parentId),
        student_user_id: Number(studentId),
      });
      if (!res.ok) {
        setMessage({ ok: false, text: await readError(res, t.requestFailed) });
        return;
      }
      setMessage({ ok: true, text: t.linkSuccess });
      setParentId("");
      setStudentId("");
    } catch {
      setMessage({ ok: false, text: t.requestFailed });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.linkTitle}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.linkSubtitle}</p>
      </div>

      <form onSubmit={handleSubmit} className={`${cardClass} p-6 max-w-2xl space-y-5`}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 dark:border-teal-400 border-t-transparent" />
          </div>
        ) : (
          <>
            <div>
              <label className={labelClass}>{t.parent}<span className="text-rose-500"> *</span></label>
              <select required value={parentId} onChange={(e) => setParentId(e.target.value)} className={inputClass}>
                <option value="">{parents.length ? t.selectParent : t.noParentsYet}</option>
                {parents.map((p) => (
                  <option key={p.user_id} value={p.user_id}>
                    {p.full_name} — {p.email}{p.parent_relationship ? ` (${p.parent_relationship})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>{t.student}<span className="text-rose-500"> *</span></label>
              <select required value={studentId} onChange={(e) => setStudentId(e.target.value)} className={inputClass}>
                <option value="">{students.length ? t.selectStudent : t.noStudentsYet}</option>
                {students.map((s) => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.full_name} — {[s.student_number, s.current_class_name].filter(Boolean).join(", ")}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        {message && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            message.ok
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300"
              : "border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
          }`}>
            {message.text}
          </div>
        )}

        <button type="submit" disabled={submitting || loading} className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-60">
          <Link2 className="h-4 w-4" />
          {submitting ? t.linking : t.link}
        </button>
      </form>
    </div>
  );
}
