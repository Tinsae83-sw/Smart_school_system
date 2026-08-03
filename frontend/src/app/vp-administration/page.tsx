"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { vpAdminApi } from "@/lib/api";

type DashboardMetrics = {
  total_assets: number;
  total_facilities: number;
  total_staff: number;
  discipline_cases: number;
  inventory_items: number;
  pending_requests: number;
  budget_remaining: number;
  budget_utilization: number;
  facility_bookings_this_week: number;
  pending_maintenance: number;
};

type RecentActivity = {
  id: number;
  type: string;
  description: string;
  timestamp: string;
};

type Notification = {
  id: number;
  type: string;
  message: string;
  priority: string;
  timestamp: string;
};

type AssetItem = {
  asset_id: number;
  name: string;
  category: string;
  status: string;
  value: number;
};

type FacilityItem = {
  facility_id: number;
  name: string;
  type: string;
  status: string;
  capacity: number;
};

function formatNumber(value: number | undefined) {
  if (value === undefined || value === null) return "0";
  return value.toLocaleString();
}

export default function VPAdministrationDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [facilities, setFacilities] = useState<FacilityItem[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function fetchAll() {
    setLoading(true);
    try {
      const [dashboardRes, assetsRes, facilitiesRes, activitiesRes, notificationsRes] = await Promise.all([
        vpAdminApi.get('/dashboard'),
        vpAdminApi.get('/assets'),
        vpAdminApi.get('/facilities'),
        vpAdminApi.get('/activities'),
        vpAdminApi.get('/notifications'),
      ]);

      if (!dashboardRes.ok || !assetsRes.ok || !facilitiesRes.ok) {
        throw new Error("Unable to fetch VP Administration data.");
      }

      const [dashboardData, assetsData, facilitiesData] = await Promise.all([
        dashboardRes.json(),
        assetsRes.json(),
        facilitiesRes.json(),
      ]);

      setMetrics(dashboardData);
      setAssets(assetsData);
      setFacilities(facilitiesData);

      // Optional: fetch activities and notifications if endpoints exist
      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setRecentActivities(activitiesData);
      }
      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json();
        setNotifications(notificationsData);
      }
    } catch (error) {
      console.error(error);
      setStatusMessage("Unable to load VP Administration dashboard. Check backend connection.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
  }, []);

  const statCards = [
    { label: "Total Assets", value: metrics?.total_assets ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" /></svg>, color: "bg-amber-50 text-amber-600" },
    { label: "Total Facilities", value: metrics?.total_facilities ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" /></svg>, color: "bg-emerald-50 text-emerald-600" },
    { label: "Total Staff", value: metrics?.total_staff ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>, color: "bg-sky-50 text-sky-600" },
    { label: "Discipline Cases", value: metrics?.discipline_cases ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>, color: "bg-rose-50 text-rose-600" },
    { label: "Inventory Items", value: metrics?.inventory_items ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25m-17.25 0a2.25 2.25 0 012.25-2.25h12.75a2.25 2.25 0 012.25 2.25m-2.25 0h.008v.008h-.008V7.5z" /></svg>, color: "bg-purple-50 text-purple-600" },
    { label: "Pending Requests", value: metrics?.pending_requests ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 5.472m0 0a9.09 9.09 0 00-5.941 3.47" /></svg>, color: "bg-indigo-50 text-indigo-600" },
    { label: "Budget Utilization", value: `${metrics?.budget_utilization ?? 0}%`, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>, color: metrics?.budget_utilization && metrics.budget_utilization > 90 ? "bg-rose-50 text-rose-600" : metrics?.budget_utilization && metrics.budget_utilization > 70 ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600" },
    { label: "Facility Bookings", value: metrics?.facility_bookings_this_week ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>, color: "bg-cyan-50 text-cyan-600" },
    { label: "Pending Maintenance", value: metrics?.pending_maintenance ?? 0, icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" /></svg>, color: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">VP Administration Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Welcome back. Here is your administrative overview.</p>
      </div>

      {statusMessage && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{statusMessage}</div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.color}`}>
                {card.icon}
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">{typeof card.value === 'number' ? formatNumber(card.value) : card.value}</p>
                <p className="text-xs text-slate-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Assets</h2>
                <p className="text-sm text-slate-500">School assets and equipment</p>
              </div>
              <Link href="/vp-administration/assets" className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700 transition">
                View all
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Category</th>
                    <th className="pb-3 pr-4">Value</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assets.slice(0, 6).map((asset) => (
                    <tr key={asset.asset_id}>
                      <td className="py-3 pr-4 text-sm font-medium text-slate-900">{asset.name}</td>
                      <td className="py-3 pr-4 text-sm text-slate-500">{asset.category}</td>
                      <td className="py-3 pr-4 text-sm text-slate-500">{formatNumber(asset.value)}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${asset.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${asset.status === "Active" ? "bg-emerald-500" : "bg-rose-500"}`} />
                          {asset.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {assets.length === 0 && <p className="py-4 text-center text-sm text-slate-400">No assets found.</p>}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Facilities</h2>
                <p className="text-sm text-slate-500">{facilities.length} facilities</p>
              </div>
              <Link href="/vp-administration/facilities" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition">
                Manage
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {facilities.slice(0, 6).map((facility) => (
                <div key={facility.facility_id} className="rounded-xl border border-slate-200 p-4 bg-slate-50 hover:border-purple-300 transition">
                  <p className="font-semibold text-slate-900 text-sm">{facility.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{facility.type}</p>
                  <p className="mt-2 text-xs text-slate-600">Capacity: {facility.capacity}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Quick Actions</h2>
            <div className="mt-4 space-y-2">
              <Link href="/vp-administration/assets" className="flex items-center gap-3 rounded-xl bg-purple-50 px-4 py-3 text-sm font-medium text-purple-700 hover:bg-purple-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add asset
              </Link>
              <Link href="/vp-administration/facilities" className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 hover:bg-emerald-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                Add facility
              </Link>
              <Link href="/vp-administration/finance" className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700 hover:bg-green-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Financial management
              </Link>
              <Link href="/vp-administration/staff" className="flex items-center gap-3 rounded-xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700 hover:bg-sky-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" /></svg>
                Manage staff
              </Link>
              <Link href="/vp-administration/inventory" className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 hover:bg-amber-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25m-17.25 0a2.25 2.25 0 012.25-2.25h12.75a2.25 2.25 0 012.25 2.25m-2.25 0h.008v.008h-.008V7.5z" /></svg>
                Inventory management
              </Link>
              <Link href="/vp-administration/discipline" className="flex items-center gap-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 hover:bg-rose-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                Discipline records
              </Link>
              <Link href="/vp-administration/reports" className="flex items-center gap-3 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
                Administrative reports
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
            <div className="mt-4 space-y-3">
              {recentActivities.length > 0 ? (
                recentActivities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 text-sm">
                    <div className="mt-1 h-2 w-2 rounded-full bg-slate-300" />
                    <div className="flex-1">
                      <p className="text-slate-700">{activity.description}</p>
                      <p className="mt-1 text-xs text-slate-400">{new Date(activity.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No recent activity.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Notifications</h2>
            <div className="mt-4 space-y-3">
              {notifications.length > 0 ? (
                notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className={`flex items-start gap-3 rounded-lg p-3 text-sm ${notification.priority === 'HIGH' ? 'bg-rose-50' : notification.priority === 'MEDIUM' ? 'bg-amber-50' : 'bg-slate-50'}`}>
                    <div className={`mt-1 h-2 w-2 rounded-full ${notification.priority === 'HIGH' ? 'bg-rose-500' : notification.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                    <div className="flex-1">
                      <p className="text-slate-700">{notification.message}</p>
                      <p className="mt-1 text-xs text-slate-400">{new Date(notification.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-400">No notifications.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">System Status</h2>
            <div className="mt-4 flex items-center gap-3">
              <span className={`flex h-3 w-3 rounded-full ${loading ? "bg-amber-400" : metrics ? "bg-emerald-500" : "bg-rose-500"}`} />
              <span className="text-sm text-slate-600">{loading ? "Connecting..." : metrics ? "Backend online" : "Backend offline"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
