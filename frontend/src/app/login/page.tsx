"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { setAuth, AUTH_CONFIGS } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

type Step = "credentials" | "otp" | "setup";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  // First-login OTP + password setup flow.
  const [step, setStep] = useState<Step>("credentials");
  const [otp, setOtp] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    if (step === "otp") {
      setNotice("A verification code was just sent to your email. Enter it below to continue.");
    }
  }, [step]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setError(payload.error || "Login failed.");
        setLoading(false);
        return;
      }

      const data = await response.json();

      // First-login: password is correct but user must verify email + set a
      // real password. No session yet.
      if (data.requiresOtp) {
        setStep("otp");
        setLoading(false);
        return;
      }

      completeLogin(data);
    } catch (err) {
      console.error("Login error:", err);
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  async function handleOtpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "OTP verification failed.");
        setLoading(false);
        return;
      }

      // First-login: OTP verified -> now set a real password.
      if (data.requiresSetup && data.setupToken) {
        setSetupToken(data.setupToken);
        setStep("setup");
        setNotice("Verified! Now choose the password you will use to sign in.");
        setLoading(false);
        return;
      }

      // Otherwise a normal session was issued.
      completeLogin(data);
    } catch (err) {
      setError("Unable to connect to the backend.");
      setLoading(false);
    }
  }

  async function handleSetupSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/setup-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken, newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Could not complete setup.");
        setLoading(false);
        return;
      }

      // Setup complete. Reset the form so the user signs in with the new password.
      setStep("credentials");
      setPassword("");
      setSetupToken("");
      setOtp("");
      setNewPassword("");
      setConfirmNewPassword("");
      setNotice("Your password has been set. Please sign in with your new password.");
      setLoading(false);
    } catch (err) {
      setError("Unable to connect to the backend.");
      setLoading(false);
    }
  }

  function completeLogin(data: { token: string; user?: any }) {
    const role = data.user?.role as keyof typeof AUTH_CONFIGS;
    if (role && AUTH_CONFIGS[role]) {
      setAuth(role, data.token, data.user);
      router.push(AUTH_CONFIGS[role].dashboardPath);
    } else {
      setError("Unknown user role.");
      setLoading(false);
    }
  }

  function backToLogin() {
    setStep("credentials");
    setError("");
    setNotice("");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-600 font-semibold">EduConnect Portal</p>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">
            {step === "otp" ? "Verify your email" : step === "setup" ? "Set your password" : "Sign in"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {step === "otp"
              ? "Enter the 6-digit code sent to your email."
              : step === "setup"
              ? "Choose the password you will use from now on."
              : "Access your dashboard, grades, attendance, and more."}
          </p>
        </div>

        {notice && <div className="mb-4 text-sm rounded-xl bg-emerald-50 text-emerald-700 px-4 py-3">{notice}</div>}
        {error && <div className="mb-4 text-sm rounded-xl bg-red-50 text-red-700 px-4 py-3">{error}</div>}

        {step === "credentials" && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="your@email.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Your password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-white font-semibold transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleOtpSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                value={otp}
                onChange={(event) => setOtp(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-center text-xl tracking-[0.3em] text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-white font-semibold transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify code"}
            </button>
            <button type="button" onClick={backToLogin} className="w-full text-sm text-indigo-600 hover:underline">
              Back to sign in
            </button>
          </form>
        )}

        {step === "setup" && (
          <form onSubmit={handleSetupSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="At least 8 characters"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Confirm new password</label>
              <input
                type="password"
                value={confirmNewPassword}
                onChange={(event) => setConfirmNewPassword(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Repeat password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-white font-semibold transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              disabled={loading}
            >
              {loading ? "Saving..." : "Set password"}
            </button>
            <button type="button" onClick={backToLogin} className="w-full text-sm text-indigo-600 hover:underline">
              Cancel
            </button>
          </form>
        )}
      </div>
    </main>
  );
}