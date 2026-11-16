import Link from "next/link";

export default function StudentDataPage() {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <h1 className="text-xl font-bold text-slate-900">Student-linked records</h1>
      <p className="mt-2 text-sm text-slate-600">
        Child-specific academic records are available in the Parent portal.
      </p>
      <Link
        href="/parent"
        className="mt-6 inline-flex rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-700"
      >
        Open Parent portal
      </Link>
    </div>
  );
}
