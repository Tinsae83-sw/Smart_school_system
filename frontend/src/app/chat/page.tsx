"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import {
  getAuthenticatedRole,
  getToken,
  getUser,
  clearAllAuth,
  getRedirectPath,
} from "@/lib/auth";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What is my class today?",
  "Quick rundown of my grades",
  "How is my attendance recently?",
  "Any news or announcements for me?",
];

function roleLabel(role: string | null) {
  if (!role) return "";
  return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ChatPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const r = getAuthenticatedRole();
    if (!r) {
      router.replace("/login");
      return;
    }
    setRole(r);
    setToken(getToken(r));
    const u = getUser(r);
    setUserName(typeof u === "object" && u ? u.full_name || "" : "");
  }, [router]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  function pushAssistant(content: string) {
    setMessages((prev) => {
      if (prev.length && prev[prev.length - 1].role === "assistant") {
        return prev.slice(0, -1).concat({ role: "assistant", content });
      }
      return prev.concat({ role: "assistant", content });
    });
  }

  async function send(message?: string) {
    const text = (message ?? input).trim();
    if (!text || sending || !token) return;

    const history = messages
      .filter((m) => m.content.trim())
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => prev.concat({ role: "user", content: text }));
    setInput("");
    setSending(true);
    setError("");

    let res: Response;
    try {
      res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text, history }),
      });
    } catch {
      setError("Could not reach the assistant. Is the backend running?");
      setSending(false);
      return;
    }

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        clearAllAuth();
        router.replace("/login");
        return;
      }
      let msg = `Request failed (${res.status})`;
      try {
        const data = await res.json();
        if (data?.error) msg = data.error;
      } catch {
        /* ignore */
      }
      setError(msg);
      setSending(false);
      return;
    }

    if (!res.body) {
      setError("Empty response from the assistant.");
      setSending(false);
      return;
    }

    let accumulator = "";
    pushAssistant(accumulator);

    try {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";
        for (const part of parts) {
          const dataLine = part
            .split("\n")
            .find((l) => l.startsWith("data:"));
          if (!dataLine) continue;
          let payload;
          try {
            payload = JSON.parse(dataLine.slice(5).trim());
          } catch {
            continue;
          }
          if (payload.error) setError(payload.error);
          if (payload.content) {
            accumulator += payload.content;
            pushAssistant(accumulator);
          }
          if (payload.done) return;
        }
      }
    } catch (err) {
      setError("Stream interrupted: " + (err as Error).message);
    } finally {
      setInput("");
      inputRef.current?.focus();
      setSending(false);
    }
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm px-4 md:px-6 h-16 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-lg flex items-center justify-center shadow">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-tight">EduConnect AI Assistant</h1>
            <p className="text-xs text-slate-500">
              {roleLabel(role)}{userName ? ` · ${userName}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Free AI · Groq
          </span>
          <Link
            href={getRedirectPath()}
            className="text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl px-3 py-2 transition"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16">
              <div className="w-14 h-14 mx-auto mb-4 bg-gradient-to-br from-sky-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-sky-500/25">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">How can I help you today?</h2>
              <p className="text-sm text-slate-500 mb-8 max-w-md mx-auto">
                Ask about your {roleLabel(role).toLowerCase()} portal, grades, attendance,
                schedules, assignments, or anything about the school.
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={sending}
                    className="text-sm bg-white border border-slate-200 hover:border-sky-300 hover:bg-sky-50 text-slate-700 rounded-xl px-4 py-2 shadow-sm transition disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-sky-600 text-white"
                    : "bg-white border border-slate-200 text-slate-800 shadow-sm"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {sending && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:120ms]"></span>
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:240ms]"></span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center">
              <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-4 py-2 inline-block">
                {error}
              </p>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      </main>

      {/* Composer */}
      <footer className="bg-white border-t border-slate-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-3xl mx-auto flex items-end gap-2">
          <textarea
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask about your school data…"
            className="flex-1 resize-none rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          />
          <button
            onClick={() => send()}
            disabled={sending || !input.trim()}
            className="rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3.5 transition shadow-sm"
            aria-label="Send"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
          </button>
        </div>
        <p className="max-w-3xl mx-auto text-center text-[11px] text-slate-400 mt-2">
          AI responses are generated from live school records and may occasionally be inaccurate.
        </p>
      </footer>
    </div>
  );
}