"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

interface Affiliate {
  _id: string;
  name: string;
  email: string;
  referralCode: string;
  affiliateBalance: number;
  totalAffiliateEarned: number;
  referralCount: number;
  totalWithdrawn: number;
  createdAt: string;
  isActive: boolean;
}

interface AffiliateStats {
  totalAffiliates: number;
  activeAffiliates: number;
  totalEarned: number;
  totalBalance: number;
  totalReferrals: number;
}

interface AffiliateDetail {
  _id: string;
  name: string;
  email: string;
  referralCode: string;
  referralLink: string;
  commissionRate: number;
  affiliateBalance: number;
  totalAffiliateEarned: number;
  totalWithdrawn: number;
  pendingWithdrawals: number;
  totalReferrals: number;
  successfulReferrals: number;
  createdAt: string;
}

interface Commission {
  _id: string;
  referredUserEmail: string;
  referredUserName: string;
  orderId: string;
  orderAmount: number;
  commissionAmount: number;
  status: string;
  date: string;
}

interface Withdrawal {
  _id: string;
  amount: number;
  paymentMethod: string;
  paymentDetails: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
}

interface ReferredUser {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

export default function AdminAffiliatesPage() {
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // PATCH_56: Page-level tabs
  const [pageTab, setPageTab] = useState<
    "overview" | "commissions" | "withdrawals"
  >("overview");

  // Detail modal
  const [selectedAffiliate, setSelectedAffiliate] =
    useState<AffiliateDetail | null>(null);
  const [affiliateCommissions, setAffiliateCommissions] = useState<
    Commission[]
  >([]);
  const [affiliateWithdrawals, setAffiliateWithdrawals] = useState<
    Withdrawal[]
  >([]);
  const [affiliateReferredUsers, setAffiliateReferredUsers] = useState<
    ReferredUser[]
  >([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<
    "profile" | "commissions" | "withdrawals" | "referrals"
  >("profile");

  useEffect(() => {
    loadAffiliates();
  }, [page, statusFilter]);

  const loadAffiliates = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (statusFilter) params.set("status", statusFilter);
      if (search.trim()) params.set("search", search.trim());

      const data = await apiRequest(
        `/api/admin/affiliate/affiliates?${params.toString()}`,
        "GET",
        null,
        true,
      );
      setAffiliates(data?.affiliates || []);
      setStats(data?.stats || null);
      setTotal(data?.total || 0);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load affiliates";
      toast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    loadAffiliates();
  };

  const viewAffiliateDetails = async (affiliateId: string) => {
    setDetailLoading(true);
    setDetailTab("profile");
    try {
      const data = await apiRequest(
        `/api/admin/affiliate/affiliates/${affiliateId}`,
        "GET",
        null,
        true,
      );
      setSelectedAffiliate(data?.affiliate || null);
      setAffiliateCommissions(data?.commissions || []);
      setAffiliateWithdrawals(data?.withdrawals || []);
      setAffiliateReferredUsers(data?.referredUsers || []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load affiliate details";
      toast(message, "error");
    } finally {
      setDetailLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
      case "paid":
        return "text-emerald-300 bg-emerald-500/20";
      case "pending":
        return "text-yellow-300 bg-yellow-500/20";
      case "rejected":
      case "cancelled":
        return "text-red-300 bg-red-500/20";
      default:
        return "text-slate-300 bg-slate-500/20";
    }
  };

  return (
    <div className="u-container">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Affiliate Program</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage affiliates, commissions, and withdrawals
          </p>
        </div>
        <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
          ← Back to Admin
        </Link>
      </div>

      {/* PATCH_56: Page-level Tab Bar */}
      <div className="mb-6 flex flex-wrap items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
        {[
          { key: "overview", label: "Overview", icon: "👥" },
          { key: "commissions", label: "Commissions", icon: "💰" },
          { key: "withdrawals", label: "Withdrawals", icon: "📤" },
        ].map((t) => {
          const active = pageTab === t.key;
          return (
            <button
              key={t.key}
              aria-pressed={active}
              onClick={() => setPageTab(t.key as typeof pageTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                active
                  ? "bg-purple-500/20 border border-purple-500/30 text-purple-300 shadow-lg shadow-purple-500/10"
                  : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* PATCH_56: Tab Content */}
      {pageTab === "overview" && (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="card text-center">
                <p className="text-xs text-slate-400">Total Affiliates</p>
                <p className="text-2xl font-bold text-white">
                  {stats.totalAffiliates}
                </p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-slate-400">Active Affiliates</p>
                <p className="text-2xl font-bold text-emerald-300">
                  {stats.activeAffiliates}
                </p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-slate-400">Total Earned</p>
                <p className="text-2xl font-bold text-purple-300">
                  ${stats.totalEarned?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-slate-400">Pending Balance</p>
                <p className="text-2xl font-bold text-yellow-300">
                  ${stats.totalBalance?.toFixed(2) || "0.00"}
                </p>
              </div>
              <div className="card text-center">
                <p className="text-xs text-slate-400">Total Referrals</p>
                <p className="text-2xl font-bold text-blue-300">
                  {stats.totalReferrals}
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="flex w-full min-w-0 gap-2 sm:w-auto">
              <input
                type="text"
                aria-label="Search affiliates by name, email or referral code"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search by name, email, or code..."
                className="u-input min-w-0 flex-1 sm:w-64"
              />
              <button onClick={handleSearch} className="btn-secondary text-sm">
                Search
              </button>
            </div>
            <select
              aria-label="Filter affiliates by activity"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="u-select w-48"
            >
              <option value="">All Affiliates</option>
              <option value="active">Active Only</option>
              <option value="hasReferrals">Has Referrals</option>
            </select>
          </div>

          {/* Affiliates Table */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="card animate-pulse">
                  <div className="h-6 w-48 bg-white/10 rounded" />
                  <div className="h-4 w-32 bg-white/10 rounded mt-2" />
                </div>
              ))}
            </div>
          ) : affiliates.length === 0 ? (
            <div className="card text-center py-12">
              <div className="text-5xl mb-4">🤝</div>
              <h3 className="text-lg font-semibold text-white mb-2">
                No Affiliates Yet
              </h3>
              <p className="text-slate-400 mb-2">
                Affiliates are users who refer others to your platform and earn
                commission.
              </p>
              <p className="text-xs text-slate-400">
                Users can apply for affiliate status from their dashboard.
                Approved affiliates appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left">
                    <th className="py-3 px-4 text-slate-400 font-medium">
                      Affiliate
                    </th>
                    <th className="py-3 px-4 text-slate-400 font-medium">
                      Referral Code
                    </th>
                    <th className="py-3 px-4 text-slate-400 font-medium text-right">
                      Total Earned
                    </th>
                    <th className="py-3 px-4 text-slate-400 font-medium text-right">
                      Balance
                    </th>
                    <th className="py-3 px-4 text-slate-400 font-medium text-center">
                      Referrals
                    </th>
                    <th className="py-3 px-4 text-slate-400 font-medium text-right">
                      Withdrawn
                    </th>
                    <th className="py-3 px-4 text-slate-400 font-medium text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {affiliates.map((aff) => (
                    <tr
                      key={aff._id}
                      className="border-b border-white/5 hover:bg-white/5"
                    >
                      <td className="py-3 px-4">
                        <p className="text-white font-medium">
                          {aff.name || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-400">{aff.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-purple-300">
                          {aff.referralCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-300 font-semibold">
                        ${(aff.totalAffiliateEarned || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-blue-300">
                        ${(aff.affiliateBalance || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-white/10 px-2 py-1 rounded text-white">
                          {aff.referralCount || 0}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        ${(aff.totalWithdrawn || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => viewAffiliateDetails(aff._id)}
                          className="text-xs px-3 py-1 bg-purple-500/20 text-purple-300 rounded hover:bg-purple-500/30"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {total > 20 && (
            <div className="flex justify-center gap-2 mt-6">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="text-sm px-4 py-2 bg-white/10 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-slate-400 px-4 py-2">
                Page {page} of {Math.ceil(total / 20)}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil(total / 20)}
                className="text-sm px-4 py-2 bg-white/10 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* PATCH_56: Commissions Tab */}
      {pageTab === "commissions" && (
        <div className="card">
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">💰</span>
            <h3 className="text-xl font-bold text-white mb-2">
              All Commissions
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              View affiliate commissions by clicking on an affiliate in the
              Overview tab
            </p>
            <button
              onClick={() => setPageTab("overview")}
              className="text-sm px-4 py-2 bg-purple-500/20 text-purple-300 rounded hover:bg-purple-500/30"
            >
              ← Go to Overview
            </button>
          </div>
        </div>
      )}

      {/* PATCH_56: Withdrawals Tab */}
      {pageTab === "withdrawals" && (
        <div className="card">
          <div className="text-center py-12">
            <span className="text-4xl block mb-3">📤</span>
            <h3 className="text-xl font-bold text-white mb-2">
              Withdrawal Requests
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              Manage pending withdrawal requests from affiliates
            </p>
            <Link
              href="/admin/affiliate"
              className="text-sm px-4 py-2 bg-purple-500/20 text-purple-300 rounded hover:bg-purple-500/30 inline-block"
            >
              Open Withdrawal Manager →
            </Link>
          </div>
        </div>
      )}

      {/* Affiliate Detail Modal */}
      {(selectedAffiliate || detailLoading) && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedAffiliate(null);
            }
          }}
        >
          <div className="w-full max-w-4xl rounded-xl border border-white/10 bg-[#0B1220] p-6 my-8">
            {detailLoading ? (
              <div className="text-center py-12">
                <p className="text-slate-400">Loading affiliate details...</p>
              </div>
            ) : selectedAffiliate ? (
              <>
                <div className="flex justify-between items-start mb-6">
                  <div className="min-w-0 break-words">
                    <h2 className="text-2xl font-bold text-white">
                      {selectedAffiliate.name || "Unknown"}
                    </h2>
                    <p className="text-slate-400">{selectedAffiliate.email}</p>
                  </div>
                  <button
                    onClick={() => setSelectedAffiliate(null)}
                    aria-label="Close affiliate details"
                    className="text-slate-400 hover:text-white text-2xl"
                  >
                    ×
                  </button>
                </div>

                {/* Detail Tabs */}
                <div className="mb-6 flex flex-wrap gap-2 border-b border-white/10 pb-2">
                  {(
                    [
                      "profile",
                      "commissions",
                      "withdrawals",
                      "referrals",
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab}
                      aria-pressed={detailTab === tab}
                      onClick={() => setDetailTab(tab)}
                      className={`text-sm px-4 py-2 rounded-t whitespace-nowrap ${
                        detailTab === tab
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      {tab === "profile"
                        ? "👤 Profile"
                        : tab === "commissions"
                          ? "💵 Commissions"
                          : tab === "withdrawals"
                            ? "📤 Withdrawals"
                            : "👥 Referrals"}
                    </button>
                  ))}
                </div>

                {/* Profile Tab */}
                {detailTab === "profile" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card">
                      <p className="text-xs text-slate-400">Referral Code</p>
                      <p className="text-xl font-mono font-bold text-purple-300">
                        {selectedAffiliate.referralCode}
                      </p>
                    </div>
                    <div className="card">
                      <p className="text-xs text-slate-400">Referral Link</p>
                      <p className="text-sm text-blue-300 break-all">
                        {selectedAffiliate.referralLink}
                      </p>
                    </div>
                    <div className="card">
                      <p className="text-xs text-slate-400">Commission Rate</p>
                      <p className="text-xl font-bold text-white">
                        {selectedAffiliate.commissionRate}%
                      </p>
                    </div>
                    <div className="card">
                      <p className="text-xs text-slate-400">Member Since</p>
                      <p className="text-white">
                        {formatDate(selectedAffiliate.createdAt)}
                      </p>
                    </div>
                    <div className="card">
                      <p className="text-xs text-slate-400">Total Earned</p>
                      <p className="text-2xl font-bold text-emerald-300">
                        ${selectedAffiliate.totalAffiliateEarned.toFixed(2)}
                      </p>
                    </div>
                    <div className="card">
                      <p className="text-xs text-slate-400">
                        Available Balance
                      </p>
                      <p className="text-2xl font-bold text-blue-300">
                        ${selectedAffiliate.affiliateBalance.toFixed(2)}
                      </p>
                    </div>
                    <div className="card">
                      <p className="text-xs text-slate-400">Total Withdrawn</p>
                      <p className="text-2xl font-bold text-purple-300">
                        ${selectedAffiliate.totalWithdrawn.toFixed(2)}
                      </p>
                    </div>
                    <div className="card">
                      <p className="text-xs text-slate-400">
                        Pending Withdrawal
                      </p>
                      <p className="text-2xl font-bold text-yellow-300">
                        ${selectedAffiliate.pendingWithdrawals.toFixed(2)}
                      </p>
                    </div>
                    <div className="card">
                      <p className="text-xs text-slate-400">Total Referrals</p>
                      <p className="text-2xl font-bold text-white">
                        {selectedAffiliate.totalReferrals}
                      </p>
                    </div>
                    <div className="card">
                      <p className="text-xs text-slate-400">
                        Successful Referrals
                      </p>
                      <p className="text-2xl font-bold text-orange-300">
                        {selectedAffiliate.successfulReferrals}
                      </p>
                    </div>
                  </div>
                )}

                {/* Commissions Tab */}
                {detailTab === "commissions" && (
                  <div>
                    {affiliateCommissions.length === 0 ? (
                      <p className="text-center text-slate-400 py-8">
                        No commissions yet
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/10 text-left">
                              <th className="py-2 px-3 text-slate-400">
                                Referred User
                              </th>
                              <th className="py-2 px-3 text-slate-400">
                                Order ID
                              </th>
                              <th className="py-2 px-3 text-slate-400 text-right">
                                Order
                              </th>
                              <th className="py-2 px-3 text-slate-400 text-right">
                                Commission
                              </th>
                              <th className="py-2 px-3 text-slate-400 text-center">
                                Status
                              </th>
                              <th className="py-2 px-3 text-slate-400">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {affiliateCommissions.map((c) => (
                              <tr
                                key={c._id}
                                className="border-b border-white/5"
                              >
                                <td className="py-2 px-3">
                                  <p className="text-white">
                                    {c.referredUserName}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    {c.referredUserEmail}
                                  </p>
                                </td>
                                <td className="py-2 px-3 font-mono text-xs text-slate-400">
                                  {c.orderId
                                    ? `${String(c.orderId).slice(0, 8)}...`
                                    : "—"}
                                </td>
                                <td className="py-2 px-3 text-right text-white">
                                  ${c.orderAmount.toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-right text-emerald-300">
                                  +${c.commissionAmount.toFixed(2)}
                                </td>
                                <td className="py-2 px-3 text-center">
                                  <span
                                    className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(c.status)}`}
                                  >
                                    {c.status}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-400">
                                  {formatDate(c.date)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Withdrawals Tab */}
                {detailTab === "withdrawals" && (
                  <div>
                    {affiliateWithdrawals.length === 0 ? (
                      <p className="text-center text-slate-400 py-8">
                        No withdrawals yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {affiliateWithdrawals.map((wd) => (
                          <div
                            key={wd._id}
                            className="p-4 rounded-lg bg-white/5 border border-white/10"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-white font-semibold">
                                  ${wd.amount.toFixed(2)} via {wd.paymentMethod}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {wd.paymentDetails}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {formatDate(wd.createdAt)}
                                </p>
                                {wd.adminNotes && (
                                  <p className="text-xs text-slate-400 mt-1 italic">
                                    {wd.adminNotes}
                                  </p>
                                )}
                              </div>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${getStatusColor(wd.status)}`}
                              >
                                {wd.status}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Referrals Tab */}
                {detailTab === "referrals" && (
                  <div>
                    {affiliateReferredUsers.length === 0 ? (
                      <p className="text-center text-slate-400 py-8">
                        No referrals yet
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-white/10 text-left">
                              <th className="py-2 px-3 text-slate-400">Name</th>
                              <th className="py-2 px-3 text-slate-400">
                                Email
                              </th>
                              <th className="py-2 px-3 text-slate-400">
                                Joined
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {affiliateReferredUsers.map((u) => (
                              <tr
                                key={u._id}
                                className="border-b border-white/5"
                              >
                                <td className="py-2 px-3 text-white">
                                  {u.name || "Unknown"}
                                </td>
                                <td className="py-2 px-3 text-slate-400">
                                  {u.email}
                                </td>
                                <td className="py-2 px-3 text-slate-400">
                                  {formatDate(u.createdAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
