import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import AssistantWidget from "@/components/AssistantWidget";
import CookieConsent from "@/components/CookieConsent";
import Analytics from "@/components/Analytics";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const SITE_NAME = "SmartSchool";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "SmartSchool — Intelligent School Management Platform",
    template: "%s | SmartSchool",
  },
  description:
    "Modern school management platform connecting administrators, teachers, students, and parents — attendance, grades, assignments, messaging, and reporting in one place.",
  applicationName: SITE_NAME,
  keywords: [
    "school management system",
    "school administration",
    "student information system",
    "attendance tracking",
    "gradebook",
    "Ethiopia schools",
    "SmartSchool",
  ],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description:
      "Transform your school with intelligent management — attendance, grades, assignments, and communication in one seamless platform.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "SmartSchool — Intelligent School Management" }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description:
      "Transform your school with intelligent management — attendance, grades, assignments, and communication in one seamless platform.",
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth antialiased" data-scroll-behavior="smooth">
      <body className={`${outfit.variable} font-sans bg-slate-50 text-slate-800 selection:bg-indigo-200 selection:text-indigo-900 overflow-x-hidden`}>
        {children}
        <AssistantWidget />
        <Analytics />
        <CookieConsent />
      </body>
    </html>
  );
}