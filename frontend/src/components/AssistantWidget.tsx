"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuthenticatedRole } from "@/lib/auth";

export default function AssistantWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const authed = !!getAuthenticatedRole();
    const hidden = pathname === "/chat" || pathname === "/login" || pathname === "/register";
    setVisible(authed && !hidden);
  }, [pathname]);

  if (!visible) return null;

  return (
    <button
      onClick={() => router.push("/chat")}
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-white pl-4 pr-5 py-3 shadow-xl shadow-sky-600/30 hover:shadow-sky-600/50 hover:-translate-y-0.5 transition-all"
      aria-label="Open AI assistant"
    >
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
      </svg>
      <span className="text-sm font-semibold">Ask AI</span>
    </button>
  );
}