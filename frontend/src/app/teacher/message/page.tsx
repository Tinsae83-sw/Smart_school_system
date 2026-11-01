"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch, formatDisplayDateTime, Toast } from "../shared";
import { io, Socket } from "socket.io-client";

interface Contact {
  user_id: number;
  full_name: string;
  email?: string;
  phone_number?: string;
  class_name?: string;
  student_number?: string;
  relationship?: string;
  type: "STUDENT" | "PARENT";
}

interface Attachment {
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

interface Message {
  message_id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  timestamp: string;
  is_read: boolean;
  attachment?: string | null;
  sender?: { user_id: number; full_name: string; profile_picture_url?: string };
  receiver?: { user_id: number; full_name: string; profile_picture_url?: string };
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("word")) return "📝";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📊";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📑";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType === "text/plain" || mimeType === "text/csv") return "📃";
  return "📎";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentPreview({ url, className }: { url: string; className?: string }) {
  const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
  const fullUrl = url.startsWith("http") ? url : `${backendUrl}${url}`;
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const filename = url.split("/").pop() || "attachment";

  if (isImage) {
    return (
      <a href={fullUrl} target="_blank" rel="noopener noreferrer" className={className}>
        <img
          src={fullUrl}
          alt="attachment"
          className="max-w-[200px] max-h-[150px] rounded-lg object-cover border border-white/20 mt-2"
        />
      </a>
    );
  }

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg border text-xs font-medium transition hover:opacity-80 ${className}`}
    >
      <span className="text-base">📎</span>
      <span className="truncate max-w-[150px]">{filename}</span>
      <span className="shrink-0">↗</span>
    </a>
  );
}

export default function MessagePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  const [contacts, setContacts] = useState<{ students: Contact[]; parents: Contact[] }>({
    students: [],
    parents: [],
  });
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Filters & input
  const [contactFilter, setContactFilter] = useState<"ALL" | "STUDENT" | "PARENT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [inputContent, setInputContent] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // File attachment state
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (text: string, type: Toast["type"]) => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);

    try {
      const decoded: any = JSON.parse(atob(savedToken.split(".")[1]));
      setCurrentUserId(decoded.userId || decoded.id);
    } catch {
      // Fallback
    }

    loadInitialData(savedToken);
  }, [router]);

  async function loadInitialData(tok: string) {
    try {
      const [contactsData, messagesData] = await Promise.all([
        authFetch("/api/teacher/contacts", {}, tok),
        authFetch("/api/teacher/messages", {}, tok),
      ]);

      const cData = contactsData || { students: [], parents: [] };
      setContacts({
        students: Array.isArray(cData.students) ? cData.students : [],
        parents: Array.isArray(cData.parents) ? cData.parents : [],
      });

      const mData = Array.isArray(messagesData) ? messagesData : [];
      setMessages(mData);

      // Select first contact if available
      const all = [...(cData.students || []), ...(cData.parents || [])];
      if (all.length > 0) {
        setSelectedContact(all[0]);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to load communication portal", "error");
    } finally {
      setLoading(false);
    }
  }

  // Socket.IO real-time connection for teacher
  useEffect(() => {
    if (!token || !currentUserId) return;

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    // Join teacher's personal room based on user_id
    newSocket.emit("join", currentUserId);

    // Listen for new messages in real time
    newSocket.on("new_message", (incomingMessage: Message) => {
      setMessages((prev) => {
        // Prevent duplicate addition
        if (prev.some((m) => m.message_id === incomingMessage.message_id)) {
          return prev;
        }
        return [incomingMessage, ...prev];
      });
    });

    // Listen for read receipts in real time
    newSocket.on("message_read", (messageId: number) => {
      setMessages((prev) =>
        prev.map((m) => (m.message_id === messageId ? { ...m, is_read: true } : m))
      );
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token, currentUserId]);

  // Scroll to bottom when conversation messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedContact]);

  // Mark unread messages as read when viewing conversation with a contact
  useEffect(() => {
    if (!selectedContact || !token) return;

    const unreadMessages = messages.filter(
      (m) =>
        m.sender_id === selectedContact.user_id &&
        !m.is_read
    );

    if (unreadMessages.length > 0) {
      unreadMessages.forEach(async (m) => {
        try {
          await authFetch(`/api/teacher/messages/${m.message_id}/read`, { method: "PUT" }, token);
          setMessages((prev) =>
            prev.map((item) => (item.message_id === m.message_id ? { ...item, is_read: true } : item))
          );
        } catch {
          // ignore mark read errors
        }
      });
    }
  }, [selectedContact, messages, token]);

  // Handle file selection
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      showToast("File size must be under 50MB", "error");
      return;
    }
    setAttachmentFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachmentPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setAttachmentPreview(null);
    }
  }

  function removeAttachment() {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // Handle Send Message
  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedContact) {
      showToast("Please select a recipient from your contact list.", "error");
      return;
    }

    const trimmed = inputContent.trim();
    if (!trimmed && !attachmentFile) {
      showToast("Message body or attachment is required.", "error");
      return;
    }
    if (trimmed.length > 1000) {
      showToast("Message cannot exceed 1000 characters.", "error");
      return;
    }

    setSending(true);
    let attachmentUrl: string | undefined;

    try {
      // Upload file first if one is selected
      if (attachmentFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("attachment", attachmentFile);
        const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
        const uploadRes = await fetch(`${backendUrl}/api/teacher/messages/upload-attachment`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        setUploading(false);
        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "File upload failed");
        }
        const uploaded: Attachment = await uploadRes.json();
        attachmentUrl = uploaded.url;
      }

      const createdMessage = await authFetch(
        "/api/teacher/messages",
        {
          method: "POST",
          body: JSON.stringify({
            receiver_id: selectedContact.user_id,
            content: trimmed || " ",
            attachment: attachmentUrl,
          }),
        },
        token
      );

      setMessages((prev) => {
        if (prev.some((m) => m.message_id === createdMessage.message_id)) return prev;
        return [createdMessage, ...prev];
      });
      setInputContent("");
      removeAttachment();
    } catch (e: any) {
      showToast(e.message || "Failed to send message", "error");
    } finally {
      setSending(false);
      setUploading(false);
    }
  }

  // Filtered contacts
  const allContactsList = [
    ...contacts.students.map((s) => ({ ...s, type: "STUDENT" as const })),
    ...contacts.parents.map((p) => ({ ...p, type: "PARENT" as const })),
  ];

  const filteredContacts = allContactsList.filter((c) => {
    const matchesType = contactFilter === "ALL" || c.type === contactFilter;
    const matchesSearch =
      c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.student_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.class_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Conversation thread for selected contact
  const activeThread = selectedContact
    ? messages
        .filter(
          (m) =>
            (m.sender_id === selectedContact.user_id && m.receiver_id === currentUserId) ||
            (m.sender_id === currentUserId && m.receiver_id === selectedContact.user_id) ||
            // Fallback match if currentUserId not extracted from JWT
            (m.sender_id === selectedContact.user_id || m.receiver_id === selectedContact.user_id)
        )
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-200 dark:border-slate-600 border-t-emerald-600 dark:border-t-emerald-400 rounded-full animate-spin" />
          <p className="text-slate-500 dark:text-slate-400 font-medium">Connecting to messaging center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 rounded-xl border px-5 py-4 shadow-lg max-w-sm animate-in slide-in-from-right-4 duration-300 ${
            toast.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-900/40 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300"
          }`}
        >
          <span className="text-sm font-medium">{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Teacher Communication
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Direct messaging with students and parents across your assigned classes
        </p>
      </div>

      {/* 2-Panel Chat Workspace */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col md:flex-row h-[720px]">
        {/* ── LEFT PANEL: CONTACTS DIRECTORY ──────────────────────────────── */}
        <div className="w-full md:w-80 lg:w-96 border-r border-slate-200 dark:border-slate-700 flex flex-col bg-slate-50/50 dark:bg-slate-800/50">
          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student or parent..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <svg className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <div className="flex gap-1 bg-slate-200/60 dark:bg-slate-700 p-1 rounded-xl text-xs font-semibold">
              {(["ALL", "STUDENT", "PARENT"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setContactFilter(tab)}
                  className={`flex-1 py-1.5 rounded-lg transition ${
                    contactFilter === tab
                      ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  {tab === "ALL" ? "All" : tab === "STUDENT" ? "Students" : "Parents"}
                </button>
              ))}
            </div>
          </div>

          {/* Contact Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700">
            {filteredContacts.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No contacts found matching your query.
              </div>
            ) : (
              filteredContacts.map((contact) => {
                const isSelected = selectedContact?.user_id === contact.user_id;
                const unreadCount = messages.filter(
                  (m) => m.sender_id === contact.user_id && !m.is_read
                ).length;

                return (
                  <button
                    key={`${contact.type}-${contact.user_id}`}
                    type="button"
                    onClick={() => setSelectedContact(contact)}
                    className={`w-full text-left p-4 flex items-start gap-3 transition ${
                      isSelected
                        ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-l-4 border-emerald-500"
                        : "hover:bg-slate-100/60 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                      {contact.full_name?.charAt(0) || "U"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {contact.full_name}
                        </p>
                        {unreadCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">
                            {unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            contact.type === "STUDENT"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                          }`}
                        >
                          {contact.type}
                        </span>
                        {contact.class_name && (
                          <span className="text-[11px] text-slate-400 truncate">
                            {contact.class_name}
                          </span>
                        )}
                        {contact.relationship && (
                          <span className="text-[11px] text-slate-400 truncate">
                            {contact.relationship}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: MESSAGE THREAD ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col bg-white dark:bg-slate-800">
          {selectedContact ? (
            <>
              {/* Active Contact Header */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50/30 dark:bg-slate-800/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                    {selectedContact.full_name?.charAt(0) || "U"}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">
                      {selectedContact.full_name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {selectedContact.type === "STUDENT"
                        ? `Student ID: ${selectedContact.student_number || "N/A"} · ${selectedContact.class_name || ""}`
                        : `Parent / Guardian · ${selectedContact.relationship || "Guardian"}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Stream */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {activeThread.length === 0 ? (
                  <div className="py-24 text-center">
                    <svg className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949C3.752 19.622 1 18.474 1 16.5c0-.376.145-.73.41-1.02C2.428 14.282 3 12.586 3 11V9c0-4.418 4.03-8 9-8s9 3.582 9 8v2c0 1.586.572 3.282 1.59 4.48.265.29.41.644.41 1.02 0 1.974-2.752 3.122-6.745 3.551A9.863 9.863 0 0112 20" />
                    </svg>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No message history with {selectedContact.full_name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Type your message below to start the conversation.
                    </p>
                  </div>
                ) : (
                  activeThread.map((msg) => {
                    const isFromMe = msg.sender_id !== selectedContact.user_id;

                    return (
                      <div
                        key={msg.message_id}
                        className={`flex flex-col ${isFromMe ? "items-end" : "items-start"}`}
                      >
                        <div
                          className={`max-w-md rounded-2xl px-4 py-3 text-sm shadow-sm ${
                            isFromMe
                              ? "bg-emerald-600 text-white rounded-br-none"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white rounded-bl-none"
                          }`}
                        >
                          {/* Message text */}
                          {msg.content && msg.content.trim() && msg.content !== " " && (
                            <p className="whitespace-pre-line">{msg.content}</p>
                          )}
                          {/* Attachment */}
                          {msg.attachment && (
                            <AttachmentPreview
                              url={msg.attachment}
                              className={isFromMe ? "border-white/30 text-white" : "border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"}
                            />
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">
                          {formatDisplayDateTime(msg.timestamp)}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Composer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                {/* Attachment Preview Strip */}
                {attachmentFile && (
                  <div className="mb-2 flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600">
                    {attachmentPreview ? (
                      <img src={attachmentPreview} alt="preview" className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <span className="text-2xl">{getFileIcon(attachmentFile.type)}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{attachmentFile.name}</p>
                      <p className="text-[10px] text-slate-400">{formatFileSize(attachmentFile.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={removeAttachment}
                      className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                    <span>Press Enter to send · Shift+Enter for new line</span>
                    <span className={inputContent.length > 1000 ? "text-red-500 font-bold" : ""}>
                      {inputContent.length} / 1000 characters
                    </span>
                  </div>

                  <div className="flex items-end gap-2">
                    {/* Hidden file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mpeg,.mov,.zip"
                      onChange={handleFileSelect}
                    />

                    {/* Attachment button */}
                    <button
                      type="button"
                      title="Attach file"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0 p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>

                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={inputContent}
                      onChange={(e) => setInputContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(e);
                        }
                      }}
                      placeholder={`Write a message to ${selectedContact.full_name}...`}
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none"
                    />

                    <button
                      type="submit"
                      disabled={sending || uploading || (!inputContent.trim() && !attachmentFile)}
                      className="rounded-xl bg-emerald-600 px-5 py-3 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 disabled:opacity-50 shrink-0"
                    >
                      {uploading ? "Uploading..." : sending ? "..." : "Send"}
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 text-slate-400 text-sm">
              Select a student or parent contact from the left list to view conversation.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
