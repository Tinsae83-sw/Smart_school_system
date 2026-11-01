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
  Mail,
  type LucideIcon,
} from 'lucide-react';

/* ---------- Data ---------- */

type Grade = { grade: string; color: string; description: string; image: string };
type ContactDetail = { icon: LucideIcon; label: string; value: string };

const navLinks = [
  { href: '#about', label: 'About' },
  { href: '#academics', label: 'Academics' },
  { href: '#campus', label: 'Campus' },
  { href: '#contact', label: 'Contact' },
];

const defaultGrades: Grade[] = [
  { grade: 'Grade 9', color: 'bg-navy-600', description: 'Strong foundation for secondary education, with emphasis on core academic subjects and study skills.', image: '/school-group-1.png' },
  { grade: 'Grade 10', color: 'bg-teal-600', description: 'Development of deeper subject knowledge, critical thinking, and preparation for national academic requirements.', image: '/school-group-2.png' },
  { grade: 'Grade 11', color: 'bg-navy-600', description: 'Advanced academic preparation and development of skills required for higher education and future careers.', image: '/school-group-3.png' },
  { grade: 'Grade 12', color: 'bg-teal-600', description: 'Focused preparation for higher education, examinations, and transition into university or professional pathways.', image: '/school-group-1.png' },
];

const defaultContactDetails: ContactDetail[] = [
  { icon: School, label: 'Yekatit 25/67 Secondary School', value: 'Building Knowledge. Inspiring Character. Shaping the Future.' },
  { icon: MapPin, label: 'Address', value: '[Official School Address]' },
  { icon: Phone, label: 'Phone', value: '[Official Phone Number]' },
  { icon: Mail, label: 'Email', value: '[Official Email]' },
];

/* ---------- Shared style tokens ---------- */

const getGradientText = (darkMode: boolean) =>
  darkMode
    ? 'text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-teal-300'
    : 'text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-500';

const getCardBase = (darkMode: boolean) =>
  darkMode
    ? 'relative rounded-2xl bg-slate-800/80 backdrop-blur-sm border border-slate-700 hover:border-teal-400/60 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-teal-500/10'
    : 'relative rounded-2xl bg-white/80 backdrop-blur-sm border border-slate-200 hover:border-teal-500/50 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-teal-500/10';

const getSectionClass = () => 'py-24 px-6';

const getTextColor = (darkMode: boolean) => (darkMode ? 'text-slate-100' : 'text-slate-900');
const getSubTextColor = (darkMode: boolean) => (darkMode ? 'text-slate-300' : 'text-slate-600');
const getBgColor = (darkMode: boolean) =>
  darkMode ? 'bg-slate-900' : 'bg-slate-50';

/* ---------- Small shared components ---------- */

function SectionHeader({ title, subtitle, darkMode }: { title: string; subtitle?: string; darkMode: boolean }) {
  return (
    <div className="text-center mb-24">
      <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${getGradientText(darkMode)}`}>{title}</h2>
      {subtitle && <p className={`text-lg ${getSubTextColor(darkMode)} max-w-2xl mx-auto font-light`}>{subtitle}</p>}
    </div>
  );
}

function HoverGlow({ darkMode }: { darkMode: boolean }) {
  return (
    <div className={`absolute inset-0 ${darkMode ? 'bg-gradient-to-br from-teal-400/10 to-cyan-400/10' : 'bg-gradient-to-br from-teal-500/10 to-cyan-500/10'} rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl`}></div>
  );
}

function Logo({ titleClass }: { titleClass: string }) {
  return (
    <>
      <div className="w-12 h-12 bg-navy-600 rounded-xl flex items-center justify-center overflow-hidden">
        <img src="/school-logo.jpg" alt="School Logo" className="w-full h-full object-cover" />
      </div>
      <div>
        <span className={`text-xl font-bold tracking-tight ${titleClass}`}>የካቲት 25/67</span>
        <span className="block text-xs text-slate-500 dark:text-slate-400">Yekatit 25/67 Secondary School</span>
      </div>
    </>
  );
}

/* ---------- Page ---------- */

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<any>(null);
  const [academicPrograms, setAcademicPrograms] = useState<any[]>([]);
  const [contactInfo, setContactInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        
        const [schoolRes, programsRes, contactRes] = await Promise.all([
          fetch(`${API_URL}/api/public/school-info`),
          fetch(`${API_URL}/api/public/academic-programs`),
          fetch(`${API_URL}/api/public/contact-info`)
        ]);

        if (schoolRes.ok) {
          const schoolData = await schoolRes.json();
          setSchoolInfo(schoolData.data);
        }

        if (programsRes.ok) {
          const programsData = await programsRes.json();
          setAcademicPrograms(programsData.data);
        }

        if (contactRes.ok) {
          const contactData = await contactRes.json();
          setContactInfo(contactData.data);
        }
      } catch (error) {
        console.error('Error fetching landing page data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Use fetched data or fallback to defaults
  const grades = academicPrograms.length > 0
    ? academicPrograms.map((program: any, index: number) => ({
        grade: program.grade,
        color: index % 2 === 0 ? 'bg-navy-500' : 'bg-teal-500',
        description: program.description,
        image: defaultGrades[index]?.image || defaultGrades[0].image
      }))
    : defaultGrades;

  const contactDetails = contactInfo
    ? [
        { icon: School, label: contactInfo.school_name, value: contactInfo.tagline },
        { icon: MapPin, label: 'Address', value: contactInfo.address },
        { icon: Phone, label: 'Phone', value: contactInfo.phone },
        ...(contactInfo.email ? [{ icon: Mail, label: 'Email', value: contactInfo.email }] : []),
      ]
    : defaultContactDetails;

  const schoolName = schoolInfo?.school_name || 'Yekatit 25/67 Secondary School';
  const schoolNameAmharic = schoolInfo?.school_name_amharic || 'የካቲት 25/67 ትምህርት ቤት';
  const tagline = schoolInfo?.tagline || 'Building Knowledge. Inspiring Character. Shaping the Future.';
  const mission = schoolInfo?.mission || 'To provide quality education through effective teaching, modern learning approaches, strong ethical values, and meaningful collaboration between students, teachers, parents, and the wider community.';
  const vision = schoolInfo?.vision;
  const establishedDate = schoolInfo?.established_date;
  const principalName = schoolInfo?.principal_name;
  const schoolType = schoolInfo?.school_type;
  const gradesOffered = schoolInfo?.grades_offered;
  const statistics = schoolInfo?.statistics;

  return (
    <div className={`min-h-screen ${getBgColor(darkMode)} ${getTextColor(darkMode)} font-sans transition-colors duration-300`}>
      {/* Navbar */}
      <header className={`fixed top-0 left-0 right-0 z-[100] px-6 py-4 bg-white/80 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 transition-all duration-300 ${scrolled ? 'shadow-2xl backdrop-blur-md' : ''}`}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Logo titleClass="text-slate-900 dark:text-white" />
          </Link>

          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-teal-600 dark:hover:text-teal-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-500 transition-colors relative group">
                {link.label}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-teal-600 dark:bg-teal-400 group-hover:w-full transition-all duration-300"></span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 transition-all duration-300 hover:scale-110"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5" />
              )}
            </button>
            <Link
              href="/login"
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 transition-all duration-300 hover:scale-105 hover:shadow-lg"
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
            src="/school-group-3.png"
            alt="Yekatit 25/67 School Students Celebrating"
            className="w-full h-full object-cover"
          />
          <div className={`absolute inset-0 ${darkMode ? 'bg-gradient-to-b from-slate-900/50 via-slate-900/70 to-slate-900/90' : 'bg-gradient-to-b from-teal-900/30 via-teal-900/50 to-teal-900/70'}`}></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="max-w-5xl">
            <h1 className={`text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-tight text-white drop-shadow-lg`}>
              {schoolNameAmharic}
              <span className={`block text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-teal-200 drop-shadow-lg`}>{schoolName}</span>
            </h1>

            <p className={`text-lg md:text-xl text-white mb-10 leading-relaxed max-w-3xl font-medium drop-shadow-md`}>
              {tagline}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-5">
              <Link
                href="#contact"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-orange-500/30 flex items-center justify-center gap-3 group transform hover:-translate-y-0.5"
              >
                Apply Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#about"
                className={`w-full sm:w-auto px-8 py-4 ${darkMode ? 'bg-slate-800/80 text-slate-100 border-slate-600 hover:bg-slate-700/80' : 'bg-white/80 text-teal-700 border-teal-600 hover:bg-teal-50/80'} font-semibold rounded-xl border transition-all duration-300 backdrop-blur-sm flex items-center justify-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 transform hover:-translate-y-0.5 hover:shadow-lg`}
              >
                Learn More
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      {statistics && (
        <section className={`py-20 px-6 ${darkMode ? 'bg-slate-800/50' : 'bg-white'}`}>
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className={`text-center p-6 rounded-2xl ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700/70' : 'bg-white hover:bg-teal-50'} transition-all duration-300 transform hover:scale-105`}>
                <div className={`text-4xl md:text-5xl font-bold ${getGradientText(darkMode)} mb-2`}>
                  {statistics.total_students}
                </div>
                <p className={getSubTextColor(darkMode)}>Students</p>
              </div>
              <div className={`text-center p-6 rounded-2xl ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700/70' : 'bg-white hover:bg-teal-50'} transition-all duration-300 transform hover:scale-105`}>
                <div className={`text-4xl md:text-5xl font-bold ${getGradientText(darkMode)} mb-2`}>
                  {statistics.total_teachers}
                </div>
                <p className={getSubTextColor(darkMode)}>Teachers</p>
              </div>
              <div className={`text-center p-6 rounded-2xl ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700/70' : 'bg-white hover:bg-teal-50'} transition-all duration-300 transform hover:scale-105`}>
                <div className={`text-4xl md:text-5xl font-bold ${getGradientText(darkMode)} mb-2`}>
                  {statistics.total_classes}
                </div>
                <p className={getSubTextColor(darkMode)}>Classes</p>
              </div>
              <div className={`text-center p-6 rounded-2xl ${darkMode ? 'bg-slate-700/50 hover:bg-slate-700/70' : 'bg-white hover:bg-teal-50'} transition-all duration-300 transform hover:scale-105`}>
                <div className={`text-4xl md:text-5xl font-bold ${getGradientText(darkMode)} mb-2`}>
                  {statistics.total_departments}
                </div>
                <p className={getSubTextColor(darkMode)}>Departments</p>
              </div>
            </div>
          </div>
        </section>
      )}



      {/* About */}
      <section id="about" className={getSectionClass()}>
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            title={`About ${schoolName}`}
            subtitle="Providing quality education in a safe, inclusive, and student-centered environment."
            darkMode={darkMode}
          />
          <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
            <div className="relative transform hover:scale-[1.02] transition-transform duration-300">
              <div className={`relative p-8 md:p-10 rounded-2xl ${darkMode ? 'bg-slate-800/80 backdrop-blur-sm border-slate-700' : 'bg-white/80 backdrop-blur-sm border-slate-200'} border shadow-lg hover:shadow-xl transition-all duration-300`}>
                <div className="w-16 h-16 rounded-xl bg-teal-600 flex items-center justify-center mb-6 shadow-lg">
                  <Medal className="w-8 h-8 text-white" />
                </div>
                <h3 className={`text-2xl font-bold ${getTextColor(darkMode)} mb-4`}>Our Mission</h3>
                <p className={`${getSubTextColor(darkMode)} leading-relaxed text-lg`}>
                  {mission}
                </p>
              </div>
            </div>
            <div className="relative h-[400px] rounded-3xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-transform duration-300">
              <img
                src="/school-group-2.png"
                alt="Yekatit 25/67 School Students"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
            </div>
          </div>

          {/* Vision and Additional Info */}
          {vision && (
            <div className={`max-w-4xl mx-auto p-8 md:p-10 rounded-2xl ${darkMode ? 'bg-slate-800/80 backdrop-blur-sm border-slate-700' : 'bg-white/80 backdrop-blur-sm border-slate-200'} border shadow-lg hover:shadow-xl transition-all duration-300 mb-12 transform hover:scale-[1.01]`}>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-navy-600 flex items-center justify-center shadow-lg">
                  <GraduationCap className="w-7 h-7 text-white" />
                </div>
                <h3 className={`text-2xl font-bold ${getTextColor(darkMode)}`}>Our Vision</h3>
              </div>
              <p className={`${getSubTextColor(darkMode)} leading-relaxed text-lg`}>
                {vision}
              </p>
            </div>
          )}

          {/* School Details */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {establishedDate && (
              <div className={`p-6 rounded-xl ${darkMode ? 'bg-slate-800/80 backdrop-blur-sm border-slate-700 hover:bg-slate-700/80' : 'bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-teal-50'} border transition-all duration-300 transform hover:scale-105 hover:shadow-lg`}>
                <h4 className={`text-sm font-semibold ${getSubTextColor(darkMode)} mb-2`}>Established</h4>
                <p className={`text-2xl font-bold ${getGradientText(darkMode)}`}>
                  {new Date(establishedDate).getFullYear()}
                </p>
              </div>
            )}
            {schoolType && (
              <div className={`p-6 rounded-xl ${darkMode ? 'bg-slate-800/80 backdrop-blur-sm border-slate-700 hover:bg-slate-700/80' : 'bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-teal-50'} border transition-all duration-300 transform hover:scale-105 hover:shadow-lg`}>
                <h4 className={`text-sm font-semibold ${getSubTextColor(darkMode)} mb-2`}>School Type</h4>
                <p className={`text-xl font-bold ${getTextColor(darkMode)}`}>
                  {schoolType}
                </p>
              </div>
            )}
            {gradesOffered && (
              <div className={`p-6 rounded-xl ${darkMode ? 'bg-slate-800/80 backdrop-blur-sm border-slate-700 hover:bg-slate-700/80' : 'bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-teal-50'} border transition-all duration-300 transform hover:scale-105 hover:shadow-lg`}>
                <h4 className={`text-sm font-semibold ${getSubTextColor(darkMode)} mb-2`}>Grades Offered</h4>
                <p className={`text-lg font-bold ${getTextColor(darkMode)}`}>
                  {Array.isArray(gradesOffered)
                    ? gradesOffered.map(g => `Grade ${g}`).join(', ')
                    : `Grade ${gradesOffered}`}
                </p>
              </div>
            )}
            {principalName && (
              <div className={`p-6 rounded-xl ${darkMode ? 'bg-slate-800/80 backdrop-blur-sm border-slate-700 hover:bg-slate-700/80' : 'bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-teal-50'} border transition-all duration-300 transform hover:scale-105 hover:shadow-lg`}>
                <h4 className={`text-sm font-semibold ${getSubTextColor(darkMode)} mb-2`}>Principal</h4>
                <p className={`text-lg font-bold ${getTextColor(darkMode)}`}>
                  {principalName}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Academics */}
      <section id="academics" className={getSectionClass()}>
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
                <div className={`${getCardBase(darkMode)} overflow-hidden transform hover:-translate-y-2 transition-all duration-300`}>
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={program.image}
                      alt={program.grade}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="p-6">
                    <div className={`w-14 h-14 rounded-xl ${program.color} flex items-center justify-center mb-4 transform group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                      <GraduationCap className="w-7 h-7 text-white" strokeWidth={2} />
                    </div>
                    <h3 className={`text-xl font-bold ${getTextColor(darkMode)} mb-3 group-hover:text-teal-600 transition-colors`}>{program.grade}</h3>
                    <p className={`${getSubTextColor(darkMode)} leading-relaxed text-sm`}>{program.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Campus */}
      <section id="campus" className={getSectionClass()}>
        <div className="max-w-7xl mx-auto">
          <SectionHeader
            title="Our Campus"
            subtitle="A modern learning environment designed for student success."
            darkMode={darkMode}
          />
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative h-[400px] rounded-3xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-transform duration-300">
              <img
                src="/school-building.png"
                alt="Yekatit 25/67 School Building"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
            </div>
            <div className="space-y-6">
              <div className={`p-6 rounded-xl ${darkMode ? 'bg-slate-800/80 backdrop-blur-sm border-slate-700' : 'bg-white/80 backdrop-blur-sm border-slate-200'} border shadow-lg`}>
                <h3 className={`text-xl font-bold ${getTextColor(darkMode)} mb-3`}>Modern Facilities</h3>
                <p className={getSubTextColor(darkMode)}>
                  Our campus features well-equipped classrooms, science laboratories, library, and computer labs to support comprehensive learning.
                </p>
              </div>
              <div className={`p-6 rounded-xl ${darkMode ? 'bg-slate-800/80 backdrop-blur-sm border-slate-700' : 'bg-white/80 backdrop-blur-sm border-slate-200'} border shadow-lg`}>
                <h3 className={`text-xl font-bold ${getTextColor(darkMode)} mb-3`}>Safe Environment</h3>
                <p className={getSubTextColor(darkMode)}>
                  We maintain a safe, secure, and conducive learning environment where students can thrive academically and socially.
                </p>
              </div>
              <div className={`p-6 rounded-xl ${darkMode ? 'bg-slate-800/80 backdrop-blur-sm border-slate-700' : 'bg-white/80 backdrop-blur-sm border-slate-200'} border shadow-lg`}>
                <h3 className={`text-xl font-bold ${getTextColor(darkMode)} mb-3`}>Green Spaces</h3>
                <p className={getSubTextColor(darkMode)}>
                  Beautiful outdoor spaces and recreational areas for students to relax, socialize, and engage in physical activities.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className={getSectionClass()}>
        <div className="max-w-7xl mx-auto">
          <SectionHeader title="Get in Touch" subtitle="Reach out with any questions or to schedule a visit." darkMode={darkMode} />

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative h-[400px] rounded-3xl overflow-hidden shadow-2xl transform hover:scale-[1.02] transition-transform duration-300">
              <img
                src="/school-group-1.png"
                alt="Yekatit 25/67 School Students"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
            </div>
            <div className="space-y-6">
              {contactDetails.map(({ icon: Icon, label, value }) => (
                <div key={label} className={`flex items-start gap-4 p-4 rounded-xl ${darkMode ? 'bg-slate-800/50 hover:bg-slate-700/50' : 'bg-white hover:bg-teal-50'} transition-all duration-300 transform hover:translate-x-2`}>
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" strokeWidth={2} />
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
      <footer className="bg-slate-900 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center gap-3 justify-center md:justify-start mb-4">
                <div className="w-12 h-12 bg-navy-600 rounded-xl flex items-center justify-center overflow-hidden">
                  <img src="/school-logo.jpg" alt="School Logo" className="w-full h-full object-cover" />
                </div>
                <div>
                  <span className="text-xl font-bold text-slate-900 dark:text-white">{schoolName}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">Excellence in Education</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">&copy; {new Date().getFullYear()} {schoolName}. All rights reserved.</p>
            </div>
            <div className="flex items-center gap-8">
              {['Terms', 'Privacy', 'Contact'].map((label) => (
                <Link key={label} href="#" className="text-sm text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 transition-colors hover:underline decoration-teal-600 dark:decoration-teal-400 underline-offset-4">
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
