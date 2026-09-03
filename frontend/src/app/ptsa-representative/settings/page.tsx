"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/ptsa";
const api = authFetchFor("PTSA_REPRESENTATIVE");

type UserProfile = {
  user_id: number;
  full_name: string;
  email: string;
  phone_number: string;
  profile_picture_url?: string;
  preferred_language: string;
};

type PTSAProfile = {
  ptsa_rep_id: number;
  position: string;
  term_start: string;
  term_end: string;
  mission_statement?: string;
  contact_email?: string;
  contact_phone?: string;
};

type NotificationPreferences = {
  email_notifications: boolean;
  sms_notifications: boolean;
  in_app_notifications: boolean;
  meeting_reminders: boolean;
  announcement_alerts: boolean;
  grievance_updates: boolean;
};

export default function SettingsPage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [ptsaProfile, setPTSAProfile] = useState<PTSAProfile | null>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    email_notifications: true,
    sms_notifications: false,
    in_app_notifications: true,
    meeting_reminders: true,
    announcement_alerts: true,
    grievance_updates: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    loadSettingsData();
  }, []);

  async function loadSettingsData() {
    setLoading(true);
    try {
      const [userRes, ptsaRes, prefsRes] = await Promise.all([
        api(`${API_BASE}/settings/profile`),
        api(`${API_BASE}/settings/ptsa-profile`),
        api(`${API_BASE}/settings/notifications`),
      ]);

      if (userRes.ok) setUserProfile(await userRes.json());
      if (ptsaRes.ok) setPTSAProfile(await ptsaRes.json());
      if (prefsRes.ok) setNotificationPrefs(await prefsRes.json());
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function saveUserProfile() {
    if (!userProfile) return;
    setSaving(true);
    try {
      await api(`${API_BASE}/settings/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userProfile),
      });
      alert("Profile updated successfully!");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function savePTSAProfile() {
    if (!ptsaProfile) return;
    setSaving(true);
    try {
      await api(`${API_BASE}/settings/ptsa-profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ptsaProfile),
      });
      alert("PTSA profile updated successfully!");
    } catch (error) {
      console.error("Error updating PTSA profile:", error);
      alert("Failed to update PTSA profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function saveNotificationPreferences() {
    setSaving(true);
    try {
      await api(`${API_BASE}/settings/notifications`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(notificationPrefs),
      });
      alert("Notification preferences saved successfully!");
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      alert("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings & Profile</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your account and PTSA settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "profile"
              ? "border-b-2 border-teal-600 text-teal-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Personal Profile
        </button>
        <button
          onClick={() => setActiveTab("ptsa")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "ptsa"
              ? "border-b-2 border-teal-600 text-teal-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          PTSA Profile
        </button>
        <button
          onClick={() => setActiveTab("notifications")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "notifications"
              ? "border-b-2 border-teal-600 text-teal-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Notifications
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === "documents"
              ? "border-b-2 border-teal-600 text-teal-600"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Documents
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500">Loading settings...</div>
        </div>
      ) : (
        <>
          {activeTab === "profile" && userProfile && (
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Personal Profile</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={userProfile.full_name}
                    onChange={(e) => setUserProfile({...userProfile, full_name: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={userProfile.email}
                    onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={userProfile.phone_number || ""}
                    onChange={(e) => setUserProfile({...userProfile, phone_number: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Language</label>
                  <select
                    value={userProfile.preferred_language}
                    onChange={(e) => setUserProfile({...userProfile, preferred_language: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  >
                    <option value="en">English</option>
                    <option value="am">Amharic</option>
                    <option value="or">Oromo</option>
                    <option value="ti">Tigrinya</option>
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={saveUserProfile}
                  disabled={saving}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "ptsa" && ptsaProfile && (
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">PTSA Group Profile</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Position</label>
                  <input
                    type="text"
                    value={ptsaProfile.position || ""}
                    onChange={(e) => setPTSAProfile({...ptsaProfile, position: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={ptsaProfile.contact_email || ""}
                    onChange={(e) => setPTSAProfile({...ptsaProfile, contact_email: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={ptsaProfile.contact_phone || ""}
                    onChange={(e) => setPTSAProfile({...ptsaProfile, contact_phone: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Mission Statement</label>
                  <textarea
                    value={ptsaProfile.mission_statement || ""}
                    onChange={(e) => setPTSAProfile({...ptsaProfile, mission_statement: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-none"
                    rows={3}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Term Start</label>
                  <input
                    type="date"
                    value={ptsaProfile.term_start ? new Date(ptsaProfile.term_start).toISOString().split('T')[0] : ""}
                    onChange={(e) => setPTSAProfile({...ptsaProfile, term_start: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Term End</label>
                  <input
                    type="date"
                    value={ptsaProfile.term_end ? new Date(ptsaProfile.term_end).toISOString().split('T')[0] : ""}
                    onChange={(e) => setPTSAProfile({...ptsaProfile, term_end: e.target.value})}
                    className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                  />
                </div>
              </div>
              <div className="mt-4">
                <button
                  onClick={savePTSAProfile}
                  disabled={saving}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Notification Preferences</h2>
              <div className="space-y-4">
                {[
                  { key: "email_notifications", label: "Email Notifications" },
                  { key: "sms_notifications", label: "SMS Notifications" },
                  { key: "in_app_notifications", label: "In-App Notifications" },
                  { key: "meeting_reminders", label: "Meeting Reminders" },
                  { key: "announcement_alerts", label: "Announcement Alerts" },
                  { key: "grievance_updates", label: "Grievance Updates" },
                ].map((pref) => (
                  <div key={pref.key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="font-medium text-slate-900 text-sm">{pref.label}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {pref.key === "email_notifications" && "Receive notifications via email"}
                        {pref.key === "sms_notifications" && "Receive notifications via SMS"}
                        {pref.key === "in_app_notifications" && "Receive notifications in the app"}
                        {pref.key === "meeting_reminders" && "Get reminded about upcoming PTSA meetings"}
                        {pref.key === "announcement_alerts" && "Get alerts for new school announcements"}
                        {pref.key === "grievance_updates" && "Get updates on grievance resolutions"}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notificationPrefs[pref.key as keyof NotificationPreferences]}
                        onChange={(e) => setNotificationPrefs({
                          ...notificationPrefs,
                          [pref.key]: e.target.checked
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-teal-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <button
                  onClick={saveNotificationPreferences}
                  disabled={saving}
                  className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Preferences"}
                </button>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-900 mb-4">PTSA Documents</h2>
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a1.125 1.125 0 00-1.125-1.125h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">PTSA Constitution</p>
                        <p className="text-xs text-slate-500">Governing document</p>
                      </div>
                    </div>
                    <button className="rounded-lg bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 transition">
                      View
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a1.125 1.125 0 00-1.125-1.125h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">PTSA Bylaws</p>
                        <p className="text-xs text-slate-500">Operational guidelines</p>
                      </div>
                    </div>
                    <button className="rounded-lg bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 transition">
                      View
                    </button>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a1.125 1.125 0 00-1.125-1.125h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5z" />
                        </svg>
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">Meeting Guidelines</p>
                        <p className="text-xs text-slate-500">Procedures and protocols</p>
                      </div>
                    </div>
                    <button className="rounded-lg bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 transition">
                      View
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
