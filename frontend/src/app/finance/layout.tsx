"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, BadgeDollarSign, LogOut, Wallet } from "lucide-react";
import LanguageToggle from "@/components/LanguageToggle";
import ThemeToggle from "@/components/ThemeToggle";
import { clearAuth, getUser, isAuthenticated } from "@/lib/auth";
import { useLanguage } from "@/contexts/LanguageContext";
import { vpAdministrationTranslations } from "@/translations/vp-administration";

type FinanceUser = {
  full_name?: string;
  email?: string;
};

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  const { language } = useLanguage();
  const t = vpAdministrationTranslations[language].financePage;
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<FinanceUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated("FINANCIAL_OFFICER")) {
      router.replace("/login");
      return;
    }

    setUser(getUser("FINANCIAL_OFFICER"));
    setLoading(false);
  }, [pathname, router]);

  function handleLogout() {
    clearAuth("FINANCIAL_OFFICER");
    router.replace("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        <span className="mr-3 h-5 w-5 animate-spin rounded-full border-2 border-teal-700 border-t-transparent" />
        Loading your finance workspace...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <aside data-app-sidebar className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 lg:flex">
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5 dark:border-slate-700">
          <span className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-navy-600 text-white">
            <img src="/school-logo.jpg" alt="School Logo" className="h-full w-full object-cover" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Yekatit 25/67</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t.workspace}</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4">
          <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{t.workspace}</p>
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-teal-50 px-3 py-2.5 text-sm font-medium text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
            <Wallet className="h-5 w-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            {t.financialOverview}
            <ArrowRight className="ml-auto h-4 w-4 opacity-60" aria-hidden="true" />
          </div>
        </nav>

        <div className="border-t border-slate-200 px-4 py-4 dark:border-slate-700">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700 dark:bg-teal-900 dark:text-teal-300">
              {user?.full_name?.charAt(0)?.toUpperCase() || "F"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{user?.full_name || "Finance Officer"}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">FINANCIAL OFFICER</p>
            </div>
            <button onClick={handleLogout} title={t.signOut} className="text-slate-400 transition hover:text-rose-500">
              <LogOut className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/90 sm:px-7">
          <div className="flex items-center gap-3 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-800 text-white">
              <BadgeDollarSign className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-sm font-semibold">School Finance</span>
          </div>
          <p className="hidden text-sm font-medium text-slate-500 dark:text-slate-400 lg:block">
            {pathname === "/finance" ? t.financialOverview : t.workspace}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="ml-1 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:text-rose-700 dark:border-slate-700 dark:text-slate-300 dark:hover:text-rose-300 lg:hidden"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              {t.signOut}
            </button>
          </div>
        </header>
        <main className="p-4 sm:p-7">{children}</main>
      </div>
    </div>
  );
}
