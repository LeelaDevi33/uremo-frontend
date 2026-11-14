"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ActionQueuePage from "@/components/admin/v2/ActionQueuePage";
import { useAdminContext } from "@/components/admin/v2/AdminLayoutV2";
import { apiRequest } from "@/lib/api";

const workflows = [
  { label: "Open roles", href: "/admin/work-positions", detail: "Publish specializations and edit applicant requirements." },
  { label: "Applications", href: "/admin/applications", detail: "Review applications and qualify workers for matching projects." },
  { label: "Projects", href: "/admin/workspace/projects", detail: "Create project briefs and manage worker assignments." },
  { label: "Project offers", href: "/admin/opportunities", detail: "Set the rental term or exclusive purchase price for a project." },
];

interface RentalMetrics {
  activeRentals: number; pendingRentals: number; expiringIn7Days: number; expiredLast30Days: number;
  revenueLast30Days: number; lifetimeRevenue: number; mostRentedService: { title: string; rentalCount: number } | null;
}
interface FinanceMetrics {
  totalWalletLiabilities: number; pendingWithdrawals: number; lifetimeEarningsPaid: number;
  purchaseRevenue: number; rentalRevenue: number; topupTotal: number; withdrawalTotal: number; refundTotal: number;
}

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

function MetricList({ rows }: { rows: [string, string | number][] }) {
  return <dl className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-3 xl:grid-cols-4">
    {rows.map(([label, value]) => <div key={label}><dt className="text-sm text-slate-300">{label}</dt>
      <dd className="mt-1 text-lg font-semibold tabular-nums text-white">{value}</dd></div>)}
  </dl>;
}

function HistoricalMetrics() {
  const [rentals, setRentals] = useState<RentalMetrics | null>(null);
  const [finance, setFinance] = useState<FinanceMetrics | null>(null);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let current = true;
    Promise.allSettled([
      apiRequest<{ metrics: RentalMetrics }>("/api/admin/rentals/metrics", "GET", null, true),
      apiRequest<{ finance: FinanceMetrics }>("/api/admin/wallet/finance", "GET", null, true),
    ]).then(([rentalResult, financeResult]) => {
      if (!current) return;
      setError(rentalResult.status === "rejected" || financeResult.status === "rejected");
      if (rentalResult.status === "fulfilled") setRentals(rentalResult.value.metrics);
      if (financeResult.status === "fulfilled") setFinance(financeResult.value.finance);
    });
    return () => { current = false; };
  }, [revision]);
  return <div className="space-y-5 pt-4">
    {error && <p role="alert">Some report totals could not be refreshed. <button type="button" className="underline" onClick={() => { setError(false); setRevision(value => value + 1); }}>Retry</button></p>}
    {!rentals && !finance && !error && <p role="status">Loading reports…</p>}
    {finance && <section><h3 className="mb-3 font-semibold">Wallet ledger</h3><MetricList rows={[
      ["Wallet liabilities", currency.format(finance.totalWalletLiabilities)], ["Pending withdrawals", currency.format(finance.pendingWithdrawals)],
      ["Earnings paid", currency.format(finance.lifetimeEarningsPaid)], ["Legacy purchases", currency.format(finance.purchaseRevenue)],
      ["Legacy rentals", currency.format(finance.rentalRevenue)], ["Top-ups", currency.format(finance.topupTotal)],
      ["Withdrawn", currency.format(finance.withdrawalTotal)], ["Refunds", currency.format(finance.refundTotal)],
    ]} /></section>}
    {rentals && <section><h3 className="mb-3 font-semibold">Legacy service rentals</h3><MetricList rows={[
      ["Active", rentals.activeRentals], ["Pending", rentals.pendingRentals], ["Expire within 7 days", rentals.expiringIn7Days],
      ["Expired in 30 days", rentals.expiredLast30Days], ["Revenue in 30 days", currency.format(rentals.revenueLast30Days)],
      ["Lifetime revenue", currency.format(rentals.lifetimeRevenue)], ["Most rented service", rentals.mostRentedService ? `${rentals.mostRentedService.title} (${rentals.mostRentedService.rentalCount})` : "—"],
    ]} /></section>}
  </div>;
}

export default function AdminDashboard() {
  const { summary, summaryError, refreshBadges } = useAdminContext();
  const [reportsOpen, setReportsOpen] = useState(false);
  return <div className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-7 lg:px-9 lg:py-9">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Admin dashboard</h1>
      <Link href="/admin/opportunities#receipt-heading" className="rounded-md border border-emerald-200/30 px-4 py-2 text-sm font-semibold text-emerald-100 hover:bg-emerald-100/10">View access receipts</Link>
    </header>
    <section aria-labelledby="marketplace-tools"><h2 id="marketplace-tools" className="mb-3 text-lg font-semibold">Manage the marketplace</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{workflows.map(item => <Link key={item.href} href={item.href}
        className="group rounded-xl border border-emerald-100/20 bg-[#152a23] p-4 transition-colors hover:border-emerald-200/55 hover:bg-[#19372a] sm:p-5">
        <span className="flex items-center justify-between font-semibold text-emerald-50">{item.label}<span aria-hidden="true" className="text-emerald-300">→</span></span>
        <span className="mt-2 block text-sm leading-relaxed text-emerald-50/75">{item.detail}</span>
      </Link>)}</div>
    </section>
    <section aria-labelledby="marketplace-activity" className="rounded-xl border border-white/10 bg-[#10191d] p-4 sm:p-5">
      <h2 id="marketplace-activity" className="mb-3 text-lg font-semibold">Marketplace activity</h2>
      {summaryError && <p role="alert" className="mb-3 text-amber-200">Dashboard counts could not be refreshed. <button type="button" className="underline" onClick={refreshBadges}>Retry</button></p>}
      {!summary && !summaryError && <p role="status">Loading dashboard counts…</p>}
      {summary && <MetricList rows={[["Published project offers", summary.marketplace.published], ["Active project rentals", summary.marketplace.activeRentals],
        ["Exclusive sales", summary.marketplace.sales], ["Pending applications", summary.badges.pendingApplications]]} />}
    </section>
    <ActionQueuePage />
    <details className="rounded-xl border border-white/10 bg-[#10191d] p-4 sm:p-5" onToggle={event => setReportsOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer font-semibold text-emerald-100">Operational reports and wallet history</summary>
      {reportsOpen && <>{summary && <div className="mt-4"><MetricList rows={[["Projects", summary.projects], ["Pending proofs", summary.badges.pendingProofs],
        ["Datasets", summary.datasets], ["Approved submissions", summary.approvedSubmissions], ["Pending dataset reviews", summary.pendingReviews],
        ["Wallet withdrawal requests", summary.badges.walletWithdrawals], ["Referral payout requests", summary.badges.referralWithdrawals], ["Top-ups to review", summary.badges.pendingTopups]]} /></div>}<HistoricalMetrics /></>}
    </details>
  </div>;
}
