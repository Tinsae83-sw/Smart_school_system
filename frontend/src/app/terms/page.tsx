import Link from "next/link";

export const metadata = {
  title: "Terms and Conditions",
  description: "The terms that govern your use of the SmartSchool platform.",
};

const SECTIONS = [
  {
    title: "1. Acceptance of terms",
    body: "By creating an account or using SmartSchool, you agree to these terms. If you are registering on behalf of a student or on behalf of a school, you confirm you have authority to do so.",
  },
  {
    title: "2. Accounts and eligibility",
    body: "Accounts are issued for students, parents, teachers, and school staff. You must provide accurate information during registration and keep your credentials secure. Your account is approved by the school before it becomes active.",
  },
  {
    title: "3. Acceptable use",
    body: "You agree to use SmartSchool only for legitimate educational purposes. You may not misuse the platform, upload unlawful content, attempt to access other users' data, disrupt the service, or use automated means to abuse it.",
  },
  {
    title: "4. Content and communications",
    body: "Messages, announcements, and study materials shared through the platform must be appropriate and related to school activities. The school may remove content that violates this policy.",
  },
  {
    title: "5. Intellectual property",
    body: "SmartSchool software, design, and branding are owned by the school or its service provider. You may not copy, modify, or redistribute the platform.",
  },
  {
    title: "6. Availability and changes",
    body: "We work to keep the service available, but do not guarantee it will be uninterrupted or error-free. We may update, suspend, or discontinue features, and update these terms when needed.",
  },
  {
    title: "7. Limitation of liability",
    body: "SmartSchool is provided as a tool to support education administration. To the extent permitted by law, neither the school nor its service provider is liable for indirect or consequential losses arising from use of the platform.",
  },
  {
    title: "8. Termination",
    body: "The school may suspend or close accounts that violate these terms. You may stop using the platform at any time and request that your account be closed.",
  },
  {
    title: "9. Governing law",
    body: "These terms are governed by the laws of the Federal Democratic Republic of Ethiopia.",
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="px-6 py-4 border-b border-slate-100 bg-white">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white text-sm font-bold">
              S
            </div>
            <span className="text-lg font-bold tracking-tight">SmartSchool</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
            Sign in
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Terms and Conditions</h1>
        <p className="text-sm text-slate-500 mt-2">Last updated: September 2026</p>
        <p className="text-slate-600 mt-6 leading-relaxed">
          Please read these terms carefully before using SmartSchool.
        </p>

        <div className="space-y-8 mt-10">
          {SECTIONS.map((s) => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <p className="text-slate-600 leading-relaxed mt-2 text-sm md:text-base">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-white border border-slate-200 p-6 text-sm text-slate-600 leading-relaxed">
          <p className="font-semibold text-slate-900 mb-1">Questions about these terms?</p>
          Contact us through the{" "}
          <Link href="/contact" className="text-blue-600 font-medium hover:underline">
            contact page
          </Link>
          .
        </div>
      </main>
    </div>
  );
}