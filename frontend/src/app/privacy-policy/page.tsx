import Link from "next/link";

export const metadata = {
  title: "Privacy Policy",
  description: "How SmartSchool collects, uses, and protects your personal information.",
};

const SECTIONS = [
  {
    title: "1. Information we collect",
    body: "We collect the information you provide when you register and use the platform: your name, email address, phone number, National ID (Fayda) details where you choose to verify them, your role, and the academic data relevant to that role (attendance, grades, assignments, communications). We also collect technical data such as device type, browser, and pages visited to keep the service secure and improve performance.",
  },
  {
    title: "2. How we use your information",
    body: "Your information is used solely to operate SmartSchool: authenticating accounts, delivering role-based dashboards, facilitating communication between administrators, teachers, students, and parents, sending service notifications, and fulfilling legal obligations. We do not sell your personal information to anyone.",
  },
  {
    title: "3. Fayda (National ID) verification",
    body: "Verification with the Ethiopian National ID Program (Fayda) is voluntary. When you use it, the National ID Program confirms your identity to us through its eSignet service. We store only the verified demographic fields you consent to share (such as name, birth date, and gender) and keep the association with your account secure.",
  },
  {
    title: "4. Cookies and analytics",
    body: "We use essential cookies to keep you signed in. If you accept cookies in the consent banner and analytics is enabled by your school, we use aggregated, anonymized analytics to understand how the platform is used. You can decline non-essential cookies at any time; declining does not affect the core functionality of the platform.",
  },
  {
    title: "5. Data retention and security",
    body: "Account data is retained while your account is active, and deleted shortly after you request account removal or when it is no longer needed. Access to personal data is restricted to authorized school staff and system administrators, transmitted over encrypted connections (HTTPS), and protected against unauthorized access.",
  },
  {
    title: "6. Your rights",
    body: "Depending on applicable law, you may have the right to access, correct, export, or delete your personal information. Contact your school's administrator or our support team using the contact page and we will respond to your request in a timely manner.",
  },
  {
    title: "7. Children and student data",
    body: "The platform is operated by your school. For students under 18, registration and consent are provided through their school or guardian, and access to student data is limited to staff and family members granted access by the school.",
  },
  {
    title: "8. Changes to this policy",
    body: "We may update this policy from time to time. Material changes will be announced through the platform. Continued use of SmartSchool after changes takes effect means you accept the updated policy.",
  },
];

export default function PrivacyPolicyPage() {
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
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mt-2">Last updated: September 2026</p>
        <p className="text-slate-600 mt-6 leading-relaxed">
          This policy explains how SmartSchool and your school handle personal information when you use the platform.
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
          <p className="font-semibold text-slate-900 mb-1">Questions?</p>
          Contact us through the{" "}
          <Link href="/contact" className="text-blue-600 font-medium hover:underline">
            contact page
          </Link>{" "}
          and we will help you.
        </div>
      </main>
    </div>
  );
}