"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { principalTranslations } from "@/translations/principal";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/principal";

type SchoolSettings = {
  school_id: number;
  school_name: string;
  address: string;
  phone: string;
  email: string;
  principal_name: string;
  academic_year: string;
  current_term: string;
  school_type: string;
  grades_offered: string;
  established_year: number;
  student_capacity: number;
  mission_statement?: string;
  vision_statement?: string;
};

type AcademicCalendar = {
  calendar_id: number;
  academic_year: string;
  term_start_date: string;
  term_end_date: string;
  exam_period_start: string;
  exam_period_end: string;
  break_periods: string;
  status: string;
};

type AcademicPolicy = {
  policy_id: number;
  policy_name: string;
  policy_type: string;
  content: string;
  effective_date: string;
};

export default function SchoolSettingsPage() {
  const { language } = useLanguage();
  const t = principalTranslations[language];
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [calendar, setCalendar] = useState<AcademicCalendar | null>(null);
  const [policies, setPolicies] = useState<AcademicPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "academic" | "policies">("general");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);

  const [formData, setFormData] = useState<Partial<SchoolSettings>>({});
  const [calendarFormData, setCalendarFormData] = useState<Partial<AcademicCalendar>>({});
  const [policyFormData, setPolicyFormData] = useState<Partial<AcademicPolicy>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fetchSettingsRef = useRef<{ isFetching: boolean }>({ isFetching: false });

  const fetchSettings = useCallback(async () => {
    if (fetchSettingsRef.current.isFetching) return;
    fetchSettingsRef.current.isFetching = true;
    setLoading(true);

    try {
      const [settingsRes, calendarRes, policiesRes] = await Promise.all([
        fetch(`${API_BASE}/settings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/academic-calendar`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/settings/policies`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings(settingsData);
      }

      if (calendarRes.ok) {
        const calendarData = await calendarRes.json();
        setCalendar(calendarData);
      }

      if (policiesRes.ok) {
        const policiesData = await policiesRes.json();
        setPolicies(policiesData);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: language === "am" ? "የትምህርት ቤት ቅንብሮችን መጫን አልተቻለም።" : "Failed to load school settings." });
    } finally {
      setLoading(false);
      fetchSettingsRef.current.isFetching = false;
    }
  }, [language]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  function handleEdit() {
    if (settings) {
      setFormData(settings);
      setShowModal(true);
    }
  }

  function handleEditCalendar() {
    if (calendar) {
      setCalendarFormData(calendar);
      setShowCalendarModal(true);
    }
  }

  function handleAddPolicy() {
    setPolicyFormData({});
    setShowPolicyModal(true);
  }

  function handleEditPolicy(policy: AcademicPolicy) {
    setPolicyFormData(policy);
    setShowPolicyModal(true);
  }

  function handleDeletePolicy(policyId: number) {
    if (confirm(language === "am" ? "ይህን ፖሊሲ መሰረዝ ይፈልጋሉ?" : "Are you sure you want to delete this policy?")) {
      fetch(`${API_BASE}/settings/policies/${policyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
        .then((res) => {
          if (res.ok) {
            setStatusMessage({ type: "success", message: language === "am" ? "ፖሊሲው ተሰርዟል።" : "Policy deleted successfully." });
            fetchSettings();
          } else {
            setStatusMessage({ type: "error", message: language === "am" ? "ፖሊሲውን መሰረዝ አልተቻለም።" : "Failed to delete policy." });
          }
        })
        .catch(() => setStatusMessage({ type: "error", message: language === "am" ? "ፖሊሲውን መሰረዝ አልተቻለም።" : "Failed to delete policy." }));
    }
  }

  function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    // Optimistic update
    if (settings) {
      setSettings({ ...settings, ...formData } as SchoolSettings);
    }

    fetch(`${API_BASE}/settings`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(formData),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatusMessage({ type: "success", message: language === "am" ? "የትምህርት ቤቱ ቅንብሮች ተዘምነዋል።" : "School settings updated successfully." });
          setShowModal(false);
          await fetchSettings();
        } else {
          const errorData = await res.json();
          setStatusMessage({ type: "error", message: errorData.error || (language === "am" ? "የትምህርት ቤቱን ቅንብሮች ማዘመን አልተቻለም።" : "Failed to update school settings.") });
          await fetchSettings(); // Revert on error
        }
      })
      .catch(async (error) => {
        setStatusMessage({ type: "error", message: language === "am" ? "የትምህርት ቤቱን ቅንብሮች ማዘመን አልተቻለም።" : "Failed to update school settings." });
        await fetchSettings(); // Revert on error
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  function handleSaveCalendar(e: React.FormEvent) {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    // Optimistic update
    if (calendar) {
      setCalendar({ ...calendar, ...calendarFormData } as AcademicCalendar);
    }

    fetch(`${API_BASE}/academic-calendar`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(calendarFormData),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatusMessage({ type: "success", message: language === "am" ? "የትምህርት ዘመን ቀን መቁጠሪያው ተዘምኗል።" : "Academic calendar updated successfully." });
          setShowCalendarModal(false);
          await fetchSettings();
        } else {
          const errorData = await res.json();
          setStatusMessage({ type: "error", message: errorData.error || (language === "am" ? "የትምህርት ዘመን ቀን መቁጠሪያውን ማዘመን አልተቻለም።" : "Failed to update academic calendar.") });
          await fetchSettings(); // Revert on error
        }
      })
      .catch(async (error) => {
        setStatusMessage({ type: "error", message: language === "am" ? "የትምህርት ዘመን ቀን መቁጠሪያውን ማዘመን አልተቻለም።" : "Failed to update academic calendar." });
        await fetchSettings(); // Revert on error
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  function handleSavePolicy(e: React.FormEvent) {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    const url = policyFormData.policy_id
      ? `${API_BASE}/settings/policies/${policyFormData.policy_id}`
      : `${API_BASE}/settings/policies`;

    const method = policyFormData.policy_id ? "PUT" : "POST";

    // Optimistic update
    if (policyFormData.policy_id) {
      setPolicies(policies.map(p => p.policy_id === policyFormData.policy_id ? { ...p, ...policyFormData } as AcademicPolicy : p));
    } else {
      setPolicies([...policies, { ...policyFormData, policy_id: Date.now() } as AcademicPolicy]);
    }

    fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(policyFormData),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatusMessage({ type: "success", message: language === "am" ? "ፖሊሲው ተቀምጧል።" : "Policy saved successfully." });
          setShowPolicyModal(false);
          await fetchSettings();
        } else {
          const errorData = await res.json();
          setStatusMessage({ type: "error", message: errorData.error || (language === "am" ? "ፖሊሲውን ማስቀመጥ አልተቻለም።" : "Failed to save policy.") });
          await fetchSettings(); // Revert on error
        }
      })
      .catch(async (error) => {
        setStatusMessage({ type: "error", message: language === "am" ? "ፖሊሲውን ማስቀመጥ አልተቻለም።" : "Failed to save policy." });
        await fetchSettings(); // Revert on error
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  function getStatusLabel(status: string) {
    if (language === "en") return status;
    return status === "ACTIVE" ? "ንቁ" : status.replaceAll("_", " ");
  }

  function getSchoolTypeLabel(schoolType: string) {
    if (language === "en") return schoolType;
    const labels: Record<string, string> = {
      Secondary: t.secondarySchool,
      "High School": t.highSchool,
      Preparatory: t.preparatorySchool,
    };
    return labels[schoolType] || schoolType;
  }

  function getTermLabel(term: string) {
    if (language === "en") return term;
    const labels: Record<string, string> = {
      "First Semester": t.firstSemester,
      "Second Semester": t.secondSemester,
    };
    return labels[term] || term;
  }

  function getPolicyTypeLabel(policyType: string) {
    if (language === "en") return policyType;
    const labels: Record<string, string> = {
      ATTENDANCE: t.attendance,
      GRADING: t.grading,
      DISCIPLINE: t.discipline,
      UNIFORM: t.uniform,
      ACADEMIC: t.academic,
      BEHAVIOR: t.behavior,
      OTHER: t.other,
    };
    return labels[policyType] || policyType;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t.schoolSettings}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t.settingsSubtitle}</p>
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
            onClick={() => setActiveTab("general")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "general"
                ? "border-b-2 border-orange-600 text-orange-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.generalInformation}
          </button>
          <button
            onClick={() => setActiveTab("academic")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "academic"
                ? "border-b-2 border-orange-600 text-orange-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.academicCalendar}
          </button>
          <button
            onClick={() => setActiveTab("policies")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "policies"
                ? "border-b-2 border-orange-600 text-orange-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            {t.schoolPolicies}
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700">
          {t.loadingPage}
        </div>
      ) : (
        <>
          {activeTab === "general" && settings && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.schoolInformation}</h2>
                  <button
                    onClick={handleEdit}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
                  >
                    {t.editSettings}
                  </button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.schoolName}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{settings.school_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.principalName}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{settings.principal_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.address}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{settings.address}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.phone}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{settings.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.email}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{settings.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.schoolTypeLabel}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{getSchoolTypeLabel(settings.school_type)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.gradesOfferedLabel}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{settings.grades_offered}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.establishedYear}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{settings.established_year}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.studentCapacity}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{settings.student_capacity}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.currentAcademicYear}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{settings.academic_year}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.currentTerm}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{getTermLabel(settings.current_term)}</p>
                  </div>
                </div>

                {settings.mission_statement && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.missionStatement}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{settings.mission_statement}</p>
                  </div>
                )}

                {settings.vision_statement && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.visionStatement}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{settings.vision_statement}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "academic" && calendar && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.academicCalendar} - {calendar.academic_year}</h2>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      calendar.status === "ACTIVE" ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" : "bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                    }`}>
                      {getStatusLabel(calendar.status)}
                    </span>
                    <button
                      onClick={handleEditCalendar}
                      className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
                    >
                      {t.editCalendar}
                    </button>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.termStartDate}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{new Date(calendar.term_start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.termEndDate}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{new Date(calendar.term_end_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.examPeriodStart}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{new Date(calendar.exam_period_start).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.examPeriodEnd}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{new Date(calendar.exam_period_end).toLocaleDateString()}</p>
                  </div>
                </div>

                {calendar.break_periods && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.breakPeriods}</label>
                    <p className="text-sm text-slate-900 dark:text-white">{calendar.break_periods}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "policies" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.schoolPolicies}</h2>
                  <button
                    onClick={handleAddPolicy}
                    className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition"
                  >
                    {t.addPolicy}
                  </button>
                </div>
                {policies.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{t.noPolicies}</div>
                ) : (
                  <div className="space-y-4">
                    {policies.map((policy) => (
                      <div key={policy.policy_id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-medium text-slate-900 dark:text-white">{policy.policy_name}</h3>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditPolicy(policy)}
                              className="text-sm text-orange-600 hover:text-orange-700 dark:hover:text-orange-400"
                            >
                              {t.edit}
                            </button>
                            <button
                              onClick={() => handleDeletePolicy(policy.policy_id)}
                              className="text-sm text-rose-600 hover:text-rose-700 dark:hover:text-rose-400"
                            >
                              {t.delete}
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">{policy.content}</p>
                        <div className="flex gap-4 text-xs text-slate-400 dark:text-slate-500">
                          <span>{t.type}: {getPolicyTypeLabel(policy.policy_type)}</span>
                          <span>{t.effective}: {new Date(policy.effective_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.editSchoolSettings}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.schoolName}</label>
                  <input
                    type="text"
                    required
                    value={formData.school_name || ""}
                    onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.principalName}</label>
                  <input
                    type="text"
                    required
                    value={formData.principal_name || ""}
                    onChange={(e) => setFormData({ ...formData, principal_name: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.address}</label>
                  <input
                    type="text"
                    required
                    value={formData.address || ""}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.phone}</label>
                  <input
                    type="text"
                    required
                    value={formData.phone || ""}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.email}</label>
                  <input
                    type="email"
                    required
                    value={formData.email || ""}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.schoolTypeLabel}</label>
                  <select
                    required
                    value={formData.school_type || ""}
                    onChange={(e) => setFormData({ ...formData, school_type: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  >
                    <option value="Secondary">{t.secondarySchool}</option>
                    <option value="High School">{t.highSchool}</option>
                    <option value="Preparatory">{t.preparatorySchool}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.gradesOfferedLabel}</label>
                  <input
                    type="text"
                    required
                    value={formData.grades_offered || ""}
                    onChange={(e) => setFormData({ ...formData, grades_offered: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.studentCapacity}</label>
                  <input
                    type="number"
                    required
                    value={formData.student_capacity || 0}
                    onChange={(e) => setFormData({ ...formData, student_capacity: parseInt(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.academicYear}</label>
                  <input
                    type="text"
                    required
                    value={formData.academic_year || ""}
                    onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.currentTerm}</label>
                  <select
                    required
                    value={formData.current_term || ""}
                    onChange={(e) => setFormData({ ...formData, current_term: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  >
                    <option value="First Semester">{t.firstSemester}</option>
                    <option value="Second Semester">{t.secondSemester}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.missionStatement}</label>
                <textarea
                  rows={3}
                  value={formData.mission_statement || ""}
                  onChange={(e) => setFormData({ ...formData, mission_statement: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.visionStatement}</label>
                <textarea
                  rows={3}
                  value={formData.vision_statement || ""}
                  onChange={(e) => setFormData({ ...formData, vision_statement: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                />
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
                  {t.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Calendar Modal */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t.editCalendar}</h2>
              <button
                onClick={() => setShowCalendarModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCalendar} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.academicYear}</label>
                <input
                  type="text"
                  required
                  value={calendarFormData.academic_year || ""}
                  onChange={(e) => setCalendarFormData({ ...calendarFormData, academic_year: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  placeholder={t.academicYearExample}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.termStartDate}</label>
                  <input
                    type="date"
                    required
                    value={calendarFormData.term_start_date ? calendarFormData.term_start_date.split('T')[0] : ""}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, term_start_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.termEndDate}</label>
                  <input
                    type="date"
                    required
                    value={calendarFormData.term_end_date ? calendarFormData.term_end_date.split('T')[0] : ""}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, term_end_date: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.examPeriodStart}</label>
                  <input
                    type="date"
                    required
                    value={calendarFormData.exam_period_start ? calendarFormData.exam_period_start.split('T')[0] : ""}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, exam_period_start: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.examPeriodEnd}</label>
                  <input
                    type="date"
                    required
                    value={calendarFormData.exam_period_end ? calendarFormData.exam_period_end.split('T')[0] : ""}
                    onChange={(e) => setCalendarFormData({ ...calendarFormData, exam_period_end: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.breakPeriods}</label>
                <textarea
                  rows={3}
                  value={calendarFormData.break_periods || ""}
                  onChange={(e) => setCalendarFormData({ ...calendarFormData, break_periods: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  placeholder={t.breakPeriodsExample}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCalendarModal(false)}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                >
                  {t.saveChanges}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Policy Modal */}
      {showPolicyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {policyFormData.policy_id ? t.editPolicy : t.addPolicy}
              </h2>
              <button
                onClick={() => setShowPolicyModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.policyName}</label>
                <input
                  type="text"
                  required
                  value={policyFormData.policy_name || ""}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, policy_name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  placeholder={t.policyNameExample}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.policyType}</label>
                <select
                  required
                  value={policyFormData.policy_type || ""}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, policy_type: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                >
                  <option value="ATTENDANCE">{t.attendance}</option>
                  <option value="GRADING">{t.grading}</option>
                  <option value="DISCIPLINE">{t.discipline}</option>
                  <option value="UNIFORM">{t.uniform}</option>
                  <option value="ACADEMIC">{t.academic}</option>
                  <option value="BEHAVIOR">{t.behavior}</option>
                  <option value="OTHER">{t.other}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.content}</label>
                <textarea
                  rows={5}
                  required
                  value={policyFormData.content || ""}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, content: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                  placeholder={t.policyDetailsPlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.effectiveDate}</label>
                <input
                  type="date"
                  required
                  value={policyFormData.effective_date ? policyFormData.effective_date.split('T')[0] : new Date().toISOString().split('T')[0]}
                  onChange={(e) => setPolicyFormData({ ...policyFormData, effective_date: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 dark:focus:ring-orange-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPolicyModal(false)}
                  className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                >
                  {policyFormData.policy_id ? t.updatePolicy : t.createPolicy}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
