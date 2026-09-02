'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

type ClassItem = { class_id: number; class_name: string; academic_year: string };

export default function RegisterPage() {
  const [form, setForm] = useState({
    role: 'STUDENT',
    full_name: '',
    email: '',
    phone_number: '',
    password: '',
    confirm_password: '',
    class_id: '',
    relationship: 'Guardian',
  });
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/classes`)
      .then((r) => r.json())
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
  }, []);

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [field]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      setLoading(false);
      return;
    }
    if (form.password !== form.confirm_password) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }
    if (form.role === 'STUDENT' && !form.class_id) {
      setError('Please select the class you are enrolling into.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: form.role,
          full_name: form.full_name,
          email: form.email,
          phone_number: form.phone_number,
          password: form.password,
          confirm_password: form.confirm_password,
          class_id: form.role === 'STUDENT' ? (Number(form.class_id) || null) : undefined,
          relationship: form.role === 'PARENT' ? form.relationship : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccessMsg(data.message || 'Your registration has been submitted.');
        setSubmitted(true);
      } else {
        setError(data.error || 'Unable to submit registration. Please try again.');
      }
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="px-6 py-4 border-b border-slate-100 bg-white">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">SmartSchool</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Sign in</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Create your account</h1>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto">
            Register as a student or a parent. Your account becomes active once the school office approves it.
          </p>
        </div>

        {submitted ? (
          <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-10 text-center">
            <div className="w-14 h-14 mx-auto bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
              <svg className="w-7 h-7 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900">Request submitted</h2>
            <p className="text-sm text-slate-500 mt-2">{successMsg}</p>
            <Link href="/login" className="inline-block mt-6 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all">
              Go to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-5">
            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">I am a</label>
              <select value={form.role} onChange={update('role')} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
                <option value="STUDENT">Student</option>
                <option value="PARENT">Parent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Full name</label>
              <input required value={form.full_name} onChange={update('full_name')} placeholder="e.g. Abebe Kebede" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email</label>
                <input required type="email" value={form.email} onChange={update('email')} placeholder="you@example.com" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Phone</label>
                <input value={form.phone_number} onChange={update('phone_number')} placeholder="+251 9xx xxx xxx" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
            </div>

            {form.role === 'STUDENT' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Class you are enrolling into</label>
                <select required value={form.class_id} onChange={update('class_id')} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
                  <option value="">Select class…</option>
                  {classes.map((c) => (
                    <option key={c.class_id} value={c.class_id}>{c.class_name} ({c.academic_year})</option>
                  ))}
                </select>
              </div>
            )}

            {form.role === 'PARENT' && (
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Relationship to student</label>
                <select value={form.relationship} onChange={update('relationship')} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition">
                  <option value="Guardian">Guardian</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Password</label>
                <input required type="password" value={form.password} onChange={update('password')} placeholder="At least 8 characters" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Confirm password</label>
                <input required type="password" value={form.confirm_password} onChange={update('confirm_password')} placeholder="Repeat password" className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition" />
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50">
              {loading ? 'Submitting…' : 'Submit registration'}
            </button>
            <p className="text-xs text-slate-400 text-center">
              Already have an account?{' '}
              <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
            </p>
          </form>
        )}
      </main>
    </div>
  );
}