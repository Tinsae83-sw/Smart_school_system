"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, clearAuth } from "@/lib/auth";

const BACKEND_URL = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000";

export default function AssignmentPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassSubject, setSelectedClassSubject] = useState<number | null>(null);
  const [selectedClassSubjects, setSelectedClassSubjects] = useState<number[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    due_date: "",
    max_score: 100,
    allow_resubmission: false,
    max_resubmissions: 1,
    resubmission_deadline: ""
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = getToken("TEACHER");
    if (!token) {
      router.push("/login");
      return;
    }
    loadClasses(token);
  }, [router]);

  async function loadClasses(token: string) {
    try {
      const response = await fetch(`${BACKEND_URL}/api/teacher/classes`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth("TEACHER");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setClasses(data);
      if (data.length > 0) {
        setSelectedClassSubject(data[0].class_subject_id);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function handleClassSubjectToggle(classSubjectId: number) {
    setSelectedClassSubjects(prev => 
      prev.includes(classSubjectId) 
        ? prev.filter(id => id !== classSubjectId)
        : [...prev, classSubjectId]
    );
  }

  async function loadAssignments() {
    const token = getToken("TEACHER");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/teacher/assignments`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth("TEACHER");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAssignments(data || []);
    } catch (e) { console.error(e); }
  }

  useEffect(() => {
    loadAssignments();
  }, []);

  async function handleCreateAssignment(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setUploading(true);
    const token = getToken("TEACHER");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      // Convert files to base64 for storage
      const attachmentUrls = await Promise.all(
        attachments.map(async (file) => {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );

      // Create assignment for each selected class sequentially to avoid database overload
      for (const classSubjectId of selectedClassSubjects) {
        const response = await fetch(`${BACKEND_URL}/api/teacher/assignments`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            class_subject_id: classSubjectId,
            attachments: attachmentUrls
          })
        });

        if (!response.ok) {
          if (response.status === 401) {
            clearAuth("TEACHER");
            router.push("/login");
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }
      
      setMessage(`Assignment created successfully for ${selectedClassSubjects.length} class(es)!`);
      setShowCreateForm(false);
      setFormData({ title: "", description: "", due_date: "", max_score: 100, allow_resubmission: false, max_resubmissions: 1, resubmission_deadline: "" });
      setAttachments([]);
      setSelectedClassSubjects([]);
      loadAssignments();
    } catch (e) {
      setMessage("Failed to create assignment");
      console.error(e);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAssignment(assignmentId: number) {
    if (!confirm("Are you sure you want to delete this assignment?")) return;
    const token = getToken("TEACHER");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const response = await fetch(`${BACKEND_URL}/api/teacher/assignments/${assignmentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth("TEACHER");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setMessage("Assignment deleted successfully!");
      loadAssignments();
    } catch (e) {
      setMessage("Failed to delete assignment");
      console.error(e);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setAttachments([...attachments, ...files]);
  }

  function handleRemoveFile(index: number) {
    setAttachments(attachments.filter((_, i) => i !== index));
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Assignment Management</h1>
              <p className="text-slate-600">Create and manage assignments for your classes</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3 text-white font-semibold hover:from-emerald-700 hover:to-emerald-800 transition shadow-lg shadow-emerald-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {showCreateForm ? "Cancel" : "Create Assignment"}
            </button>
          </div>
        </div>
        
        {/* Class Selection Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700">Select Class</label>
              <p className="text-xs text-slate-500">Choose the class for assignment management</p>
            </div>
          </div>
          <select
            value={selectedClassSubject || ''}
            onChange={(e) => setSelectedClassSubject(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
          >
            {classes.map((cls: any) => (
              <option key={cls.class_subject_id} value={cls.class_subject_id}>
                {cls.school_class?.class_name || cls.class_name} - {cls.subject?.subject_name || cls.subject}
              </option>
            ))}
          </select>
        </div>

        {/* Create Assignment Form */}
        {showCreateForm && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-6 mb-6 animate-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Create Assignment</h2>
                <p className="text-xs text-slate-500">Fill in the details below</p>
              </div>
            </div>
            <form onSubmit={handleCreateAssignment} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Select Classes</label>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {classes.map((cls: any) => (
                    <label
                      key={cls.class_subject_id}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                        selectedClassSubjects.includes(cls.class_subject_id)
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedClassSubjects.includes(cls.class_subject_id)}
                        onChange={() => handleClassSubjectToggle(cls.class_subject_id)}
                        className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {cls.school_class?.class_name || cls.class_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {cls.subject?.subject_name || cls.subject}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
                {selectedClassSubjects.length === 0 && (
                  <p className="text-xs text-red-500 mt-2">Please select at least one class</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  placeholder="Enter assignment title"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  placeholder="Enter assignment description and instructions"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition resize-none"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Max Score</label>
                  <input
                    type="number"
                    value={formData.max_score}
                    onChange={(e) => setFormData({ ...formData, max_score: Number(e.target.value) })}
                    required
                    placeholder="100"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                  />
                </div>
              </div>
              {/* File Upload Section */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Attachments</label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-emerald-400 transition cursor-pointer">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <svg className="w-12 h-12 mx-auto text-slate-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-slate-600 mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-400">PDF, DOC, DOCX, images (max 10MB each)</p>
                  </label>
                </div>
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-2">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span className="text-sm text-slate-700">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                          className="text-red-500 hover:text-red-700 transition"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Resubmission Options */}
              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="allow-resubmission"
                    checked={formData.allow_resubmission}
                    onChange={(e) => setFormData({ ...formData, allow_resubmission: e.target.checked })}
                    className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <label htmlFor="allow-resubmission" className="text-sm font-semibold text-slate-700">Allow Resubmission</label>
                </div>
                {formData.allow_resubmission && (
                  <div className="grid gap-4 md:grid-cols-2 pl-7">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Max Resubmissions</label>
                      <input
                        type="number"
                        value={formData.max_resubmissions}
                        onChange={(e) => setFormData({ ...formData, max_resubmissions: Number(e.target.value) })}
                        min="1"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Resubmission Deadline</label>
                      <input
                        type="date"
                        value={formData.resubmission_deadline}
                        onChange={(e) => setFormData({ ...formData, resubmission_deadline: e.target.value })}
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={uploading || selectedClassSubjects.length === 0}
                  className="flex-1 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3 text-white font-semibold hover:from-emerald-700 hover:to-emerald-800 transition shadow-lg shadow-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Creating..." : `Create Assignment${selectedClassSubjects.length > 1 ? ` (${selectedClassSubjects.length} classes)` : ''}`}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="rounded-xl border border-slate-300 px-6 py-3 text-slate-700 font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {message && (
          <div className={`mb-6 rounded-xl p-4 ${message.includes("success") ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
            <div className="flex items-center gap-2">
              {message.includes("success") ? (
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <p className={`text-sm font-medium ${message.includes("success") ? "text-emerald-700" : "text-red-700"}`}>
                {message}
              </p>
            </div>
          </div>
        )}

        {/* Assignments List */}
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No Assignments Yet</h3>
              <p className="text-slate-600 mb-4">Create your first assignment to get started</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="rounded-xl bg-emerald-600 px-6 py-2 text-white font-semibold hover:bg-emerald-700 transition"
              >
                Create Assignment
              </button>
            </div>
          ) : (
            assignments.map((assignment: any) => {
              const dueDate = new Date(assignment.due_date);
              const isOverdue = dueDate < new Date();
              const submissionCount = assignment.submissions?.length || 0;
              
              return (
                <div key={assignment.assignment_id} className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-slate-900">{assignment.title}</h3>
                        {isOverdue && (
                          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Overdue</span>
                        )}
                        {assignment.allow_resubmission && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">Resubmission Allowed</span>
                        )}
                      </div>
                      <p className="text-slate-600 mt-2 mb-4">{assignment.description}</p>
                      
                      {/* Attachments */}
                      {assignment.attachments && assignment.attachments.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-slate-500 mb-2">Attachments:</p>
                          <div className="flex flex-wrap gap-2">
                            {assignment.attachments.map((attachment: string, index: number) => (
                              <a
                                key={index}
                                href={attachment}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 underline"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                Attachment {index + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <div className="flex items-center gap-2 text-slate-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Due: {dueDate.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Max Score: {assignment.max_score}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <span>Submissions: {submissionCount}</span>
                        </div>
                        {assignment.class_subject && (
                          <div className="flex items-center gap-2 text-slate-500">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span>{assignment.class_subject.school_class?.class_name} - {assignment.class_subject.subject?.subject_name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDeleteAssignment(assignment.assignment_id)}
                        className="rounded-xl bg-red-50 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-100 transition flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
