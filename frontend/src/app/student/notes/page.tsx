"use client";

import { useEffect, useState } from "react";
import { useStudent } from "../StudentContext";
import { FileText, Video, Image as ImageIcon, File, Download, Calendar, FolderOpen } from "lucide-react";

export default function StudentNotes() {
  const { authFetch } = useStudent();
  const [notes, setNotes] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [accessLog, setAccessLog] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"notes" | "materials" | "books" | "log">("materials");

  // Note editing state
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    loadNotes();
    loadMaterials();
    loadBooks();
    loadAccessLog();
  }, []);

  async function loadNotes() {
    try {
      const data = await authFetch("/api/student/notes");
      setNotes(data);
    } catch {
      setNotes([]);
    }
  }

  async function loadMaterials() {
    try {
      const data = await authFetch("/api/student/materials");
      setMaterials(data);
    } catch {
      setMaterials([]);
    }
  }

  async function loadBooks() {
    try {
      const data = await authFetch("/api/student/books");
      setBooks(data);
    } catch {
      setBooks([]);
    }
  }

  async function loadAccessLog() {
    try {
      const data = await authFetch("/api/student/books/access-log");
      setAccessLog(data);
    } catch {
      setAccessLog([]);
    }
  }

  // FR-S35: Create/Save Note
  async function handleSaveNote() {
    if (!noteTitle.trim() || !noteContent.trim()) {
      setFeedback("Title and content are required.");
      return;
    }
    try {
      if (editingNoteId) {
        await authFetch(`/api/student/notes/${editingNoteId}`, {
          method: "PUT",
          body: JSON.stringify({ title: noteTitle, content: noteContent }),
        });
        setFeedback("Note updated successfully!");
      } else {
        await authFetch("/api/student/notes", {
          method: "POST",
          body: JSON.stringify({ title: noteTitle, content: noteContent }),
        });
        setFeedback("Note saved successfully!");
      }
      setNoteTitle("");
      setNoteContent("");
      setEditingNoteId(null);
      loadNotes();
    } catch (error) {
      setFeedback((error as Error).message);
    }
  }

  // FR-S36: Edit Note
  function handleEditNote(note: any) {
    setEditingNoteId(note.note_id);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  }

  // FR-S36: Delete Note
  async function handleDeleteNote(noteId: number) {
    try {
      await authFetch(`/api/student/notes/${noteId}`, { method: "DELETE" });
      setFeedback("Note deleted.");
      loadNotes();
    } catch (error) {
      setFeedback((error as Error).message);
    }
  }

  // FR-S37: Access Book
  async function handleAccessBook(book: any) {
    try {
      await authFetch(`/api/student/books/${book.book_id}/access`, { method: "POST" });
      window.open(book.external_url, "_blank");
      loadAccessLog();
    } catch {
      window.open(book.external_url, "_blank");
    }
  }

  function getFileIcon(fileType: string) {
    switch (fileType) {
      case "PDF":
        return <FileText className="w-5 h-5 text-red-500" />;
      case "VIDEO":
        return <Video className="w-5 h-5 text-purple-500" />;
      case "IMAGE":
        return <ImageIcon className="w-5 h-5 text-blue-500" />;
      case "DOCX":
        return <FileText className="w-5 h-5 text-blue-600" />;
      case "PPTX":
        return <FileText className="w-5 h-5 text-orange-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Notes & Learning Tools</h1>
        <p className="text-sm text-slate-500 mt-1">Take notes and access recommended books.</p>
      </div>

      {feedback && (
        <div className={`rounded-2xl p-4 text-sm ${feedback.includes("success") || feedback.includes("deleted") ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-amber-50 border border-amber-200 text-amber-800"}`}>
          {feedback}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2">
        {(["materials", "notes", "books", "log"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === tab ? "bg-sky-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab === "materials" ? "Materials" : tab === "notes" ? "My Notes" : tab === "books" ? "AI Books" : "Access Log"}
          </button>
        ))}
      </div>

      {activeTab === "materials" && (
        <div className="space-y-3">
          {materials.length > 0 ? (
            materials.map((material: any) => (
              <div key={material.material_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        {getFileIcon(material.file_type)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{material.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="rounded-full bg-sky-50 text-sky-700 px-2 py-0.5 text-xs font-medium border border-sky-100">
                            {material.subject_name}
                          </span>
                          <span className="text-xs text-slate-500">{material.class_name}</span>
                        </div>
                      </div>
                    </div>
                    {material.description && (
                      <p className="text-sm text-slate-600 mt-2">{material.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(material.uploaded_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {material.file_url && (
                    <a
                      href={`http://localhost:5000${material.file_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <FolderOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No materials have been uploaded by your teachers yet.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "notes" && (
        <div className="space-y-6">
          {/* FR-S35, S36: Note Editor */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {editingNoteId ? "Edit Note" : "New Note"}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
                <input
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900"
                  placeholder="Note title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Content</label>
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 resize-y"
                  placeholder="Write your study notes..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveNote}
                  className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition"
                >
                  {editingNoteId ? "Update note" : "Save note"}
                </button>
                {editingNoteId && (
                  <button
                    onClick={() => { setEditingNoteId(null); setNoteTitle(""); setNoteContent(""); }}
                    className="rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Notes List */}
          <div className="space-y-3">
            {notes.length > 0 ? (
              notes.map((note) => (
                <div key={note.note_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{note.title}</h3>
                      <p className="mt-2 text-sm text-slate-600 whitespace-pre-wrap">{note.content}</p>
                      <p className="mt-3 text-xs text-slate-400">
                        {new Date(note.updated_at || note.created_at).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEditNote(note)}
                        className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNote(note.note_id)}
                        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-slate-500">No notes yet. Start writing your first note above!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "books" && (
        /* FR-S37: AI-Supported Books */
        <div className="space-y-4">
          {books.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {books.map((book) => (
                <div key={book.book_id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition">
                  <div className="flex flex-col h-full">
                    {book.cover_image_url && (
                      <div className="w-full h-32 bg-slate-100 rounded-lg mb-4 overflow-hidden">
                        <img
                          src={book.cover_image_url}
                          alt={book.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="rounded-full bg-sky-50 text-sky-700 px-2 py-0.5 text-xs font-medium border border-sky-100">
                          {book.subject_name}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 text-lg mb-1">{book.title}</h3>
                      <p className="text-xs text-slate-500 mb-3">by {book.author}</p>
                      <p className="text-sm text-slate-600 line-clamp-3">{book.description}</p>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                      <button
                        onClick={() => handleAccessBook(book)}
                        className="flex-1 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition"
                      >
                        Open Book
                      </button>
                      {book.preview_url && (
                        <a
                          href={book.preview_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 transition"
                        >
                          Preview
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <FolderOpen className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No recommended books available at this time.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === "log" && (
        /* FR-S38: Book Access Log */
        <div className="space-y-3">
          {accessLog.length > 0 ? (
            accessLog.map((entry) => (
              <div key={entry.access_id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{entry.book?.title || "Unknown Book"}</p>
                    <p className="text-xs text-slate-500">{entry.book?.subject_name || ""}</p>
                  </div>
                  <span className="text-xs text-slate-400">
                    {new Date(entry.accessed_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-slate-500">No books accessed yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
