"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/ptsa";

type Meeting = {
  meeting_id: number;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  agenda: string[];
  status: string;
  created_at: string;
};

type MeetingMinutes = {
  minutes_id: number;
  meeting_id: number;
  content: string;
  action_items: string[];
  created_at: string;
};

type MeetingAttendance = {
  meeting_id: number;
  attendee_name: string;
  attended: boolean;
  role: string;
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingMinutes, setMeetingMinutes] = useState<MeetingMinutes[]>([]);
  const [attendance, setAttendance] = useState<MeetingAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [showMinutesForm, setShowMinutesForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<number | null>(null);
  
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    agenda: "",
  });
  
  const [newMinutes, setNewMinutes] = useState({
    content: "",
    action_items: "",
  });

  useEffect(() => {
    loadMeetingData();
  }, []);

  async function loadMeetingData() {
    setLoading(true);
    try {
      const [meetingsRes, minutesRes, attendanceRes] = await Promise.all([
        fetch(`${API_BASE}/meetings`),
        fetch(`${API_BASE}/meetings/minutes`),
        fetch(`${API_BASE}/meetings/attendance`),
      ]);

      if (meetingsRes.ok) setMeetings(await meetingsRes.json());
      if (minutesRes.ok) setMeetingMinutes(await minutesRes.json());
      if (attendanceRes.ok) setAttendance(await attendanceRes.json());
    } catch (error) {
      console.error("Error loading meeting data:", error);
    } finally {
      setLoading(false);
    }
  }

  async function scheduleMeeting() {
    if (!newMeeting.title || !newMeeting.date || !newMeeting.time) {
      alert("Please fill in all required fields.");
      return;
    }
    
    try {
      await fetch(`${API_BASE}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newMeeting,
          agenda: newMeeting.agenda.split("\n").filter(item => item.trim()),
        }),
      });
      setNewMeeting({ title: "", description: "", date: "", time: "", location: "", agenda: "" });
      setShowScheduleForm(false);
      loadMeetingData();
      alert("Meeting scheduled successfully!");
    } catch (error) {
      console.error("Error scheduling meeting:", error);
      alert("Failed to schedule meeting. Please try again.");
    }
  }

  async function uploadMinutes() {
    if (!selectedMeeting || !newMinutes.content) {
      alert("Please select a meeting and provide minutes content.");
      return;
    }
    
    try {
      await fetch(`${API_BASE}/meetings/minutes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_id: selectedMeeting,
          content: newMinutes.content,
          action_items: newMinutes.action_items.split("\n").filter(item => item.trim()),
        }),
      });
      setNewMinutes({ content: "", action_items: "" });
      setShowMinutesForm(false);
      setSelectedMeeting(null);
      loadMeetingData();
      alert("Meeting minutes uploaded successfully!");
    } catch (error) {
      console.error("Error uploading minutes:", error);
      alert("Failed to upload minutes. Please try again.");
    }
  }

  async function sendInvitations(meetingId: number) {
    try {
      await fetch(`${API_BASE}/meetings/${meetingId}/invite`, {
        method: "POST",
      });
      alert("Invitations sent successfully!");
    } catch (error) {
      console.error("Error sending invitations:", error);
      alert("Failed to send invitations. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">PTSA Meeting Management</h1>
          <p className="text-sm text-slate-500 mt-1">Schedule, manage, and track PTSA meetings</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowScheduleForm(true)}
            className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
          >
            Schedule Meeting
          </button>
          <button
            onClick={() => setShowMinutesForm(true)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Upload Minutes
          </button>
        </div>
      </div>

      {showScheduleForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Schedule New Meeting</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
              <input
                type="text"
                value={newMeeting.title}
                onChange={(e) => setNewMeeting({...newMeeting, title: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                placeholder="Meeting title"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input
                type="date"
                value={newMeeting.date}
                onChange={(e) => setNewMeeting({...newMeeting, date: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Time *</label>
              <input
                type="time"
                value={newMeeting.time}
                onChange={(e) => setNewMeeting({...newMeeting, time: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
              <input
                type="text"
                value={newMeeting.location}
                onChange={(e) => setNewMeeting({...newMeeting, location: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
                placeholder="Meeting location"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={newMeeting.description}
                onChange={(e) => setNewMeeting({...newMeeting, description: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-none"
                rows={2}
                placeholder="Meeting description"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Agenda (one item per line)</label>
              <textarea
                value={newMeeting.agenda}
                onChange={(e) => setNewMeeting({...newMeeting, agenda: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-none"
                rows={4}
                placeholder="Agenda items..."
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={scheduleMeeting}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
            >
              Schedule Meeting
            </button>
            <button
              onClick={() => setShowScheduleForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showMinutesForm && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Upload Meeting Minutes</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Select Meeting *</label>
              <select
                value={selectedMeeting || ""}
                onChange={(e) => setSelectedMeeting(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none"
              >
                <option value="">Select a meeting</option>
                {meetings.map((meeting) => (
                  <option key={meeting.meeting_id} value={meeting.meeting_id}>
                    {meeting.title} - {new Date(meeting.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Minutes Content *</label>
              <textarea
                value={newMinutes.content}
                onChange={(e) => setNewMinutes({...newMinutes, content: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-none"
                rows={6}
                placeholder="Meeting minutes content..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Action Items (one per line)</label>
              <textarea
                value={newMinutes.action_items}
                onChange={(e) => setNewMinutes({...newMinutes, action_items: e.target.value})}
                className="w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-200 outline-none resize-none"
                rows={3}
                placeholder="Action items..."
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={uploadMinutes}
              className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
            >
              Upload Minutes
            </button>
            <button
              onClick={() => setShowMinutesForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-slate-500">Loading meeting data...</div>
        </div>
      ) : (
        <>
          {/* Upcoming Meetings */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Scheduled Meetings</h2>
            <div className="space-y-3">
              {meetings.map((meeting) => (
                <div key={meeting.meeting_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="font-medium text-slate-900 text-sm">{meeting.title}</p>
                      <p className="text-xs text-slate-500 mt-1">{meeting.description}</p>
                      <div className="flex gap-4 mt-2 text-xs text-slate-400">
                        <span>{new Date(meeting.date).toLocaleDateString()}</span>
                        <span>{meeting.time}</span>
                        <span>{meeting.location}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        meeting.status === "Upcoming" ? "bg-emerald-50 text-emerald-700" :
                        meeting.status === "Completed" ? "bg-blue-50 text-blue-700" :
                        "bg-amber-50 text-amber-700"
                      }`}>
                        {meeting.status}
                      </span>
                      <button
                        onClick={() => sendInvitations(meeting.meeting_id)}
                        className="rounded-lg bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700 hover:bg-teal-100 transition"
                      >
                        Send Invites
                      </button>
                    </div>
                  </div>
                  {meeting.agenda.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <p className="text-xs font-semibold text-slate-900 mb-1">Agenda:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                        {meeting.agenda.map((item, index) => (
                          <li key={index}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
              {meetings.length === 0 && (
                <p className="text-sm text-slate-400">No meetings scheduled.</p>
              )}
            </div>
          </div>

          {/* Meeting Minutes */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Meeting Minutes Archive</h2>
            <div className="space-y-3">
              {meetingMinutes.map((minutes) => {
                const meeting = meetings.find(m => m.meeting_id === minutes.meeting_id);
                return (
                  <div key={minutes.minutes_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{meeting?.title || "Unknown Meeting"}</p>
                        <p className="text-xs text-slate-400 mt-1">{new Date(minutes.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 mb-3">{minutes.content}</p>
                    {minutes.action_items.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-slate-900 mb-1">Action Items:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
                          {minutes.action_items.map((item, index) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
              {meetingMinutes.length === 0 && (
                <p className="text-sm text-slate-400">No meeting minutes available.</p>
              )}
            </div>
          </div>

          {/* Meeting Attendance */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Meeting Attendance</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Meeting</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Attendee</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Role</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => {
                    const meeting = meetings.find(m => m.meeting_id === record.meeting_id);
                    return (
                      <tr key={`${record.meeting_id}-${record.attendee_name}`} className="border-b border-slate-100">
                        <td className="py-3 px-4 text-sm text-slate-900">{meeting?.title || "Unknown"}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{record.attendee_name}</td>
                        <td className="py-3 px-4 text-sm text-slate-600">{record.role}</td>
                        <td className="py-3 px-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            record.attended ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          }`}>
                            {record.attended ? "Attended" : "Absent"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
