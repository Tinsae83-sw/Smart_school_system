"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

type TabType = "account" | "notifications" | "security" | "appearance";

export default function SettingPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [activeTab, setActiveTab] = useState<TabType>("account");

  // Account settings form
  const [accountForm, setAccountForm] = useState({
    full_name: "",
    email: "",
    phone_number: ""
  });

  // Notification settings form
  const [notificationForm, setNotificationForm] = useState({
    email_notifications: true,
    assignment_reminders: true,
    grade_notifications: true,
    attendance_alerts: false
  });

  // Security form
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  // Appearance settings form
  const [appearanceForm, setAppearanceForm] = useState({
    timezone: "UTC",
    language: "en",
    theme: "light"
  });

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadSettings(savedToken);
  }, [router]);

  async function loadSettings(token: string) {
    try {
      // Load profile data for account tab
      const profileData = await authFetch("/api/teacher/profile", {}, token);
      setSettings(profileData);

      if (profileData) {
        setAccountForm({
          full_name: profileData.user?.full_name || "",
          email: profileData.user?.email || "",
          phone_number: profileData.user?.phone_number || ""
        });
      }

      // Load settings data for other tabs
      const settingsData = await authFetch("/api/teacher/settings", {}, token);

      if (settingsData) {
        // Parse notification preferences if they're stored as JSON
        const notificationPrefs = typeof settingsData.notification_preferences === 'string'
          ? JSON.parse(settingsData.notification_preferences)
          : settingsData.notification_preferences || {};

        setNotificationForm({
          email_notifications: notificationPrefs.email_notifications ?? true,
          assignment_reminders: notificationPrefs.assignment_reminders ?? true,
          grade_notifications: notificationPrefs.grade_notifications ?? true,
          attendance_alerts: notificationPrefs.attendance_alerts ?? false
        });
        setAppearanceForm({
          timezone: settingsData.timezone || "UTC",
          language: settingsData.language || "en",
          theme: settingsData.theme || "light"
        });
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleSaveAccount(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await authFetch("/api/teacher/profile", {
        method: "PUT",
        body: JSON.stringify(accountForm)
      }, token);
      setMessage("Account settings updated successfully!");
      setMessageType("success");
      loadSettings(token);
    } catch (e) {
      setMessage("Failed to update account settings");
      setMessageType("error");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNotifications(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      // Send notification preferences as part of notification_preferences
      await authFetch("/api/teacher/settings", {
        method: "PUT",
        body: JSON.stringify({
          notification_preferences: notificationForm
        })
      }, token);
      setMessage("Notification preferences updated!");
      setMessageType("success");
      loadSettings(token);
    } catch (e) {
      setMessage("Failed to update notifications");
      setMessageType("error");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAppearance(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await authFetch("/api/teacher/settings", {
        method: "PUT",
        body: JSON.stringify({
          timezone: appearanceForm.timezone,
          language: appearanceForm.language,
          theme: appearanceForm.theme
        })
      }, token);
      setMessage("Appearance settings saved!");
      setMessageType("success");
      loadSettings(token);
    } catch (e) {
      setMessage("Failed to update appearance");
      setMessageType("error");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setMessage("Passwords do not match");
      setMessageType("error");
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setMessage("Password must be at least 6 characters");
      setMessageType("error");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      await authFetch("/api/teacher/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        })
      }, token);
      setMessage("Password changed successfully!");
      setMessageType("success");
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: ""
      });
    } catch (e) {
      setMessage("Failed to change password");
      setMessageType("error");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "account" as TabType, label: "Account", icon: "👤" },
    { id: "notifications" as TabType, label: "Notifications", icon: "🔔" },
    { id: "security" as TabType, label: "Security", icon: "🔒" },
    { id: "appearance" as TabType, label: "Appearance", icon: "🎨" }
  ];

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-slate-600 mt-2">Manage your account preferences and security</p>
        </div>

        {message && (
          <div className={`mb-6 rounded-xl p-4 ${messageType === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-2xl shadow-lg border border-slate-100 p-4 sticky top-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all mb-2 ${
                    activeTab === tab.id
                      ? "bg-emerald-50 text-emerald-700 font-semibold"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Account Tab */}
            {activeTab === "account" && (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Account Information</h2>
                  <p className="text-slate-500 mt-1">Update your personal details</p>
                </div>
                <form onSubmit={handleSaveAccount} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={accountForm.full_name}
                        onChange={(e) => setAccountForm({ ...accountForm, full_name: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                      <input
                        type="email"
                        value={accountForm.email}
                        onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={accountForm.phone_number}
                        onChange={(e) => setAccountForm({ ...accountForm, phone_number: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      />
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-emerald-600 px-8 py-3 text-white font-semibold hover:bg-emerald-700 transition disabled:bg-slate-300 shadow-lg shadow-emerald-200"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === "notifications" && (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Notification Preferences</h2>
                  <p className="text-slate-500 mt-1">Choose how you want to be notified</p>
                </div>
                <form onSubmit={handleSaveNotifications} className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <h3 className="font-semibold text-slate-900">Email Notifications</h3>
                        <p className="text-sm text-slate-500">Receive notifications via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationForm.email_notifications}
                          onChange={(e) => setNotificationForm({ ...notificationForm, email_notifications: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <h3 className="font-semibold text-slate-900">Assignment Reminders</h3>
                        <p className="text-sm text-slate-500">Get reminded about upcoming deadlines</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationForm.assignment_reminders}
                          onChange={(e) => setNotificationForm({ ...notificationForm, assignment_reminders: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <h3 className="font-semibold text-slate-900">Grade Notifications</h3>
                        <p className="text-sm text-slate-500">Notify when grades are posted</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationForm.grade_notifications}
                          onChange={(e) => setNotificationForm({ ...notificationForm, grade_notifications: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <h3 className="font-semibold text-slate-900">Attendance Alerts</h3>
                        <p className="text-sm text-slate-500">Alerts for attendance issues</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationForm.attendance_alerts}
                          onChange={(e) => setNotificationForm({ ...notificationForm, attendance_alerts: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-emerald-600 px-8 py-3 text-white font-semibold hover:bg-emerald-700 transition disabled:bg-slate-300 shadow-lg shadow-emerald-200"
                  >
                    {saving ? "Saving..." : "Save Preferences"}
                  </button>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Security Settings</h2>
                  <p className="text-slate-500 mt-1">Manage your password and security</p>
                </div>
                <form onSubmit={handleChangePassword} className="space-y-6">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Current Password</label>
                      <input
                        type="password"
                        value={passwordForm.current_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                        required
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      />
                    </div>
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">New Password</label>
                        <input
                          type="password"
                          value={passwordForm.new_password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                          required
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          value={passwordForm.confirm_password}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                          required
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-emerald-600 px-8 py-3 text-white font-semibold hover:bg-emerald-700 transition disabled:bg-slate-300 shadow-lg shadow-emerald-200"
                  >
                    {saving ? "Changing..." : "Update Password"}
                  </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-200">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Security Tips</h3>
                  <ul className="space-y-3 text-slate-600">
                    <li className="flex items-start gap-3">
                      <span className="text-emerald-600 mt-1">✓</span>
                      <span>Use a strong password with at least 8 characters, including numbers and symbols</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-emerald-600 mt-1">✓</span>
                      <span>Don't share your password with anyone</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-emerald-600 mt-1">✓</span>
                      <span>Change your password regularly</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === "appearance" && (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-slate-900">Appearance Settings</h2>
                  <p className="text-slate-500 mt-1">Customize your interface</p>
                </div>
                <form onSubmit={handleSaveAppearance} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Timezone</label>
                      <select
                        value={appearanceForm.timezone}
                        onChange={(e) => setAppearanceForm({ ...appearanceForm, timezone: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      >
                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                        <option value="Africa/Addis_Ababa">Africa/Addis_Ababa (EAT)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                        <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Language</label>
                      <select
                        value={appearanceForm.language}
                        onChange={(e) => setAppearanceForm({ ...appearanceForm, language: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      >
                        <option value="en">English</option>
                        <option value="am">አማርኛ (Amharic)</option>
                        <option value="or">Afaan Oromoo (Oromo)</option>
                        <option value="ti">ትግርኛ (Tigrinya)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Theme</label>
                      <select
                        value={appearanceForm.theme}
                        onChange={(e) => setAppearanceForm({ ...appearanceForm, theme: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                      >
                        <option value="light">Light</option>
                        <option value="dark">Dark</option>
                        <option value="system">System Default</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-emerald-600 px-8 py-3 text-white font-semibold hover:bg-emerald-700 transition disabled:bg-slate-300 shadow-lg shadow-emerald-200"
                  >
                    {saving ? "Saving..." : "Save Appearance"}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
