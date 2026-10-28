'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  School,
  ArrowRight,
  ChevronRight,
  Phone,
  MapPin,
  Medal,
  GraduationCap,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react';

/* ---------- Data ---------- */

type Grade = { grade: string; color: string; description: string; image: string };

const navLinks = [
  { href: '#about', label: 'About' },
  { href: '#academics', label: 'Academics' },
  { href: '#contact', label: 'Contact' },
];

const grades: Grade[] = [
  { grade: 'Grade 9', color: 'from-blue-500 to-blue-600', description: 'Strong foundation for secondary education, with emphasis on core academic subjects and study skills.', image: 'https://images.pexels.com/photos/31152400/pexels-photo-31152400/free-photo-of-smiling-african-boy-in-classroom-setting.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { grade: 'Grade 10', color: 'from-indigo-500 to-indigo-600', description: 'Development of deeper subject knowledge, critical thinking, and preparation for national academic requirements.', image: 'https://images.pexels.com/photos/28593054/pexels-photo-28593054/free-photo-of-young-african-students-in-classroom-setting.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { grade: 'Grade 11', color: 'from-purple-500 to-purple-600', description: 'Advanced academic preparation and development of skills required for higher education and future careers.', image: 'https://images.pexels.com/photos/35610368/pexels-photo-35610368/free-photo-of-children-learning-alphabet-in-liberian-classroom.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { grade: 'Grade 12', color: 'from-pink-500 to-pink-600', description: 'Focused preparation for higher education, examinations, and transition into university or professional pathways.', image: 'https://images.pexels.com/photos/31152400/pexels-photo-31152400/free-photo-of-smiling-african-boy-in-classroom-setting.jpeg?auto=compress&cs=tinysrgb&w=600' },
];

const contactDetails = [
  { icon: School, label: 'Kekatit 25 School', value: 'Building Knowledge. Inspiring Character. Shaping the Future.' },
  { icon: MapPin, label: 'Address', value: '[Official School Address]' },
  { icon: Phone, label: 'Phone', value: '[Official Phone Number]' },
];

/* ---------- Shared style tokens ---------- */

const getGradientText = (darkMode: boolean) =>
  darkMode
    ? 'bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent'
    : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent';

const getCardBase = (darkMode: boolean) =>
  darkMode
    ? 'relative rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-blue-400/50 hover:bg-slate-800/80 transition-all duration-300 backdrop-blur-xl shadow-2xl'
    : 'relative rounded-2xl bg-white border border-gray-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 shadow-lg';

const getSectionClass = (darkMode: boolean) =>
  darkMode
    ? 'py-32 px-6 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent'
    : 'py-32 px-6 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent';

const getTextColor = (darkMode: boolean) => (darkMode ? 'text-gray-100' : 'text-gray-900');
const getSubTextColor = (darkMode: boolean) => (darkMode ? 'text-gray-400' : 'text-gray-600');
const getBgColor = (darkMode: boolean) =>
  darkMode ? 'bg-gradient-to-b from-slate-900 via-slate-950 to-black' : 'bg-gradient-to-b from-white via-gray-50 to-white';

/* ---------- Small shared components ---------- */

function SectionHeader({ title, subtitle, darkMode }: { title: string; subtitle?: string; darkMode: boolean }) {
  return (
    <div className="text-center mb-24">
      <h2 className={`text-4xl md:text-6xl font-black mb-6 ${getGradientText(darkMode)}`}>{title}</h2>
      {subtitle && <p className={`text-lg ${getSubTextColor(darkMode)} max-w-2xl mx-auto font-light`}>{subtitle}</p>}
    </div>
  );
}

function HoverGlow({ darkMode }: { darkMode: boolean }) {
  return (
    <div className={`absolute inset-0 bg-gradient-to-b ${darkMode ? 'from-blue-500/15' : 'from-blue-500/10'} to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl`}></div>
  );
}

function Logo({ titleClass, darkMode }: { titleClass: string; darkMode: boolean }) {
  return (
    <>
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-105">
        <School className="w-7 h-7 text-white" strokeWidth={2.5} />
      </div>
      <div>
        <span className={`text-xl font-bold tracking-tight ${titleClass}`}>የካቲት 25</span>
        <span className={`block text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Kekatit 25 School</span>
      </div>
    </>
  );
}

/* ---------- Page ---------- */

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className={`min-h-screen ${getBgColor(darkMode)} ${getTextColor(darkMode)} font-sans transition-colors duration-300`}>
      {/* Navbar */}
      <header
        className={`fixed top-0 left-0 right-0 z-[100] px-6 py-4 border-b transition-all duration-300 ${
          darkMode
            ? 'border-slate-800 ' + (scrolled ? 'bg-slate-900/95 backdrop-blur-xl shadow-2xl' : 'bg-slate-900')
            : 'border-gray-200 ' + (scrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg' : 'bg-white')
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo titleClass={getGradientText(darkMode)} darkMode={darkMode} />
          </Link>

          <nav className={`hidden lg:flex items-center gap-8 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-blue-400 transition-colors duration-300 relative group">
                {link.label}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl transition-all duration-300 hover:scale-110"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-yellow-400" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <Link
              href="/login"
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg"
            >
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-40 pb-32 lg:pt-56 lg:pb-48 px-6 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.pexels.com/photos/28593054/pexels-photo-28593054/free-photo-of-young-african-students-in-classroom-setting.jpeg?auto=compress&cs=tinysrgb&w=2000"
            alt="African Students in Classroom"
            className="w-full h-full object-cover"
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${darkMode ? 'from-slate-900 via-slate-900/95 to-slate-900/70' : 'from-white via-white/95 to-white/70'}`}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-5xl">
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.1] ${getTextColor(darkMode)}`}>
              የካቲት 25 ትምህርት ቤት
              <span className={`block ${getGradientText(darkMode)}`}>Kekatit 25 School</span>
            </h1>

            <p className={`text-lg md:text-xl lg:text-2xl ${getSubTextColor(darkMode)} mb-14 leading-relaxed max-w-4xl font-light`}>
              Building Knowledge. Inspiring Character. Shaping the Future.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <Link
                href="#contact"
                className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3 group hover:scale-105"
              >
                Apply Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#about"
                className={`w-full sm:w-auto px-10 py-5 ${darkMode ? 'bg-slate-800 text-gray-100 border-slate-700 hover:border-blue-400 hover:text-blue-400' : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600'} font-semibold rounded-xl border-2 transition-all duration-300 flex items-center justify-center gap-3 shadow-md hover:shadow-lg`}
              >
                Learn More
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>



      {/* About */}
      <section id="about" className={getSectionClass(darkMode)}>
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            title="About Kekatit 25 School"
            subtitle="Providing quality education in a safe, inclusive, and student-centered environment."
            darkMode={darkMode}
          />
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-3xl blur-2xl"></div>
              <div className={`relative p-10 rounded-3xl ${darkMode ? 'bg-gradient-to-br from-slate-800/60 to-slate-900/60 border-slate-700/50' : 'bg-white border-gray-200'} shadow-xl`}>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center mb-6 border border-blue-400/30">
                  <Medal className={`w-8 h-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <h3 className={`text-2xl font-bold ${getTextColor(darkMode)} mb-4`}>Our Mission</h3>
                <p className={`${getSubTextColor(darkMode)} leading-relaxed`}>
                  To provide quality education through effective teaching, modern learning approaches, strong ethical values, and meaningful collaboration between students, teachers, parents, and the wider community.
                </p>
              </div>
            </div>
            <div className="relative h-[400px] rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://images.pexels.com/photos/35610368/pexels-photo-35610368/free-photo-of-children-learning-alphabet-in-liberian-classroom.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="African Students Learning"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Academics */}
      <section id="academics" className={getSectionClass(darkMode)}>
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            title="Academic Programs"
            subtitle="Comprehensive education from Grade 9 through Grade 12."
            darkMode={darkMode}
          />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {grades.map((program) => (
              <div key={program.grade} className="group relative">
                <HoverGlow darkMode={darkMode} />
                <div className={`${getCardBase(darkMode)} overflow-hidden`}>
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={program.image}
                      alt={program.grade}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${program.color} flex items-center justify-center mb-4 shadow-lg`}>
                      <GraduationCap className="w-6 h-6 text-white" strokeWidth={2} />
                    </div>
                    <h3 className={`text-xl font-bold ${getTextColor(darkMode)} mb-3`}>{program.grade}</h3>
                    <p className={`${getSubTextColor(darkMode)} leading-relaxed text-sm`}>{program.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className={getSectionClass(darkMode)}>
        <div className="max-w-7xl mx-auto">
          <SectionHeader title="Get in Touch" subtitle="Reach out with any questions or to schedule a visit." darkMode={darkMode} />

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative h-[400px] rounded-3xl overflow-hidden shadow-2xl">
              <img
                src="https://images.pexels.com/photos/28593054/pexels-photo-28593054/free-photo-of-young-african-students-in-classroom-setting.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="African School Classroom"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-6">
              {contactDetails.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 flex items-center justify-center flex-shrink-0 border border-blue-400/30">
                    <Icon className={`w-6 h-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className={`text-lg font-bold ${getTextColor(darkMode)} mb-1`}>{label}</h4>
                    <p className={getSubTextColor(darkMode)}>{value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`bg-gradient-to-b ${darkMode ? 'from-slate-950 to-black border-slate-800/50 text-gray-400' : 'from-gray-100 to-white border-gray-200 text-gray-600'} border-t py-16 px-6`}>
        <div className="max-w-7xl mx-auto">
          <div className={`flex flex-col md:flex-row items-center justify-between gap-6 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            <p>&copy; {new Date().getFullYear()} Kekatit 25 School. All rights reserved.</p>
            <div className="flex items-center gap-8">
              {['Terms', 'Privacy'].map((label) => (
                <Link key={label} href="#" className={`hover:text-blue-400 transition-colors duration-300`}>
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
