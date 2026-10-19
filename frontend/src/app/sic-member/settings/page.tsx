"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/sic";

type Profile = {
  sic_member_id: number;
  user_id: number;
  role: string | null;
  term_start: string | null;
  term_end: string | null;
  user: {
    full_name: string;
    email: string;
    phone_number: string | null;
    profile_picture_url: string | null;
  };
};

type NeedsAssessment = {
  assessment_id: number;
  assessment_name: string;
  academic_year: string;
  assessment_type: string;
  status: string;
  created_at: string;
};

type Partnership = {
  partnership_id: number;
  partner_name: string;
  partner_type: string;
  partnership_type: string;
  description: string | null;
  contact_person: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  start_date: string;
  status: string;
  created_at: string;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "needs-assessment" | "partnerships">("profile");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [needsAssessments, setNeedsAssessments] = useState<NeedsAssessment[]>([]);
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditForm, setShowEditForm] = useState(false);
  
  const [editProfile, setEditProfile] = useState({
    full_name: "",
    phone_number: "",
    profile_picture_url: ""
  });

  async function fetchData() {
    setLoading(true);
    try {
      const [profileRes, needsRes, partnershipsRes] = await Promise.all([
        fetch(`${API_BASE}/profile`),
        fetch(`${API_BASE}/needs-assessments`),
        fetch(`${API_BASE}/partnerships`)
      ]);

      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data);
        setEditProfile({
          full_name: data.user.full_name || "",
          phone_number: data.user.phone_number || "",
          profile_picture_url: data.user.profile_picture_url || ""
        });
      }

      if (needsRes.ok) {
        const data = await needsRes.json();
        setNeedsAssessments(data);
      }

      if (partnershipsRes.ok) {
        const data = await partnershipsRes.json();
        setPartnerships(data);
      }
    } catch (error) {
      console.error("Error fetching settings data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editProfile)
      });
      if (res.ok) {
        setShowEditForm(false);
        fetchData();
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">Manage your profile and settings</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "profile"
                ? "text-rose-600 dark:text-rose-400 border-b-2 border-rose-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab("needs-assessment")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "needs-assessment"
                ? "text-rose-600 dark:text-rose-400 border-b-2 border-rose-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Needs Assessment
          </button>
          <button
            onClick={() => setActiveTab("partnerships")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "partnerships"
                ? "text-rose-600 dark:text-rose-400 border-b-2 border-rose-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Partnerships
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && profile && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Profile Information</h2>
              <button
                onClick={() => setShowEditForm(!showEditForm)}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition"
              >
                Edit Profile
              </button>
            </div>

            {showEditForm && (
              <form onSubmit={updateProfile} className="mb-6 rounded-xl bg-rose-50 dark:bg-rose-900/30 p-4">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Update Profile</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editProfile.full_name}
                      onChange={(e) => setEditProfile(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-slate-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={editProfile.phone_number}
                      onChange={(e) => setEditProfile(prev => ({ ...prev, phone_number: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Profile Picture URL</label>
                    <input
                      type="url"
                      value={editProfile.profile_picture_url}
                      onChange={(e) => setEditProfile(prev => ({ ...prev, profile_picture_url: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-slate-700 dark:text-white"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
                      Save Changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEditForm(false)}
                      className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                {profile.user.profile_picture_url ? (
                  <img
                    src={profile.user.profile_picture_url}
                    alt="Profile"
                    className="h-16 w-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xl font-bold">
                    {profile.user.full_name?.charAt(0)?.toUpperCase() || "S"}
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-white">{profile.user.full_name}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{profile.user.email}</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Role</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{profile.role || 'Member'}</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{profile.user.phone_number || 'Not provided'}</p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Term Start</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {profile.term_start ? new Date(profile.term_start).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-700/50 p-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Term End</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {profile.term_end ? new Date(profile.term_end).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Needs Assessment Tab */}
      {activeTab === "needs-assessment" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Needs Assessments</h2>
              <button className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
                Create Assessment
              </button>
            </div>

            {needsAssessments.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">No needs assessments available.</p>
            ) : (
              <div className="space-y-3">
                {needsAssessments.map((assessment) => (
                  <div key={assessment.assessment_id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">{assessment.assessment_name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{assessment.assessment_type}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        assessment.status === 'COMPLETED' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                        assessment.status === 'IN_PROGRESS' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                        'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                      }`}>
                        {assessment.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Academic Year: {assessment.academic_year}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">Created: {new Date(assessment.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">School Self-Assessment</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">View the school's self-assessment report for the current academic year.</p>
            <button className="rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">
              View Self-Assessment
            </button>
          </div>
        </div>
      )}

      {/* Partnerships Tab */}
      {activeTab === "partnerships" && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between gap-4 mb-5">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">School Partnerships</h2>
              <button className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
                Suggest Partner
              </button>
            </div>

            {partnerships.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">No partnerships established yet.</p>
            ) : (
              <div className="space-y-3">
                {partnerships.map((partnership) => (
                  <div key={partnership.partnership_id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">{partnership.partner_name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{partnership.partner_type} • {partnership.partnership_type}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        partnership.status === 'ACTIVE' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                        partnership.status === 'PENDING' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                        partnership.status === 'INACTIVE' ? 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300' :
                        'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300'
                      }`}>
                        {partnership.status}
                      </span>
                    </div>
                    {partnership.description && <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{partnership.description}</p>}
                    {partnership.contact_person && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Contact: {partnership.contact_person}</p>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500">Started: {new Date(partnership.start_date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Partnership Tracking</h2>
            <p className="text-sm text-slate-500 mb-4">Track the progress and outcomes of school partnerships.</p>
            <button className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
              View Tracking Reports
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
