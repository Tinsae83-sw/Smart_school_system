"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/ptsa";
const api = authFetchFor("PTSA_REPRESENTATIVE");

type Discussion = {
  discussion_id: number;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  category: string;
  status: string;
  participant_count: number;
  message_count: number;
};

type DiscussionMessage = {
  message_id: number;
  discussion_id: number;
  sender_name: string;
  sender_role: string;
  content: string;
  timestamp: string;
};

export default function DiscussionsPage() {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<Discussion | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  
  const [newDiscussion, setNewDiscussion] = useState({
    title: "",
    description: "",
    category: "General",
  });

  useEffect(() => {
    loadDiscussions();
  }, []);

  useEffect(() => {
    if (selectedDiscussion) {
      loadMessages(selectedDiscussion.discussion_id);
    }
  }, [selectedDiscussion]);

  async function loadDiscussions() {
    setLoading(true);
    try {
      const res = await api(`${API_BASE}/discussions`);
      if (res.ok) setDiscussions(await res.json());
    } catch (error) {
      console.error("Error loading discussions:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages(discussionId: number) {
    try {
      const res = await api(`${API_BASE}/discussions/${discussionId}/messages`);
      if (res.ok) setMessages(await res.json());
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  }

  async function createDiscussion() {
    if (!newDiscussion.title || !newDiscussion.description) {
      alert("Please fill in title and description.");
      return;
    }
    
    try {
      await api(`${API_BASE}/discussions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDiscussion),
      });
      setNewDiscussion({ title: "", description: "", category: "General" });
      setShowCreateForm(false);
      loadDiscussions();
      alert("Discussion created successfully!");
    } catch (error) {
      console.error("Error creating discussion:", error);
      alert("Failed to create discussion. Please try again.");
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedDiscussion) return;
    
    try {
      await api(`${API_BASE}/discussions/${selectedDiscussion.discussion_id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newMessage }),
      });
      setNewMessage("");
      loadMessages(selectedDiscussion.discussion_id);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">PTSA Discussions</h1>
          <p className="text-sm text-slate-500 mt-1">Join discussions with other PTSA members</p>
        </div>
        {!selectedDiscussion && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
          >
            Start Discussion
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Start New Discussion</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                value={newDiscussion.title}
                onChange={(e) => setNewDiscussion({...newDiscussion, title: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                placeholder="Discussion title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={newDiscussion.category}
                onChange={(e) => setNewDiscussion({...newDiscussion, category: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
              >
                <option value="General">General</option>
                <option value="Academic">Academic</option>
                <option value="Financial">Financial</option>
                <option value="Facilities">Facilities</option>
                <option value="Events">Events</option>
                <option value="Policy">Policy</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description *</label>
              <textarea
                value={newDiscussion.description}
                onChange={(e) => setNewDiscussion({...newDiscussion, description: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-none"
                rows={4}
                placeholder="What would you like to discuss?"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={createDiscussion}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
            >
              Start Discussion
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500">Loading discussions...</div>
        </div>
      ) : (
        <>
          {!selectedDiscussion ? (
            <>
              {/* Discussions List */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Active Discussions</h2>
                <div className="space-y-3">
                  {discussions.map((discussion) => (
                    <div 
                      key={discussion.discussion_id} 
                      className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition cursor-pointer"
                      onClick={() => setSelectedDiscussion(discussion)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              discussion.status === "Active" ? "bg-emerald-50 text-emerald-700" :
                              "bg-slate-50 text-slate-700"
                            }`}>
                              {discussion.status}
                            </span>
                            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                              {discussion.category}
                            </span>
                          </div>
                          <p className="font-medium text-slate-900 text-sm">{discussion.title}</p>
                          <p className="text-sm text-slate-600 mt-1">{discussion.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                            <span>Started by {discussion.created_by}</span>
                            <span>{new Date(discussion.created_at).toLocaleDateString()}</span>
                            <span>{discussion.participant_count} participants</span>
                            <span>{discussion.message_count} messages</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {discussions.length === 0 && (
                    <p className="text-sm text-slate-400">No active discussions. Start a new discussion to engage with other PTSA members.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Discussion View */}
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setSelectedDiscussion(null)}
                      className="p-2 rounded-lg hover:bg-slate-100 transition"
                    >
                      <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                      </svg>
                    </button>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{selectedDiscussion.title}</h2>
                      <p className="text-sm text-slate-500">{selectedDiscussion.description}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    selectedDiscussion.status === "Active" ? "bg-emerald-50 text-emerald-700" :
                    "bg-slate-50 text-slate-700"
                  }`}>
                    {selectedDiscussion.status}
                  </span>
                </div>

                {/* Messages */}
                <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
                  {messages.map((message) => (
                    <div key={message.message_id} className="rounded-xl bg-slate-50 p-4 border border-slate-200">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                            <span className="text-xs font-semibold text-teal-700">
                              {message.sender_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{message.sender_name}</p>
                            <p className="text-xs text-slate-500">{message.sender_role}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-400">{new Date(message.timestamp).toLocaleString()}</p>
                      </div>
                      <p className="text-sm text-slate-700">{message.content}</p>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">No messages yet. Be the first to contribute!</p>
                  )}
                </div>

                {/* Message Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  />
                  <button
                    onClick={sendMessage}
                    className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
