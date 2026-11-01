"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useStudent } from "../StudentContext";
import { io, Socket } from "socket.io-client";

interface Attachment {
  url: string;
  originalName: string;
  size: number;
  mimeType: string;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.includes("word")) return "📝";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet")) return "📊";
  if (mimeType.includes("powerpoint") || mimeType.includes("presentation")) return "📑";
  if (mimeType.startsWith("video/")) return "🎬";
  return "📎";
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function AttachmentPreview({ url, isMine }: { url: string; isMine: boolean }) {
  const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
  const fullUrl = url.startsWith("http") ? url : `${backendUrl}${url}`;
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const filename = url.split("/").pop() || "attachment";

  if (isImage) {
    return (
      <a href={fullUrl} target="_blank" rel="noopener noreferrer">
        <img
          src={fullUrl}
          alt="attachment"
          className="max-w-[200px] max-h-[150px] rounded-lg object-cover mt-2 border border-white/20"
        />
      </a>
    );
  }

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center gap-2 mt-2 px-3 py-2 rounded-lg border text-xs font-medium transition hover:opacity-80 ${
        isMine
          ? "border-white/30 text-white"
          : "border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300"
      }`}
    >
      <span className="text-base">📎</span>
      <span className="truncate max-w-[150px]">{filename}</span>
      <span className="shrink-0">↗</span>
    </a>
  );
}

export default function MessagePage() {
  const router = useRouter();
  const { authFetch, token, profile } = useStudent();
  const [contacts, setContacts] = useState<{ teachers: any[], parents: any[] }>({ teachers: [], parents: [] });
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeForm, setComposeForm] = useState({
    receiver_id: 0,
    content: "",
    attachment: ""
  });
  const [message, setMessage] = useState("");
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState<number | null>(null);

  // File attachment state
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadContacts();
    loadAllMessages();

    // Set up Socket.IO connection
    if (token) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';
      const newSocket = io(socketUrl);
      setSocket(newSocket);

      // Get user ID from token and join room
      const decodedToken = JSON.parse(atob(token.split('.')[1]));
      const currentUserId = decodedToken.userId || decodedToken.id;
      setUserId(currentUserId);

      newSocket.emit('join', currentUserId);

      // Listen for new messages
      newSocket.on('new_message', (message) => {
        console.log('New message received:', message);
        setAllMessages(prev => prev.some(m => m.message_id === message.message_id) ? prev : [message, ...prev]);
        
        // Update chat messages if it's for the current contact
        if (selectedContact && 
            (message.sender_id === selectedContact.user_id || message.receiver_id === selectedContact.user_id)) {
          setChatMessages(prev => {
            if (prev.some(m => m.message_id === message.message_id)) return prev;
            return [...prev, message].sort((a, b) => 
              new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
          });
        }
      });

      // Listen for message read updates
      newSocket.on('message_read', (messageId) => {
        console.log('Message marked as read:', messageId);
        setAllMessages(prev => prev.map(msg => 
          msg.message_id === messageId ? { ...msg, is_read: true } : msg
        ));
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [token, selectedContact]);

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  async function loadContacts() {
    try {
      const data = await authFetch("/api/student/contacts");
      setContacts(data || { teachers: [], parents: [] });
    } catch (e) {
      console.error("Error loading student contacts:", e);
      setContacts({ teachers: [], parents: [] });
    }
    setLoadingContacts(false);
  }

  async function loadAllMessages() {
    try {
      const data = await authFetch("/api/student/messages");
      setAllMessages(data || []);
    } catch (e) {
      console.error("Error loading messages:", e);
      setAllMessages([]);
    }
  }

  async function loadChatMessages(contactId: number) {
    try {
      const allMsgs = await authFetch("/api/student/messages");
      const messagesArray = Array.isArray(allMsgs) ? allMsgs : [];
      const contactMessages = messagesArray.filter((msg: any) => 
        (msg.sender_id === contactId || msg.receiver_id === contactId)
      );
      setChatMessages(contactMessages.sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ));
    } catch (e) {
      console.error(e);
      setChatMessages([]);
    }
  }

  function handleContactClick(contact: any) {
    setSelectedContact(contact);
    loadChatMessages(contact.user_id);
    
    if (Array.isArray(allMessages)) {
      allMessages.forEach((msg: any) => {
        if (msg.sender_id === contact.user_id && !msg.is_read) {
          handleMarkAsRead(msg.message_id);
        }
      });
    }
  }

  async function handleMarkAsRead(messageId: number) {
    try {
      await authFetch(`/api/student/messages/${messageId}/read`, {
        method: "PUT"
      });
      loadAllMessages();
    } catch (e) { console.error(e); }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  const allContacts = useMemo(() => {
    return [...contacts.teachers, ...contacts.parents];
  }, [contacts]);

  function getContactName(contact: any) {
    return contact.full_name || "Unknown";
  }

  function getContactAvatar(contact: any) {
    return contact.full_name?.charAt(0).toUpperCase() || "?";
  }

  function getContactInfo(contact: any) {
    if (contact.type === 'TEACHER') {
      const subject = contact.subject_name ? `${contact.subject_name} • ` : "";
      return `${subject}${contact.class_name || 'Teacher'}`;
    }
    return `${contact.type} - ${contact.relationship}`;
  }

  function getLastMessage(contactId: number) {
    if (!Array.isArray(allMessages)) return "No messages yet";
    const contactMessages = allMessages.filter((msg: any) => 
      msg.sender_id === contactId || msg.receiver_id === contactId
    );
    if (contactMessages.length === 0) return "No messages yet";
    const lastMsg = contactMessages[contactMessages.length - 1];
    const preview = lastMsg.attachment && !lastMsg.content?.trim()
      ? "📎 Attachment"
      : lastMsg.content?.substring(0, 30) + (lastMsg.content?.length > 30 ? "..." : "");
    return preview || "No messages yet";
  }

  function isUnread(contactId: number) {
    if (!Array.isArray(allMessages)) return false;
    return allMessages.some((msg: any) => 
      msg.sender_id === contactId && !msg.is_read
    );
  }

  // File handling
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      alert("File size must be under 50MB");
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

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim() && !attachmentFile) return;
    if (!selectedContact) return;
    
    setSending(true);
    let attachmentUrl: string | undefined;

    try {
      if (attachmentFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("attachment", attachmentFile);
        const backendUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5000";
        const uploadRes = await fetch(`${backendUrl}/api/student/messages/upload-attachment`, {
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

      await authFetch("/api/student/messages", {
        method: "POST",
        body: JSON.stringify({
          receiver_id: selectedContact.user_id,
          content: draft || " ",
          attachment: attachmentUrl,
        })
      });
      setDraft("");
      removeAttachment();
      loadChatMessages(selectedContact.user_id);
      loadAllMessages();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to send message");
    } finally {
      setSending(false);
      setUploading(false);
    }
  }

  async function handleComposeMessage(e: React.FormEvent) {
    e.preventDefault();
    try {
      await authFetch("/api/student/messages", {
        method: "POST",
        body: JSON.stringify(composeForm)
      });
      setMessage("Message sent successfully!");
      setShowCompose(false);
      setComposeForm({ receiver_id: 0, content: "", attachment: "" });
      loadAllMessages();
    } catch (e) {
      setMessage("Failed to send message");
      console.error(e);
    }
  }

  return (
    <main className="h-screen bg-slate-100 dark:bg-slate-900 flex overflow-hidden">
      {/* Sidebar - Contact List */}
      <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Messages</h1>
            <button
              onClick={() => setShowCompose(!showCompose)}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            placeholder="Search contacts..."
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900 dark:text-white"
          />
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {loadingContacts ? (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">Loading contacts...</div>
          ) : allContacts.length === 0 ? (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
              <p className="mb-2">No contacts available</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {contacts.teachers.length === 0 && contacts.parents.length === 0
                  ? "No teachers or parents found."
                  : "Try refreshing the page"}
              </p>
            </div>
          ) : (
            allContacts.map((contact: any) => (
              <div
                key={contact.user_id}
                onClick={() => handleContactClick(contact)}
                className={`flex items-center p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition ${
                  selectedContact?.user_id === contact.user_id ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold mr-3 ${
                  contact.type === 'TEACHER' ? 'bg-purple-500' : 'bg-blue-500'
                }`}>
                  {getContactAvatar(contact)}
                </div>

                {/* Contact Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900 dark:text-white truncate">{getContactName(contact)}</h3>
                    {isUnread(contact.user_id) && (
                      <div className="ml-2 h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{getContactInfo(contact)}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-1">{getLastMessage(contact.user_id)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-100 dark:bg-slate-900">
        {selectedContact ? (
          <>
            {/* Chat Header */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-4 flex items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold mr-3 ${
                selectedContact.type === 'TEACHER' ? 'bg-purple-500' : 'bg-blue-500'
              }`}>
                {getContactAvatar(selectedContact)}
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 dark:text-white">{getContactName(selectedContact)}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{getContactInfo(selectedContact)}</p>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 ? (
                <div className="text-center text-slate-500 dark:text-slate-400 mt-10">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                chatMessages.map((msg: any) => {
                  const isMine = msg.sender_id !== selectedContact.user_id;
                  return (
                    <div
                      key={msg.message_id}
                      className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isMine
                          ? 'bg-emerald-500 text-white'
                          : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white'
                      }`}>
                        {/* Text content */}
                        {msg.content && msg.content.trim() && msg.content !== " " && (
                          <p className="text-sm">{msg.content}</p>
                        )}
                        {/* Attachment */}
                        {msg.attachment && (
                          <AttachmentPreview url={msg.attachment} isMine={isMine} />
                        )}
                        <p className={`text-xs mt-2 ${
                          isMine ? 'text-emerald-100' : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4">
              {/* Attachment preview strip */}
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
                    className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition text-slate-400"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex gap-3">
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
                  className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                <input
                  type="text"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  disabled={sending || uploading || (!draft.trim() && !attachmentFile)}
                  className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {uploading ? "Uploading..." : sending ? "Sending..." : "Send"}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
            <div className="text-center text-slate-500 dark:text-slate-400">
              <svg className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-lg">Select a contact to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Compose Modal */}
      {showCompose && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">New Message</h2>
              <button
                onClick={() => setShowCompose(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"
              >
                <svg className="w-5 h-5 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleComposeMessage} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Recipient</label>
                {loadingContacts ? (
                  <div className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400">
                    Loading contacts...
                  </div>
                ) : (
                  <select
                    value={composeForm.receiver_id || ''}
                    onChange={(e) => setComposeForm({ ...composeForm, receiver_id: Number(e.target.value) })}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  >
                    <option value="">Select a recipient</option>
                    <optgroup label="Teachers">
                      {contacts.teachers.map((teacher: any) => (
                        <option key={teacher.user_id} value={teacher.user_id}>
                          {teacher.full_name} ({teacher.subject_name ? `${teacher.subject_name} • ` : ""}{teacher.class_name})
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Parents">
                      {contacts.parents.map((parent: any) => (
                        <option key={parent.user_id} value={parent.user_id}>
                          {parent.full_name} ({parent.relationship})
                        </option>
                      ))}
                    </optgroup>
                  </select>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Message</label>
                <textarea
                  value={composeForm.content}
                  onChange={(e) => setComposeForm({ ...composeForm, content: e.target.value })}
                  rows={4}
                  required
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
