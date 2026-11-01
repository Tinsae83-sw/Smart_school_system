"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { isAuthenticated, getUser, clearAuth } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAdministrationTranslations } from "@/translations/vp-administration";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/vp-administration";

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

const navigation: NavItem[] = [
  {
    label: "Dashboard",
    href: "/vp-administration",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    label: "Assets",
    href: "/vp-administration/assets",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
      </svg>
    ),
  },
  {
    label: "Facilities",
    href: "/vp-administration/facilities",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
      </svg>
    ),
  },
  {
    label: "Transport",
    href: "/vp-administration/transport",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75h7.5m-10.5-3h13.5m-15-9.75h16.5l1.5 9.75h-19.5l1.5-9.75zM6.75 18.75a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm13.5 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM8.25 6V3.75h7.5V6" />
      </svg>
    ),
  },
  {
    label: "Catering",
    href: "/vp-administration/catering",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v6a3 3 0 006 0V3M6 3v18m12-18v18m0-18c-2.21 2.21-3 5.79-3 9h6c0-3.21-.79-6.79-3-9z" />
      </svg>
    ),
  },
  {
    label: "Finance",
    href: "/vp-administration/finance",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m3-9.75c0-1.24-1.34-2.25-3-2.25s-3 1.01-3 2.25 1.34 2.25 3 2.25 3 1.01 3 2.25-1.34 2.25-3 2.25-3-1.01-3-2.25m9-7.5H6a2.25 2.25 0 00-2.25 2.25v9A2.25 2.25 0 006 18.75h12a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0018 5.25z" />
      </svg>
    ),
  },
  {
    label: "Discipline",
    href: "/vp-administration/discipline",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    label: "Communications",
    href: "/vp-administration/communications",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.75a2.25 2.25 0 01-2.25 2.25h-1.5l-4.5 3v-3H7.5a3.75 3.75 0 01-3.75-3.75v-3A3.75 3.75 0 017.5 4.5h10.5A3.75 3.75 0 0121.75 8.25V9zM8.25 19.5h7.5" />
      </svg>
    ),
  },
  {
    label: "Security",
    href: "/vp-administration/security",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l8.25 3v5.25c0 5.25-3.75 8.25-8.25 9.75-4.5-1.5-8.25-4.5-8.25-9.75V6L12 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
      </svg>
    ),
  },
  {
    label: "Staff",
    href: "/vp-administration/staff",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
      </svg>
    ),
  },
  {
    label: "Inventory",
    href: "/vp-administration/inventory",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25m-17.25 0a2.25 2.25 0 012.25-2.25h12.75a2.25 2.25 0 012.25 2.25m-2.25 0h.008v.008h-.008V7.5z" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/vp-administration/settings",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 3.75h3l.6 2.4a6.9 6.9 0 011.6.93l2.35-.75 1.5 2.6-1.75 1.72a7.2 7.2 0 010 1.85l1.75 1.72-1.5 2.6-2.35-.75a6.9 6.9 0 01-1.6.93l-.6 2.4h-3l-.6-2.4a6.9 6.9 0 01-1.6-.93l-2.35.75-1.5-2.6 1.75-1.72a7.2 7.2 0 010-1.85L4.45 8.93l1.5-2.6 2.35.75a6.9 6.9 0 011.6-.93l.6-2.4z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 11.25a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
  {
    label: "Audit Logs",
    href: "/vp-administration/audit-logs",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12m-12 5.25h12m-12 5.25h12M3.75 6.75h.008v.008H3.75V6.75zm0 5.25h.008v.008H3.75V12zm0 5.25h.008v.008H3.75v-.008z" />
      </svg>
    ),
  },
  {
    label: "Reports",
    href: "/vp-administration/reports",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" />
      </svg>
    ),
  },
];

export default function VPAdministrationLayout({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const t = vpAdministrationTranslations[language];
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vpUser, setVpUser] = useState<{ full_name: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Check authentication
    if (!isAuthenticated('VP_ADMINISTRATION')) {
      router.push("/vp-administration/login");
      return;
    }

    // Load user data
    const user = getUser('VP_ADMINISTRATION');
    if (user) {
      setVpUser(user);
    }
    setLoading(false);
  }, [router]);

  function handleLogout() {
    clearAuth('VP_ADMINISTRATION');
    router.push("/vp-administration/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-navy-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        data-app-sidebar
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700 px-6 py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-600 text-white overflow-hidden">
              <img src="/school-logo.jpg" alt="School Logo" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Yekatit 25/67</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">VP Admin Panel</p>
            </div>
            <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
              <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/vp-administration" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <span className={isActive ? "text-teal-600 dark:text-teal-400" : "text-slate-400 dark:text-slate-500"}>{item.icon}</span>
                  {item.href === "/vp-administration/staff" ? t.staffNavigation : item.label}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-700 px-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-sm font-bold">
                {vpUser?.full_name?.charAt(0)?.toUpperCase() || "V"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{vpUser?.full_name || "VP Admin"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{vpUser?.role || "VP_ADMINISTRATION"}</p>
              </div>
              <button onClick={handleLogout} title="Sign out" className="text-slate-400 dark:text-slate-500 hover:text-rose-500 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header data-app-navbar className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-6">
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <svg className="w-6 h-6 text-slate-600 dark:text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
