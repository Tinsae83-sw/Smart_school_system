"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function MessagePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [message, setMessage] = useState("");
  const [composeForm, setComposeForm] = useState({
    receiver_id: 0,
    content: "",
    attachment: ""
  });
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadMessages(savedToken);
  }, [router]);

  async function loadMessages(token: string) {
    try {
      const data = await authFetch("/api/teacher/messages", {}, token);
      setMessages(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;
    
    try {
      await authFetch("/api/teacher/messages", {
        method: "POST",
        body: JSON.stringify({
          receiver_id: selectedConversation.receiver_id,
          content: messageText
        })
      }, token);
      setMessageText("");
      loadMessages(token);
    } catch (e) { console.error(e); }
  }

  async function handleComposeMessage(e: React.FormEvent) {
    e.preventDefault();
    try {
      await authFetch("/api/teacher/messages", {
        method: "POST",
        body: JSON.stringify(composeForm)
      }, token);
      setMessage("Message sent successfully!");
      setShowCompose(false);
      setComposeForm({ receiver_id: 0, content: "", attachment: "" });
      loadMessages(token);
    } catch (e) {
      setMessage("Failed to send message");
      console.error(e);
    }
  }

  async function handleMarkAsRead(messageId: number) {
    try {
      await authFetch(`/api/teacher/messages/${messageId}/read`, {
        method: "PUT"
      }, token);
      loadMessages(token);
    } catch (e) { console.error(e); }
  }

  function getConversationName(msg: any) {
    if (msg.sender_id !== msg.receiver_id) {
      return msg.sender?.user?.full_name || msg.receiver?.user?.full_name || "Unknown";
    }
    return "Self";
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Messages</h1>
        
        {/* Compose Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCompose(!showCompose)}
            className="rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 transition"
          >
            {showCompose ? "Cancel" : "Compose New Message"}
          </button>
        </div>

        {/* Compose Form */}
        {showCompose && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Compose Message</h2>
            <form onSubmit={handleComposeMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Recipient ID</label>
                <input
                  type="number"
                  value={composeForm.receiver_id || ''}
                  onChange={(e) => setComposeForm({ ...composeForm, receiver_id: Number(e.target.value) })}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  value={composeForm.content}
                  onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })}
                  rows={4}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 transition"
              >
                Send Message
              </button>
            </form>
          </div>
        )}

        {message && (
          <p className={`mb-4 text-sm ${message.includes("success") ? "text-emerald-600" : "text-red-600"}`}>
            {message}
          </p>
        )}

        {/* Messages Layout */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Conversation List */}
          <div className="lg:col-span-1 space-y-2">
            <h2 className="text-lg font-semibold text-slate-900 mb-3">Conversations</h2>
            {messages.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-500">
                No messages yet
              </div>
            ) : (
              messages.map((msg: any) => (
                <div
                  key={msg.message_id}
                  onClick={() => {
                    setSelectedConversation(msg);
                    if (!msg.is_read) {
                      handleMarkAsRead(msg.message_id);
                    }
                  }}
                  className={`bg-white rounded-xl border p-4 cursor-pointer transition ${
                    selectedConversation?.message_id === msg.message_id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-slate-200 hover:border-slate-300"
                  } ${!msg.is_read ? "border-l-4 border-l-emerald-500" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">
                        {getConversationName(msg)}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1 truncate">
                        {msg.content}
                      </p>
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(msg.timestamp).toLocaleString()}
                      </p>
                    </div>
                    {!msg.is_read && (
                      <div className="ml-2 h-2 w-2 rounded-full bg-emerald-500"></div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message View */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="border-b border-slate-200 pb-4 mb-4">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {getConversationName(selectedConversation)}
                  </h2>
                  <p className="text-sm text-slate-500">
                    {new Date(selectedConversation.timestamp).toLocaleString()}
                  </p>
                </div>
                
                {/* Message Content */}
                <div className="mb-6">
                  <div className={`p-4 rounded-xl ${
                    selectedConversation.sender_id === selectedConversation.receiver_id
                      ? "bg-slate-100"
                      : "bg-emerald-50"
                  }`}>
                    <p className="text-slate-900">{selectedConversation.content}</p>
                  </div>
                </div>

                {/* Reply Form */}
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your reply..."
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 transition"
                  >
                    Send
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <p className="text-slate-500">Select a conversation to view messages</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
