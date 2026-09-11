import Link from "next/link";

export const metadata = {
  title: "Page not found",
  description: "The page you are looking for does not exist.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex items-center justify-center px-6">
      <div className="max-w-lg w-full text-center">
        <p className="text-7xl font-black bg-gradient-to-br from-blue-600 to-indigo-700 bg-clip-text text-transparent">404</p>
        <h1 className="text-2xl md:text-3xl font-bold mt-4">This page is lost</h1>
        <p className="text-slate-500 mt-3 leading-relaxed">
          The link may be broken, or the page may have moved. Check the address or head back to a familiar place.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link
            href="/"
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition-all"
          >
            Back to homepage
          </Link>
          <Link
            href="/contact"
            className="w-full sm:w-auto px-6 py-3 bg-white text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 hover:border-slate-300 transition-all"
          >
            Contact support
          </Link>
        </div>
      </div>
    </div>
  );
}