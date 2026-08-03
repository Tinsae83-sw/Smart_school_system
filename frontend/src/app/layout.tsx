import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "EduConnect | Premium School Management",
  description: "Modern, attractive school dashboard and management system.",
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
      </body>
    </html>
  );
}
