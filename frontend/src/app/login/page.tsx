"use client";



import { FormEvent, useEffect, useState } from "react";

import { useRouter } from "next/navigation";

import { getRedirectPath, setAuth, AUTH_CONFIGS, getToken, getAuthenticatedRole } from "@/lib/auth";



const BACKEND_URL = "http://localhost:5000";



export default function LoginPage() {

  const router = useRouter();

  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const [loading, setLoading] = useState(false);

  const [requiresOtp, setRequiresOtp] = useState(false);

  const [otp, setOtp] = useState("");


  async function handleSubmit(event: FormEvent<HTMLFormElement>) {

    event.preventDefault();

    setLoading(true);

    setError("");



    try {

      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({ email, password }),

      });

      if (!response.ok) {

        const payload = await response.json();

        setError(payload.error || "Login failed.");

        setLoading(false);

        return;

      }

      const data = await response.json();

      if (data.requiresOtp) {

        setRequiresOtp(true);

        setLoading(false);

        return;

      }

      const role = data.user?.role as keyof typeof AUTH_CONFIGS;
      
      console.log('[Login] User role:', role);
      console.log('[Login] Token received:', data.token ? 'Present' : 'Missing');
      console.log('[Login] Token (first 20 chars):', data.token ? data.token.substring(0, 20) + '...' : 'N/A');
      
      if (role && AUTH_CONFIGS[role]) {
        setAuth(role, data.token, data.user);
        console.log('[Login] Auth set successfully for role:', role);
        console.log('[Login] Dashboard path:', AUTH_CONFIGS[role].dashboardPath);
        router.push(AUTH_CONFIGS[role].dashboardPath);
      } else {
        setError("Unknown user role.");
        setLoading(false);
      }

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



      if (!response.ok) {

        const payload = await response.json();

        setError(payload.error || "OTP verification failed.");

        setLoading(false);

        return;

      }



      const data = await response.json();



      // Store token and redirect based on role
      const role = data.user?.role as keyof typeof AUTH_CONFIGS;
      
      if (role && AUTH_CONFIGS[role]) {
        setAuth(role, data.token, data.user);
        router.push(AUTH_CONFIGS[role].dashboardPath);
      } else {
        setError("Unknown user role.");
        setLoading(false);
      }

    } catch (err) {

      setError("Unable to connect to the backend.");

    } finally {

      setLoading(false);

    }

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

          <h1 className="mt-4 text-3xl font-bold text-slate-900">Sign in</h1>

          <p className="mt-2 text-sm text-slate-500">Access your dashboard, grades, attendance, and more.</p>

        </div>



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

              placeholder="Password123!"

              required

            />

          </div>



          {error ? <div className="text-sm text-red-600">{error}</div> : null}



          <button

            type="submit"

            className="w-full rounded-2xl bg-indigo-600 px-5 py-3 text-white font-semibold transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-400"

            disabled={loading}

          >

            {loading ? "Signing in..." : "Sign in"}

          </button>

        </form>




      </div>

    </main>

  );

}

