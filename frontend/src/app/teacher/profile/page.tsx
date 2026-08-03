"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken, clearAuth } from "@/lib/auth";

export default function ProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [editForm, setEditForm] = useState({
    full_name: "",
    phone_number: "",
    email: "",
    qualification: "",
    profile_picture_url: ""
  });

  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });

  useEffect(() => {
    const token = getToken("TEACHER");
    if (!token) {
      router.push("/login");
      return;
    }
    loadProfile(token);
  }, [router]);

  async function loadProfile(token: string) {
    try {
      const response = await fetch(`http://localhost:5000/api/teacher/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth("TEACHER");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setProfile(data);
      setEditForm({
        full_name: data?.full_name || "",
        phone_number: data?.phone_number || "",
        email: data?.email || "",
        qualification: data?.qualification || "",
        profile_picture_url: data?.profile_picture_url || ""
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function handleLogout() {
    clearAuth("TEACHER");
    router.push("/login");
  }

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const token = getToken("TEACHER");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/teacher/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editForm)
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth("TEACHER");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setMessage("Profile updated successfully!");
      setMessageType("success");
      setEditMode(false);
      loadProfile(token);
    } catch (e) {
      setMessage("Failed to update profile");
      setMessageType("error");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setMessage("");
    const token = getToken("TEACHER");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`http://localhost:5000/api/teacher/upload-profile-picture`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth("TEACHER");
          router.push("/login");
          return;
        }
        throw new Error("Upload failed");
      }

      const data = await response.json();
      setEditForm({ ...editForm, profile_picture_url: data.url });
      setMessage("Profile picture uploaded successfully!");
      setMessageType("success");
    } catch (e) {
      setMessage("Failed to upload profile picture");
      setMessageType("error");
      console.error(e);
    } finally {
      setUploadingImage(false);
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
    const token = getToken("TEACHER");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      const response = await fetch(`http://localhost:5000/api/teacher/change-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: passwordForm.current_password,
          new_password: passwordForm.new_password
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          clearAuth("TEACHER");
          router.push("/login");
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      setMessage("Password changed successfully!");
      setMessageType("success");
      setShowPasswordForm(false);
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
          <p className="text-slate-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            My Profile
          </h1>
          <p className="text-slate-600 mt-2">Manage your personal information and account settings</p>
        </div>

        {message && (
          <div className={`mb-6 rounded-xl p-4 ${messageType === "success" ? "bg-emerald-50 border border-emerald-200 text-emerald-800" : "bg-red-50 border border-red-200 text-red-800"}`}>
            <p className="text-sm font-medium">{message}</p>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-6">
          {/* Cover Image */}
          <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-500"></div>

          <div className="px-8 pb-8">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between -mt-16 mb-6">
              <div className="flex items-end gap-6">
                <div className="relative group">
                  <div className="h-32 w-32 rounded-2xl bg-white shadow-lg flex items-center justify-center overflow-hidden border-4 border-white">
                    {editForm.profile_picture_url ? (
                      <img
                        src={editForm.profile_picture_url}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-5xl font-bold text-emerald-600">
                        {profile?.full_name?.charAt(0) || "T"}
                      </span>
                    )}
                  </div>
                  {editMode && (
                    <label className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                      <span className="text-white text-sm font-medium">
                        {uploadingImage ? "Uploading..." : "Change"}
                      </span>
                    </label>
                  )}
                </div>
                <div className="pb-2">
                  <h2 className="text-2xl font-bold text-slate-900">{profile?.full_name}</h2>
                  <p className="text-emerald-600 font-medium">{profile?.department}</p>
                  <p className="text-slate-500 text-sm">{profile?.email}</p>
                </div>
              </div>
              <button
                onClick={() => setEditMode(!editMode)}
                className={`mt-4 md:mt-0 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                  editMode
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200"
                }`}
              >
                {editMode ? "Cancel" : "Edit Profile"}
              </button>
            </div>

            {editMode ? (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={editForm.phone_number}
                      onChange={(e) => setEditForm({ ...editForm, phone_number: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Email</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Qualification</label>
                    <input
                      type="text"
                      value={editForm.qualification}
                      onChange={(e) => setEditForm({ ...editForm, qualification: e.target.value })}
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
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="rounded-xl bg-slate-100 px-8 py-3 text-slate-700 font-semibold hover:bg-slate-200 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-slate-50 rounded-xl p-5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Employee ID</label>
                  <p className="text-lg font-semibold text-slate-900">{profile?.employee_id || "N/A"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Phone</label>
                  <p className="text-lg font-semibold text-slate-900">{profile?.phone_number || "N/A"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Qualification</label>
                  <p className="text-lg font-semibold text-slate-900">{profile?.qualification || "N/A"}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Joined Date</label>
                  <p className="text-lg font-semibold text-slate-900">
                    {profile?.joined_date ? new Date(profile.joined_date).toLocaleDateString("en-US", { year: 'numeric', month: 'long', day: 'numeric' }) : "N/A"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Change Password Section */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Security</h2>
              <p className="text-slate-500 text-sm mt-1">Change your password to keep your account secure</p>
            </div>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className={`rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
                showPasswordForm
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              {showPasswordForm ? "Cancel" : "Change Password"}
            </button>
          </div>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="space-y-6">
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
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-emerald-600 px-8 py-3 text-white font-semibold hover:bg-emerald-700 transition disabled:bg-slate-300 shadow-lg shadow-emerald-200"
              >
                {saving ? "Changing..." : "Update Password"}
              </button>
            </form>
          )}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full rounded-2xl bg-red-600 px-6 py-4 text-white font-semibold hover:bg-red-700 transition shadow-lg shadow-red-200"
        >
          Logout
        </button>
      </div>
    </main>
  );
}
