"use client";

import { useEffect, useState } from "react";
import { useStudent } from "../StudentContext";

export default function StudentLearningPage() {
  const { profile, authFetch } = useStudent();
  const [activeTab, setActiveTab] = useState<"classes" | "materials" | "books">("classes");
  
  // Virtual Classes
  const [virtualClasses, setVirtualClasses] = useState<any[]>([]);
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  
  // Course Materials
  const [courseMaterials, setCourseMaterials] = useState<any[]>([]);
  const [materialProgress, setMaterialProgress] = useState<any>({});
  
  // AI Books
  const [aiBooks, setAiBooks] = useState<any[]>([]);
  const [bookProgress, setBookProgress] = useState<any>({});

  useEffect(() => {
    loadVirtualClasses();
    loadCourseMaterials();
    loadAIBooks();
  }, []);

  async function loadVirtualClasses() {
    try {
      const data = await authFetch("/api/student/virtual-classes");
      setVirtualClasses(data.virtualClasses || []);
      setLiveSessions(data.liveSessions || []);
    } catch {
      // Mock data
      setVirtualClasses([
        {
          virtual_class_id: 1,
          title: "Mathematics - Grade 10",
          description: "Advanced Algebra and Functions",
          meeting_link: "https://zoom.us/j/123456789",
          is_active: true,
        },
        {
          virtual_class_id: 2,
          title: "Physics - Grade 10",
          description: "Mechanics and Motion",
          meeting_link: "https://zoom.us/j/987654321",
          is_active: true,
        },
      ]);
      setLiveSessions([
        {
          session_id: 1,
          virtual_class_id: 1,
          title: "Quadratic Equations",
          scheduled_start: new Date(Date.now() + 3600000).toISOString(),
          scheduled_end: new Date(Date.now() + 7200000).toISOString(),
          status: "SCHEDULED",
          recording_url: null,
        },
        {
          session_id: 2,
          virtual_class_id: 1,
          title: "Linear Functions",
          scheduled_start: new Date(Date.now() - 86400000).toISOString(),
          scheduled_end: new Date(Date.now() - 72000000).toISOString(),
          status: "ENDED",
          recording_url: "https://example.com/recording/linear-functions",
        },
      ]);
    }
  }

  async function loadCourseMaterials() {
    try {
      const data = await authFetch("/api/student/course-materials");
      setCourseMaterials(data.materials || []);
      setMaterialProgress(data.progress || {});
    } catch {
      // Mock data
      setCourseMaterials([
        {
          material_id: 1,
          title: "Introduction to Quadratic Equations",
          description: "Learn the basics of quadratic equations",
          material_type: "VIDEO",
          file_url: "https://example.com/video/quadratic-intro",
          duration_minutes: 45,
          order: 1,
        },
        {
          material_id: 2,
          title: "Quadratic Formula Worksheet",
          description: "Practice problems with solutions",
          material_type: "PDF",
          file_url: "https://example.com/pdf/quadratic-worksheet.pdf",
          order: 2,
        },
        {
          material_id: 3,
          title: "Graphing Quadratics",
          description: "How to graph quadratic functions",
          material_type: "VIDEO",
          file_url: "https://example.com/video/graphing-quadratics",
          duration_minutes: 30,
          order: 3,
        },
        {
          material_id: 4,
          title: "Additional Resources",
          description: "Links to external resources",
          material_type: "LINK",
          file_url: "https://khanacademy.org/math/algebra/x2f8bb11595b61c86:quadratics",
          order: 4,
        },
      ]);
      setMaterialProgress({
        1: { completed: true, completion_percentage: 100, time_spent_minutes: 45 },
        2: { completed: false, completion_percentage: 0, time_spent_minutes: 0 },
        3: { completed: false, completion_percentage: 25, time_spent_minutes: 8 },
      });
    }
  }

  async function loadAIBooks() {
    try {
      const data = await authFetch("/api/student/ai-books");
      setAiBooks(data.books || []);
      setBookProgress(data.progress || {});
    } catch {
      // Mock data
      setAiBooks([
        {
          book_id: 1,
          title: "Mathematics for Grade 10",
          subject: "Mathematics",
          grade_level: 10,
          description: "Comprehensive mathematics textbook with AI-powered learning",
          cover_image_url: "https://example.com/covers/math-grade10.jpg",
        },
        {
          book_id: 2,
          title: "Physics Fundamentals",
          subject: "Physics",
          grade_level: 10,
          description: "Interactive physics textbook with simulations",
          cover_image_url: "https://example.com/covers/physics-fundamentals.jpg",
        },
        {
          book_id: 3,
          title: "English Grammar Guide",
          subject: "English",
          grade_level: 10,
          description: "Complete guide to English grammar with exercises",
          cover_image_url: "https://example.com/covers/english-grammar.jpg",
        },
      ]);
      setBookProgress({
        1: { current_page: 45, total_pages: 300, completion_percentage: 15 },
        2: { current_page: 0, total_pages: 250, completion_percentage: 0 },
      });
    }
  }

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case "VIDEO":
        return (
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case "PDF":
        return (
          <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
      case "DOCUMENT":
        return (
          <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case "LINK":
        return (
          <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        );
      case "AUDIO":
        return (
          <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
        );
      default:
        return (
          <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        );
    }
  };

  const getSessionStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Scheduled</span>;
      case "LIVE":
        return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full animate-pulse">Live Now</span>;
      case "ENDED":
        return <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full">Ended</span>;
      case "CANCELLED":
        return <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full">Cancelled</span>;
      default:
        return <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Learning Center</h1>
        <p className="text-sm text-slate-500 mt-1">Access online classes, course materials, and AI books</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("classes")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === "classes"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Online Classes
          </span>
        </button>
        <button
          onClick={() => setActiveTab("materials")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === "materials"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Course Materials
          </span>
        </button>
        <button
          onClick={() => setActiveTab("books")}
          className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
            activeTab === "books"
              ? "border-blue-500 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            AI Books
          </span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "classes" && (
        <div className="space-y-6">
          {/* Virtual Classes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Virtual Classes</h2>
            {virtualClasses.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {virtualClasses.map((vc) => (
                  <div key={vc.virtual_class_id} className="rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-slate-900">{vc.title}</h3>
                        <p className="text-sm text-slate-600 mt-1">{vc.description}</p>
                        {vc.is_active && (
                          <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Active
                          </span>
                        )}
                      </div>
                      <a
                        href={vc.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Join Class
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No virtual classes available.</p>
            )}
          </div>

          {/* Live Sessions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Session Schedule</h2>
            {liveSessions.length > 0 ? (
              <div className="space-y-3">
                {liveSessions.map((session) => (
                  <div key={session.session_id} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900 text-sm">{session.title}</h3>
                          {getSessionStatusBadge(session.status)}
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(session.scheduled_start).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(session.scheduled_end).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      {session.status === "LIVE" && (
                        <a
                          href="#"
                          className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Join Now
                        </a>
                      )}
                      {session.status === "ENDED" && session.recording_url && (
                        <a
                          href={session.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 bg-slate-600 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Watch Recording
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No sessions scheduled.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "materials" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Course Materials</h2>
          {courseMaterials.length > 0 ? (
            <div className="space-y-3">
              {courseMaterials.map((material) => {
                const progress = materialProgress[material.material_id] || { completed: false, completion_percentage: 0, time_spent_minutes: 0 };
                return (
                  <div key={material.material_id} className="rounded-xl bg-slate-50 border border-slate-100 p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        {getMaterialIcon(material.material_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-semibold text-slate-900 text-sm">{material.title}</h3>
                            <p className="text-xs text-slate-500 mt-1">{material.description}</p>
                            <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                              <span className="uppercase">{material.material_type}</span>
                              {material.duration_minutes && <span>• {material.duration_minutes} min</span>}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            {progress.completed ? (
                              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">Completed</span>
                            ) : (
                              <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded-full">{progress.completion_percentage}%</span>
                            )}
                            <a
                              href={material.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                              {progress.completed ? "Review" : "Open"}
                            </a>
                          </div>
                        </div>
                        {!progress.completed && progress.completion_percentage > 0 && (
                          <div className="mt-3">
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${progress.completion_percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No course materials available.</p>
          )}
        </div>
      )}

      {activeTab === "books" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">AI Books</h2>
          {aiBooks.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {aiBooks.map((book) => {
                const progress = bookProgress[book.book_id] || { current_page: 0, total_pages: 0, completion_percentage: 0 };
                return (
                  <div key={book.book_id} className="rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 p-5">
                    <div className="aspect-[3/4] bg-white rounded-lg mb-4 flex items-center justify-center border border-amber-200">
                      {book.cover_image_url ? (
                        <img src={book.cover_image_url} alt={book.title} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <svg className="w-16 h-16 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                      )}
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm">{book.title}</h3>
                    <p className="text-xs text-slate-500 mt-1">{book.subject} • Grade {book.grade_level}</p>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Progress</span>
                        <span>{progress.completion_percentage}%</span>
                      </div>
                      <div className="h-2 bg-amber-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-300"
                          style={{ width: `${progress.completion_percentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Page {progress.current_page} of {progress.total_pages}
                      </p>
                    </div>
                    <button className="mt-4 w-full px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition">
                      Continue Reading
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500">No AI books available.</p>
          )}
        </div>
      )}
    </div>
  );
}
