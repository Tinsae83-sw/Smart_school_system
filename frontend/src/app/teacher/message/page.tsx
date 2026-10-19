"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";
import { io, Socket } from "socket.io-client";
import MessageNotification from "@/components/MessageNotification";

export default function MessagePage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [message, setMessage] = useState("");
  const [composeForm, setComposeForm] = useState({
    receiver_id: 0,
    content: "",
    attachment: ""
  });
  const [messageText, setMessageText] = useState("");
  const [contacts, setContacts] = useState<{ students: any[], parents: any[] }>({ students: [], parents: [] });
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ message: string; senderName: string } | null>(null);

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadMessages(savedToken);
    loadContacts(savedToken);

    // Set up Socket.IO connection
    const newSocket = io('http://localhost:5000');
    setSocket(newSocket);

    // Get user ID from token and join room
    const decodedToken = JSON.parse(atob(savedToken.split('.')[1]));
    const currentUserId = decodedToken.userId;
    setUserId(currentUserId);

    newSocket.emit('join', currentUserId);

    // Listen for new messages
    newSocket.on('new_message', (message) => {
      console.log('New message received:', message);
      setMessages(prev => [message, ...prev]);
      
      // Show notification if message is from someone else
      if (message.sender_id !== currentUserId) {
        setNotification({
          message: message.content,
          senderName: message.sender?.full_name || 'Unknown'
        });
      }
      
      // Update chat messages if it's for the current contact
      if (selectedContact && 
          (message.sender_id === selectedContact.user_id || message.receiver_id === selectedContact.user_id)) {
        setChatMessages(prev => [...prev, message].sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ));
      }
    });

    // Listen for message read updates
    newSocket.on('message_read', (messageId) => {
      console.log('Message marked as read:', messageId);
      setMessages(prev => prev.map(msg => 
        msg.message_id === messageId ? { ...msg, is_read: true } : msg
      ));
    });

    return () => {
      newSocket.disconnect();
    };
  }, [router, selectedContact]);

  async function loadMessages(token: string) {
    try {
      const data = await authFetch("/api/teacher/messages", {}, token);
      setMessages(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function loadContacts(token: string) {
    try {
      console.log("Loading contacts...");
      const data = await authFetch("/api/teacher/contacts", {}, token);
      console.log("Contacts data received:", data);
      setContacts(data || { students: [], parents: [] });
    } catch (e) { 
      console.error("Error loading contacts:", e); 
      setContacts({ students: [], parents: [] });
    }
    setLoadingContacts(false);
  }

  async function loadChatMessages(contactId: number) {
    try {
      const allMessages = await authFetch("/api/teacher/messages", {}, token);
      const contactMessages = allMessages.filter((msg: any) => 
        (msg.sender_id === contactId || msg.receiver_id === contactId)
      );
      setChatMessages(contactMessages.sort((a: any, b: any) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ));
    } catch (e) { console.error(e); }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!messageText.trim() || !selectedContact) return;
    
    try {
      await authFetch("/api/teacher/messages", {
        method: "POST",
        body: JSON.stringify({
          receiver_id: selectedContact.user_id,
          content: messageText
        })
      }, token);
      setMessageText("");
      loadChatMessages(selectedContact.user_id);
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

  function getContactName(contact: any) {
    return contact.full_name || "Unknown";
  }

  function getContactAvatar(contact: any) {
    return contact.full_name?.charAt(0).toUpperCase() || "?";
  }

  function getContactInfo(contact: any) {
    if (contact.type === 'STUDENT') {
      return `${contact.class_name} - ${contact.student_number}`;
    }
    return contact.relationship || "Parent";
  }

  function getLastMessage(contactId: number) {
    const contactMessages = messages.filter((msg: any) => 
      msg.sender_id === contactId || msg.receiver_id === contactId
    );
    if (contactMessages.length === 0) return "No messages yet";
    const lastMsg = contactMessages[contactMessages.length - 1];
    return lastMsg.content.substring(0, 30) + (lastMsg.content.length > 30 ? "..." : "");
  }

  function isUnread(contactId: number) {
    return messages.some((msg: any) => 
      msg.sender_id === contactId && !msg.is_read
    );
  }

  function handleContactClick(contact: any) {
    setSelectedContact(contact);
    loadChatMessages(contact.user_id);
    
    // Mark messages as read
    messages.forEach((msg: any) => {
      if (msg.sender_id === contact.user_id && !msg.is_read) {
        handleMarkAsRead(msg.message_id);
      }
    });
  }

  if (loading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white">Loading...</div>;
  }

  const allContacts = [
    ...contacts.students.map(s => ({ ...s, type: 'STUDENT' })),
    ...contacts.parents.map(p => ({ ...p, type: 'PARENT' }))
  ];

  return (
    <main className="h-screen bg-slate-100 dark:bg-slate-900 flex overflow-hidden">
      {/* Sidebar - Contact List */}
      <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
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
            className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm text-slate-900 dark:text-white"
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
                {contacts.students.length === 0 && contacts.parents.length === 0
                  ? "No students or parents found. Check if you have classes assigned."
                  : "Try refreshing the page"}
              </p>
            </div>
          ) : (
            allContacts.map((contact: any) => (
              <div
                key={contact.user_id}
                onClick={() => handleContactClick(contact)}
                className={`flex items-center p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 transition ${
                  selectedContact?.user_id === contact.user_id ? 'bg-emerald-50 dark:bg-emerald-900/30' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold mr-3 ${
                  contact.type === 'STUDENT' ? 'bg-blue-500' : 'bg-purple-500'
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
                selectedContact.type === 'STUDENT' ? 'bg-blue-500' : 'bg-purple-500'
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
                chatMessages.map((msg: any) => (
                  <div
                    key={msg.message_id}
                    className={`flex ${msg.sender_id === selectedContact.user_id ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.sender_id === selectedContact.user_id
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white'
                        : 'bg-emerald-500 text-white'
                    }`}>
                      <p className="text-sm">{msg.content}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender_id === selectedContact.user_id ? 'text-slate-400 dark:text-slate-500' : 'text-emerald-100'
                      }`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Message Input */}
            <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 p-4">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                />
                <button
                  type="submit"
                  className="px-6 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition font-semibold"
                >
                  Send
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
                  <div className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                    Loading contacts...
                  </div>
                ) : (
                  <select
                    value={composeForm.receiver_id || ''}
                    onChange={(e) => setComposeForm({ ...composeForm, receiver_id: Number(e.target.value) })}
                    required
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
                  >
                    <option value="">Select a recipient</option>
                    <optgroup label="Students">
                      {contacts.students.map((student: any) => (
                        <option key={student.user_id} value={student.user_id}>
                          {student.full_name} ({student.class_name} - {student.student_number})
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
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 dark:text-white"
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

      {/* Message Notification */}
      {notification && (
        <MessageNotification
          message={notification.message}
          senderName={notification.senderName}
          onClose={() => setNotification(null)}
        />
      )}
    </main>
  );
}
