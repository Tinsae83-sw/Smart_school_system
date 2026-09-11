"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "smartschool_cookie_consent";

export function getCookieConsent(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(CONSENT_KEY);
}

export function setCookieConsent(value: "accepted" | "declined") {
  window.localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent("cookie-consent", { detail: value }));
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!getCookieConsent()) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 z-[70] mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm leading-relaxed text-slate-600">
          <p className="font-semibold text-slate-900 mb-1">We value your privacy</p>
          <p>
            SmartSchool uses cookies to keep you signed in and to understand how
            the platform is used. See our{" "}
            <Link href="/privacy-policy" className="font-medium text-blue-600 hover:underline">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => { setVisible(false); setCookieConsent("declined"); }}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => { setVisible(false); setCookieConsent("accepted"); }}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}