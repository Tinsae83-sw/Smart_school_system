'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  BarChart3,
  Users,
  FileText,
  MessageSquare,
  Calendar,
  Lock,
  ArrowRight,
  Play,
  Zap,
  Globe,
  Shield,
  Clock,
  Menu,
  X,
  Mail,
  Phone,
  Sparkles,
  TrendingUp,
  Award,
  Building2,
  GraduationCap,
  Target,
  CheckCircle2,
  Star,
  ChevronRight,
  Share2,
  ExternalLink,
  Heart,
  Lightbulb,
  TreePine,
  Globe2,
  Microscope,
  Computer,
  Library,
  Trophy,
  Palette,
  Stethoscope,
  Utensils,
  Bus,
  ShieldCheck,
  GraduationCap as Cap,
  FlaskConical,
  Code,
  Book as BookIcon,
  Drama,
  Mic,
  Brain,
  HandHeart,
  PartyPopper,
  MapPin,
  Send,
  HelpCircle,
  ChevronDown,
  User,
  Briefcase,
  FileCheck,
  School,
  Award as Medal,
  HeartHandshake
} from 'lucide-react';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-950 to-black text-slate-100 font-sans">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-[100] px-6 py-4 bg-slate-900 border-b border-amber-400/30 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/40 group-hover:shadow-amber-500/60 transition-all duration-500 group-hover:scale-105">
              <School className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">የካቲት 25</span>
              <span className="block text-xs text-slate-400">Kekatit 25 School</span>
            </div>
          </Link>
          
          <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-slate-300">
            <Link href="#about" className="hover:text-amber-300 transition-colors duration-300 relative group">
              About
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link href="#academics" className="hover:text-amber-300 transition-colors duration-300 relative group">
              Academics
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link href="#admissions" className="hover:text-amber-300 transition-colors duration-300 relative group">
              Admissions
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link href="#student-life" className="hover:text-amber-300 transition-colors duration-300 relative group">
              Student Life
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link href="#news" className="hover:text-amber-300 transition-colors duration-300 relative group">
              News & Events
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
            <Link href="#contact" className="hover:text-amber-300 transition-colors duration-300 relative group">
              Contact
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-orange-500 group-hover:w-full transition-all duration-300"></span>
            </Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 text-sm font-semibold rounded-2xl hover:from-amber-300 hover:to-orange-400 transition-all duration-500 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105">
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-40 pb-32 lg:pt-56 lg:pb-48 px-6 overflow-hidden">
        {/* Enhanced Gradient Orbs */}
        <div className="absolute top-20 -left-64 w-[500px] h-[500px] bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 -right-40 w-[400px] h-[400px] bg-gradient-to-bl from-orange-500/20 via-amber-500/15 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-t from-amber-600/10 via-transparent to-transparent rounded-full blur-3xl"></div>
        
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 via-transparent to-slate-950/50"></div>
        <div className="max-w-7xl mx-auto relative">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-gradient-to-r from-slate-800/80 to-slate-900/80 border border-amber-400/40 mb-10 backdrop-blur-xl group hover:border-amber-400/60 transition-all duration-500 shadow-2xl shadow-amber-500/20">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="text-sm font-semibold bg-gradient-to-r from-amber-200 to-orange-400 bg-clip-text text-transparent">Building Knowledge. Inspiring Character. Shaping the Future.</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-6 leading-[1.1]">
              የካቲት 25 ትምህርት ቤት
              <span className="block bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">Kekatit 25 School</span>
            </h1>
            
            <p className="text-lg md:text-xl lg:text-2xl text-slate-300 mb-14 leading-relaxed max-w-4xl font-light">
              Welcome to Kekatit 25 School, where education goes beyond the classroom. We are committed to creating a supportive learning environment that helps students develop knowledge, confidence, discipline, creativity, and the skills they need for a successful future.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-5">
              <Link href="#admissions" className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold rounded-2xl hover:from-amber-300 hover:to-orange-400 transition-all duration-500 shadow-2xl shadow-amber-500/40 hover:shadow-amber-500/60 flex items-center justify-center gap-3 group hover:scale-105">
                Apply Now
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="#about" className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-slate-800/80 to-slate-900/80 text-slate-100 font-semibold rounded-2xl border border-slate-700 hover:border-amber-400/50 hover:bg-slate-800/90 transition-all duration-500 flex items-center justify-center gap-3 backdrop-blur-xl shadow-2xl hover:scale-105">
                Learn More
                <ChevronRight className="w-5 h-5 text-amber-400" />
              </Link>
              <Link href="#contact" className="w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-slate-800/80 to-slate-900/80 text-slate-100 font-semibold rounded-2xl border border-slate-700 hover:border-amber-400/50 hover:bg-slate-800/90 transition-all duration-500 flex items-center justify-center gap-3 backdrop-blur-xl shadow-2xl hover:scale-105">
                Contact Us
                <Mail className="w-5 h-5 text-amber-400" />
              </Link>
            </div>

            <div className="mt-16 flex flex-col sm:flex-row items-center gap-10 text-sm text-slate-400">
              <div className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center border border-amber-400/30 group-hover:border-amber-400/50 transition-all">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                </div>
                <span className="font-medium">Safe Learning Environment</span>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center border border-amber-400/30 group-hover:border-amber-400/50 transition-all">
                  <Users className="w-5 h-5 text-amber-400" />
                </div>
                <span className="font-medium">Student-Centered Learning</span>
              </div>
              <div className="flex items-center gap-3 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center border border-amber-400/30 group-hover:border-amber-400/50 transition-all">
                  <Award className="w-5 h-5 text-amber-400" />
                </div>
                <span className="font-medium">Qualified Teachers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-6 border-y border-slate-800/50 bg-gradient-to-b from-slate-800/40 to-slate-900/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12">
            <div className="text-center group">
              <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-500">25+</div>
              <div className="text-sm text-slate-400 font-medium">Years of Service</div>
            </div>
            <div className="text-center group">
              <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-500">1,000+</div>
              <div className="text-sm text-slate-400 font-medium">Students</div>
            </div>
            <div className="text-center group">
              <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-500">50+</div>
              <div className="text-sm text-slate-400 font-medium">Qualified Teachers</div>
            </div>
            <div className="text-center group">
              <div className="text-5xl md:text-6xl font-black bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent mb-3 group-hover:scale-110 transition-transform duration-500">95%+</div>
              <div className="text-sm text-slate-400 font-medium">Success Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 px-6 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">About Kekatit 25 School</h2>
            <p className="text-lg text-slate-400 max-w-3xl mx-auto font-light">Kekatit 25 School is dedicated to providing quality education in a safe, inclusive, and student-centered environment.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 mb-20">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl blur-2xl"></div>
              <div className="relative p-10 rounded-3xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 backdrop-blur-xl">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center mb-6 border border-amber-400/30">
                  <Medal className="w-8 h-8 text-amber-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100 mb-4">Our Vision</h3>
                <p className="text-slate-400 leading-relaxed">To become a leading educational institution that develops knowledgeable, responsible, innovative, and future-ready students.</p>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-3xl blur-2xl"></div>
              <div className="relative p-10 rounded-3xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 backdrop-blur-xl">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center mb-6 border border-amber-400/30">
                  <Target className="w-8 h-8 text-amber-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-100 mb-4">Our Mission</h3>
                <p className="text-slate-400 leading-relaxed">To provide quality education through effective teaching, modern learning approaches, strong ethical values, and meaningful collaboration between students, teachers, parents, and the wider community.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-32 px-6 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">Our Core Values</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">The principles that guide our educational approach and shape our school community.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Cap,
                title: 'Excellence',
                description: 'We encourage students to pursue high academic standards.'
              },
              {
                icon: HeartHandshake,
                title: 'Respect',
                description: 'We promote respect, cooperation, and understanding among students and staff.'
              },
              {
                icon: Lightbulb,
                title: 'Innovation',
                description: 'We encourage creativity, problem-solving, technology, and new ideas.'
              },
              {
                icon: Heart,
                title: 'Integrity',
                description: 'We help students develop honesty, responsibility, and strong character.'
              },
              {
                icon: TreePine,
                title: 'Growth',
                description: 'We support continuous personal, academic, and social development.'
              },
              {
                icon: Globe2,
                title: 'Community',
                description: 'We encourage students to contribute positively to their school and society.'
              }
            ].map((value, index) => (
              <div key={index} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/15 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                <div className="relative p-8 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-amber-400/50 hover:bg-slate-800/80 transition-all duration-500 backdrop-blur-xl shadow-2xl group-hover:shadow-amber-500/10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-amber-400/30 shadow-lg shadow-amber-500/20">
                    <value.icon className="w-8 h-8 text-amber-300" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-3">{value.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">{value.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Academic Programs Section */}
      <section id="academics" className="py-32 px-6 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">Academic Programs</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">Comprehensive education from Grade 9 through Grade 12, preparing students for higher education and future careers.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                grade: 'Grade 9',
                description: 'Strong foundation for secondary education, with emphasis on core academic subjects and study skills.',
                color: 'from-blue-500 to-blue-600'
              },
              {
                grade: 'Grade 10',
                description: 'Development of deeper subject knowledge, critical thinking, and preparation for national academic requirements.',
                color: 'from-emerald-500 to-emerald-600'
              },
              {
                grade: 'Grade 11',
                description: 'Advanced academic preparation and development of skills required for higher education and future careers.',
                color: 'from-purple-500 to-purple-600'
              },
              {
                grade: 'Grade 12',
                description: 'Focused preparation for higher education, examinations, and transition into university or professional pathways.',
                color: 'from-amber-500 to-amber-600'
              }
            ].map((program, index) => (
              <div key={index} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/15 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                <div className="relative p-8 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-amber-400/50 hover:bg-slate-800/80 transition-all duration-500 backdrop-blur-xl shadow-2xl group-hover:shadow-amber-500/10">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${program.color} flex items-center justify-center mb-6 shadow-2xl shadow-amber-500/20 group-hover:scale-110 transition-transform duration-500`}>
                    <Cap className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-3">{program.grade}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">{program.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-32 px-6 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">Why Choose Kekatit 25 School?</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">Discover what makes our school the right choice for your education.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Award,
                title: 'Quality Education',
                description: 'Experienced educators and structured learning programs designed to help students achieve their potential.'
              },
              {
                icon: Users,
                title: 'Student-Centered Learning',
                description: 'Students are encouraged to participate, ask questions, collaborate, and develop independent thinking.'
              },
              {
                icon: Briefcase,
                title: 'Qualified Teachers',
                description: 'Dedicated teachers who support students\' academic and personal development.'
              },
              {
                icon: ShieldCheck,
                title: 'Safe Learning Environment',
                description: 'A respectful environment where students can learn, grow, and participate confidently.'
              },
              {
                icon: Lightbulb,
                title: 'Technology & Innovation',
                description: 'Use of appropriate technology and modern learning methods to improve educational experiences.'
              },
              {
                icon: HeartHandshake,
                title: 'Parent Engagement',
                description: 'Strong communication between the school, parents, and students.'
              }
            ].map((reason, index) => (
              <div key={index} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/15 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                <div className="relative p-8 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-amber-400/50 hover:bg-slate-800/80 transition-all duration-500 backdrop-blur-xl shadow-2xl group-hover:shadow-amber-500/10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-amber-400/30 shadow-lg shadow-amber-500/20">
                    <reason.icon className="w-8 h-8 text-amber-300" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-3">{reason.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">{reason.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facilities Section */}
      <section className="py-32 px-6 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">Our Facilities</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">Modern facilities designed to support comprehensive learning and student development.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Building2, name: 'Modern Classrooms' },
              { icon: Microscope, name: 'Science Laboratories' },
              { icon: Computer, name: 'Computer Laboratory' },
              { icon: Library, name: 'Library' },
              { icon: Trophy, name: 'Sports Facilities' },
              { icon: Palette, name: 'Student Activity Areas' },
              { icon: Stethoscope, name: 'Health/First-Aid Facility' },
              { icon: Utensils, name: 'Cafeteria' },
              { icon: Bus, name: 'Transportation' },
              { icon: ShieldCheck, name: 'Safe & Secure Campus' }
            ].map((facility, index) => (
              <div key={index} className="group relative">
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-amber-400/50 hover:bg-slate-800/80 transition-all duration-500 backdrop-blur-xl shadow-2xl group-hover:shadow-amber-500/10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500 border border-amber-400/30 shadow-lg shadow-amber-500/20">
                    <facility.icon className="w-7 h-7 text-amber-300" strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">{facility.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Teaching & Learning Section */}
      <section className="py-32 px-6 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">Learning That Inspires</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">At Kekatit 25 School, learning goes beyond memorizing information. Our approach emphasizes holistic development.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: 'Interactive Learning',
                description: 'Students actively participate in classroom activities and discussions.'
              },
              {
                icon: Brain,
                title: 'Critical Thinking',
                description: 'Students learn how to analyze information and solve complex problems.'
              },
              {
                icon: Target,
                title: 'Practical Learning',
                description: 'Students connect classroom knowledge with real-world situations.'
              },
              {
                icon: HeartHandshake,
                title: 'Collaborative Learning',
                description: 'Students work together and learn from one another.'
              },
              {
                icon: FileCheck,
                title: 'Continuous Assessment',
                description: 'Students receive regular feedback to identify strengths and areas for improvement.'
              },
              {
                icon: Lightbulb,
                title: 'Innovation & Creativity',
                description: 'Encouraging new ideas and creative approaches to learning.'
              }
            ].map((approach, index) => (
              <div key={index} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/15 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                <div className="relative p-8 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-amber-400/50 hover:bg-slate-800/80 transition-all duration-500 backdrop-blur-xl shadow-2xl group-hover:shadow-amber-500/10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-amber-400/30 shadow-lg shadow-amber-500/20">
                    <approach.icon className="w-8 h-8 text-amber-300" strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mb-3">{approach.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">{approach.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Student Life Section */}
      <section id="student-life" className="py-32 px-6 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">More Than Just Classrooms</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">A strong landing page should show that school life is more than academic lessons.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Trophy, name: 'Sports' },
              { icon: FlaskConical, name: 'Science Clubs' },
              { icon: Code, name: 'Technology Clubs' },
              { icon: BookIcon, name: 'Reading Clubs' },
              { icon: Palette, name: 'Arts and Drama' },
              { icon: Mic, name: 'Debate' },
              { icon: Brain, name: 'Academic Competitions' },
              { icon: TreePine, name: 'Environmental Activities' },
              { icon: HandHeart, name: 'Community Service' },
              { icon: PartyPopper, name: 'School Events' }
            ].map((activity, index) => (
              <div key={index} className="group relative">
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-amber-400/50 hover:bg-slate-800/80 transition-all duration-500 backdrop-blur-xl shadow-2xl group-hover:shadow-amber-500/10 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-500 border border-amber-400/30 shadow-lg shadow-amber-500/20">
                    <activity.icon className="w-7 h-7 text-amber-300" strokeWidth={2} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">{activity.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Admissions Section */}
      <section id="admissions" className="py-32 px-6 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">Start Your Journey With Us</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">Join our community of learners and begin your path to success.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6 mb-16">
            {[
              { step: '01', title: 'Submit Application', description: 'Complete the student application form.' },
              { step: '02', title: 'Document Review', description: 'The school reviews the required documents.' },
              { step: '03', title: 'Assessment / Interview', description: 'Students participate in required assessment or interview.' },
              { step: '04', title: 'Admission Decision', description: 'The school communicates the admission decision.' },
              { step: '05', title: 'Enrollment', description: 'Complete registration and begin the academic journey.' }
            ].map((process, index) => (
              <div key={index} className="group relative">
                <div className="relative p-6 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-amber-400/50 hover:bg-slate-800/80 transition-all duration-500 backdrop-blur-xl shadow-2xl group-hover:shadow-amber-500/10 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform duration-500">
                    <span className="text-xl font-black text-slate-900">{process.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-100 mb-2">{process.title}</h3>
                  <p className="text-sm text-slate-400">{process.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* News & Events Section */}
      <section id="news" className="py-32 px-6 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">Latest News & Events</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">Stay updated with the latest happenings at Kekatit 25 School.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
            {[
              { icon: PartyPopper, title: 'School Registration Open', description: 'Information about registration and admission for the upcoming academic year.', date: 'Sep 2026' },
              { icon: Medal, title: 'Academic Achievement', description: 'Celebrating outstanding student performance in national examinations.', date: 'Aug 2026' },
              { icon: Trophy, title: 'Sports Competition', description: 'Updates about school sporting events and achievements.', date: 'Jul 2026' }
            ].map((news, index) => (
              <div key={index} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/15 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                <div className="relative p-8 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-amber-400/50 hover:bg-slate-800/80 transition-all duration-500 backdrop-blur-xl shadow-2xl group-hover:shadow-amber-500/10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-amber-400/30 shadow-lg shadow-amber-500/20">
                    <news.icon className="w-8 h-8 text-amber-300" strokeWidth={2} />
                  </div>
                  <div className="text-sm text-amber-400 font-semibold mb-2">{news.date}</div>
                  <h3 className="text-xl font-bold text-slate-100 mb-3">{news.title}</h3>
                  <p className="text-slate-400 leading-relaxed text-sm">{news.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Events Table */}
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-slate-100 mb-8 text-center">Upcoming Events</h3>
            <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 backdrop-blur-xl shadow-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Date</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Event</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { date: 'Sep 10', event: 'New Academic Year', location: 'School Campus' },
                    { date: 'Oct 05', event: 'Parents Meeting', location: 'School Hall' },
                    { date: 'Nov 15', event: 'Science Exhibition', location: 'Laboratory' },
                    { date: 'Dec 10', event: 'Sports Day', location: 'School Field' }
                  ].map((event, index) => (
                    <tr key={index} className="border-b border-slate-700/50 last:border-0 hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-300">{event.date}</td>
                      <td className="px-6 py-4 text-sm text-slate-100 font-medium">{event.event}</td>
                      <td className="px-6 py-4 text-sm text-slate-400">{event.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-32 px-6 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">What Our Community Says</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">Hear from parents, students, and alumni about their experience at Kekatit 25 School.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { role: 'Parent', quote: 'The school has created a supportive environment where my child feels encouraged to learn and grow.', icon: User },
              { role: 'Student', quote: 'My teachers encourage me to participate, ask questions, and work hard toward my goals.', icon: Cap },
              { role: 'Alumni', quote: 'The skills and discipline I developed at school continue to help me in my education and career.', icon: Award }
            ].map((testimonial, index) => (
              <div key={index} className="group relative">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-500/15 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl"></div>
                <div className="relative p-8 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-amber-400/50 hover:bg-slate-800/80 transition-all duration-500 backdrop-blur-xl shadow-2xl group-hover:shadow-amber-500/10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 border border-amber-400/30 shadow-lg shadow-amber-500/20">
                    <testimonial.icon className="w-8 h-8 text-amber-300" strokeWidth={2} />
                  </div>
                  <div className="text-sm text-amber-400 font-semibold mb-4">{testimonial.role}</div>
                  <p className="text-slate-300 leading-relaxed italic">"{testimonial.quote}"</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 px-6 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">Frequently Asked Questions</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">Find answers to common questions about Kekatit 25 School.</p>
          </div>

          <div className="space-y-4">
            {[
              { question: 'What grades does the school offer?', answer: 'We offer education from Grade 9 through Grade 12, preparing students for higher education and future careers.' },
              { question: 'How can I apply?', answer: 'You can apply by completing the student application form. Visit our Admissions section for more details on the application process.' },
              { question: 'What documents are required?', answer: 'Required documents include academic transcripts, birth certificate, and passport-sized photos. Contact us for the complete list.' },
              { question: 'When does registration begin?', answer: 'Registration typically begins in September for the upcoming academic year. Please check our News & Events section for specific dates.' },
              { question: 'Does the school provide transportation?', answer: 'Yes, we provide transportation services for students. Contact us for route information and availability.' },
              { question: 'Does the school have extracurricular activities?', answer: 'Yes, we offer various extracurricular activities including sports, science clubs, technology clubs, arts, and community service.' }
            ].map((faq, index) => (
              <div key={index} className="group">
                <div className="rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/50 hover:border-amber-400/50 transition-all duration-500 backdrop-blur-xl shadow-2xl overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center flex-shrink-0 border border-amber-400/30">
                        <HelpCircle className="w-5 h-5 text-amber-400" strokeWidth={2} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-100 mb-2">{faq.question}</h3>
                        <p className="text-slate-400 leading-relaxed text-sm">{faq.answer}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 px-6 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-400 bg-clip-text text-transparent">Get in Touch</h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">We'd love to hear from you. Reach out with any questions or to schedule a visit.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-slate-100 mb-8">Contact Information</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center flex-shrink-0 border border-amber-400/30">
                    <School className="w-6 h-6 text-amber-400" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-100 mb-1">Kekatit 25 School</h4>
                    <p className="text-slate-400">Building Knowledge. Inspiring Character. Shaping the Future.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center flex-shrink-0 border border-amber-400/30">
                    <MapPin className="w-6 h-6 text-amber-400" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-100 mb-1">Address</h4>
                    <p className="text-slate-400">[Official School Address]</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center flex-shrink-0 border border-amber-400/30">
                    <Phone className="w-6 h-6 text-amber-400" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-100 mb-1">Phone</h4>
                    <p className="text-slate-400">[Official Phone Number]</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 flex items-center justify-center flex-shrink-0 border border-amber-400/30">
                    <Mail className="w-6 h-6 text-amber-400" strokeWidth={2} />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-100 mb-1">Email</h4>
                    <p className="text-slate-400">[Official Email]</p>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-slate-100 mb-8">Send us a Message</h3>
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all text-slate-100" placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
                  <input type="tel" className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all text-slate-100" placeholder="Your phone number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                  <input type="email" className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all text-slate-100" placeholder="Your email" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                  <input type="text" className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all text-slate-100" placeholder="Subject" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                  <textarea rows={4} className="w-full px-4 py-3 rounded-xl bg-slate-800/50 border border-slate-700 focus:border-amber-400/50 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition-all text-slate-100 resize-none" placeholder="Your message"></textarea>
                </div>
                <button type="submit" className="w-full px-6 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold rounded-2xl hover:from-amber-300 hover:to-orange-400 transition-all duration-500 shadow-2xl shadow-amber-500/40 hover:shadow-amber-500/60 hover:scale-105 flex items-center justify-center gap-3">
                  Send Message
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gradient-to-b from-slate-950 to-black border-t border-slate-800/50 text-slate-400 py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-16">
            <div className="col-span-1 md:col-span-1">
              <Link href="/" className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-amber-500/30">
                  <School className="w-7 h-7 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <span className="text-xl font-bold bg-gradient-to-r from-amber-200 to-orange-400 bg-clip-text text-transparent">የካቲት 25</span>
                  <span className="block text-xs text-slate-400">Kekatit 25 School</span>
                </div>
              </Link>
              <p className="text-sm leading-relaxed text-slate-500 max-w-sm mb-8">Building Knowledge. Inspiring Character. Shaping the Future. Empowering students to achieve their full potential.</p>
              <div className="flex gap-4">
                <a href="#" className="w-12 h-12 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center transition-all duration-300 text-slate-400 hover:text-amber-300 border border-slate-700/50 hover:border-amber-400/50">
                  <Share2 className="w-5 h-5" />
                </a>
                <a href="#" className="w-12 h-12 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center transition-all duration-300 text-slate-400 hover:text-amber-300 border border-slate-700/50 hover:border-amber-400/50">
                  <ExternalLink className="w-5 h-5" />
                </a>
                <a href="#" className="w-12 h-12 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 flex items-center justify-center transition-all duration-300 text-slate-400 hover:text-amber-300 border border-slate-700/50 hover:border-amber-400/50">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="text-slate-200 font-bold mb-8 text-sm uppercase tracking-wider">Contact</h4>
              <ul className="space-y-4 text-sm">
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <span>[School Address]</span>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-400" />
                  <span>[Phone Number]</span>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-amber-400" />
                  <span>[Email Address]</span>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="pt-8 border-t border-slate-800/50 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} Kekatit 25 School. All rights reserved.</p>
            <div className="flex items-center gap-8">
              <Link href="#" className="hover:text-amber-300 transition-colors duration-300">Terms</Link>
              <Link href="#" className="hover:text-amber-300 transition-colors duration-300">Privacy</Link>
              <Link href="#" className="hover:text-amber-300 transition-colors duration-300">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
