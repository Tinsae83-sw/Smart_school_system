"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { authFetchFor } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/ptsa";
const api = authFetchFor("PTSA_REPRESENTATIVE");

type CalendarEvent = {
  event_id: number;
  title: string;
  description: string;
  event_type: string;
  start_date: string;
  end_date: string;
  location?: string;
  is_all_day: boolean;
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  useEffect(() => {
    loadCalendarEvents();
  }, [currentMonth]);

  async function loadCalendarEvents() {
    setLoading(true);
    try {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth() + 1;
      const res = await api(`${API_BASE}/calendar?year=${year}&month=${month}`);
      if (res.ok) setEvents(await res.json());
    } catch (error) {
      console.error("Error loading calendar events:", error);
    } finally {
      setLoading(false);
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const getEventsForDay = (date: Date) => {
    if (!date) return [];
    return events.filter(event => {
      const eventDate = new Date(event.start_date);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const days = getDaysInMonth(currentMonth);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">School Calendar</h1>
          <p className="text-sm text-slate-500 mt-1">View upcoming school events and important dates</p>
        </div>
        <button
          onClick={goToToday}
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition"
        >
          Today
        </button>
      </div>

      {/* Calendar Navigation */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={previousMonth}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-slate-900">
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-slate-100 transition"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {dayNames.map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">
              {day}
            </div>
          ))}
          {days.map((date, index) => {
            const dayEvents = date ? getEventsForDay(date) : [];
            const isToday = date && date.toDateString() === new Date().toDateString();
            
            return (
              <div
                key={index}
                className={`min-h-[80px] p-1 rounded-lg border border-slate-100 ${
                  date ? "hover:border-teal-300 cursor-pointer transition" : "bg-slate-50"
                } ${isToday ? "bg-teal-50 border-teal-200" : ""}`}
                onClick={() => date && setSelectedEvent(dayEvents[0] || null)}
              >
                {date && (
                  <>
                    <span className={`text-xs font-medium ${
                      isToday ? "text-teal-600" : "text-slate-700"
                    }`}>
                      {date.getDate()}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="mt-1 space-y-1">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.event_id}
                            className={`text-xs px-1 py-0.5 rounded truncate ${
                              event.event_type === "Exam" ? "bg-rose-100 text-rose-700" :
                              event.event_type === "Meeting" ? "bg-blue-100 text-blue-700" :
                              event.event_type === "Holiday" ? "bg-emerald-100 text-emerald-700" :
                              "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <div className="text-xs text-slate-500">+{dayEvents.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">{selectedEvent.title}</h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  selectedEvent.event_type === "Exam" ? "bg-rose-50 text-rose-700" :
                  selectedEvent.event_type === "Meeting" ? "bg-blue-50 text-blue-700" :
                  selectedEvent.event_type === "Holiday" ? "bg-emerald-50 text-emerald-700" :
                  "bg-amber-50 text-amber-700"
                }`}>
                  {selectedEvent.event_type}
                </span>
              </div>
              <p className="text-sm text-slate-600">{selectedEvent.description}</p>
              <div className="text-sm text-slate-500">
                <p><strong>Date:</strong> {new Date(selectedEvent.start_date).toLocaleDateString()}</p>
                {selectedEvent.end_date && selectedEvent.start_date !== selectedEvent.end_date && (
                  <p><strong>End:</strong> {new Date(selectedEvent.end_date).toLocaleDateString()}</p>
                )}
                {selectedEvent.location && (
                  <p><strong>Location:</strong> {selectedEvent.location}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Events List */}
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Upcoming Events</h2>
        <div className="space-y-3">
          {events
            .filter(event => new Date(event.start_date) >= new Date())
            .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
            .slice(0, 5)
            .map((event) => (
              <div key={event.event_id} className="rounded-xl border border-slate-200 p-4 hover:border-teal-300 transition cursor-pointer" onClick={() => setSelectedEvent(event)}>
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center ${
                    event.event_type === "Exam" ? "bg-rose-50" :
                    event.event_type === "Meeting" ? "bg-blue-50" :
                    event.event_type === "Holiday" ? "bg-emerald-50" :
                    "bg-amber-50"
                  }`}>
                    <span className="text-xs font-semibold text-slate-700">
                      {new Date(event.start_date).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                    <span className="text-lg font-bold text-slate-900">
                      {new Date(event.start_date).getDate()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 text-sm">{event.title}</p>
                    <p className="text-xs text-slate-500 mt-1">{event.description}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    event.event_type === "Exam" ? "bg-rose-50 text-rose-700" :
                    event.event_type === "Meeting" ? "bg-blue-50 text-blue-700" :
                    event.event_type === "Holiday" ? "bg-emerald-50 text-emerald-700" :
                    "bg-amber-50 text-amber-700"
                  }`}>
                    {event.event_type}
                  </span>
                </div>
              </div>
            ))}
          {events.filter(event => new Date(event.start_date) >= new Date()).length === 0 && (
            <p className="text-sm text-slate-400">No upcoming events.</p>
          )}
        </div>
      </div>
    </div>
  );
}
