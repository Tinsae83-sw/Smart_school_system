"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TeacherPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard
    router.push("/teacher/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-slate-600">Loading...</p>
      </div>
    </div>
  );
}
