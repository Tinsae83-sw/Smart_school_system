"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { LayoutDashboard, UserPlus, Users, Link2 } from "lucide-react";
import { getAuthenticatedRole, getUser, clearAuth, type UserRole } from "@/lib/auth";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageToggle from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { adminTranslations, type AdminTranslationKey } from "@/translations/admin";

type NavItem = {
  labelKey: AdminTranslationKey;
  href: string;
  icon: React.ReactNode;
};

const navigationItems: NavItem[] = [
  { labelKey: "dashboard", href: "/admin", icon: <LayoutDashboard className="w-5 h-5" strokeWidth={1.5} /> },
  { labelKey: "registerUser", href: "/admin/register", icon: <UserPlus className="w-5 h-5" strokeWidth={1.5} /> },
  { labelKey: "users", href: "/admin/users", icon: <Users className="w-5 h-5" strokeWidth={1.5} /> },
  { labelKey: "linkParent", href: "/admin/link-parent", icon: <Link2 className="w-5 h-5" strokeWidth={1.5} /> },
];

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { language } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [role, setRole] = useState<UserRole | null>(null);
  const [adminUser, setAdminUser] = useState<{ full_name: string; role: string } | null>(null);

  const t = adminTranslations[language];

  useEffect(() => {
    const activeRole = getAuthenticatedRole();
    if (!activeRole || !ADMIN_ROLES.includes(activeRole)) {
      router.push("/login");
      return;
    }
    setRole(activeRole);
    setAdminUser(getUser(activeRole));
  }, [router]);

  function handleLogout() {
    if (role) clearAuth(role);
    router.push("/login");
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-navy-200 border-t-teal-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">{t.loading}</p>
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
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.adminPanel}</p>
            </div>
            <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
              <svg className="w-5 h-5 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
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
                  {t[item.labelKey]}
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-4">
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-slate-700 px-3 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-sm font-bold">
                {adminUser?.full_name?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{adminUser?.full_name || "Administrator"}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{adminUser?.role || role}</p>
              </div>
              <button onClick={handleLogout} title={t.signOut} className="text-slate-400 dark:text-slate-500 hover:text-rose-500 transition">
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
            <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">{new Date().toLocaleDateString(language === "am" ? "am-ET" : "en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</span>
          </div>
        </header>

        <main data-app-content className="p-6">{children}</main>
      </div>
    </div>
  );
}
