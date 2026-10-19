"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { useStudent } from "../StudentContext";

const allowedExtensions = ["pdf", "docx", "doc", "jpg", "jpeg", "png"];

export default function StudentAssignments() {
  const { authFetch } = useStudent();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "SUBMITTED" | "GRADED">("ALL");
  const [selectedFiles, setSelectedFiles] = useState<Record<number, File | null>>({});
  const [submitLoading, setSubmitLoading] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    loadAssignments();
  }, []);

  async function loadAssignments() {
    try {
      const data = await authFetch("/api/student/assignments");
      setAssignments(data);
    } catch {
      setAssignments([]);
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>, assignmentId: number) {
    const file = event.target.files?.[0] || null;
    setSelectedFiles((current) => ({ ...current, [assignmentId]: file }));
  }

  async function handleSubmitAssignment(assignmentId: number) {
    const file = selectedFiles[assignmentId];
    if (!file) {
      setFeedback("Please choose a file before submitting.");
      return;
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.includes(extension)) {
      setFeedback(`Invalid file format. Allowed: ${allowedExtensions.join(", ")}.`);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFeedback("File size must be 10MB or smaller.");
      return;
    }

    setSubmitLoading((current) => ({ ...current, [assignmentId]: true }));
    setFeedback("");

    try {
      await authFetch(`/api/student/assignments/${assignmentId}/submit`, {
        method: "POST",
        body: JSON.stringify({
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
        }),
      });
      setFeedback("Submission successful!");
      setSelectedFiles((current) => ({ ...current, [assignmentId]: null }));
      loadAssignments();
    } catch (error) {
      setFeedback((error as Error).message);
    } finally {
      setSubmitLoading((current) => ({ ...current, [assignmentId]: false }));
    }
  }

  const filtered = filter === "ALL" ? assignments : assignments.filter((a) => a.status === filter);
  const counts = {
    ALL: assignments.length,
    OPEN: assignments.filter((a) => a.status === "OPEN").length,
    SUBMITTED: assignments.filter((a) => a.status === "SUBMITTED").length,
    GRADED: assignments.filter((a) => a.status === "GRADED").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Assignments</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">View open work and submit before deadlines.</p>
      </div>

      {feedback && (
        <div className={`rounded-2xl p-4 text-sm ${feedback.includes("successful") ? "bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300" : "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"}`}>
          {feedback}
        </div>
      )}

      {/* FR-S10: Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["ALL", "OPEN", "SUBMITTED", "GRADED"] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              filter === status
                ? "bg-sky-600 text-white"
                : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
            }`}
          >
            {status} ({counts[status]})
          </button>
        ))}
      </div>

      {/* Assignment List */}
      <div className="space-y-4">
        {filtered.length > 0 ? (
          filtered.map((assignment) => {
            const dueDate = new Date(assignment.due_date);
            const canSubmit = dueDate > new Date();
            const isOverdue = !canSubmit && !assignment.submission;
            const file = selectedFiles[assignment.assignment_id];
            const loading = submitLoading[assignment.assignment_id];

            return (
              <div key={assignment.assignment_id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{assignment.subject || `Class ${assignment.class_id}`}</p>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{assignment.title}</h3>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    assignment.status === "OPEN" ? "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800" :
                    assignment.status === "SUBMITTED" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-800" :
                    assignment.status === "GRADED" ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800" :
                    "bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-600"
                  }`}>
                    {assignment.status}
                  </span>
                </div>

                {/* FR-S11: Assignment Details */}
                <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">{assignment.description}</p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                  <span>Due {dueDate.toLocaleDateString()}</span>
                  <span>Max {assignment.max_score} pts</span>
                  {isOverdue && <span className="text-red-600 dark:text-red-400 font-medium">Overdue</span>}
                </div>

                {/* FR-S11: Downloadable Attachments */}
                {assignment.attachments?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Resources</p>
                    <div className="flex flex-wrap gap-2">
                      {assignment.attachments.map((attachment: string) => (
                        <span key={attachment} className="rounded-lg bg-slate-100 dark:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                          {attachment}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* FR-S12, S13, S14: File Upload & Submit */}
                {(canSubmit || assignment.status === "SUBMITTED") && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, assignment.assignment_id)}
                        className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                      />
                      <button
                        onClick={() => handleSubmitAssignment(assignment.assignment_id)}
                        disabled={loading}
                        className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-400 whitespace-nowrap"
                      >
                        {loading ? "Submitting..." : assignment.submission ? "Update submission" : "Submit"}
                      </button>
                    </div>
                    {file && (
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)</p>
                    )}
                  </div>
                )}

                {/* FR-S16: Submitted Files & Timestamp */}
                {assignment.submission && (
                  <div className="mt-4 rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-100 dark:border-slate-600 p-4">
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Submission</p>
                    <div className="space-y-1 text-sm text-slate-700 dark:text-slate-300">
                      <p>File: <span className="font-medium">{assignment.submission.file_url}</span></p>
                      <p>Submitted: {new Date(assignment.submission.submitted_at).toLocaleString()}</p>
                      <p>Status: <span className="font-medium">{assignment.submission.is_late ? "Late" : "On time"}</span></p>
                    </div>
                    {/* FR-S18: Feedback for graded */}
                    {assignment.submission.score != null && (
                      <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 space-y-1 text-sm">
                        <p>Score: <span className="font-bold text-slate-900 dark:text-white">{assignment.submission.score}/{assignment.max_score}</span></p>
                        <p>Grade: <span className="font-bold text-emerald-700 dark:text-emerald-400">{assignment.submission.grade}</span></p>
                        {assignment.submission.feedback && (
                          <p>Feedback: <span className="text-slate-600 dark:text-slate-300">{assignment.submission.feedback}</span></p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-8 text-center">
            <p className="text-slate-500 dark:text-slate-400">No assignments match the selected filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
