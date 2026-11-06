"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import PageHeader from "@/components/ui/PageHeader";
import { getStatusLabel } from "@/lib/statusConfig";

interface Commission {
  _id: string;
  orderId: string | null;
  referredUserName: string;
  orderAmount: number;
  commissionAmount: number;
  status: string;
  date: string;
}
interface Withdrawal {
  _id: string;
  amount: number;
  paymentMethod: string;
  paymentDetails?: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
}
interface Summary {
  totalEarnings: number;
  availableBalance: number;
  withdrawnAmount: number;
  pendingWithdrawal: number;
}
const dollars = (amount: number) =>
  amount.toLocaleString("en-US", { style: "currency", currency: "USD" });
const date = (iso: string) => new Date(iso).toLocaleDateString();
const payoutMethods = { paypal: "PayPal", bank: "Bank transfer", crypto: "Crypto wallet" } as const;
type Method = keyof typeof payoutMethods;

export default function AffiliatePage() {
  const [summary, setSummary] = useState<Summary>();
  const [minimum, setMinimum] = useState<number>();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [tab, setTab] = useState<"commissions" | "withdrawals">("commissions");
  const [commissionPage, setCommissionPage] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [pages, setPages] = useState({ commissions: 1, withdrawals: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Method>("paypal");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const refresh = useCallback(() => setAttempt(n => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [stats, ledger, requests] = await Promise.all([
          apiRequest<{ stats: { minimumWithdrawal: number } }>("/api/affiliate/stats", "GET", null, true),
          apiRequest<{ summary: Summary; commissions: Commission[]; pages: number }>(
            `/api/affiliate/commissions?page=${commissionPage}`, "GET", null, true),
          apiRequest<{ withdrawals: Withdrawal[]; pages: number }>(
            `/api/affiliate/withdrawals?page=${withdrawalPage}`, "GET", null, true),
        ]);
        if (cancelled) return;
        setMinimum(stats.stats.minimumWithdrawal);
        setSummary(ledger.summary);
        setCommissions(ledger.commissions);
        setWithdrawals(requests.withdrawals);
        setPages({ commissions: ledger.pages, withdrawals: requests.pages });
      } catch {
        if (!cancelled) setError("Your referral records could not be loaded.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [commissionPage, withdrawalPage, attempt]);

  async function requestPayout(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || !summary || minimum === undefined) return;
    const requested = Number(amount);
    if (!Number.isFinite(requested) || requested < minimum || requested > summary.availableBalance ||
        Number(requested.toFixed(2)) !== requested || !details.trim()) {
      setMessage("Enter a valid amount and your payment details.");
      return;
    }
    setSubmitting(true);
    setMessage("");
    try {
      await apiRequest("/api/affiliate/withdraw", "POST", {
        amount: requested, paymentMethod: method, paymentDetails: details.trim(),
      }, true);
      setMessage("Your withdrawal request was submitted for review.");
      setShowForm(false);
      setDetails("");
      setAmount("");
      setTab("withdrawals");
      setWithdrawalPage(1);
      refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "The request could not be confirmed. Check your withdrawal history before retrying.");
    } finally {
      setSubmitting(false);
    }
  }

  const currentPage = tab === "commissions" ? commissionPage : withdrawalPage;
  const setPage = tab === "commissions" ? setCommissionPage : setWithdrawalPage;
  return (
    <main className="u-container max-w-5xl space-y-6">
      <PageHeader title="Referral history" description="Review commissions recorded on earlier service orders and request payment of your available referral earnings." />
      {loading ? <p role="status">Loading referral records…</p> : error ? (
        <div role="alert" className="card">{error} <button className="btn-secondary" onClick={refresh}>Try again</button></div>
      ) : summary && minimum !== undefined && (
        <>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Recorded earnings", summary.totalEarnings], ["Available for withdrawal", summary.availableBalance],
              ["Awaiting review", summary.pendingWithdrawal], ["Paid withdrawals", summary.withdrawnAmount],
            ].map(([label, value]) => (
              <div key={label} className="card"><dt className="text-sm text-slate-400">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold">{dollars(Number(value))}</dd></div>
            ))}
          </dl>
          {summary.availableBalance > 0 && (
            <section className="card space-y-3">
              <h2 className="text-lg font-semibold">Withdraw historical earnings</h2>
              <p className="text-sm text-slate-300">The minimum withdrawal is {dollars(minimum)}. Each request is reviewed before payment.</p>
              {summary.pendingWithdrawal > 0 ? <p className="text-sm">A withdrawal is awaiting review.</p> :
                summary.availableBalance >= minimum && !showForm && <button className="btn-primary" onClick={() => setShowForm(true)}>Request withdrawal</button>}
              {showForm && summary.availableBalance >= minimum && summary.pendingWithdrawal === 0 && (
                <form className="max-w-md space-y-3" onSubmit={requestPayout}>
                  <label className="block">Amount in USD
                    <input type="number" className="u-input" min={minimum} max={summary.availableBalance} step="0.01" required value={amount} onChange={e => setAmount(e.target.value)} />
                  </label>
                  <label className="block">Payout method for earlier referral earnings
                    <select className="u-select" value={method} onChange={e => { setMethod(e.target.value as Method); setDetails(""); }}>
                      {Object.entries(payoutMethods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="block">{method === "paypal" ? "PayPal email" : method === "bank" ? "Bank payment details" : "Wallet address and network"}
                    <textarea className="u-input" required value={details} onChange={e => setDetails(e.target.value)} />
                  </label>
                  <div className="flex gap-3"><button className="btn-primary" disabled={submitting}>{submitting ? "Submitting…" : "Submit request"}</button>
                    <button type="button" className="btn-secondary" disabled={submitting} onClick={() => { setShowForm(false); setDetails(""); }}>Cancel</button></div>
                </form>
              )}
            </section>
          )}
          <section className="card space-y-4">
            <div className="flex gap-2" aria-label="Referral records">
              {(["commissions", "withdrawals"] as const).map(item => (
                <button key={item} aria-pressed={tab === item} className={tab === item ? "btn-primary" : "btn-secondary"} onClick={() => setTab(item)}>
                  {item === "commissions" ? "Commissions" : "Withdrawals"}
                </button>
              ))}
            </div>
            {tab === "commissions" ? (
              commissions.length === 0 ? <p>No referral commissions are recorded for this account.</p> :
                <ul className="divide-y divide-white/10">{commissions.map(row => (
                  <li key={row._id} className="py-3"><strong>{dollars(row.commissionAmount)} commission</strong> · {getStatusLabel(row.status)}
                    <p className="text-sm text-slate-400">{date(row.date)} · {row.referredUserName} · {dollars(row.orderAmount)} order{row.orderId ? " #" + row.orderId.slice(-8) : ""}</p>
                  </li>))}</ul>
            ) : withdrawals.length === 0 ? <p>No referral withdrawals are recorded for this account.</p> :
              <ul className="divide-y divide-white/10">{withdrawals.map(row => (
                <li key={row._id} className="py-3"><strong>{dollars(row.amount)} withdrawal</strong> · {getStatusLabel(row.status)}
                  <p className="text-sm text-slate-400">{date(row.createdAt)} · {payoutMethods[row.paymentMethod as Method] || row.paymentMethod}</p>
                  {row.paymentDetails && <details className="text-sm text-slate-400"><summary>Payment details</summary><p>{row.paymentDetails}</p></details>}
                  {row.adminNotes && <p className="text-sm">{row.adminNotes}</p>}
                </li>))}</ul>}
            {pages[tab] > 1 && <nav className="flex gap-3 items-center" aria-label="History pages">
              <button className="btn-secondary" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
              <span>Page {currentPage} of {pages[tab]}</span>
              <button className="btn-secondary" disabled={currentPage >= pages[tab]} onClick={() => setPage(p => p + 1)}>Next</button>
            </nav>}
          </section>
        </>
      )}
      {message && <p role="status" className="text-sm">{message}</p>}
    </main>
  );
}
