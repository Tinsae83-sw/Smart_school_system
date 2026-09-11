"use client";

import { useEffect } from "react";
import { getCookieConsent } from "./CookieConsent";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "";

/**
 * Privacy-first Google Analytics (GA4) loader.
 *
 * The gtag script is only injected after the visitor accepts cookies via the
 * consent banner, or on later visits if the stored consent is "accepted".
 * When NEXT_PUBLIC_GA_MEASUREMENT_ID is not set, this renders nothing.
 */
function injectScript() {
  if (!GA_ID || typeof document === "undefined" || document.querySelector("#smart-school-gtag")) return;
  const win = window as unknown as { dataLayer: unknown[]; gtag: (...args: unknown[]) => void };

  const script = document.createElement("script");
  script.id = "smart-school-gtag";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(script);

  win.dataLayer = win.dataLayer || [];
  win.gtag = function gtag() {
    win.dataLayer.push(arguments);
  };
  win.gtag("js", new Date());
  win.gtag("config", GA_ID, { anonymize_ip: true });
}

export default function Analytics() {
  useEffect(() => {
    if (!GA_ID) return;
    if (getCookieConsent() === "accepted") {
      injectScript();
      return;
    }
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === "accepted") injectScript();
    };
    window.addEventListener("cookie-consent", handler);
    return () => window.removeEventListener("cookie-consent", handler);
  }, []);

  return null;
}