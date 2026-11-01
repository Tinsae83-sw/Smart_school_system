"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { principalTranslations } from "@/translations/principal";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/principal";

type Grievance = {
  grievance_id: number;
  complainant_name: string;
  complainant_type: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  submitted_date: string;
  resolution?: string;
  resolved_date?: string;
};

type DisciplineRecord = {
  record_id: number;
  student_name: string;
  student_id: string;
  infraction: string;
  description: string;
  severity: string;
  action_taken: string;
  action_date: string;
  reported_by: string;
  status: string;
};

export default function GrievancesPage() {
  const { language } = useLanguage();
  const t = principalTranslations[language];
  const [grievances, setGrievances] = useState<Grievance[]>([]);
  const [disciplineRecords, setDisciplineRecords] = useState<DisciplineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"grievances" | "discipline">("grievances");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedGrievance, setSelectedGrievance] = useState<Grievance | null>(null);

  const [resolutionForm, setResolutionForm] = useState({
    resolution: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fetchDataRef = useRef<{ isFetching: boolean }>({ isFetching: false });

  const fetchData = useCallback(async () => {
    if (fetchDataRef.current.isFetching) return;
    fetchDataRef.current.isFetching = true;
    setLoading(true);

    try {
      const [grievancesRes, disciplineRes] = await Promise.all([
        fetch(`${API_BASE}/grievances`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/discipline`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      if (grievancesRes.ok) {
        const grievancesData = await grievancesRes.json();
        setGrievances(grievancesData);
      }

      if (disciplineRes.ok) {
        const disciplineData = await disciplineRes.json();
        setDisciplineRecords(disciplineData);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: language === "am" ? "መረጃውን መጫን አልተቻለም።" : "Failed to load data." });
    } finally {
      setLoading(false);
      fetchDataRef.current.isFetching = false;
    }
  }, [language]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function handleResolveGrievance(grievance: Grievance) {
    setSelectedGrievance(grievance);
    setResolutionForm({ resolution: grievance.resolution || "" });
    setShowModal(true);
  }

  function handleSubmitResolution(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedGrievance || isSubmitting) return;
    setIsSubmitting(true);

    // Optimistic update
    const updatedGrievances = grievances.map(g =>
      g.grievance_id === selectedGrievance.grievance_id
        ? { ...g, status: "RESOLVED", resolution: resolutionForm.resolution }
        : g
    );
    setGrievances(updatedGrievances);

    fetch(`${API_BASE}/grievances/${selectedGrievance.grievance_id}/resolve`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(resolutionForm),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatusMessage({ type: "success", message: language === "am" ? "ቅሬታው በተሳካ ሁኔታ ተፈትቷል።" : "Grievance resolved successfully." });
          setShowModal(false);
          setSelectedGrievance(null);
          await fetchData();
        } else {
          const errorData = await res.json();
          setStatusMessage({ type: "error", message: errorData.error || (language === "am" ? "ቅሬታውን መፍታት አልተቻለም።" : "Failed to resolve grievance.") });
          // Revert optimistic update on error
          await fetchData();
        }
      })
      .catch(async (error) => {
        setStatusMessage({ type: "error", message: language === "am" ? "ቅሬታውን መፍታት አልተቻለም።" : "Failed to resolve grievance." });
        // Revert optimistic update on error
        await fetchData();
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  function getLabel(value: string) {
    if (language === "en") return value.replaceAll("_", " ");
    const labels: Record<string, string> = {
      HIGH: "ከፍተኛ",
      MEDIUM: "መካከለኛ",
      LOW: "ዝቅተኛ",
      RESOLVED: "የተፈታ",
      IN_PROGRESS: "በሂደት ላይ",
      PENDING: "በመጠባበቅ ላይ",
      CLOSED: "የተዘጋ",
      ACTIVE: "ንቁ",
    };
    return labels[value] || value.replaceAll("_", " ");
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.grievancesTitle}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.grievancesSubtitle}</p>
      </div>

      {statusMessage && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${
          statusMessage.type === "success" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-200 dark:border-orange-800" : "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
        }`}>
          {statusMessage.message}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab("grievances")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "grievances"
                ? "border-b-2 border-orange-600 text-orange-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.grievancesTab} ({grievances.length})
          </button>
          <button
            onClick={() => setActiveTab("discipline")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "discipline"
                ? "border-b-2 border-orange-600 text-orange-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.disciplineRecords} ({disciplineRecords.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700">
          {t.loadingPage}
        </div>
      ) : (
        <>
          {activeTab === "grievances" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.grievancesTab}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.complaintsSubtitle}</p>
                </div>
                {grievances.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t.noGrievances}</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">{t.complainant}</th>
                        <th className="px-6 py-3">{t.type}</th>
                        <th className="px-6 py-3">{t.subject}</th>
                        <th className="px-6 py-3">{t.category}</th>
                        <th className="px-6 py-3">{t.priority}</th>
                        <th className="px-6 py-3">{t.submittedDate}</th>
                        <th className="px-6 py-3">{t.status}</th>
                        <th className="px-6 py-3">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {grievances.map((grievance) => (
                        <tr key={grievance.grievance_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{grievance.complainant_name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{grievance.complainant_type}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{grievance.subject}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{grievance.category}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              grievance.priority === "HIGH" ? "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" :
                              grievance.priority === "MEDIUM" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                              "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                            }`}>
                              {getLabel(grievance.priority)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(grievance.submitted_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              grievance.status === "RESOLVED" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" :
                              grievance.status === "IN_PROGRESS" ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300" :
                              "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            }`}>
                              {getLabel(grievance.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {grievance.status !== "RESOLVED" && (
                              <button
                                onClick={() => handleResolveGrievance(grievance)}
                                className="text-sm text-orange-600 hover:text-orange-700 dark:hover:text-orange-400"
                              >
                                {t.resolve}
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

          {activeTab === "discipline" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.disciplineRecords}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t.studentDisciplineSubtitle}</p>
                </div>
                {disciplineRecords.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t.noDisciplineRecords}</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">{t.student}</th>
                        <th className="px-6 py-3">{t.studentId}</th>
                        <th className="px-6 py-3">{t.infraction}</th>
                        <th className="px-6 py-3">{t.severity}</th>
                        <th className="px-6 py-3">{t.actionTaken}</th>
                        <th className="px-6 py-3">{t.actionDate}</th>
                        <th className="px-6 py-3">{t.reportedBy}</th>
                        <th className="px-6 py-3">{t.status}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {disciplineRecords.map((record) => (
                        <tr key={record.record_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{record.student_name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{record.student_id}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{record.infraction}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              record.severity === "HIGH" ? "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" :
                              record.severity === "MEDIUM" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                              "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                            }`}>
                              {getLabel(record.severity)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{record.action_taken}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(record.action_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{record.reported_by}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              record.status === "CLOSED" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" :
                              record.status === "ACTIVE" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300" :
                              "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                            }`}>
                              {getLabel(record.status)}
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
        </>
      )}

      {/* Resolution Modal */}
      {showModal && selectedGrievance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.resolveGrievance}</h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedGrievance(null);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <div className="mb-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.complainant}</label>
                <p className="text-sm text-slate-900 dark:text-white">{selectedGrievance.complainant_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.subject}</label>
                <p className="text-sm text-slate-900 dark:text-white">{selectedGrievance.subject}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.description}</label>
                <p className="text-sm text-slate-600 dark:text-slate-400">{selectedGrievance.description}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitResolution} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.resolution}</label>
                <textarea
                  rows={4}
                  required
                  value={resolutionForm.resolution}
                  onChange={(e) => setResolutionForm({ resolution: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  placeholder={t.enterResolution}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedGrievance(null);
                  }}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                >
                  {t.submitResolution}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
