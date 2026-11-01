"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { principalTranslations } from "@/translations/principal";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/principal";

type SIP = {
  sip_id: number;
  title: string;
  description: string;
  academic_year: string;
  term: string;
  status: string;
  submission_date: string;
  approval_date?: string;
  approved_by?: string;
};

type PTSAExecutive = {
  member_id: number;
  name: string;
  role: string;
  term_start: string;
  term_end: string;
  status: string;
  contact_info?: string;
};

type PTSAFeedback = {
  feedback_id: number;
  title: string;
  description: string;
  submitted_by: string;
  submission_date: string;
  status: string;
  response?: string;
  response_date?: string;
};

type GovernanceStats = {
  pending_sip: number;
  approved_sip: number;
  pending_feedback: number;
  active_ptsa_members: number;
};

export default function GovernancePage() {
  const { language } = useLanguage();
  const t = principalTranslations[language];
  const [sips, setSips] = useState<SIP[]>([]);
  const [ptsaExecutives, setPtsaExecutives] = useState<PTSAExecutive[]>([]);
  const [feedback, setFeedback] = useState<PTSAFeedback[]>([]);
  const [stats, setStats] = useState<GovernanceStats>({
    pending_sip: 0,
    approved_sip: 0,
    pending_feedback: 0,
    active_ptsa_members: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "sip" | "ptsa" | "feedback">("overview");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<"response" | "approve" | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fetchGovernanceDataRef = useRef<{ isFetching: boolean }>({ isFetching: false });

  const [responseText, setResponseText] = useState("");

  const fetchGovernanceData = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (fetchGovernanceDataRef.current.isFetching) {
      return;
    }

    fetchGovernanceDataRef.current.isFetching = true;
    setLoading(true);

    try {
      const [sipRes, ptsaRes, feedbackRes] = await Promise.all([
        fetch(`${API_BASE}/governance/sip`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/governance/ptsa/executive`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/governance/ptsa/feedback`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      let sipData, ptsaData, feedbackData;

      if (sipRes.ok) {
        sipData = await sipRes.json();
        setSips(sipData);
      }

      if (ptsaRes.ok) {
        ptsaData = await ptsaRes.json();
        setPtsaExecutives(ptsaData);
      }

      if (feedbackRes.ok) {
        feedbackData = await feedbackRes.json();
        setFeedback(feedbackData);
      }

      // Calculate stats from fetched data
      const pendingSip = sipData?.filter((s: any) => s.status === "PENDING" || s.status === "SUBMITTED").length || 0;
      const approvedSip = sipData?.filter((s: any) => s.status === "APPROVED").length || 0;
      const pendingFeedback = feedbackData?.filter((f: any) => f.status === "PENDING").length || 0;
      const activeMembers = ptsaData?.filter((m: any) => m.status === "ACTIVE").length || 0;

      setStats({
        pending_sip: pendingSip,
        approved_sip: approvedSip,
        pending_feedback: pendingFeedback,
        active_ptsa_members: activeMembers,
      });
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: language === "am" ? "የአስተዳደር መረጃን መጫን አልተቻለም።" : "Failed to load governance data." });
    } finally {
      setLoading(false);
      fetchGovernanceDataRef.current.isFetching = false;
    }
  }, [language]);

  useEffect(() => {
    fetchGovernanceData();
  }, [fetchGovernanceData]);

  async function handleApproveSIP(sipId: number) {
    if (!confirm(language === "am" ? "ይህን የትምህርት ቤት ማሻሻያ ዕቅድ ማጽደቅ ይፈልጋሉ?" : "Are you sure you want to approve this School Improvement Plan?")) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/governance/sip/${sipId}/approve`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (res.ok) {
        setStatusMessage({ type: "success", message: language === "am" ? "የትምህርት ቤት ማሻሻያ ዕቅዱ ጸድቋል።" : "SIP approved successfully." });
        // Optimistically update local state
        setSips(prev => prev.map(s => s.sip_id === sipId ? { ...s, status: "APPROVED" } : s));
        setStats(prev => ({ ...prev, pending_sip: prev.pending_sip - 1, approved_sip: prev.approved_sip + 1 }));
      } else {
        const errorData = await res.json();
        setStatusMessage({ type: "error", message: errorData.error || (language === "am" ? "የትምህርት ቤት ማሻሻያ ዕቅዱን ማጽደቅ አልተቻለም።" : "Failed to approve SIP.") });
      }
    } catch (error) {
      setStatusMessage({ type: "error", message: language === "am" ? "የትምህርት ቤት ማሻሻያ ዕቅዱን ማጽደቅ አልተቻለም።" : "Failed to approve SIP." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRespondToFeedback(feedbackId: number) {
    if (!responseText.trim()) {
      setStatusMessage({ type: "error", message: language === "am" ? "እባክዎ ምላሽዎን ያስገቡ።" : "Please enter a response." });
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/governance/ptsa/feedback/${feedbackId}/respond`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: JSON.stringify({ response: responseText }),
      });

      if (res.ok) {
        setStatusMessage({ type: "success", message: language === "am" ? "ምላሹ በተሳካ ሁኔታ ቀርቧል።" : "Response submitted successfully." });
        setShowModal(false);
        setResponseText("");
        // Optimistically update local state
        setFeedback(prev => prev.map(f => f.feedback_id === feedbackId ? { ...f, status: "RESPONDED", response: responseText } : f));
        setStats(prev => ({ ...prev, pending_feedback: prev.pending_feedback - 1 }));
      } else {
        const errorData = await res.json();
        setStatusMessage({ type: "error", message: errorData.error || (language === "am" ? "ምላሹን ማቅረብ አልተቻለም።" : "Failed to submit response.") });
      }
    } catch (error) {
      setStatusMessage({ type: "error", message: language === "am" ? "ምላሹን ማቅረብ አልተቻለም።" : "Failed to submit response." });
    } finally {
      setIsSubmitting(false);
    }
  }

  function openResponseModal(feedback: PTSAFeedback) {
    setSelectedItem(feedback);
    setResponseText(feedback.response || "");
    setModalType("response");
    setShowModal(true);
  }

  function openApproveModal(sip: SIP) {
    setSelectedItem(sip);
    setModalType("approve");
    setShowModal(true);
  }

  function getStatusLabel(status: string) {
    if (language === "en") return status;
    const labels: Record<string, string> = {
      PENDING: "በመጠባበቅ ላይ",
      SUBMITTED: "የቀረበ",
      APPROVED: "የጸደቀ",
      ACTIVE: "ንቁ",
      RESPONDED: "ምላሽ የተሰጠ",
    };
    return labels[status] || status;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.governanceTitle}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.governanceSubtitle}</p>
      </div>

      {statusMessage && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${
          statusMessage.type === "success"
            ? "bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800"
            : "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
        }`}>
          {statusMessage.message}
        </div>
      )}

      {/* Stats Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t.pendingSips}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{stats.pending_sip}</p>
            </div>
            <div className="rounded-full bg-amber-50 dark:bg-amber-900/30 p-3">
              <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t.approvedSips}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{stats.approved_sip}</p>
            </div>
            <div className="rounded-full bg-orange-50 dark:bg-orange-900/30 p-3">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t.pendingFeedback}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{stats.pending_feedback}</p>
            </div>
            <div className="rounded-full bg-sky-50 dark:bg-sky-900/30 p-3">
              <svg className="w-6 h-6 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{t.activePtsaMembers}</p>
              <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{stats.active_ptsa_members}</p>
            </div>
            <div className="rounded-full bg-indigo-50 dark:bg-indigo-900/30 p-3">
              <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "overview"
                ? "border-b-2 border-navy-600 text-navy-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.overview}
          </button>
          <button
            onClick={() => setActiveTab("sip")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "sip"
                ? "border-b-2 border-navy-600 text-navy-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.schoolImprovementPlans} ({sips.length})
          </button>
          <button
            onClick={() => setActiveTab("ptsa")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "ptsa"
                ? "border-b-2 border-navy-600 text-navy-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.ptsaExecutive} ({ptsaExecutives.length})
          </button>
          <button
            onClick={() => setActiveTab("feedback")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "feedback"
                ? "border-b-2 border-navy-600 text-navy-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.ptsaFeedback} ({feedback.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700">
          {t.loadingPage}
        </div>
      ) : (
        <>
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t.quickActions}</h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <button
                    onClick={() => setActiveTab("sip")}
                    className="rounded-lg bg-navy-50 dark:bg-navy-900/30 p-4 text-left hover:bg-navy-100 dark:hover:bg-navy-900/50 transition"
                  >
                    <svg className="w-6 h-6 text-navy-600 dark:text-navy-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{t.reviewSips}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stats.pending_sip} {t.pendingApproval}</p>
                  </button>

                  <button
                    onClick={() => setActiveTab("feedback")}
                    className="rounded-lg bg-sky-50 dark:bg-sky-900/30 p-4 text-left hover:bg-sky-100 dark:hover:bg-sky-900/50 transition"
                  >
                    <svg className="w-6 h-6 text-sky-600 dark:text-sky-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{t.respondFeedback}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stats.pending_feedback} {t.pendingResponse}</p>
                  </button>

                  <button
                    onClick={() => setActiveTab("ptsa")}
                    className="rounded-lg bg-indigo-50 dark:bg-indigo-900/30 p-4 text-left hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition"
                  >
                    <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{t.managePtsa}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{stats.active_ptsa_members} {t.activeMembers}</p>
                  </button>
                </div>
              </div>

              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">{t.recentActivity}</h2>
                <div className="space-y-4">
                  {sips.slice(0, 3).map((sip) => (
                    <div key={sip.sip_id} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{sip.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sip.academic_year} - {t.termLabel} {sip.term}</p>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                        sip.status === "APPROVED" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" :
                        sip.status === "PENDING" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                        "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                      }`}>
                        {getStatusLabel(sip.status)}
                      </span>
                    </div>
                  ))}
                  {sips.length === 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">{t.noRecentSipActivity}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "sip" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.schoolImprovementPlans}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.reviewApproveInitiatives}</p>
                </div>
                {sips.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t.noSipsFound}</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">{t.title}</th>
                        <th className="px-6 py-3">{t.academicYear}</th>
                        <th className="px-6 py-3">{t.term}</th>
                        <th className="px-6 py-3">{t.submitted}</th>
                        <th className="px-6 py-3">{t.status}</th>
                        <th className="px-6 py-3">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {sips.map((sip) => (
                        <tr key={sip.sip_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{sip.title}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{sip.academic_year}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{sip.term}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(sip.submission_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              sip.status === "APPROVED" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" :
                              sip.status === "PENDING" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                              "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                            }`}>
                              {getStatusLabel(sip.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {sip.status === "PENDING" && (
                              <button
                                onClick={() => handleApproveSIP(sip.sip_id)}
                                disabled={isSubmitting}
                                className="text-sm text-orange-600 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {t.approve}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === "ptsa" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.ptsaExecutive}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.managePtsaLeadership}</p>
                </div>
                {ptsaExecutives.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t.noPtsaMembers}</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">{t.name}</th>
                        <th className="px-6 py-3">{t.role}</th>
                        <th className="px-6 py-3">{t.termStart}</th>
                        <th className="px-6 py-3">{t.termEnd}</th>
                        <th className="px-6 py-3">{t.contact}</th>
                        <th className="px-6 py-3">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {ptsaExecutives.map((member) => (
                        <tr key={member.member_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{member.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{member.role}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(member.term_start).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(member.term_end).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{member.contact_info || "N/A"}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              member.status === "ACTIVE" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                            }`}>
                              {getStatusLabel(member.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {activeTab === "feedback" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.ptsaFeedback}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.ptsaFeedbackSubtitle}</p>
                </div>
                {feedback.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t.noFeedbackFound}</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">{t.title}</th>
                        <th className="px-6 py-3">{t.description}</th>
                        <th className="px-6 py-3">{t.submittedBy}</th>
                        <th className="px-6 py-3">{t.date}</th>
                        <th className="px-6 py-3">{t.status}</th>
                        <th className="px-6 py-3">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:border-slate-700">
                      {feedback.map((item) => (
                        <tr key={item.feedback_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{item.title}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{item.description}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{item.submitted_by}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(item.submission_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              item.status === "RESPONDED" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" :
                              item.status === "PENDING" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                              "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                            }`}>
                              {getStatusLabel(item.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <button
                              onClick={() => openResponseModal(item)}
                              className="text-sm text-navy-600 hover:text-navy-700"
                            >
                              {item.status === "PENDING" ? t.respond : t.viewResponse}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Response Modal */}
      {showModal && modalType === "response" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-800 p-4 sm:p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.respondToFeedbackTitle}</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setResponseText("");
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.feedbackLabel}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">{selectedItem?.description}</p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.yourResponse}</label>
              <textarea
                value={responseText}
                onChange={(e) => setResponseText(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 dark:focus:ring-navy-400"
                placeholder={t.enterResponse}
              />
            </div>

            {selectedItem?.response && (
              <div className="mb-4">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.previousResponseLabel}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 bg-orange-50 dark:bg-orange-900/30 p-3 rounded-lg">{selectedItem.response}</p>
              </div>
            )}

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setResponseText("");
                }}
                className="w-full sm:w-auto rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => handleRespondToFeedback(selectedItem.feedback_id)}
                disabled={isSubmitting}
                className="w-full sm:w-auto rounded-lg bg-navy-600 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? t.submitting : t.submitResponse}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
