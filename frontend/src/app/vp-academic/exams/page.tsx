"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { vpAcademicApi } from "@/lib/api";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAcademicTranslations } from "@/translations/vp-academic";

// ==================== CONSTANTS ====================
const EXAM_TYPES = ["MIDTERM", "FINAL", "UNIT_TEST", "PRACTICAL"] as const;
const EXAM_STATUSES = ["APPROVED", "PENDING_APPROVAL", "COMPLETED", "DRAFT"] as const;

// Subject to department mapping for subjects without department data
const SUBJECT_DEPARTMENT_MAP: Record<string, string> = {
  // Natural Sciences
  'Physics': 'Natural',
  'Chemistry': 'Natural',
  'Biology': 'Natural',
  'Mathematics': 'Natural',
  'Advanced Mathematics': 'Natural',
  'Physical Science': 'Natural',
  'Geology': 'Natural',
  'Astronomy': 'Natural',
  
  // Social Sciences
  'History': 'Social',
  'Geography': 'Social',
  'Civics': 'Social',
  'Economics': 'Social',
  'Sociology': 'Social',
  'Psychology': 'Social',
  'Political Science': 'Social',
  'Ethiopian History': 'Social',
  'World History': 'Social',
  
  // Languages (General)
  'English': 'General',
  'Amharic': 'General',
  'Afaan Oromo': 'General',
  'Tigrinya': 'General',
  'French': 'General',
  'Arabic': 'General',
  'Literature': 'General',
  
  // Other (General)
  'Physical Education': 'General',
  'Art': 'General',
  'Music': 'General',
  'Information Technology': 'General',
  'Computer Science': 'General',
  'Technical Drawing': 'General',
  'Entrepreneurship': 'General',
};

// Function to get department from subject name
const getDepartmentFromSubject = (subjectName: string): string => {
  for (const [subject, department] of Object.entries(SUBJECT_DEPARTMENT_MAP)) {
    if (subjectName.toLowerCase().includes(subject.toLowerCase())) {
      return department;
    }
  }
  return 'General';
};

// ==================== TYPES & INTERFACES ====================
type ExamType = typeof EXAM_TYPES[number];
type ExamStatus = typeof EXAM_STATUSES[number];

interface Exam {
  exam_id: number;
  title: string;
  type: ExamType;
  subject: string;
  subject_department?: string;
  class: string;
  exam_date: string;
  exam_time?: string;
  duration_minutes: number;
  total_marks: number;
  status: ExamStatus;
  created_by: string;
  approved_by?: string;
  invigilators: string[];
  room?: string;
  coordinator?: string;
}

interface ClassSubject {
  class_subject_id: number;
  class_id: number;
  subject_id: number;
  school_class?: {
    class_id: number;
    class_name: string;
  };
  subject?: {
    subject_id: number;
    subject_name: string;
    subject_code: string;
    department?: string;
  };
}

interface ExamFormData {
  title: string;
  exam_type: string;
  selected_class_subjects: number[];
  exam_date: string;
  exam_time: string;
  duration_minutes: string;
  total_marks: string;
  room: string;
  invigilators: string;
  coordinator: string;
}

// ==================== UTILITY FUNCTIONS ====================
const formatDate = (dateString: string, language: "en" | "am"): string => {
  return new Date(dateString).toLocaleDateString(language === "am" ? "am-ET" : "en-US");
};

const getStatusColor = (status: ExamStatus): string => {
  const colors: Record<ExamStatus, string> = {
    APPROVED: "bg-orange-50 text-emerald-700 dark:bg-orange-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
    PENDING_APPROVAL: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
    COMPLETED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
    DRAFT: "bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700",
  };
  return colors[status] || colors.DRAFT;
};

const formatStatus = (status: ExamStatus, t: typeof vpAcademicTranslations.en): string => {
  const statusLabels: Record<ExamStatus, string> = {
    APPROVED: t.statusApproved,
    PENDING_APPROVAL: t.statusPendingApproval,
    COMPLETED: t.statusCompleted,
    DRAFT: t.statusDraft,
  };
  return statusLabels[status];
};

const formatExamType = (type: ExamType, t: typeof vpAcademicTranslations.en): string => {
  const typeLabels: Record<ExamType, string> = {
    MIDTERM: t.examTypeMidterm,
    FINAL: t.examTypeFinal,
    UNIT_TEST: t.examTypeUnitTest,
    PRACTICAL: t.examTypePractical,
  };
  return typeLabels[type];
};

// ==================== MAIN COMPONENT ====================
export default function ExamsPage() {
  const { language } = useLanguage();
  const t = vpAcademicTranslations[language];
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const fetchDataRef = useRef<{ isFetching: boolean }>({ isFetching: false });
  const [formData, setFormData] = useState<ExamFormData>({
    title: "",
    exam_type: "MIDTERM",
    selected_class_subjects: [],
    exam_date: "",
    exam_time: "",
    duration_minutes: "",
    total_marks: "",
    room: "",
    invigilators: "",
    coordinator: ""
  });

  // ==================== API FUNCTIONS ====================
  const fetchExams = useCallback(async () => {
    if (fetchDataRef.current.isFetching) return;
    fetchDataRef.current.isFetching = true;
    setLoading(true);
    setError(null);
    try {
      const res = await vpAcademicApi.get('/exams');

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.message || "Failed to fetch exams");
      }

      const data = await res.json();
      const examArray = data.exams || data || [];
      const mappedData = examArray.map((exam: any) => ({
        exam_id: exam.exam_id,
        title: exam.title,
        type: exam.exam_type,
        subject: exam.subject,
        subject_department: exam.subject_department,
        class: exam.class,
        exam_date: exam.exam_date,
        exam_time: exam.exam_time,
        duration_minutes: exam.duration_minutes,
        total_marks: exam.total_marks,
        status: exam.status,
        created_by: exam.created_by,
        approved_by: exam.approved_by,
        invigilators: exam.invigilators || [],
        room: exam.room,
        coordinator: exam.coordinator
      }));
      setExams(mappedData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch exams";
      setError(errorMessage);
      console.error("Error fetching exams:", err);
    } finally {
      setLoading(false);
      fetchDataRef.current.isFetching = false;
    }
  }, []);

  const fetchAllClassSubjects = useCallback(async () => {
    try {
      const res = await vpAcademicApi.get(`/../admin/class-subject`);

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.message || "Failed to fetch class subjects");
      }

      const data = await res.json();
      setClassSubjects(data.class_subjects || []);
    } catch (err) {
      console.error("Error fetching class subjects:", err);
    }
  }, []);

  // --- Initial data loading ---
  useEffect(() => {
    fetchExams();
    fetchAllClassSubjects();
  }, [fetchExams, fetchAllClassSubjects]);

  // ==================== EVENT HANDLERS ====================
  const handleClassSubjectToggle = useCallback((classSubjectId: number) => {
    setFormData(prev => ({
      ...prev,
      selected_class_subjects: prev.selected_class_subjects.includes(classSubjectId)
        ? prev.selected_class_subjects.filter(id => id !== classSubjectId)
        : [...prev.selected_class_subjects, classSubjectId]
    }));
  }, []);

  const resetFormData = useCallback(() => {
    setFormData({
      title: "",
      exam_type: "MIDTERM",
      selected_class_subjects: [],
      exam_date: "",
      exam_time: "",
      duration_minutes: "",
      total_marks: "",
      room: "",
      invigilators: "",
      coordinator: ""
    });
  }, []);

  const handleCreateExam = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (formData.selected_class_subjects.length === 0) {
      alert(t.selectAtLeastOne);
      return;
    }
    
    setIsSubmitting(true);
    try {
      const examPromises = formData.selected_class_subjects.map(class_subject_id =>
        vpAcademicApi.post('/exams', {
          class_subject_id,
          title: formData.title,
          exam_type: formData.exam_type,
          exam_date: formData.exam_date,
          exam_time: formData.exam_time,
          duration_minutes: parseInt(formData.duration_minutes),
          total_marks: parseInt(formData.total_marks),
          room: formData.room,
          coordinator: formData.coordinator
        })
      );

      const results = await Promise.all(examPromises);
      
      const failed = results.filter(res => !res.ok);
      if (failed.length > 0) {
        const errorData = await failed[0].json();
        throw new Error(errorData.error || errorData.message || "Failed to create some exams");
      }

      setShowCreateModal(false);
      resetFormData();
      await fetchExams();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create exam";
      console.error("Error creating exam:", err);
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, resetFormData, fetchExams, isSubmitting]);

  const handleApprove = useCallback(async (examId: number) => {
    try {
      const res = await vpAcademicApi.put(`/exams/${examId}/approve`, {});
      if (res.ok) {
        await fetchExams();
      }
    } catch (err) {
      console.error("Error approving exam:", err);
    }
  }, [fetchExams]);

  const handleDeleteExam = useCallback(async (examIds: number[]) => {
    if (!confirm(t.deleteExamConfirmation)) return;
    
    try {
      await Promise.all(
        examIds.map(id => vpAcademicApi.delete(`/exams/${id}`))
      );
      await fetchExams();
    } catch (err) {
      console.error("Error deleting exam:", err);
      alert(t.failedDeleteExam);
    }
  }, [fetchExams, t]);

  const handleEditExam = useCallback((exam: Exam) => {
    setSelectedExam(exam);
    setFormData({
      title: exam.title,
      exam_type: exam.type,
      selected_class_subjects: [],
      exam_date: new Date(exam.exam_date).toISOString().split('T')[0],
      exam_time: "",
      duration_minutes: exam.duration_minutes.toString(),
      total_marks: exam.total_marks.toString(),
      room: "",
      invigilators: "",
      coordinator: ""
    });
    setShowEditModal(true);
  }, []);

  const handleUpdateExam = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExam || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const res = await vpAcademicApi.put(`/exams/${selectedExam.exam_id}`, {
        title: formData.title,
        exam_type: formData.exam_type,
        exam_date: formData.exam_date,
        duration_minutes: formData.duration_minutes,
        total_marks: formData.total_marks
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || errorData.message || "Failed to update exam");
      }

      setShowEditModal(false);
      setSelectedExam(null);
      await fetchExams();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update exam";
      console.error("Error updating exam:", err);
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedExam, formData, fetchExams, isSubmitting]);

  // ==================== COMPUTED VALUES ====================
  const filteredExams = useMemo(() => {
    return exams.filter(exam => {
      const matchesSearch = !searchQuery || 
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.class.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = !statusFilter || exam.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [exams, searchQuery, statusFilter]);

  const examsByGrade = useMemo(() => {
    const grouped = filteredExams.reduce((acc: Record<string, Record<string, Exam[]>>, exam: Exam) => {
      const gradeMatch = exam.class?.match(/Grade (\d+)/);
      const grade = gradeMatch ? gradeMatch[1] : 'Other';
      const department = exam.subject_department || getDepartmentFromSubject(exam.subject);
      
      if (!acc[grade]) acc[grade] = {};
      if (!acc[grade][department]) acc[grade][department] = [];
      acc[grade][department].push(exam);
      
      return acc;
    }, {});

    Object.keys(grouped).forEach(grade => {
      Object.keys(grouped[grade]).forEach(department => {
        grouped[grade][department].sort((a, b) => {
          const dateA = new Date(a.exam_date);
          const dateB = new Date(b.exam_date);
          
          if (dateA.getTime() !== dateB.getTime()) {
            return dateA.getTime() - dateB.getTime();
          }
          
          const timeA = a.exam_time || '00:00';
          const timeB = b.exam_time || '00:00';
          return timeA.localeCompare(timeB);
        });
      });
    });

    return grouped;
  }, [filteredExams]);

  const sortedGrades = useMemo(() => {
    return Object.keys(examsByGrade).sort((a: string, b: string) => {
      const gradeA = parseInt(a) || 99;
      const gradeB = parseInt(b) || 99;
      return gradeA - gradeB;
    });
  }, [examsByGrade]);

  const sortedDepartments = useMemo(() => {
    return (departments: string[]) => {
      return departments.sort((a: string, b: string) => {
        const order = { 'Natural': 1, 'Social': 2, 'General': 3 };
        const orderA = order[a as keyof typeof order] || 99;
        const orderB = order[b as keyof typeof order] || 99;
        return orderA - orderB;
      });
    };
  }, []);

  // Calculate stats
  const totalExams = exams.length;
  const pendingApprovals = exams.filter(e => e.status === 'PENDING_APPROVAL').length;
  const completedExams = exams.filter(e => e.status === 'COMPLETED').length;
  const upcomingExams = exams.filter(e => new Date(e.exam_date) > new Date()).length;

  // ==================== MAIN RENDER ====================
  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">{t.examinations}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.manageDepartmentExams}</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.totalExams}</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalExams}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <span className="text-2xl">📝</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.pendingApproval}</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendingApprovals}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <span className="text-2xl">⏳</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.completed}</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{completedExams}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{t.upcoming}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{upcomingExams}</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-2xl">📅</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 dark:bg-red-900/30 dark:border-red-800 p-4" role="alert">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="ml-3 text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder={t.searchExams}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:text-white"
        >
          <option value="">{t.allStatuses}</option>
          {EXAM_STATUSES.map((status) => (
            <option key={status} value={status}>{formatStatus(status, t)}</option>
          ))}
        </select>
        {(searchQuery || statusFilter) && (
          <button
            onClick={() => { setSearchQuery(""); setStatusFilter(""); }}
            className="rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
          >
            {t.clear}
          </button>
        )}
        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition shadow-lg shadow-orange-200"
        >
          {t.createExam}
        </button>
      </div>

      {/* Render exams */}
      {loading ? (
        <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 dark:border-orange-400 border-t-transparent" aria-label={t.loadingExams} />
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-300">
            {searchQuery || statusFilter ? t.noTeachersMatchFilters : t.noExamsAvailable}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedGrades.map((grade) => (
            <div key={grade} className="rounded-2xl bg-white shadow-sm border border-slate-200 dark:bg-slate-800 dark:border-slate-700 overflow-hidden">
              <div className="bg-orange-50 dark:bg-orange-900/30 px-6 py-4 border-b border-orange-100 dark:border-orange-800">
                <h2 className="text-lg font-semibold text-orange-900 dark:text-orange-300">{grade === "Other" ? t.other : `${t.grade} ${grade}`}</h2>
              </div>
              <div className="space-y-6 p-6">
                {sortedDepartments(Object.keys(examsByGrade[grade] || {})).map((department) => (
                  <div key={department}>
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">{department}</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wider text-slate-600 dark:border-slate-700 dark:bg-slate-700/50 dark:text-slate-400">
                            <th className="px-6 py-4 font-semibold">{t.examTitle}</th>
                            <th className="px-6 py-4 font-semibold">{t.examType}</th>
                            <th className="px-6 py-4 font-semibold">{t.subjectLabel}</th>
                            <th className="px-6 py-4 font-semibold">{t.examDate}</th>
                            <th className="px-6 py-4 font-semibold">{t.examTime}</th>
                            <th className="px-6 py-4 font-semibold">{t.room}</th>
                            <th className="px-6 py-4 font-semibold">{t.durationMinutes}</th>
                            <th className="px-6 py-4 font-semibold">{t.status}</th>
                            <th className="px-6 py-4 text-right font-semibold">{t.actions}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                          {(examsByGrade[grade][department] || []).map((exam: Exam) => {
                            const gradeMatch = exam.class?.match(/Grade (\d+)/);
                            const gradeNumber = gradeMatch ? gradeMatch[1] : 'Other';
                            return (
                              <tr key={exam.exam_id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{exam.title}</td>
                                <td className="px-6 py-4">
                                  <span className="rounded-full bg-purple-50 dark:bg-purple-900/30 px-3 py-1 text-xs font-medium text-purple-700 dark:text-purple-300">
                                    {formatExamType(exam.type, t)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{exam.subject}</td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{formatDate(exam.exam_date, language)}</td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{exam.exam_time || '-'}</td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{exam.room || '-'}</td>
                                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{exam.duration_minutes} {t.minutesShort}</td>
                                <td className="px-6 py-4">
                                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(exam.status)}`}>
                                    {formatStatus(exam.status, t)}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => handleEditExam(exam)}
                                      className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                                      aria-label={`${t.editExamLabel} ${exam.title}`}
                                    >
                                      {t.edit}
                                    </button>
                                    <button
                                      onClick={() => handleDeleteExam([exam.exam_id])}
                                      className="rounded-lg bg-red-50 dark:bg-red-900/30 px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                                      aria-label={`${t.deleteExamLabel} ${exam.title}`}
                                    >
                                      {t.delete}
                                    </button>
                                    <button
                                      onClick={() => { setSelectedExam(exam); setShowResultsModal(true); }}
                                      className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600 transition"
                                      aria-label={`${t.viewExamResultsLabel} ${exam.title}`}
                                    >
                                      {t.viewResults}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==================== MODALS ==================== */}
      {/* Create Exam Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="create-modal-title">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-6 flex items-center justify-between">
              <h2 id="create-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">{t.createExam}</h2>
              <button
                onClick={() => { setShowCreateModal(false); resetFormData(); }}
                className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateExam} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="exam-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.examTitle} *</label>
                  <input
                    id="exam-title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                    placeholder={t.examTitle}
                  />
                </div>
                <div>
                  <label htmlFor="exam-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.examDate} *</label>
                  <input
                    id="exam-date"
                    type="date"
                    value={formData.exam_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, exam_date: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="exam-time" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.examTime} *</label>
                  <input
                    id="exam-time"
                    type="time"
                    value={formData.exam_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, exam_time: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="exam-duration" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.durationMinutes} *</label>
                  <input
                    id="exam-duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                    required
                    min="1"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                    placeholder="60"
                  />
                </div>
                <div>
                  <label htmlFor="exam-room" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.room} *</label>
                  <input
                    id="exam-room"
                    type="text"
                    value={formData.room}
                    onChange={(e) => setFormData(prev => ({ ...prev, room: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                    placeholder="Room 101"
                  />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="exam-marks" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.totalMarks} *</label>
                  <input
                    id="exam-marks"
                    type="number"
                    value={formData.total_marks}
                    onChange={(e) => setFormData(prev => ({ ...prev, total_marks: e.target.value }))}
                    required
                    min="1"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                    placeholder="100"
                  />
                </div>
                <div>
                  <label htmlFor="exam-coordinator" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.coordinator}</label>
                  <input
                    id="exam-coordinator"
                    type="text"
                    value={formData.coordinator}
                    onChange={(e) => setFormData(prev => ({ ...prev, coordinator: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                    placeholder="Dr. Smith"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="exam-invigilators" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.invigilators}</label>
                <input
                  id="exam-invigilators"
                  type="text"
                  value={formData.invigilators}
                  onChange={(e) => setFormData(prev => ({ ...prev, invigilators: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                  placeholder="Teacher A, Teacher B"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.selectClassSubjects} *</label>
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  <div className="max-h-48 overflow-y-auto">
                    {(() => {
                      const groupedBySubject = classSubjects.reduce((acc: Record<string, Record<string, Record<string, ClassSubject[]>>>, cs) => {
                        const subjectName = cs.subject?.subject_name || 'Unknown';
                        const gradeMatch = cs.school_class?.class_name?.match(/Grade (\d+)/);
                        const grade = gradeMatch ? gradeMatch[1] : 'Other';
                        const department = cs.subject?.department || getDepartmentFromSubject(cs.subject?.subject_name || '');
                        
                        if (!acc[subjectName]) acc[subjectName] = {};
                        if (!acc[subjectName][grade]) acc[subjectName][grade] = {};
                        if (!acc[subjectName][grade][department]) acc[subjectName][grade][department] = [];
                        acc[subjectName][grade][department].push(cs);
                        return acc;
                      }, {});

                      const sortedSubjects = Object.keys(groupedBySubject).sort();

                      return sortedSubjects.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-300">
                          {t.noSubjectsRegistered}
                        </div>
                      ) : (
                        sortedSubjects.map((subjectName) => (
                          <div key={subjectName} className="border-b border-slate-200 dark:border-slate-700 last:border-b-0">
                            <div className="bg-orange-50 dark:bg-orange-900/30 px-4 py-2 font-semibold text-orange-900 dark:text-orange-300 text-sm">
                              {subjectName}
                            </div>
                            {Object.keys(groupedBySubject[subjectName])
                              .sort((a, b) => parseInt(a) - parseInt(b))
                              .map((grade) => (
                                <div key={grade}>
                                  {Object.keys(groupedBySubject[subjectName][grade])
                                    .sort((a, b) => {
                                      const order = { 'Natural': 1, 'Social': 2, 'General': 3 };
                                      const orderA = order[a as keyof typeof order] || 99;
                                      const orderB = order[b as keyof typeof order] || 99;
                                      return orderA - orderB;
                                    })
                                    .map((department) => {
                                      const classSubjectsInGroup = groupedBySubject[subjectName][grade][department];
                                      const allIds = classSubjectsInGroup.map(cs => cs.class_subject_id);
                                      const allSelected = allIds.every(id => formData.selected_class_subjects.includes(id));
                                      const someSelected = allIds.some(id => formData.selected_class_subjects.includes(id));
                                      
                                      return (
                                        <div key={department} className="border-b border-slate-100 dark:border-slate-700 last:border-b-0 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                          <div className="flex items-center gap-3">
                                            <input
                                              type="checkbox"
                                              id={`group-${subjectName}-${grade}-${department}`}
                                              checked={allSelected}
                                              ref={el => {
                                                if (el && someSelected && !allSelected) {
                                                  el.indeterminate = true;
                                                }
                                              }}
                                              onChange={() => {
                                                if (allSelected) {
                                                  setFormData(prev => ({
                                                    ...prev,
                                                    selected_class_subjects: prev.selected_class_subjects.filter(id => !allIds.includes(id))
                                                  }));
                                                } else {
                                                  setFormData(prev => ({
                                                    ...prev,
                                                    selected_class_subjects: [...new Set([...prev.selected_class_subjects, ...allIds])]
                                                  }));
                                                }
                                              }}
                                              className="rounded border-slate-300 dark:border-slate-600 text-orange-600 focus:ring-orange-500 dark:bg-slate-700"
                                            />
                                            <label
                                              htmlFor={`group-${subjectName}-${grade}-${department}`}
                                              className="flex-1 cursor-pointer text-sm text-slate-700 dark:text-slate-300"
                                            >
                                              {subjectName} {grade} {department}
                                            </label>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                              {classSubjectsInGroup.length} {t.classCount}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              ))}
                          </div>
                        ))
                      );
                    })()}
                  </div>
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formData.selected_class_subjects.length} {t.students} {t.selectClassSubjects}
                </p>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); resetFormData(); }}
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t.loading : t.createExam}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Exam Modal */}
      {showEditModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
            <div className="mb-6 flex items-center justify-between">
              <h2 id="edit-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">{t.edit} {t.examinations}</h2>
              <button
                onClick={() => { setShowEditModal(false); setSelectedExam(null); }}
                className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdateExam} className="space-y-4">
              <div>
                <label htmlFor="edit-exam-title" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.examTitle} *</label>
                <input
                  id="edit-exam-title"
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                  placeholder={t.examTitle}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="edit-exam-date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.examDate} *</label>
                  <input
                    id="edit-exam-date"
                    type="date"
                    value={formData.exam_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, exam_date: e.target.value }))}
                    required
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                  />
                </div>
                <div>
                  <label htmlFor="edit-exam-duration" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.durationMinutes} *</label>
                  <input
                    id="edit-exam-duration"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: e.target.value }))}
                    required
                    min="1"
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                    placeholder="60"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="edit-exam-marks" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.totalMarks} *</label>
                <input
                  id="edit-exam-marks"
                  type="number"
                  value={formData.total_marks}
                  onChange={(e) => setFormData(prev => ({ ...prev, total_marks: e.target.value }))}
                  required
                  min="1"
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400 dark:bg-slate-700 dark:text-white"
                  placeholder="100"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowEditModal(false); setSelectedExam(null); }}
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? t.loading : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="results-modal-title">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto dark:bg-slate-800">
            <div className="mb-6 flex items-center justify-between">
              <h2 id="results-modal-title" className="text-xl font-bold text-slate-900 dark:text-white">{t.viewResults} - {selectedExam.title}</h2>
              <button
                onClick={() => setShowResultsModal(false)}
                className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.totalStudents}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">45</p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.passRate}</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">87%</p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.averageScore}</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">76%</p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700/50 p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.score}</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">95%</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{t.studentLabel}</h3>
                <div className="space-y-2">
                  {[
                    { name: "Student A", score: 95, grade: "A" },
                    { name: "Student B", score: 92, grade: "A" },
                    { name: "Student C", score: 90, grade: "A" }
                  ].map((student, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-700/50 px-4 py-2">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{student.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-slate-600 dark:text-slate-400">{student.score}%</span>
                        <span className="rounded-full bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">{student.grade}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowResultsModal(false)}
                  className="flex-1 rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  {t.close}
                </button>
                <button
                  className="flex-1 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
                >
                  {t.generateReport}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
