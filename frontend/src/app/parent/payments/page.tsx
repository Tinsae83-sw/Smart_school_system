"use client";

import { useEffect, useState, FormEvent } from "react";
import { useParent } from "../ParentContext";
import { MOCK_FEES, MOCK_PAYMENTS } from "../mockData";

export default function PaymentsPage() {
  const { selectedChildId, selectedChild, authFetch } = useParent();
  const [fees, setFees] = useState<any>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"balance" | "pay" | "history">("balance");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("Chapa");
  const [payFeedback, setPayFeedback] = useState("");
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    if (!selectedChildId) return;
    loadFees();
    loadPaymentHistory();
  }, [selectedChildId]);

  async function loadFees() {
    try {
      const data = await authFetch(`/api/parent/children/${selectedChildId}/fees`);
      setFees(data);
    } catch {
      setFees(MOCK_FEES);
    }
  }

  async function loadPaymentHistory() {
    try {
      const data = await authFetch(`/api/parent/children/${selectedChildId}/payments`);
      setPaymentHistory(data);
    } catch {
      setPaymentHistory(MOCK_PAYMENTS);
    }
  }

  // FR-P36: Initiate online fee payment
  async function handlePayment(e: FormEvent) {
    e.preventDefault();
    setPayFeedback("");
    if (!payAmount || Number(payAmount) <= 0) {
      setPayFeedback("Please enter a valid amount.");
      return;
    }
    setPayLoading(true);
    try {
      const result = await authFetch(`/api/parent/children/${selectedChildId}/payments`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(payAmount), payment_method: payMethod }),
      });
      setPayFeedback("Payment completed successfully!");
      setPayAmount("");
      await loadFees();
      await loadPaymentHistory();
      // FR-P38: Confirmation simulated
    } catch (error) {
      setPayFeedback((error as Error).message);
    } finally {
      setPayLoading(false);
    }
  }

  function getStatusStyle(status: string) {
    switch (status) {
      case "COMPLETED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "PENDING": return "bg-amber-100 text-amber-700 border-amber-200";
      case "FAILED": return "bg-red-100 text-red-700 border-red-200";
      case "REFUNDED": return "bg-blue-100 text-blue-700 border-blue-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments & Fees</h1>
        <p className="text-sm text-slate-500 mt-1">
          {selectedChild?.full_name || "Student"} &middot; {selectedChild?.class_name || ""}
        </p>
      </div>

      {/* Tab Toggle */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "balance", label: "Fee Balance" },
          { key: "pay", label: "Make Payment" },
          { key: "history", label: "Payment History" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.key
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* FR-P35: View Fee Balance */}
      {activeTab === "balance" && fees && (
        <div className="space-y-4">
          {/* Balance Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Fees</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{fees.totalFees?.toLocaleString()}</p>
              <p className="text-sm text-slate-500">{fees.currency}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
              <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Paid</p>
              <p className="text-3xl font-bold text-emerald-700 mt-2">{fees.totalPaid?.toLocaleString()}</p>
              <p className="text-sm text-slate-500">{fees.currency}</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm text-center">
              <p className="text-xs font-medium text-red-600 uppercase tracking-wider">Balance Due</p>
              <p className="text-3xl font-bold text-red-700 mt-2">{fees.balance?.toLocaleString()}</p>
              <p className="text-sm text-slate-500">{fees.currency}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-slate-700">Payment Progress</p>
              <p className="text-sm font-bold text-slate-900">
                {fees.totalFees ? Math.round((fees.totalPaid / fees.totalFees) * 100) : 0}%
              </p>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                style={{ width: `${fees.totalFees ? (fees.totalPaid / fees.totalFees) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* Fee Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Fee Breakdown</h2>
            <div className="space-y-3">
              {fees.fees?.map((fee: any) => (
                <div key={fee.fee_id} className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-medium text-slate-900">{fee.name}</p>
                    <p className="text-xs text-slate-500">{fee.term}</p>
                  </div>
                  <p className="font-semibold text-slate-900">{fee.amount?.toLocaleString()} {fee.currency}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FR-P36: Make Payment */}
      {activeTab === "pay" && (
        <div className="max-w-lg">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Make a Payment</h2>

            {fees?.balance > 0 && (
              <div className="rounded-xl bg-red-50 border border-red-100 p-4 mb-6">
                <p className="text-sm text-red-700">
                  Outstanding balance: <span className="font-bold">{fees.balance?.toLocaleString()} {fees.currency}</span>
                </p>
              </div>
            )}

            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount ({fees?.currency || "ETB"})</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="1"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-2 gap-3">
                  {["Chapa", "Telebirr", "CBE Birr", "Bank Transfer"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPayMethod(method)}
                      className={`rounded-xl px-4 py-3 text-sm font-semibold border transition ${
                        payMethod === method
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              {payFeedback && (
                <p className={`text-sm ${payFeedback.includes("success") ? "text-emerald-600" : "text-red-600"}`}>
                  {payFeedback}
                </p>
              )}

              <button
                type="submit"
                disabled={payLoading}
                className="w-full rounded-xl bg-emerald-600 px-6 py-3 text-white font-semibold hover:bg-emerald-700 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {payLoading ? "Processing..." : `Pay ${payAmount ? Number(payAmount).toLocaleString() : ""} ${fees?.currency || "ETB"}`}
              </button>
            </form>

            <p className="text-xs text-slate-400 mt-4 text-center">
              Payments are processed securely through the selected payment gateway.
            </p>
          </div>
        </div>
      )}

      {/* FR-P37: Payment History & Receipts */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {paymentHistory.length > 0 ? (
            paymentHistory.map((payment) => (
              <div key={payment.payment_id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-semibold text-slate-900">
                        {payment.amount?.toLocaleString()} {payment.currency}
                      </p>
                      <span className={`rounded-lg px-2 py-0.5 text-xs font-bold border ${getStatusStyle(payment.status)}`}>
                        {payment.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500">
                      {payment.payment_method && <span>Via {payment.payment_method}</span>}
                      {payment.transaction_id && <span>TXN: {payment.transaction_id}</span>}
                      <span>{new Date(payment.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {/* FR-P37: Download Receipt */}
                  {payment.receipt_url && (
                    <a
                      href={payment.receipt_url}
                      download
                      className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Receipt
                    </a>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p className="text-slate-500">No payment history available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
