"use client";

import { useEffect, useState, useMemo, FormEvent, useRef } from "react";
import { useParent } from "../ParentContext";
import { MOCK_MESSAGES } from "../mockData";

export default function MessagesPage() {
  const { selectedChildId, selectedChild, profile, authFetch } = useParent();
  const [messages, setMessages] = useState<any[]>([]);
  const [chatThreadId, setChatThreadId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedChildId) return;
    loadMessages();
  }, [selectedChildId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, chatThreadId]);

  async function loadMessages() {
    try {
      const data = await authFetch(`/api/parent/children/${selectedChildId}/messages`);
      setMessages(data);
      if (data.length && chatThreadId === null) {
        setChatThreadId(data[0].thread_id);
      }
    } catch {
      setMessages(MOCK_MESSAGES);
      if (chatThreadId === null && MOCK_MESSAGES.length > 0) {
        setChatThreadId(MOCK_MESSAGES[0].thread_id);
      }
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const currentThread = useMemo(
    () => messages.find((thread) => thread.thread_id === chatThreadId) || messages[0] || null,
    [messages, chatThreadId]
  );

  // FR-P29: Send messages to teacher
  async function handleSendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selectedChildId || !draft.trim()) return;
    setSending(true);
    setError("");
    try {
      await authFetch(`/api/parent/children/${selectedChildId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          thread_id: currentThread?.thread_id,
          body: draft.trim(),
          attachment: attachmentName || undefined,
        }),
      });
      setDraft("");
      setAttachmentName("");
      await loadMessages();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setSending(false);
    }
  }

  // FR-P30: File attachment simulation
  function handleFileSelect() {
    // In production, this would open a file picker and upload
    const filenames = ["homework-help.pdf", "question-about-grade.docx", "medical-certificate.jpg", "permission-slip.png"];
    const randomFile = filenames[Math.floor(Math.random() * filenames.length)];
    setAttachmentName(randomFile);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-500 mt-1">
          Communicate with {selectedChild?.full_name}&apos;s teachers
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_1fr] h-[calc(100vh-220px)] min-h-[500px]">
        {/* FR-P31: Message History - Thread List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Conversations</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {messages.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {messages.map((thread) => (
                  <button
                    key={thread.thread_id}
                    onClick={() => setChatThreadId(thread.thread_id)}
                    className={`w-full px-4 py-4 text-left transition hover:bg-slate-50 ${
                      thread.thread_id === (currentThread?.thread_id) ? "bg-emerald-50 border-l-4 border-emerald-500" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm flex-shrink-0">
                        T
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 truncate">{thread.recipient_name}</p>
                        <p className="text-xs text-slate-500 truncate mt-0.5">{thread.last_message}</p>
                      </div>
                      {thread.unread > 0 && (
                        <span className="rounded-full bg-emerald-600 w-5 h-5 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {thread.unread}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center">
                <p className="text-sm text-slate-500">No conversations yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          {currentThread ? (
            <>
              {/* Chat Header */}
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                  T
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{currentThread.recipient_name}</p>
                  <p className="text-xs text-slate-500">{currentThread.recipient_role}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {currentThread.messages?.map((msg: any, index: number) => (
                  <div
                    key={index}
                    className={`flex ${msg.sender === "parent" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[75%] rounded-2xl p-4 ${
                      msg.sender === "parent"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}>
                      <p className="text-sm">{msg.body}</p>
                      {msg.attachment && (
                        <div className={`mt-2 rounded-xl px-3 py-2 flex items-center gap-2 text-xs ${
                          msg.sender === "parent" ? "bg-emerald-700 text-emerald-100" : "bg-slate-200 text-slate-700"
                        }`}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          {msg.attachment}
                        </div>
                      )}
                      <p className={`mt-2 text-xs ${
                        msg.sender === "parent" ? "text-emerald-200" : "text-slate-400"
                      }`}>
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* FR-P30: File Attachment & Send */}
              <div className="px-5 py-4 border-t border-slate-100">
                {error && (
                  <p className="text-sm text-red-600 mb-2">{error}</p>
                )}
                {attachmentName && (
                  <div className="flex items-center gap-2 mb-3 rounded-xl bg-slate-50 px-3 py-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    <span className="text-sm text-slate-600">{attachmentName}</span>
                    <button onClick={() => setAttachmentName("")} className="ml-auto text-slate-400 hover:text-red-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <form onSubmit={handleSendMessage} className="flex items-end gap-3">
                  <button
                    type="button"
                    onClick={handleFileSelect}
                    className="rounded-xl bg-slate-100 p-3 hover:bg-slate-200 transition flex-shrink-0"
                    title="Attach file"
                  >
                    <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </button>
                  <div className="flex-1">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={2}
                      placeholder="Type a message..."
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="rounded-xl bg-emerald-600 px-5 py-3 text-white font-semibold hover:bg-emerald-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-slate-200 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-slate-500 font-medium">No conversation selected</p>
                <p className="text-sm text-slate-400 mt-1">Select a thread or start a new conversation.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
