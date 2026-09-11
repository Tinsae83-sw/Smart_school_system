'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000';

type ClassItem = { class_id: number; class_name: string; academic_year: string };

export default function RegisterPage() {
  const [form, setForm] = useState({
    role: 'STUDENT',
    full_name: '',
    email: '',
    phone_number: '',
    national_id: '',
    password: '',
    confirm_password: '',
    class_id: '',
    relationship: 'Guardian',
    honeypot: '',
  });
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [faydaRef, setFaydaRef] = useState('');
  const [faydaVerified, setFaydaVerified] = useState<{ name?: string; birthdate?: string; gender?: string } | null>(null);
  const [faydaChecking, setFaydaChecking] = useState(false);
  const [faydaConfigured, setFaydaConfigured] = useState(false);
  const [faydaMock, setFaydaMock] = useState(false);
  const popupRef = useRef<Window | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/classes`)
      .then((r) => r.json())
      .then((data) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setClasses([]));
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/fayda/config`)
      .then((r) => r.json())
      .then((data) => {
        setFaydaConfigured(Boolean(data.configured));
        setFaydaMock(Boolean(data.mock));
      })
      .catch(() => setFaydaConfigured(false));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    function onMessage(e: MessageEvent) {
      if (e.data && e.data.type === 'FAYDA_RESULT') {
        setFaydaChecking(false);
        if (e.data.payload?.ok && e.data.payload.ref) {
          setFaydaRef(e.data.payload.ref);
          setFaydaVerified(e.data.payload.verified || null);
          if (e.data.payload.mock) setError('');
        } else {
          setError(e.data.payload?.message || 'Fayda verification failed.');
        }
        if (popupRef.current) popupRef.current.close();
        popupRef.current = null;
      }
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  function update(field: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm({ ...form, [field]: e.target.value });
      if (field === 'national_id' || field === 'phone_number') {
        setFaydaRef('');
        setFaydaVerified(null);
      }
    };
  }

  async function handleVerifyFayda() {
    setError('');
    const digits = form.national_id.replace(/\D/g, '');
    if (!/^\d{12}$/.test(digits) && !/^\d{16}$/.test(digits)) {
      setError('Enter your 12-digit Fayda ID (FIN) or 16-digit alias (FAN) first, then verify.');
      return;
    }
    if (faydaMock && !form.phone_number) {
      setError('Enter your phone number so the simulated Fayda portal can (in production) send the OTP there.');
      return;
    }
    setFaydaChecking(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/fayda/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          national_id: digits,
          phone_number: form.phone_number.replace(/\D/g, ''),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.authorizeUrl) {
        setError(data.error || 'Fayda verification is unavailable right now.');
        setFaydaChecking(false);
        return;
      }
      popupRef.current = window.open(data.authorizeUrl, 'fayda', 'popup,width=560,height=720');
      if (!popupRef.current) {
        setError('Popup was blocked. Please allow popups for this site and try again.');
        setFaydaChecking(false);
      }
    } catch {
      setError('Unable to reach the server. Please try again.');
      setFaydaChecking(false);
    }
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
    if (form.national_id) {
      const digits = form.national_id.replace(/\D/g, '');
      if (!/^\d{12}$/.test(digits) && !/^\d{16}$/.test(digits)) {
        setError('Enter your 12-digit Fayda ID (FIN) or 16-digit alias (FAN).');
        setLoading(false);
        return;
      }
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
          national_id: form.national_id.replace(/\D/g, '') || undefined,
          fayda_ref: faydaRef || undefined,
          password: form.password,
          confirm_password: form.confirm_password,
          class_id: form.role === 'STUDENT' ? (Number(form.class_id) || null) : undefined,
          relationship: form.role === 'PARENT' ? form.relationship : undefined,
          company_website: form.honeypot,
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

            <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden opacity-0">
              <input type="text" name="company_website" value={form.honeypot} onChange={update('honeypot')} tabIndex={-1} autoComplete="off" />
            </div>

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

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Fayda ID (optional)</label>
              <input
                type="text"
                pattern="\d{12}|\d{16}"
                maxLength={16}
                value={form.national_id}
                onChange={update('national_id')}
                placeholder="12-digit FIN or 16-digit FAN"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
              <p className="text-xs text-slate-400 mt-1">Optional. Your 12-digit Fayda Identification Number (FIN) or 16-digit Fayda Alias Number (FAN).</p>
              {form.national_id && !/^(\d{12}|\d{16})$/.test(form.national_id.replace(/\D/g, '')) && (
                <p className="text-xs text-red-600 mt-1">Must be a 12-digit Fayda ID (FIN) or a 16-digit alias (FAN).</p>
              )}
              <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 mt-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">Verify with Fayda</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {faydaVerified
                      ? `Verified: ${faydaVerified.name || 'Identity confirmed'}`
                      : 'Fayda will send an OTP to the phone number registered with your Fayda ID. Your verified name, birth date, and gender are then linked to your account.'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={faydaChecking || Boolean(faydaRef)}
                  onClick={handleVerifyFayda}
                  className="shrink-0 ml-4 px-4 py-2 rounded-lg text-xs font-semibold border transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {faydaChecking ? (
                    <span className="text-slate-500">Opening…</span>
                  ) : faydaRef ? (
                    <span className="text-emerald-600">✓ Verified</span>
                  ) : (
                    <span className={faydaConfigured || faydaMock ? 'text-blue-600' : 'text-slate-400'}>
                      {faydaConfigured ? 'Verify' : faydaMock ? 'Verify (test mode)' : 'Unavailable'}
                    </span>
                  )}
                </button>
              </div>
              {!faydaConfigured && faydaMock && (
                <p className="text-xs text-slate-400 mt-1">
                  Test mode: no real Fayda account is contacted — the popup simulates the OTP sent to your phone. Live verification activates once the school configures Fayda.
                </p>
              )}
              {!faydaConfigured && !faydaMock && (
                <p className="text-xs text-slate-400 mt-1">
                  Live Fayda verification is not active yet — you can still register without it, and verify once the school activates Fayda.
                </p>
              )}
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