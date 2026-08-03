"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ParentContext, authHeaders, BACKEND_URL } from "./ParentContext";
import { isAuthenticated, getUser, clearAuth, getToken } from "@/lib/auth";

const navItems = [
  { href: "/parent", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 5a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/parent/grades", label: "Grades", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
  { href: "/parent/attendance", label: "Attendance", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/parent/assignments", label: "Assignments", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
  { href: "/parent/conduct", label: "Conduct", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { href: "/parent/messages", label: "Messages", icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" },
  { href: "/parent/notifications", label: "Notifications", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.058-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
  { href: "/parent/payments", label: "Payments", icon: "M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" },
  { href: "/parent/profile", label: "Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
];

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [linkedChildren, setLinkedChildren] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Early return for login page to bypass all auth logic
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Load token from storage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedToken = getToken('PARENT');
    console.log('[ParentLayout] Token from storage:', savedToken ? 'Present' : 'Missing');
    if (savedToken) {
      console.log('[ParentLayout] Token (first 20 chars):', savedToken.substring(0, 20) + '...');
      setToken(savedToken);
    }
    setLoading(false);
  }, []);

  // Redirect to login only when there is truly no saved parent auth
  useEffect(() => {
    if (!loading) {
      const persistedToken = getToken('PARENT');
      if (!persistedToken) {
        router.replace('/login');
      }
    }
  }, [loading, router]);

  // Only load data if token exists
  useEffect(() => {
    if (!token) return;
    loadProfile();
    loadChildren();
  }, [token]);



  async function doAuthFetch(path: string, options: RequestInit = {}) {
    if (!token) throw new Error("Not authenticated.");

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    console.log('[ParentLayout] Fetching:', path);
    console.log('[ParentLayout] Token being sent:', token.substring(0, 20) + '...');

    try {
      const response = await fetch(`${BACKEND_URL}${path}`, {
        ...options,
        headers,
      });

      console.log('[ParentLayout] Response status:', response.status);

      if (!response.ok) {
        const data = await response.json();
        console.log('[ParentLayout] Error response:', data);
        throw new Error(data.error || 'Request failed');
      }

      return await response.json();
    } catch (error: any) {
      console.log('[ParentLayout] Fetch error:', error.message);
      if (error.message?.includes('Invalid or expired token') || 
          error.message?.includes('No token provided') ||
          error.message?.includes('Token expired')) {
        error.isAuthError = true;
      }
      throw error;
    }
  }

  async function loadProfile() {
    try {
      const data = await doAuthFetch("/api/parent/profile");
      if (data) {
        setProfile(data);
        const userPayload = {
          ...data,
          full_name: data.full_name || data.name || '',
          email: data.email || '',
          phone_number: data.phone_number || '',
          preferred_language: data.preferred_language || 'English',
          relationship: data.relationship || 'Guardian',
          address: data.address || '',
        };
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('parent_name', JSON.stringify(userPayload));
        }
      }
    } catch (error: any) {
      if (error.isAuthError) {
        clearAuth('PARENT');
        setToken("");
        setProfile(null);
        setLinkedChildren([]);
        setSelectedChildId(null);
        return;
      }
      const localUser = getUser('PARENT');
      if (localUser) {
        setProfile(localUser);
      }
    }
  }

  async function loadChildren() {
    try {
      const data = await doAuthFetch("/api/parent/children");
      const childrenArray = data.children || data || [];
      setLinkedChildren(childrenArray);
      if (childrenArray.length && !selectedChildId) {
        setSelectedChildId(childrenArray[0].student_id);
      }
    } catch (error: any) {
      if (error.isAuthError) {
        clearAuth('PARENT');
        setToken("");
        // Don't redirect - let the user see the login prompt
        return;
      }
    }
  }

  function logout() {
    clearAuth('PARENT');
    setToken("");
    setProfile(null);
    setLinkedChildren([]);
    setSelectedChildId(null);
    router.push("/login");
  }

  const selectedChild = linkedChildren.find((c) => c.student_id === selectedChildId) || null;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ParentContext.Provider
      value={{
        token,
        profile,
        children: linkedChildren,
        selectedChildId,
        setSelectedChildId,
        selectedChild,
        authFetch: doAuthFetch,
        logout,
        refreshProfile: loadProfile,
      }}
    >
      <div className="min-h-screen bg-slate-50">
        {/* Top bar */}
        <header className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-sm">
          <div className="flex items-center justify-between px-4 h-16">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition"
              >
                <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center shadow">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                </div>
                <span className="text-lg font-bold text-slate-900 hidden sm:block">EduConnect</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {token ? (
                <>
                  {linkedChildren.length > 1 && (
                    <select
                      value={selectedChildId || ""}
                      onChange={(e) => setSelectedChildId(Number(e.target.value))}
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {linkedChildren.map((child) => (
                        <option key={child.student_id} value={child.student_id}>
                          {child.full_name} ({child.class_name})
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-slate-900">{profile?.full_name || "Parent"}</p>
                    <p className="text-xs text-slate-500">{profile?.relationship || ""}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-sm">
                    {profile?.full_name?.charAt(0) || "P"}
                  </div>
                  <button
                    onClick={logout}
                    className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200 transition"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={() => router.push('/login')}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </header>

        {sidebarOpen && (
          <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside
          className={`fixed top-16 left-0 bottom-0 z-40 w-64 bg-white border-r border-slate-200 overflow-y-auto transition-transform duration-200 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          {token && selectedChild && (
            <div className="p-4 border-b border-slate-100">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-800 font-bold text-sm">
                    {selectedChild.full_name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{selectedChild.full_name}</p>
                    <p className="text-xs text-slate-500">{selectedChild.class_name}</p>
                    <p className="text-xs text-emerald-600">{selectedChild.school_name}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/parent" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={isActive ? 2 : 1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main content */}
        <main className="lg:ml-64 pt-16 min-h-screen">
          <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </ParentContext.Provider>
  );
}
