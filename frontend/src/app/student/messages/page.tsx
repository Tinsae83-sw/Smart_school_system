"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useStudent } from "../StudentContext";

export default function StudentMessages() {
  const { authFetch } = useStudent();
  const [messages, setMessages] = useState<any[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<number | null>(null);
  const [messageDraft, setMessageDraft] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      const data = await authFetch("/api/student/messages");
      setMessages(data);
      if (data.length && !currentThreadId) {
        setCurrentThreadId(data[0].thread_id);
      }
    } catch {
      setMessages([]);
    }
  }

  async function handleSendMessage() {
    if (!currentThreadId || !messageDraft.trim()) return;
    try {
      await authFetch("/api/student/messages", {
        method: "POST",
        body: JSON.stringify({
          thread_id: currentThreadId,
          body: messageDraft.trim(),
          attachment: selectedFile ? selectedFile.name : undefined,
        }),
      });
      setMessageDraft("");
      setSelectedFile(null);
      loadMessages();
    } catch (error) {
      setFeedback((error as Error).message);
    }
  }

  function handleFileAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
  }

  const currentThread = messages.find((t) => t.thread_id === currentThreadId) || null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-sm text-slate-500 mt-1">Communicate with your teachers.</p>
      </div>

      {feedback && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
          {feedback}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        {/* FR-S31: Thread List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900 mb-3">Conversations</h2>
          {messages.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {messages.map((thread) => (
                <button
                  key={thread.thread_id}
                  onClick={() => setCurrentThreadId(thread.thread_id)}
                  className={`w-full text-left rounded-xl border px-4 py-3 transition ${
                    thread.thread_id === currentThreadId
                      ? "border-sky-600 bg-sky-50"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{thread.recipient_name}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate">{thread.last_message}</p>
                  {thread.unread > 0 && (
                    <span className="mt-1 inline-block rounded-full bg-sky-100 text-sky-700 px-2 py-0.5 text-xs font-bold">{thread.unread} new</span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No conversations yet.</p>
          )}
        </div>

        {/* FR-S29, S30: Chat Area */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          {currentThread ? (
            <>
              <div className="p-4 border-b border-slate-100">
                <p className="font-semibold text-slate-900">{currentThread.recipient_name}</p>
              </div>

              {/* Message History */}
              <div className="flex-1 p-4 space-y-3 max-h-80 overflow-y-auto">
                {currentThread.messages.map((message: any, index: number) => (
                  <div key={index} className={`flex ${message.sender === "student" ? "justify-end" : "justify-start"}`}>
                    <div className={`rounded-2xl px-4 py-2.5 max-w-[80%] ${
                      message.sender === "student"
                        ? "bg-sky-600 text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}>
                      <p className="text-sm">{message.body}</p>
                      <p className={`text-xs mt-1 ${message.sender === "student" ? "text-sky-200" : "text-slate-400"}`}>
                        {new Date(message.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Compose Area */}
              <div className="p-4 border-t border-slate-100 space-y-3">
                <textarea
                  value={messageDraft}
                  onChange={(e) => setMessageDraft(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 resize-none"
                  placeholder="Write a message..."
                />
                {/* FR-S30: File Attachment */}
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition">
                    Attach file
                    <input
                      type="file"
                      onChange={handleFileAttachment}
                      className="hidden"
                    />
                  </label>
                  {selectedFile && (
                    <span className="text-xs text-slate-500">{selectedFile.name}</span>
                  )}
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageDraft.trim()}
                    className="ml-auto rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition disabled:bg-slate-400 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center">
              <p className="text-slate-500">Select a conversation to start messaging.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
