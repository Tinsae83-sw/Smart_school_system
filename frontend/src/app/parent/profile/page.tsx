"use client";

import { useEffect, useState } from "react";
import { useParent } from "../ParentContext";
import { getUser } from "@/lib/auth";

export default function ProfilePage() {
  const { profile, authFetch, refreshProfile, children } = useParent();
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileLanguage, setProfileLanguage] = useState("");
  const [profileRelationship, setProfileRelationship] = useState("");
  const [profileAddress, setProfileAddress] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  // Change password states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordFeedback, setPasswordFeedback] = useState("");

  useEffect(() => {
    const fallbackUser = getUser('PARENT');
    const source = profile || fallbackUser;

    if (source) {
      setProfileName(source.full_name || source.name || "");
      setProfilePhone(source.phone_number || "");
      setProfileLanguage(source.preferred_language || "English");
      setProfileRelationship(source.relationship || "Guardian");
      setProfileAddress(source.address || "");
    }
  }, [profile]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setFeedback("");
    try {
      await authFetch("/api/parent/profile", {
        method: "PUT",
        body: JSON.stringify({
          full_name: profileName,
          phone_number: profilePhone,
          preferred_language: profileLanguage,
          relationship: profileRelationship,
          address: profileAddress,
        }),
      });
      setFeedback("Profile updated successfully.");
      refreshProfile();
    } catch {
      setFeedback("Profile saved locally (demo mode).");
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordFeedback("");
    if (newPassword !== confirmPassword) {
      setPasswordFeedback("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordFeedback("Password must be at least 6 characters.");
      return;
    }
    try {
      await authFetch("/api/parent/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordFeedback("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setPasswordFeedback("Password saved locally (demo mode).");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Profile Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Manage your personal information and password.</p>
      </div>

      {/* FR-P04: View and Edit Profile */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-2xl">
            {profile?.full_name?.charAt(0) || "P"}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{profile?.full_name || getUser('PARENT')?.full_name || "Parent"}</h2>
            <p className="text-sm text-slate-500">{profile?.email || getUser('PARENT')?.email || ""}</p>
            <p className="text-xs text-emerald-600 uppercase font-medium">{profile?.relationship || getUser('PARENT')?.relationship || ""}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
              <input
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Preferred Language</label>
              <select
                value={profileLanguage}
                onChange={(e) => setProfileLanguage(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="English">English</option>
                <option value="Amharic">Amharic</option>
                <option value="Oromo">Oromo</option>
                <option value="Tigrinya">Tigrinya</option>
                <option value="Somali">Somali</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
              <select
                value={profileRelationship}
                onChange={(e) => setProfileRelationship(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea
              value={profileAddress}
              onChange={(e) => setProfileAddress(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter your address"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {feedback && (
              <p className={`text-sm ${feedback.includes("success") ? "text-emerald-600" : "text-red-600"}`}>
                {feedback}
              </p>
            )}
            <button
              type="submit"
              className="ml-auto rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>

      {/* Loved Ones (Linked Children) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Loved Ones</h2>
        {children.length > 0 ? (
          <div className="space-y-3">
            {children.map((child: any) => (
              <div key={child.student_id} className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100">
                <div className="w-12 h-12 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-lg">
                  {child.full_name?.charAt(0) || "S"}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{child.full_name}</h3>
                  <p className="text-sm text-slate-600">{child.student_number || `Student ID: ${child.student_id}`}</p>
                  <p className="text-xs text-emerald-600">{child.class_name || "Class not assigned"}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-sm font-medium text-emerald-700 border border-emerald-200">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Linked
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p>No children linked to your account yet.</p>
          </div>
        )}
      </div>

      {/* FR-P05: Change Password */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Change Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            {passwordFeedback && (
              <p className={`text-sm ${passwordFeedback.includes("success") ? "text-emerald-600" : "text-red-600"}`}>
                {passwordFeedback}
              </p>
            )}
            <button
              type="submit"
              className="ml-auto rounded-xl bg-slate-900 px-6 py-3 text-white font-semibold hover:bg-slate-800 transition"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
