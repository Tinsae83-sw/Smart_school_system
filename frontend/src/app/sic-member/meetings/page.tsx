"use client";

import { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/sic";

type Meeting = {
  meeting_id: number;
  title: string;
  description: string | null;
  scheduled_date: string;
  scheduled_time: string;
  location: string | null;
  meeting_type: string;
  status: string;
  created_at: string;
  attendees: Array<{
    user: {
      full_name: string;
      email: string;
    };
  }>;
  agenda_items: Array<{
    agenda_id: number;
    title: string;
    description: string | null;
    priority: string;
  }>;
};

type AgendaItem = {
  agenda_id: number;
  meeting_id: number;
  title: string;
  description: string | null;
  priority: string;
  order: number;
};

type MeetingMinutes = {
  minutes_id: number;
  meeting_id: number;
  content: string;
  action_items: string;
  created_at: string;
};

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [minutes, setMinutes] = useState<MeetingMinutes | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAgendaForm, setShowAgendaForm] = useState(false);
  
  const [newAgendaItem, setNewAgendaItem] = useState({
    meeting_id: 0,
    title: "",
    description: "",
    priority: "MEDIUM"
  });

  async function fetchMeetings() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/meetings`);
      if (res.ok) {
        const data = await res.json();
        setMeetings(data);
      }
    } catch (error) {
      console.error("Error fetching meetings:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMeetingDetails(meetingId: number) {
    try {
      const [agendaRes, minutesRes] = await Promise.all([
        fetch(`${API_BASE}/meetings/${meetingId}/agenda`),
        fetch(`${API_BASE}/meetings/${meetingId}/minutes`)
      ]);

      if (agendaRes.ok) {
        const agendaData = await agendaRes.json();
        setAgendaItems(agendaData);
      }

      if (minutesRes.ok) {
        const minutesData = await minutesRes.json();
        setMinutes(minutesData);
      } else {
        setMinutes(null);
      }
    } catch (error) {
      console.error("Error fetching meeting details:", error);
    }
  }

  useEffect(() => {
    fetchMeetings();
  }, []);

  function handleMeetingSelect(meeting: Meeting) {
    setSelectedMeeting(meeting);
    fetchMeetingDetails(meeting.meeting_id);
    setNewAgendaItem(prev => ({ ...prev, meeting_id: meeting.meeting_id }));
  }

  async function submitAgendaItem(e: React.FormEvent) {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/meetings/agenda-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAgendaItem)
      });
      if (res.ok) {
        setShowAgendaForm(false);
        setNewAgendaItem({
          meeting_id: selectedMeeting?.meeting_id || 0,
          title: "",
          description: "",
          priority: "MEDIUM"
        });
        if (selectedMeeting) {
          fetchMeetingDetails(selectedMeeting.meeting_id);
        }
      }
    } catch (error) {
      console.error("Error submitting agenda item:", error);
    }
  }

  async function voteOnResolution(resolutionId: number, vote: 'for' | 'against' | 'abstain') {
    try {
      const res = await fetch(`${API_BASE}/meetings/resolutions/${resolutionId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vote })
      });
      if (res.ok) {
        alert("Vote recorded successfully!");
      }
    } catch (error) {
      console.error("Error voting on resolution:", error);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 dark:text-slate-400">Loading meetings...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Meeting Management</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">View and manage SIC meetings</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Meetings List */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">All Meetings</h2>
            {meetings.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-slate-500">No meetings scheduled.</p>
            ) : (
              <div className="space-y-3">
                {meetings.map((meeting) => (
                  <div
                    key={meeting.meeting_id}
                    onClick={() => handleMeetingSelect(meeting)}
                    className={`rounded-xl border p-4 cursor-pointer transition ${
                      selectedMeeting?.meeting_id === meeting.meeting_id
                        ? "border-rose-500 dark:border-rose-500 bg-rose-50 dark:bg-rose-900/30"
                        : "border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-600"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900 dark:text-white text-sm">{meeting.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {new Date(meeting.scheduled_date).toLocaleDateString()} at {meeting.scheduled_time}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">{meeting.location || 'TBD'}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        meeting.status === 'COMPLETED' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                        meeting.status === 'CANCELLED' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' :
                        'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}>
                        {meeting.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Meeting Details */}
        <div className="space-y-4">
          {selectedMeeting ? (
            <>
              <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">{selectedMeeting.title}</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{selectedMeeting.description || 'No description'}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                      {new Date(selectedMeeting.scheduled_date).toLocaleDateString()} at {selectedMeeting.scheduled_time}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500">{selectedMeeting.location || 'TBD'}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1 text-sm font-medium ${
                    selectedMeeting.status === 'COMPLETED' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' :
                    selectedMeeting.status === 'CANCELLED' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' :
                    'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  }`}>
                    {selectedMeeting.status}
                  </span>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Attendees: {selectedMeeting.attendees.length}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selectedMeeting.attendees.slice(0, 5).map((attendee, index) => (
                      <span key={index} className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1 text-xs text-slate-600 dark:text-slate-300">
                        {attendee.user.full_name}
                      </span>
                    ))}
                    {selectedMeeting.attendees.length > 5 && (
                      <span className="rounded-full bg-slate-100 dark:bg-slate-700 px-2 py-1 text-xs text-slate-600 dark:text-slate-300">
                        +{selectedMeeting.attendees.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Agenda Items */}
              <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">Agenda Items</h3>
                  <button
                    onClick={() => setShowAgendaForm(!showAgendaForm)}
                    className="rounded-xl bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 transition"
                  >
                    Add Item
                  </button>
                </div>

                {showAgendaForm && (
                  <form onSubmit={submitAgendaItem} className="mb-4 rounded-xl bg-rose-50 dark:bg-rose-900/30 p-4">
                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Submit Agenda Item</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                        <input
                          type="text"
                          value={newAgendaItem.title}
                          onChange={(e) => setNewAgendaItem(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-slate-700 dark:text-white"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
                        <textarea
                          value={newAgendaItem.description}
                          onChange={(e) => setNewAgendaItem(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-slate-700 dark:text-white"
                          rows={2}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Priority</label>
                        <select
                          value={newAgendaItem.priority}
                          onChange={(e) => setNewAgendaItem(prev => ({ ...prev, priority: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 dark:bg-slate-700 dark:text-white"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition">
                          Submit
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAgendaForm(false)}
                          className="rounded-lg border border-slate-300 dark:border-slate-600 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {agendaItems.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500">No agenda items for this meeting.</p>
                ) : (
                  <div className="space-y-3">
                    {agendaItems.map((item) => (
                      <div key={item.agenda_id} className="rounded-xl border border-slate-200 dark:border-slate-700 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white text-sm">{item.title}</p>
                            {item.description && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.description}</p>}
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.priority === 'HIGH' ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' :
                            item.priority === 'MEDIUM' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                            'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {item.priority}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Meeting Minutes */}
              <div className="rounded-2xl bg-white dark:bg-slate-800 p-6 shadow-sm border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Meeting Minutes</h3>
                {!minutes ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500">No minutes available for this meeting yet.</p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Content</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{minutes.content}</p>
                    </div>
                    {minutes.action_items && (
                      <div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Action Items</p>
                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{minutes.action_items}</p>
                      </div>
                    )}
                    <p className="text-xs text-slate-400 dark:text-slate-500">Recorded: {new Date(minutes.created_at).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="rounded-2xl bg-white dark:bg-slate-800 p-8 shadow-sm border border-slate-200 dark:border-slate-700 text-center">
              <svg className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
              <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">Select a Meeting</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Choose a meeting from the list to view details.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
