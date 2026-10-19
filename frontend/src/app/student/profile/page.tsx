"use client";

import { useEffect, useState } from "react";
import { useStudent } from "../StudentContext";

export default function StudentProfile() {
  const { profile, authFetch, refreshProfile } = useStudent();
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [feedback, setFeedback] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) {
      setProfileName(profile.full_name || "");
      setProfilePhone(profile.phone_number || "");
      setProfilePictureUrl(profile.profile_picture_url || "");
      setLoading(false);
    }
  }, [profile]);

  async function handleSaveProfile() {
    try {
      await authFetch("/api/student/profile", {
        method: "PUT",
        body: JSON.stringify({
          full_name: profileName,
          phone_number: profilePhone,
        }),
      });
      setFeedback("Profile updated successfully!");
      refreshProfile();
    } catch (error) {
      setFeedback((error as Error).message);
    }
  }

  async function handleSavePicture() {
    try {
      await authFetch("/api/student/profile/picture", {
        method: "PUT",
        body: JSON.stringify({ profile_picture_url: profilePictureUrl }),
      });
      setFeedback("Profile picture updated!");
      refreshProfile();
    } catch (error) {
      setFeedback((error as Error).message);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMessage("All password fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMessage("Password must be at least 6 characters.");
      return;
    }
    try {
      await authFetch("/api/student/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordMessage("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordMessage((error as Error).message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-sky-200 dark:border-slate-600 border-t-sky-600 dark:border-t-sky-400 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage your profile details and password.</p>
      </div>

      {feedback && (
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4 text-sm text-emerald-800 dark:text-emerald-300">
          {feedback}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* FR-S04: Profile Details */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Personal Information</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-6">
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="Profile"
                  className="w-20 h-20 rounded-2xl object-cover"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-sky-100 dark:bg-sky-900/50 flex items-center justify-center text-sky-700 dark:text-sky-400 font-bold text-2xl">
                  {profileName.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{profile?.full_name || "Student"}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{profile?.student_number || ""}</p>
                {profile?.class && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Class: {profile.class}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Student ID</label>
              <input
                value={profile?.student_id || ""}
                disabled
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Student ID cannot be changed.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
              <input
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                value={profile?.email || ""}
                disabled
                className="w-full rounded-xl border border-slate-200 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900"
              />
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Email cannot be changed.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
              <input
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900"
              />
            </div>

            <button
              onClick={handleSaveProfile}
              className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition"
            >
              Save changes
            </button>
          </div>
        </div>

        {/* FR-S04: Profile Picture & Password */}
        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Profile Picture</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Image URL</label>
                <input
                  value={profilePictureUrl}
                  onChange={(e) => setProfilePictureUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900"
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
              {profilePictureUrl && (
                <div className="rounded-xl bg-slate-50 dark:bg-slate-700 p-4 flex items-center justify-center">
                  <img
                    src={profilePictureUrl}
                    alt="Preview"
                    className="w-24 h-24 rounded-xl object-cover"
                    onError={(e) => (e.currentTarget.src = "")}
                  />
                </div>
              )}
              <button
                onClick={handleSavePicture}
                className="w-full rounded-xl bg-slate-900 dark:bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-slate-600 transition"
              >
                Update picture
              </button>
            </div>
          </div>

          {/* FR-S05: Change Password */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Change Password</h2>
            {passwordMessage && (
              <div className={`rounded-xl p-3 text-sm mb-4 ${
                passwordMessage.includes("successfully") ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" : "bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              }`}>
                {passwordMessage}
              </div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Current password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Confirm new password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-600 px-4 py-2.5 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900"
                />
              </div>
              <button
                onClick={handleChangePassword}
                className="w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition"
              >
                Change password
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
