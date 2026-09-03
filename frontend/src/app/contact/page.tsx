'use client';

import Link from 'next/link';

const CONTACT_CHANNELS = [
  { label: 'Email', value: 'support@smartschool.edu', href: 'mailto:support@smartschool.edu', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { label: 'Phone', value: '+251 11 123 4567', href: 'tel:+251111234567', icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' },
  { label: 'Location', value: 'Bole Road, Addis Ababa, Ethiopia', href: '#', icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z' },
  { label: 'Office hours', value: 'Mon–Fri, 8:00 AM – 4:30 PM', href: '#', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <header className="px-6 py-4 border-b border-slate-100 bg-white">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">SmartSchool</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Sign in</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Get in touch</h1>
          <p className="text-slate-500 mt-3 max-w-xl mx-auto">
            Questions about enrollment, onboarding, or SmartSchool for your school? Our team is happy to help.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {CONTACT_CHANNELS.map((c) => (
            <a key={c.label} href={c.href} className="group flex items-start gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:border-blue-300 hover:shadow-md transition-all">
              <div className="w-11 h-11 flex-shrink-0 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={c.icon} />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{c.label}</p>
                <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">{c.value}</p>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-10 text-center text-white shadow-xl shadow-blue-500/20">
          <h2 className="text-2xl font-bold">Want a guided walkthrough?</h2>
          <p className="text-blue-100 mt-2 text-sm max-w-lg mx-auto">
            Our team can walk your school through SmartSchool with a live demo of the teacher, student, and parent portals.
          </p>
          <Link href="/register" className="inline-block mt-6 px-6 py-3 bg-white text-blue-700 text-sm font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-lg">
            Request a demo
          </Link>
        </div>
      </main>
    </div>
  );
}