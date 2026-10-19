"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/principal";

type PTSABoardMember = {
  member_id: number;
  name: string;
  role: string;
  term_start: string;
  term_end: string;
  status: string;
  contact_info?: string;
};

type SICMember = {
  member_id: number;
  name: string;
  role: string;
  appointment_date: string;
  status: string;
  contact_info?: string;
};

type PTSAActivity = {
  activity_id: number;
  title: string;
  description: string;
  activity_date: string;
  organizer: string;
  status: string;
};

type GovernanceMeeting = {
  meeting_id: number;
  title: string;
  meeting_date: string;
  location: string;
  agenda: string;
  status: string;
  minutes?: string;
};

export default function GovernancePage() {
  const [ptsaMembers, setPtsaMembers] = useState<PTSABoardMember[]>([]);
  const [sicMembers, setSicMembers] = useState<SICMember[]>([]);
  const [activities, setActivities] = useState<PTSAActivity[]>([]);
  const [meetings, setMeetings] = useState<GovernanceMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ptsa" | "sic" | "activities" | "meetings">("ptsa");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function fetchGovernanceData() {
    setLoading(true);
    try {
      const [ptsaRes, sicRes, activitiesRes, meetingsRes] = await Promise.all([
        fetch(`${API_BASE}/governance/ptsa-members`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/governance/sic-members`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/governance/ptsa-activities`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
        fetch(`${API_BASE}/governance/meetings`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }),
      ]);

      if (ptsaRes.ok) {
        const ptsaData = await ptsaRes.json();
        setPtsaMembers(ptsaData);
      }

      if (sicRes.ok) {
        const sicData = await sicRes.json();
        setSicMembers(sicData);
      }

      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData);
      }

      if (meetingsRes.ok) {
        const meetingsData = await meetingsRes.json();
        setMeetings(meetingsData);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage({ type: "error", message: "Failed to load governance data." });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGovernanceData();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Governance & PTSA</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage PTSA, School Improvement Committee, and governance activities</p>
      </div>

      {statusMessage && (
        <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${
          statusMessage.type === "success" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" : "bg-rose-50 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
        }`}>
          {statusMessage.message}
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab("ptsa")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "ptsa"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            PTSA Board ({ptsaMembers.length})
          </button>
          <button
            onClick={() => setActiveTab("sic")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "sic"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            School Improvement Committee ({sicMembers.length})
          </button>
          <button
            onClick={() => setActiveTab("activities")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "activities"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            PTSA Activities ({activities.length})
          </button>
          <button
            onClick={() => setActiveTab("meetings")}
            className={`pb-3 text-sm font-medium transition ${
              activeTab === "meetings"
                ? "border-b-2 border-indigo-600 text-indigo-600"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Governance Meetings ({meetings.length})
          </button>
        </nav>
      </div>

      {loading ? (
        <div className="rounded-2xl bg-white dark:bg-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400 shadow-sm border border-slate-200 dark:border-slate-700">
          Loading...
        </div>
      ) : (
        <>
          {activeTab === "ptsa" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">PTSA Board Members</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Parent-Teacher-Student Association leadership</p>
                </div>
                {ptsaMembers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No PTSA members found.</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Term Start</th>
                        <th className="px-6 py-3">Term End</th>
                        <th className="px-6 py-3">Contact</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {ptsaMembers.map((member) => (
                        <tr key={member.member_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{member.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{member.role}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(member.term_start).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(member.term_end).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{member.contact_info || "N/A"}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              member.status === "ACTIVE" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                            }`}>
                              {member.status}
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

          {activeTab === "sic" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">School Improvement Committee</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Committee members for school development initiatives</p>
                </div>
                {sicMembers.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No SIC members found.</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">Name</th>
                        <th className="px-6 py-3">Role</th>
                        <th className="px-6 py-3">Appointment Date</th>
                        <th className="px-6 py-3">Contact</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {sicMembers.map((member) => (
                        <tr key={member.member_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{member.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{member.role}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(member.appointment_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{member.contact_info || "N/A"}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              member.status === "ACTIVE" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" : "bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                            }`}>
                              {member.status}
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

          {activeTab === "activities" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">PTSA Activities</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Events and activities organized by PTSA</p>
                </div>
                {activities.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No PTSA activities found.</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">Title</th>
                        <th className="px-6 py-3">Description</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Organizer</th>
                        <th className="px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {activities.map((activity) => (
                        <tr key={activity.activity_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{activity.title}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{activity.description}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(activity.activity_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{activity.organizer}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              activity.status === "COMPLETED" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" :
                              activity.status === "UPCOMING" ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300" :
                              "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            }`}>
                              {activity.status}
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

          {activeTab === "meetings" && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">Governance Meetings</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">PTSA and SIC meeting records</p>
                </div>
                {meetings.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">No governance meetings found.</div>
                ) : (
                  <table className="min-w-full">
                    <thead className="bg-slate-50 dark:bg-slate-700">
                      <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        <th className="px-6 py-3">Title</th>
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Location</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Minutes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {meetings.map((meeting) => (
                        <tr key={meeting.meeting_id} className="hover:bg-slate-50 dark:hover:bg-slate-700">
                          <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">{meeting.title}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{new Date(meeting.meeting_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{meeting.location}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                              meeting.status === "COMPLETED" ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300" :
                              meeting.status === "SCHEDULED" ? "bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300" :
                              "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300"
                            }`}>
                              {meeting.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">{meeting.minutes ? "Available" : "Pending"}</td>
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
    </div>
  );
}
