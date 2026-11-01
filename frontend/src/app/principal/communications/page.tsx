"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { principalTranslations } from "@/translations/principal";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/principal";

type Announcement = {
  announcement_id: number;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  target_audience: string;
  status: string;
  announcement_type?: string;
  is_urgent?: boolean;
  attachment_url?: string;
  expire_date?: string;
};

type CreateAnnouncementRequest = {
  title: string;
  content: string;
  target_audience: string;
  expire_date?: string;
};

export default function CommunicationsPage() {
  const { language } = useLanguage();
  const t = principalTranslations[language];
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fetchAnnouncementsRef = useRef<{ isFetching: boolean }>({ isFetching: false });
  const [searchQuery, setSearchQuery] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [formData, setFormData] = useState<CreateAnnouncementRequest>({
    title: "",
    content: "",
    target_audience: "ALL",
    expire_date: "",
  });

  function getAudienceLabel(audience: string) {
    const labels: Record<string, string> = {
      ALL: t.all,
      STUDENTS: t.students,
      TEACHERS: t.teachers,
      PARENTS: t.parents,
      STAFF: t.staff,
    };
    return labels[audience] || audience;
  }

  const fetchAnnouncements = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (fetchAnnouncementsRef.current.isFetching) {
      return;
    }

    fetchAnnouncementsRef.current.isFetching = true;
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/communications/announcements`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: language === "am" ? "ማስታወቂያዎችን መጫን አልተቻለም።" : "Failed to load announcements." });
    } finally {
      setLoading(false);
      fetchAnnouncementsRef.current.isFetching = false;
    }
  }, [language]);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/communications/announcements`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const responseData = await res.json();
        setStatusMessage({ type: "success", message: language === "am" ? "ማስታወቂያው በተሳካ ሁኔታ ተፈጥሯል።" : "Announcement created successfully." });
        setShowModal(false);
        setFormData({ title: "", content: "", target_audience: "ALL", expire_date: "" });
        // Optimistically add to local state
        setAnnouncements(prev => [responseData, ...prev]);
      } else {
        setStatusMessage({ type: "error", message: language === "am" ? "ማስታወቂያ መፍጠር አልተቻለም።" : "Failed to create announcement." });
      }
    } catch (error) {
      setStatusMessage({ type: "error", message: language === "am" ? "ማስታወቂያ መፍጠር አልተቻለም።" : "Failed to create announcement." });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(announcementId: number) {
    if (!confirm(language === "am" ? "ይህን ማስታወቂያ መሰረዝ ይፈልጋሉ?" : "Are you sure you want to delete this announcement?")) return;

    try {
      const res = await fetch(`${API_BASE}/communications/announcements/${announcementId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (res.ok) {
        setStatusMessage({ type: "success", message: language === "am" ? "ማስታወቂያው ተሰርዟል።" : "Announcement deleted successfully." });
        // Optimistically remove from local state
        setAnnouncements(prev => prev.filter(a => a.announcement_id !== announcementId));
      } else {
        setStatusMessage({ type: "error", message: language === "am" ? "ማስታወቂያውን መሰረዝ አልተቻለም።" : "Failed to delete announcement." });
      }
    } catch (error) {
      setStatusMessage({ type: "error", message: language === "am" ? "ማስታወቂያውን መሰረዝ አልተቻለም።" : "Failed to delete announcement." });
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.communications}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.communicationsSubtitle}</p>
      </div>

      {statusMessage && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${
          statusMessage.type === "success" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800" : "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
        }`}>
          {statusMessage.message}
        </div>
      )}

      {/* Actions */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder={t.searchAnnouncements}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
          />
          <select
            value={audienceFilter}
            onChange={(e) => setAudienceFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
          >
            <option value="">{t.allAudiences}</option>
            <option value="ALL">{t.all}</option>
            <option value="STUDENTS">{t.students}</option>
            <option value="TEACHERS">{t.teachers}</option>
            <option value="PARENTS">{t.parents}</option>
            <option value="STAFF">{t.staff}</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
          >
            <option value="">{t.allStatuses}</option>
            <option value="PUBLISHED">{t.published}</option>
            <option value="DRAFT">{t.draft}</option>
            <option value="EXPIRED">{t.expired}</option>
          </select>
          {(searchQuery || audienceFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setAudienceFilter("");
                setStatusFilter("");
              }}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              {t.clearFilters}
            </button>
          )}
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
        >
          {t.createAnnouncement}
        </button>
      </div>

      {/* Announcements List */}
      <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t.loadingPage}</div>
        ) : (
          <>
            {announcements.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t.noAnnouncements}</div>
            ) : (
              <table className="min-w-full">
                <thead className="bg-slate-50 dark:bg-slate-700">
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="px-6 py-3">{t.title}</th>
                    <th className="px-6 py-3">{t.message}</th>
                    <th className="px-6 py-3">{t.targetAudience}</th>
                    <th className="px-6 py-3">{t.createdBy}</th>
                    <th className="px-6 py-3">{t.createdAt}</th>
                    <th className="px-6 py-3">{t.expires}</th>
                    <th className="px-6 py-3">{t.status}</th>
                    <th className="px-6 py-3">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {announcements
                    .filter((announcement) => {
                      const matchesSearch =
                        searchQuery === "" ||
                        announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        announcement.content.toLowerCase().includes(searchQuery.toLowerCase());

                      const matchesAudience =
                        audienceFilter === "" || announcement.target_audience === audienceFilter;

                      // Check if announcement is expired
                      const isExpired = announcement.expire_date && new Date(announcement.expire_date) < new Date();
                      const actualStatus = isExpired ? "EXPIRED" : announcement.status;

                      const matchesStatus =
                        statusFilter === "" || actualStatus === statusFilter;

                      return matchesSearch && matchesAudience && matchesStatus;
                    })
                    .map((announcement) => {
                      // Check if announcement is expired
                      const isExpired = announcement.expire_date && new Date(announcement.expire_date) < new Date();
                      const displayStatus = isExpired ? "EXPIRED" : announcement.status;

                      return (
                      <tr key={announcement.announcement_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                          {announcement.is_urgent && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 px-2 py-0.5 text-xs font-medium mr-2">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              {t.urgent}
                            </span>
                          )}
                          {announcement.title}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 max-w-md truncate">{announcement.content}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{getAudienceLabel(announcement.target_audience)}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{announcement.created_by}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(announcement.created_at).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                          {announcement.expire_date ? new Date(announcement.expire_date).toLocaleDateString() : t.never}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            displayStatus === "PUBLISHED" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" :
                            displayStatus === "EXPIRED" ? "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" :
                            "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                          }`}>
                            {displayStatus === "PUBLISHED" ? t.published : displayStatus === "EXPIRED" ? t.expired : t.draft}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleDelete(announcement.announcement_id)}
                            className="text-sm text-rose-600 hover:text-rose-700 dark:hover:text-rose-400"
                          >
                            {t.delete}
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.createAnnouncement}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.title}</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.message}</label>
                <textarea
                  rows={4}
                  required
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.targetAudience}</label>
                <select
                  required
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                >
                  <option value="ALL">{t.all}</option>
                  <option value="STUDENTS">{t.students}</option>
                  <option value="TEACHERS">{t.teachers}</option>
                  <option value="PARENTS">{t.parents}</option>
                  <option value="STAFF">{t.staff}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.expirationOptional}</label>
                <input
                  type="date"
                  value={formData.expire_date}
                  onChange={(e) => setFormData({ ...formData, expire_date: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.noExpirationHint}</p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                >
                  {t.publish}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
