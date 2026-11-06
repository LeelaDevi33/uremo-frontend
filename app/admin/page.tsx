"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import ActionQueuePage from "@/components/admin/v2/ActionQueuePage";
import Link from "next/link";
import { useAdminContext } from "@/components/admin/v2/AdminLayoutV2";

interface RentalMetrics {
  activeRentals: number;
  pendingRentals: number;
  expiringIn7Days: number;
  expiredLast30Days: number;
  revenueLast30Days: number;
  lifetimeRevenue: number;
  mostRentedService: {
    serviceId: string;
    title: string;
    rentalCount: number;
  } | null;
}

interface FinanceMetrics {
  totalWalletLiabilities: number;
  pendingWithdrawals: number;
  lifetimeEarningsPaid: number;
  purchaseRevenue: number;
  rentalRevenue: number;
  topupTotal: number;
  withdrawalTotal: number;
  refundTotal: number;
  platformRevenue: number;
  transactionBreakdown: Record<string, { count: number; total: number }>;
}

function MetricBlock({
  title,
  icon,
  color,
  metrics,
}: {
  title: string;
  icon: string;
  color: string;
  metrics: { label: string; value: string | number }[];
}) {
  return (
    <div className={`rounded-2xl border p-5 ${color}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="font-semibold text-white text-sm">{title}</h3>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="text-center">
            <p className="text-xl font-bold text-white">{m.value}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { summary, summaryError, refreshBadges } = useAdminContext();
  const [rentalMetrics, setRentalMetrics] = useState<RentalMetrics | null>(
    null,
  );
  const [financeMetrics, setFinanceMetrics] = useState<FinanceMetrics | null>(
    null,
  );


  useEffect(() => {

    loadRentalMetrics();
    loadFinanceMetrics();
  }, []);

  const loadFinanceMetrics = async () => {
    try {
      const res = await apiRequest(
        "/api/admin/wallet/finance",
        "GET",
        null,
        true,
      );
      if (res?.finance) {
        setFinanceMetrics(res.finance);
      }
    } catch (err) {
      console.error("Failed to load finance metrics:", err);
    }
  };

  const loadRentalMetrics = async () => {
    try {
      const res = await apiRequest(
        "/api/admin/rentals/metrics",
        "GET",
        null,
        true,
      );
      if (res?.metrics) {
        setRentalMetrics(res.metrics);
      }
    } catch (err) {
      console.error("Failed to load rental metrics:", err);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <div className="flex flex-wrap gap-4">
          <Link className="text-emerald-300 underline" href="/admin/opportunities">Manage opportunities</Link>
          <Link className="text-emerald-300 underline" href="/admin/opportunities#receipt-heading">Access receipts</Link>
        </div>
      </header>
      {summaryError && <p role="alert">Dashboard counts could not be refreshed. <button type="button" className="underline" onClick={refreshBadges}>Retry</button></p>}
      {!summary && !summaryError && <p role="status">Loading dashboard counts…</p>}
      {summary && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricBlock title="Marketplace" icon="" color="border-blue-500/30 bg-blue-500/5" metrics={[
          {label: "Published listings", value: summary.marketplace.published},
          {label: "Active rentals", value: summary.marketplace.activeRentals},
          {label: "Exclusive sales", value: summary.marketplace.sales},
        ]} />
        <MetricBlock title="Workforce" icon="" color="border-emerald-500/30 bg-emerald-500/5" metrics={[
          {label: "Pending applications", value: summary.badges.pendingApplications},
          {label: "Projects", value: summary.projects},
          {label: "Pending proofs", value: summary.badges.pendingProofs},
        ]} />
        <MetricBlock title="Dataset reviews" icon="" color="border-purple-500/30 bg-purple-500/5" metrics={[
          {label: "Datasets", value: summary.datasets}, {label: "Approved submissions", value: summary.approvedSubmissions},
          {label: "Pending reviews", value: summary.pendingReviews},
        ]} />
        <MetricBlock title="Finance queues" icon="" color="border-amber-500/30 bg-amber-500/5" metrics={[
          {label: "Wallet withdrawals", value: summary.badges.walletWithdrawals},
          {label: "Referral payouts", value: summary.badges.referralWithdrawals},
          {label: "Top-ups to review", value: summary.badges.pendingTopups},
        ]} />
      </div>}

      {/* PATCH_109: Rental Revenue Intelligence Block */}
      {rentalMetrics && (
        <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔑</span>
            <h3 className="font-semibold text-white text-sm">
              Legacy service rental history
            </h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-300">
                {rentalMetrics.activeRentals}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-300">
                {rentalMetrics.pendingRentals}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Pending</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-300">
                {rentalMetrics.expiringIn7Days}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Expiring (7d)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-300">
                {rentalMetrics.expiredLast30Days}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Expired (30d)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-white">
                ${rentalMetrics.revenueLast30Days}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Revenue (30d)</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-300">
                ${rentalMetrics.lifetimeRevenue}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Lifetime Rev.</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-blue-300 truncate">
                {rentalMetrics.mostRentedService?.title || "—"}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Top Service
                {rentalMetrics.mostRentedService
                  ? ` (${rentalMetrics.mostRentedService.rentalCount})`
                  : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PATCH_110: Finance Ledger Dashboard */}
      {financeMetrics && (
        <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/30 rounded-2xl p-5 border border-emerald-700/30">
          <h3 className="text-sm font-semibold text-emerald-300 mb-3">
            💰 Finance Ledger Dashboard
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-emerald-300">
                ${financeMetrics.totalWalletLiabilities.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Wallet Liabilities
              </p>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-300">
                ${financeMetrics.pendingWithdrawals.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Pending W/D</p>
            </div>
            <div>
              <p className="text-lg font-bold text-blue-300">
                ${financeMetrics.lifetimeEarningsPaid.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Earnings Paid</p>
            </div>
            <div>
              <p className="text-lg font-bold text-cyan-300">
                ${financeMetrics.purchaseRevenue.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Legacy purchases</p>
            </div>
            <div>
              <p className="text-lg font-bold text-purple-300">
                ${financeMetrics.rentalRevenue.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Legacy rentals</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-300">
                ${financeMetrics.topupTotal.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Topup Total</p>
            </div>
            <div>
              <p className="text-lg font-bold text-red-300">
                ${financeMetrics.withdrawalTotal.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Withdrawn</p>
            </div>
            <div>
              <p className="text-lg font-bold text-orange-300">
                ${financeMetrics.refundTotal.toFixed(2)}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Refunds</p>
            </div>

          </div>
        </div>
      )}

      {/* Action Queue below */}
      <ActionQueuePage />
    </div>
  );
}
