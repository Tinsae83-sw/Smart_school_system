"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { authFetch } from "../shared";

export default function ActivityLogPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "attendance" | "assignment" | "grade" | "exam">("all");

  useEffect(() => {
    const savedToken = getToken("TEACHER");
    if (!savedToken) {
      router.push("/login");
      return;
    }
    setToken(savedToken);
    loadActivities(savedToken);
  }, [router]);

  async function loadActivities(token: string) {
    try {
      const data = await authFetch("/api/teacher/activity-log", {}, token);
      setActivities(data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  function getActivityIcon(type: string) {
    switch (type) {
      case "attendance": return "📅";
      case "assignment": return "📝";
      case "grade": return "📊";
      case "exam": return "📋";
      case "login": return "🔐";
      case "logout": return "🚪";
      default: return "📌";
    }
  }

  function getActivityColor(type: string) {
    switch (type) {
      case "attendance": return "bg-blue-50 border-blue-200";
      case "assignment": return "bg-purple-50 border-purple-200";
      case "grade": return "bg-emerald-50 border-emerald-200";
      case "exam": return "bg-red-50 border-red-200";
      case "login": return "bg-slate-50 border-slate-200";
      case "logout": return "bg-slate-50 border-slate-200";
      default: return "bg-amber-50 border-amber-200";
    }
  }

  const filteredActivities = filter === "all" 
    ? activities 
    : activities.filter(a => a.type === filter);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Activity Log</h1>
        
        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-2 mb-6 inline-flex gap-2 flex-wrap">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded-xl font-medium transition ${
              filter === "all" 
                ? "bg-emerald-600 text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("attendance")}
            className={`px-4 py-2 rounded-xl font-medium transition ${
              filter === "attendance" 
                ? "bg-emerald-600 text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Attendance
          </button>
          <button
            onClick={() => setFilter("assignment")}
            className={`px-4 py-2 rounded-xl font-medium transition ${
              filter === "assignment" 
                ? "bg-emerald-600 text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Assignments
          </button>
          <button
            onClick={() => setFilter("grade")}
            className={`px-4 py-2 rounded-xl font-medium transition ${
              filter === "grade" 
                ? "bg-emerald-600 text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Grades
          </button>
          <button
            onClick={() => setFilter("exam")}
            className={`px-4 py-2 rounded-xl font-medium transition ${
              filter === "exam" 
                ? "bg-emerald-600 text-white" 
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Exams
          </button>
        </div>

        {/* Activity List */}
        <div className="space-y-4">
          {filteredActivities.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
              <p className="text-slate-500">No activities found</p>
            </div>
          ) : (
            filteredActivities.map((activity: any) => (
              <div
                key={activity.id || activity.activity_id}
                className={`bg-white rounded-2xl border p-6 ${getActivityColor(activity.type)}`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900 capitalize">
                          {activity.type || "Activity"}
                        </h3>
                        <p className="text-slate-600 mt-1">{activity.description}</p>
                        <p className="text-sm text-slate-500 mt-2">
                          {new Date(activity.timestamp || activity.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
