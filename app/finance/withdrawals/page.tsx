"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { ApiError, apiRequest } from "@/lib/api";
import { formatPrice } from "@/lib/orderPrice";

type Balance = { balance: number; spendable: number; withdrawable: number; pendingWithdrawals: number };
type Receipt = { _id: string; amount: number; status: string };
type Withdrawal = Receipt & { createdAt: string; adminNote?: string };
type Request = { amount: number; requestId: string };
type Data = { revision: number; balance: Balance | null; history: Withdrawal[] | null };
const labels: Record<string, string> = { pending: "Pending review", approved: "Approved", rejected: "Rejected", paid: "Paid" };
const loginHref = "/login?next=%2Ffinance%2Fwithdrawals";
const panel = "rounded-2xl border border-slate-700 bg-slate-900/75 p-5 sm:p-7";
const button = "inline-flex min-h-11 items-center justify-center rounded-lg bg-teal-200 px-4 py-2 font-semibold text-slate-950 hover:bg-teal-100 disabled:opacity-50";
const secondary = "inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-600 px-4 py-2 font-medium text-slate-100 hover:bg-slate-800 disabled:opacity-50";

function validMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}
function usableBalance(value?: Balance): value is Balance {
  return !!value && [value.balance, value.spendable, value.withdrawable, value.pendingWithdrawals].every(validMoney);
}
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "Date unavailable";
}
function recoverRequest(storageKey: string | null): Request | null {
  if (!storageKey) return null;
  try {
    const data = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    return data && validMoney(data.amount) && data.amount >= 10 && typeof data.requestId === "string" &&
      /^[\da-f-]{36}$/i.test(data.requestId) ? { amount: data.amount, requestId: data.requestId } : null;
  } catch { return null; }
}
function recordRequest(key: string | null, request: Request | null) {
  if (!key) return;
  try {
    if (request) sessionStorage.setItem(key, JSON.stringify(request));
    else sessionStorage.removeItem(key);
  } catch { /* The in-memory request remains available if storage is disabled. */ }
}
function requestError(error: ApiError) {
  const payload = error.payload;
  if (payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string") return payload.error;
  return error.message;
}

function Withdrawals({ token, email }: { token: string; email?: string }) {
  const key = email ? "uremo-withdrawal:" + email.toLowerCase() : null;
  const [review, setReview] = useState<Request | null>(() => recoverRequest(key));
  const [uncertain, setUncertain] = useState(Boolean(review));
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const reviewHeading = useRef<HTMLHeadingElement>(null);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<Data>();
  const refresh = () => setRevision(value => value + 1);
  useEffect(() => {
    let current = true;
    Promise.allSettled([
      apiRequest<Balance>("/api/wallet/balance", "GET", null, true),
      apiRequest<{ withdrawals: Withdrawal[] }>("/api/wallet/withdrawals", "GET", null, true),
    ]).then(([funds, records]) => {
      if (!current) return;
      const balance = funds.status === "fulfilled" && usableBalance(funds.value) ? funds.value : null;
      const values = records.status === "fulfilled" ? records.value?.withdrawals : null;
      const history = Array.isArray(values) && values.every(row => row && typeof row._id === "string" && validMoney(row.amount) && typeof row.status === "string") ? values : null;
      setData({ revision, balance, history });
    });
    return () => { current = false; };
  }, [revision, token]);
  const loading = data?.revision !== revision;
  const balance = loading ? null : data?.balance;
  const history = loading ? null : data?.history;
  useEffect(() => { if (review) reviewHeading.current?.focus(); }, [review]);

  function startReview(event: FormEvent) {
    event.preventDefault();
    if (!balance) return;
    setReceipt(null);
    const value = Number(amount);
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount.trim()) || !Number.isSafeInteger(Math.round(value * 100)) || value < 10) {
      setError("Enter at least $10.00, with up to two decimal places."); return;
    }
    if (value > balance.withdrawable) {
      setError(`You can currently withdraw up to ${formatPrice(balance.withdrawable)}.`); return;
    }
    setError(""); setUncertain(false);
    setReview({ amount: value, requestId: crypto.randomUUID() });
  }
  async function confirm() {
    if (!review || submitting.current || (!uncertain && (!balance || review.amount > balance.withdrawable))) return;
    submitting.current = true;
    setBusy(true); setError("");
    recordRequest(key, review);
    try {
      const response = await apiRequest<{ withdrawal: Receipt }>("/api/wallet/withdraw", "POST", review, true);
      if (!response?.withdrawal?._id || response.withdrawal.amount !== review.amount || !labels[response.withdrawal.status]) throw new Error("Receipt unavailable");
      recordRequest(key, null);
      setReceipt(response.withdrawal); setAmount(""); setReview(null); setUncertain(false); refresh();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status >= 400 && cause.status < 500 && ![408,429].includes(cause.status)) {
        recordRequest(key, null);
        setError(requestError(cause)); setReview(null); setUncertain(false); refresh();
      } else {
        setUncertain(true);
        setError("The server did not confirm the result. Check your history or retry this same request.");
        refresh();
      }
    } finally { submitting.current = false; setBusy(false); }
  }

  return <div className="mx-auto max-w-5xl px-4 pb-28 pt-8 sm:px-8 sm:pt-12">
    <Link href="/wallet" className="text-sm font-semibold text-teal-200 hover:underline">← Back to wallet</Link>
    <h1 className="mt-5 text-4xl font-semibold tracking-tight">Withdrawals</h1>
    <p className="mt-2 text-slate-300">Request a withdrawal from eligible earnings and track its review.</p>
    {receipt && <div role="status" className="mt-5 rounded-xl border border-teal-700 bg-teal-950 p-4 text-teal-100">
      Withdrawal request recorded for <strong>{formatPrice(receipt.amount)}</strong>. Status: {labels[receipt.status]}.
    </div>}
    <section aria-label="Wallet balances" className={panel + " mt-6"}>
      {loading ? <p role="status">Loading wallet balances…</p> : !balance ? <div role="alert">
        <p>Wallet balances could not be loaded. Withdrawal availability is unknown.</p>
        <button className={secondary + " mt-3"} type="button" onClick={refresh}>Retry balances</button>
      </div> : <dl className="grid grid-cols-2 gap-5 md:grid-cols-4">
        {([["Withdrawable", balance.withdrawable], ["Pending withdrawals", balance.pendingWithdrawals], ["Spendable", balance.spendable], ["Wallet balance", balance.balance]] as const)
          .map(([label, value]) => <div key={label}><dt className="text-sm text-slate-300">{label}</dt><dd className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">{formatPrice(value)}</dd></div>)}
      </dl>}
    </section>
    <div className="mt-5 grid items-start gap-5 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className={panel} aria-label="Request a withdrawal">
        {review ? <>
          <h2 ref={reviewHeading} tabIndex={-1} className="text-xl font-semibold">{uncertain ? "Check withdrawal request" : "Review withdrawal"}</h2>
          <p className="mt-3 text-slate-300">{uncertain ? "An earlier submission may have reached your wallet. Retrying checks the same request." : "Confirm the amount to reserve these funds for admin review."}</p>
          <p className="my-4 text-3xl font-semibold">{formatPrice(review.amount)} <span className="text-sm text-slate-300">USD</span></p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={button} disabled={busy || (!uncertain && (!balance || review.amount > balance.withdrawable))} onClick={confirm}>{busy ? "Submitting…" : uncertain ? "Retry same request" : "Confirm withdrawal"}</button>
            {uncertain ? <button type="button" className={secondary} disabled={busy} onClick={refresh}>Refresh history</button> :
              <button type="button" className={secondary} disabled={busy} onClick={() => { setReview(null); setError(""); }}>Edit amount</button>}
          </div>
        </> : <form onSubmit={startReview} noValidate>
          <h2 className="text-xl font-semibold">Request a withdrawal</h2>
          <label className="mt-4 block font-medium" htmlFor="withdrawal-amount">Amount (USD)</label>
          <input id="withdrawal-amount" inputMode="decimal" autoComplete="off" value={amount} placeholder="0.00" onChange={event => { setAmount(event.target.value); setError(""); }}
            aria-invalid={error ? true : undefined} aria-describedby={error ? "withdrawal-minimum withdrawal-response" : "withdrawal-minimum"} className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-3 text-lg" />
          <p id="withdrawal-minimum" className="mt-2 text-sm text-slate-300">Minimum withdrawal is $10.00.</p>
          {balance && balance.withdrawable < 10 && <p className="mt-2 text-sm text-amber-200">Your withdrawable balance is below the minimum.</p>}
          <button className={button + " mt-4"} disabled={!balance || balance.withdrawable < 10} type="submit">Review withdrawal</button>
        </form>}
        {error && <p id="withdrawal-response" role="alert" className="mt-4 text-amber-200">{error}</p>}
      </section>
      <section className={panel} aria-label="Withdrawal history">
        <h2 className="text-xl font-semibold">Withdrawal history</h2>
        {loading ? <p role="status" className="mt-3">Loading recent requests…</p> : !history ? <div role="alert" className="mt-3">
          <p>Withdrawal history could not be loaded.</p><button type="button" className={secondary + " mt-3"} onClick={refresh}>Retry history</button>
        </div> : history.length ? <ul className="mt-2 divide-y divide-slate-700">{history.map(row =>
          <li key={row._id} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2"><strong>{formatPrice(row.amount)}</strong><span className="text-sm text-teal-200">{labels[row.status] || "Status unavailable"}</span></div>
            <p className="text-sm text-slate-300">{dateLabel(row.createdAt)}</p>
            {typeof row.adminNote === "string" && row.adminNote && <p className="mt-1 wrap-anywhere text-sm text-slate-300">Review note: {row.adminNote}</p>}
          </li>)}</ul> : <p className="mt-3 text-slate-300">You have no withdrawal requests.</p>}
      </section>
    </div>
  </div>;
}

export default function WithdrawalPage() {
  const { ready, token, user } = useAuth();
  const router = useRouter();
  useEffect(() => { if (ready && !token) router.replace(loginHref); }, [ready, token, router]);
  if (!ready || !token) return <div className="mx-auto max-w-5xl p-6" role="status">
    {ready ? <Link href={loginHref}>Sign in to view withdrawals</Link> : "Checking your session…"}
  </div>;
  return <Withdrawals key={token} token={token} email={user?.email} />;
}
