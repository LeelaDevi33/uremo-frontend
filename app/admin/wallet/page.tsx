"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import {
  ActionBar,
  AuditTrail,
  UndoToast,
  useUndoToast,
} from "@/components/admin/v2";

interface User {
  _id: string;
  name: string;
  email: string;
  walletBalance: number;
}

interface Transaction {
  _id: string;
  type: "credit" | "debit";
  amount: number;
  source: string;
  description: string;
  balanceAfter: number;
  createdAt: string;
  // PATCH_80: New fields
  // PATCH_82: Added paid_unverified for PayPal
  status?: "initiated" | "pending" | "paid_unverified" | "success" | "failed";
  provider?: string;
  settlementReference?: string;
  methodName?: string;
  paymentReference?: string;
  failureReason?: string;
  user?: { _id: string; name: string; email: string };
}

interface Stats {
  totalBalance: number;
  credits: { total: number; count: number };
  debits: { total: number; count: number };
}

interface WithdrawalRequest {
  _id: string;
  userId: { _id: string; name: string; email: string } | null;
  amount: number;
  method: string;
  note?: string;
  status: "pending" | "approved" | "rejected" | "paid";
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
  reviewedBy?: { name: string; email: string };
}

export default function AdminWalletPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { ready, isAdmin } = useAuth();
  const undoToast = useUndoToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [lastAdjustment, setLastAdjustment] = useState<{
    userId: string;
    amount: number;
    type: "credit" | "debit";
  } | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [balanceFilter, setBalanceFilter] = useState<
    "all" | "high" | "medium" | "low"
  >("all");

  // Selected user
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [userLoading, setUserLoading] = useState(false);

  // Adjust modal
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustType, setAdjustType] = useState<"credit" | "debit">("credit");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustDescription, setAdjustDescription] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);

  // PATCH_80: Pending topups
  const [pendingTopups, setPendingTopups] = useState<Transaction[]>([]);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingPages, setPendingPages] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingError, setPendingError] = useState("");
  const pendingRequest = useRef(0);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [settlementReferences, setSettlementReferences] = useState<Record<string, string>>({});

  // PATCH_115: Withdrawal requests
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalCursors, setWithdrawalCursors] = useState<string[]>([]);
  const [nextWithdrawalCursor, setNextWithdrawalCursor] = useState<string | null>(null);
  const [withdrawalError, setWithdrawalError] = useState(false);
  const [withdrawalReload, setWithdrawalReload] = useState(0);
  const withdrawalBefore = withdrawalCursors.at(-1);
  const [withdrawalFilter, setWithdrawalFilter] = useState<
    "all" | "pending" | "approved" | "rejected" | "paid"
  >("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!isAdmin) {
      router.push("/admin/login");
      return;
    }
    fetchStats();
  }, [ready, isAdmin, router]);

  useEffect(() => {
    if (!ready || !isAdmin) return;
    let current = true;
    const query = new URLSearchParams();
    if (withdrawalFilter !== "all") query.set("status", withdrawalFilter);
    if (withdrawalBefore) query.set("before", withdrawalBefore);
    setWithdrawalLoading(true);
    setWithdrawalError(false);
    setNextWithdrawalCursor(null);
    apiRequest("/api/admin/wallet/withdrawals?" + query, "GET")
      .then(result => {
        if (!current) return;
        setWithdrawals(result.withdrawals);
        setNextWithdrawalCursor(result.nextCursor ?? null);
      })
      .catch(() => { if (current) { setWithdrawals([]); setWithdrawalError(true); } })
      .finally(() => { if (current) setWithdrawalLoading(false); });
    return () => { current = false; };
  }, [ready, isAdmin, withdrawalFilter, withdrawalBefore, withdrawalReload]);

  const fetchStats = async () => {
    try {
      const res = await apiRequest("/api/admin/wallet/stats", "GET");
      setStats(res.stats);
    } catch (err: any) {
      toast(err.message || "Failed to load stats", "error");
    } finally {
      setLoading(false);
    }
  };

  // PATCH_80: Fetch pending topups
  const fetchPendingTopups = async () => {
    const request = ++pendingRequest.current;
    setPendingLoading(true);
    try {
      const res = await apiRequest("/api/admin/wallet/pending-topups?page=" + pendingPage, "GET");
      if (request !== pendingRequest.current) return;
      const pages = Math.max(1, res.pages);
      setPendingPages(pages);
      setPendingTotal(res.total);
      setPendingError("");
      setPendingTopups(res.pendingTopups || []);
      if (pendingPage > pages) setPendingPage(pages);
    } catch (cause) {
      if (request === pendingRequest.current) setPendingError(cause instanceof Error ? cause.message : "Could not load pending transfers.");
    } finally {
      if (request === pendingRequest.current) setPendingLoading(false);
    }
  };
  useEffect(() => {
    if (ready && isAdmin) void fetchPendingTopups();
  }, [ready, isAdmin, pendingPage]);

  const fetchWithdrawals = () => setWithdrawalReload(value => value + 1);

  // PATCH_80: Verify (approve/reject) a pending topup
  // PATCH_81: Enhanced with double-click protection and already-processed handling
  const handleVerifyTopup = async (
    transactionId: string,
    action: "approve" | "reject",
    reason?: string,
  ) => {
    // PATCH_81: Prevent double-click by checking if already verifying
    if (verifyingId) {
      toast("Please wait - another action is in progress", "info");
      return;
    }

    setVerifyingId(transactionId);
    try {
      const res = await apiRequest("/api/admin/wallet/verify-topup", "POST", {
        transactionId,
        action,
        reason,
        settlementReference: action === "approve" ? settlementReferences[transactionId]?.trim() : undefined,
      });
      toast(res.message || `Topup ${action}d successfully`, "success");
      fetchPendingTopups(); // Refresh the list
      fetchStats(); // Refresh stats
    } catch (err: any) {
      // PATCH_81: Handle already-processed case gracefully
      if (err.payload?.alreadyProcessed) {
        toast("This topup was already processed by another admin", "info");
        fetchPendingTopups(); // Remove from list
      } else {
        toast(err.message || `Failed to ${action} topup`, "error");
      }
    } finally {
      setVerifyingId(null);
    }
  };

  // PATCH_115: Handle withdrawal approval
  const handleApproveWithdrawal = async (withdrawalId: string) => {
    setProcessingId(withdrawalId);
    try {
      await apiRequest(
        `/api/admin/wallet/withdrawals/${withdrawalId}/approve`,
        "PUT",
        {
          adminNote: "Approved by admin",
        },
      );
      toast("Withdrawal approved", "success");
      fetchWithdrawals();
    } catch (err: any) {
      toast(err.message || "Failed to approve withdrawal", "error");
    } finally {
      setProcessingId(null);
    }
  };

  // PATCH_115: Handle withdrawal payment
  const handlePayWithdrawal = async (withdrawalId: string) => {
    setProcessingId(withdrawalId);
    try {
      await apiRequest(
        `/api/admin/wallet/withdrawals/${withdrawalId}/pay`,
        "PUT",
        {},
      );
      toast("Withdrawal marked as paid", "success");
      fetchWithdrawals();
    } catch (err: any) {
      toast(err.message || "Failed to mark withdrawal as paid", "error");
    } finally {
      setProcessingId(null);
    }
  };

  // PATCH_115: Handle withdrawal rejection
  const handleRejectWithdrawal = async (withdrawalId: string) => {
    const reason = prompt("Enter rejection reason:");
    if (!reason) return;

    setProcessingId(withdrawalId);
    try {
      await apiRequest(
        `/api/admin/wallet/withdrawals/${withdrawalId}/reject`,
        "PUT",
        { adminNote: reason },
      );
      toast("Withdrawal rejected", "success");
      fetchWithdrawals();
    } catch (err: any) {
      toast(err.message || "Failed to reject withdrawal", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const handleSearch = async () => {
    if (searchQuery.length < 2 && balanceFilter === "all") {
      toast("Enter at least 2 characters or select a balance filter", "error");
      return;
    }

    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery.length >= 2) params.append("q", searchQuery);
      if (balanceFilter !== "all") params.append("tier", balanceFilter);

      const res = await apiRequest(
        `/api/admin/wallet/search?${params.toString()}`,
        "GET",
      );
      setSearchResults(res.users || []);
      if (res.users?.length === 0) {
        toast("No users found", "info");
      }
    } catch (err: any) {
      toast(err.message || "Search failed", "error");
    } finally {
      setSearching(false);
    }
  };

  const filterByTier = async (tier: "all" | "high" | "medium" | "low") => {
    setBalanceFilter(tier);
    if (tier === "all") {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await apiRequest(
        `/api/admin/wallet/search?tier=${tier}`,
        "GET",
      );
      setSearchResults(res.users || []);
      if (res.users?.length === 0) {
        toast(`No ${tier} balance users found`, "info");
      }
    } catch (err: any) {
      toast(err.message || "Filter failed", "error");
    } finally {
      setSearching(false);
    }
  };

  const selectUser = async (user: User) => {
    setSelectedUser(user);
    setUserLoading(true);
    try {
      const res = await apiRequest(`/api/admin/wallet/user/${user._id}`, "GET");
      setSelectedUser(res.user);
      setUserTransactions(res.transactions || []);
    } catch (err: any) {
      toast(err.message || "Failed to load user wallet", "error");
    } finally {
      setUserLoading(false);
    }
  };

  const handleAdjust = async () => {
    const amount = parseFloat(adjustAmount);
    if (!amount || amount <= 0) {
      toast("Amount must be greater than 0", "error");
      return;
    }

    if (!selectedUser) return;

    const userId = selectedUser._id;
    const currentType = adjustType;

    setAdjustLoading(true);
    try {
      const res = await apiRequest("/api/admin/wallet/adjust", "POST", {
        userId: selectedUser._id,
        amount,
        type: adjustType,
        description: adjustDescription,
      });
      toast(res.message || "Balance adjusted", "success");
      setLastAdjustment({ userId, amount, type: currentType });
      setShowAdjust(false);
      setAdjustAmount("");
      setAdjustDescription("");
      selectUser(selectedUser); // Refresh user data
      fetchStats(); // Refresh stats

      // PATCH_67: Show undo toast for wallet adjustment
      undoToast.showUndo(
        `${currentType === "credit" ? "Credited" : "Debited"} $${amount.toFixed(2)}`,
        async () => {
          // Reverse the adjustment
          const reverseType = currentType === "credit" ? "debit" : "credit";
          await apiRequest("/api/admin/wallet/adjust", "POST", {
            userId,
            amount,
            type: reverseType,
            description: `Undo: ${adjustDescription}`,
          });
          toast("Adjustment undone", "info");
          selectUser(selectedUser);
          fetchStats();
        },
      );
    } catch (err: any) {
      toast(err.message || "Adjustment failed", "error");
    } finally {
      setAdjustLoading(false);
    }
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      topup: "Top-up",
      service_purchase: "Service Purchase",
      rental_purchase: "Rental Purchase",
      admin_adjustment: "Admin Adjustment",
      refund: "Refund",
    };
    return labels[source] || source;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400">Loading wallet admin...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">💳 Wallet Management</h1>
          <button
            onClick={() => router.push("/admin")}
            className="text-sm text-slate-400 hover:text-white"
          >
            ← Back to Admin
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <p className="text-slate-400 text-sm">Total User Balances</p>
              <p className="text-2xl font-bold text-emerald-400">
                ${stats.totalBalance.toFixed(2)}
              </p>
            </div>
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <p className="text-slate-400 text-sm">Total Credits</p>
              <p className="text-2xl font-bold text-green-400">
                ${stats.credits.total.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">
                {stats.credits.count} transactions
              </p>
            </div>
            <div className="bg-slate-900 rounded-xl p-5 border border-slate-800">
              <p className="text-slate-400 text-sm">Total Debits</p>
              <p className="text-2xl font-bold text-red-400">
                ${stats.debits.total.toFixed(2)}
              </p>
              <p className="text-xs text-slate-500">
                {stats.debits.count} transactions
              </p>
            </div>
          </div>
        )}

        {/* PATCH_80: Pending Topups Section */}
        {(
          <div className="bg-slate-900 rounded-xl border border-amber-500/50 mb-8">
            <div className="p-4 border-b border-amber-500/30 bg-amber-500/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-amber-400 text-xl">⏳</span>
                <h2 className="text-lg font-semibold text-amber-400">
                  Pending Topup Verifications
                </h2>
              </div>
              <span className="bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full">
                {pendingError ? "Unavailable" : pendingTotal + " Pending"}
              </span>
            </div>
            <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
              {pendingError ? <p role="alert">{pendingError} <button className="underline" onClick={fetchPendingTopups}>Reload transfers</button></p> : pendingLoading ? (
                <p className="text-slate-400 text-center py-4">Loading...</p>
              ) : pendingTopups.length === 0 ? <p className="text-slate-400">No transfers awaiting review.</p> : (
                pendingTopups.map((topup) => (
                  <div
                    key={topup._id}
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {topup.user?.name || "Unknown User"}
                        </p>
                        <p className="text-sm text-slate-400">
                          {topup.user?.email || "No email"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Requested:{" "}
                          {new Date(topup.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-400">
                          ${topup.amount.toFixed(2)}
                        </p>
                        {/* PATCH_82: Show provider (PayPal badge) */}
                        {topup.provider === "paypal" && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-400 mr-1">
                            PayPal
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            topup.status === "paid_unverified"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : topup.status === "initiated"
                                ? "bg-yellow-500/20 text-yellow-400"
                                : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          {topup.status === "paid_unverified"
                            ? "✓ Paid - Verify"
                            : topup.status === "initiated"
                              ? "Awaiting Review"
                              : "Processing"}
                        </span>
                      </div>
                    </div>
                    {topup.methodName && <p className="mt-2 text-sm text-slate-200">Funding method: {topup.methodName}</p>}
                    {topup.paymentReference && <p className="mt-1 break-all text-sm text-slate-300">Submitted transfer reference: {topup.paymentReference}</p>}
                    {(!topup.provider || ["manual", "internal"].includes(topup.provider)) && (
                      <label className="mt-3 block text-sm text-slate-300">
                        Verified payment reference
                        <input type="text" autoComplete="off" maxLength={80}
                          value={settlementReferences[topup._id] || ""}
                          onChange={event => setSettlementReferences(current => ({ ...current, [topup._id]: event.target.value }))}
                          className="mt-1 block w-full rounded border border-slate-600 bg-slate-900 px-3 py-2 text-white" />
                        <span className="mt-1 block text-xs">Match the payer and amount to the payment record before approving.</span>
                      </label>
                    )}
                    <div className="mt-3 flex gap-2 justify-end">
                      <button
                        onClick={() => handleVerifyTopup(topup._id, "reject")}
                        disabled={verifyingId === topup._id}
                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {verifyingId === topup._id ? "..." : "Reject"}
                      </button>
                      <button
                        onClick={() => handleVerifyTopup(topup._id, "approve")}
                        disabled={Boolean(verifyingId) || !/^[a-z0-9][a-z0-9._/-]{3,79}$/i.test(settlementReferences[topup._id]?.trim() || "") ||
                          Boolean(topup.paymentReference && topup.paymentReference !== settlementReferences[topup._id]?.trim().toUpperCase())}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {verifyingId === topup._id ? "..." : "✓ Approve"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            {pendingPages > 1 && <nav aria-label="Pending transfer pages" className="flex items-center justify-between p-4">
              <button disabled={pendingLoading || pendingPage <= 1} className="underline disabled:opacity-40" onClick={() => setPendingPage(page => page - 1)}>Previous transfers</button>
              <span>Page {pendingPage} of {pendingPages}</span>
              <button disabled={pendingLoading || pendingPage >= pendingPages} className="underline disabled:opacity-40" onClick={() => setPendingPage(page => page + 1)}>Next transfers</button>
            </nav>}
          </div>
        )}

        {/* PATCH_115: Withdrawal Requests Section */}
        <div id="withdrawal-requests" className="bg-slate-900 rounded-xl border border-slate-800 mb-8">
          <div className="p-4 border-b border-slate-800 bg-slate-850 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 text-xl">💸</span>
              <h2 className="text-lg font-semibold text-blue-400">
                Withdrawal Requests
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                {withdrawals.filter((w) => w.status === "pending").length}{" "}
                Pending on this page
              </span>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="p-4 border-b border-slate-700 flex gap-2 overflow-x-auto">
            {(["all", "pending", "approved", "rejected", "paid"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => {
                    setWithdrawalFilter(status);
                    setWithdrawalCursors([]);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                    withdrawalFilter === status
                      ? "bg-blue-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ),
            )}
          </div>

          {/* Withdrawals List */}
          <div className="p-4">
            {withdrawalLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="bg-slate-800 rounded-lg p-4 animate-pulse"
                  >
                    <div className="h-4 w-32 bg-slate-700 rounded mb-2" />
                    <div className="h-3 w-48 bg-slate-700 rounded" />
                  </div>
                ))}
              </div>
            ) : withdrawalError ? (
              <p role="alert">Withdrawals could not be loaded. <button className="underline" onClick={fetchWithdrawals}>Retry</button></p>
            ) : withdrawals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-400 text-sm">
                  No {withdrawalFilter === "all" ? "" : withdrawalFilter}{" "}
                  withdrawal requests
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {withdrawals.map((withdrawal) => (
                  <div
                    key={withdrawal._id}
                    className="bg-slate-800 rounded-lg p-4 border border-slate-700"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-medium text-white">
                          {withdrawal.userId?.name ?? "Archived account"}
                        </p>
                        <p className="text-sm text-slate-400">
                          {withdrawal.userId?.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-emerald-400">
                          ${withdrawal.amount.toFixed(2)}
                        </p>
                        <span
                          className={`inline-block text-xs px-2 py-1 rounded-full mt-1 ${
                            withdrawal.status === "pending"
                              ? "bg-yellow-500/20 text-yellow-400"
                              : withdrawal.status === "approved"
                                ? "bg-blue-500/20 text-blue-400"
                                : withdrawal.status === "paid"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {withdrawal.status.charAt(0).toUpperCase() +
                            withdrawal.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 mb-3 space-y-1">
                      <p>
                        Method:{" "}
                        <span className="text-slate-300">
                          {withdrawal.method}
                        </span>
                      </p>
                      <p>
                        Requested:{" "}
                        {new Date(withdrawal.createdAt).toLocaleString()}
                      </p>
                      {withdrawal.reviewedBy && (
                        <p>
                          Reviewed by: {withdrawal.reviewedBy.name} (
                          {withdrawal.reviewedBy.email})
                        </p>
                      )}
                      {withdrawal.adminNote && (
                        <p className="text-slate-300">
                          Note: {withdrawal.adminNote}
                        </p>
                      )}
                    </div>

                    {/* Action buttons based on status */}
                    <div className="flex gap-2 justify-end">
                      {withdrawal.status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              handleRejectWithdrawal(withdrawal._id)
                            }
                            disabled={processingId === withdrawal._id}
                            className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 rounded text-xs font-medium disabled:opacity-50"
                          >
                            {processingId === withdrawal._id
                              ? "..."
                              : "✕ Reject"}
                          </button>
                          <button
                            onClick={() =>
                              handleApproveWithdrawal(withdrawal._id)
                            }
                            disabled={processingId === withdrawal._id}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs font-medium disabled:opacity-50"
                          >
                            {processingId === withdrawal._id
                              ? "..."
                              : "✓ Approve"}
                          </button>
                        </>
                      )}
                      {withdrawal.status === "approved" && (
                        <button
                          onClick={() => handlePayWithdrawal(withdrawal._id)}
                          disabled={processingId === withdrawal._id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-medium disabled:opacity-50"
                        >
                          {processingId === withdrawal._id
                            ? "..."
                            : "💰 Mark as Paid"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {(withdrawalCursors.length > 0 || nextWithdrawalCursor) && <nav aria-label="Withdrawal pages" className="mb-6 flex items-center gap-4">
          <button className="underline disabled:opacity-50" disabled={!withdrawalCursors.length || withdrawalLoading} onClick={() => setWithdrawalCursors(values => values.slice(0, -1))}>Newer withdrawals</button>
          <span>Page {withdrawalCursors.length + 1}</span>
          <button className="underline disabled:opacity-50" disabled={!nextWithdrawalCursor || withdrawalLoading} onClick={() => { if (nextWithdrawalCursor) setWithdrawalCursors(values => [...values, nextWithdrawalCursor]); }}>Older withdrawals</button>
        </nav>}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Search Panel */}
          <div className="bg-slate-900 rounded-xl border border-slate-800">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold">🔍 Search User</h2>
            </div>
            <div className="p-4">
              {/* PATCH_32: Balance Tier Filters with updated thresholds */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="text-sm text-slate-400 mr-2">
                  Quick Filter:
                </span>
                {[
                  { key: "all", label: "All", color: "slate" },
                  { key: "high", label: "🔥 High ($500+)", color: "emerald" },
                  {
                    key: "medium",
                    label: "📊 Medium ($100-499)",
                    color: "blue",
                  },
                  { key: "low", label: "💧 Low (<$100)", color: "yellow" },
                ].map((tier) => (
                  <button
                    key={tier.key}
                    onClick={() => filterByTier(tier.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                      balanceFilter === tier.key
                        ? tier.key === "high"
                          ? "bg-emerald-600 text-white"
                          : tier.key === "medium"
                            ? "bg-blue-600 text-white"
                            : tier.key === "low"
                              ? "bg-yellow-600 text-white"
                              : "bg-slate-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by name or email..."
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {searching ? "..." : "Search"}
                </button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <button
                      key={user._id}
                      onClick={() => selectUser(user)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        selectedUser?._id === user._id
                          ? "bg-blue-600/20 border-blue-500"
                          : "bg-slate-800 border-slate-700 hover:border-slate-600"
                      }`}
                    >
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-slate-400">{user.email}</p>
                      <p className="text-sm text-emerald-400">
                        Balance: ${(user.walletBalance || 0).toFixed(2)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected User Panel */}
          <div className="bg-slate-900 rounded-xl border border-slate-800">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold">User Wallet</h2>
            </div>

            {!selectedUser ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">👛</div>
                <p className="text-slate-400 mb-2">
                  Search and select a user to view their wallet
                </p>
                <p className="text-xs text-slate-500">
                  Use the search box or quick filters on the left to find a
                  user, then click to see their balance and transaction history.
                </p>
              </div>
            ) : userLoading ? (
              <div className="p-8 text-center text-slate-400">Loading...</div>
            ) : (
              <div className="p-4">
                {/* User Info */}
                <div className="bg-slate-800 rounded-lg p-4 mb-4">
                  <p className="font-medium text-lg">{selectedUser.name}</p>
                  <p className="text-slate-400">{selectedUser.email}</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-2">
                    ${(selectedUser.walletBalance || 0).toFixed(2)}
                  </p>
                  <button
                    onClick={() => setShowAdjust(true)}
                    className="mt-3 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm"
                  >
                    Adjust Balance
                  </button>
                </div>

                {/* Transaction History */}
                <h3 className="font-medium mb-2">Recent Transactions</h3>
                {userTransactions.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-slate-500">
                      No transactions yet
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      Transactions appear when you adjust this user's balance or
                      when they make purchases.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {userTransactions.slice(0, 10).map((tx) => (
                      <div
                        key={tx._id}
                        className="bg-slate-800 rounded-lg p-3 flex justify-between items-center"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {getSourceLabel(tx.source)}
                          </p>
                          {tx.methodName && <p className="text-xs text-slate-300">Funding method: {tx.methodName}</p>}
                          {tx.paymentReference && <p className="break-all text-xs text-slate-300">Submitted transfer reference: {tx.paymentReference}</p>}
                          {tx.settlementReference && <p className="break-all text-xs text-slate-300">Payment reference: {tx.settlementReference}</p>}
                          <p className="text-xs text-slate-500">
                            {new Date(tx.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <p
                          className={`font-semibold ${
                            tx.type === "credit"
                              ? "text-emerald-400"
                              : "text-red-400"
                          }`}
                        >
                          {tx.type === "credit" ? "+" : "-"}$
                          {tx.amount.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* PATCH_67: AuditTrail for wallet transactions */}
                {userTransactions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-700">
                    <h4 className="text-sm font-semibold mb-2 text-slate-300">
                      Audit Trail
                    </h4>
                    <AuditTrail
                      events={userTransactions.map((tx) => ({
                        id: tx._id,
                        action: `${tx.type === "credit" ? "Credit" : "Debit"}: $${tx.amount.toFixed(2)}`,
                        timestamp: tx.createdAt,
                        actor: getSourceLabel(tx.source),
                        details:
                          tx.description ||
                          `Balance after: $${tx.balanceAfter.toFixed(2)}`,
                      }))}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Adjust Modal - PATCH_66: Enhanced with Preview */}
        {showAdjust && selectedUser && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 rounded-xl p-6 w-full max-w-md border border-slate-700">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                  ⚠️
                </span>
                Adjust Balance
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                Adjusting wallet for: <strong>{selectedUser.email}</strong>
              </p>

              {/* Type Selection */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setAdjustType("credit")}
                  className={`flex-1 py-2 rounded-lg border ${
                    adjustType === "credit"
                      ? "bg-emerald-600 border-emerald-500"
                      : "bg-slate-800 border-slate-700"
                  }`}
                >
                  + Credit
                </button>
                <button
                  onClick={() => setAdjustType("debit")}
                  className={`flex-1 py-2 rounded-lg border ${
                    adjustType === "debit"
                      ? "bg-red-600 border-red-500"
                      : "bg-slate-800 border-slate-700"
                  }`}
                >
                  - Debit
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm text-slate-300 mb-2">
                  Amount ($)
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-slate-300 mb-2">
                  Reason (Required)
                </label>
                <input
                  type="text"
                  value={adjustDescription}
                  onChange={(e) => setAdjustDescription(e.target.value)}
                  placeholder="Why are you making this adjustment?"
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-3 text-white"
                />
              </div>

              {/* PATCH_66: Preview of Change */}
              {adjustAmount && parseFloat(adjustAmount) > 0 && (
                <div className="bg-slate-800 border border-slate-700 rounded-lg p-4 mb-4">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">
                    Preview of Changes
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">User:</span>
                      <span className="text-white">{selectedUser.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Current Balance:</span>
                      <span className="text-white">
                        ${(selectedUser.walletBalance || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Change:</span>
                      <span
                        className={
                          adjustType === "credit"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {adjustType === "credit" ? "+" : "-"}$
                        {parseFloat(adjustAmount).toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t border-slate-600 pt-2 flex justify-between font-semibold">
                      <span className="text-slate-300">New Balance:</span>
                      <span className="text-white">
                        $
                        {(
                          (selectedUser.walletBalance || 0) +
                          (adjustType === "credit" ? 1 : -1) *
                            parseFloat(adjustAmount)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowAdjust(false);
                    setAdjustAmount("");
                    setAdjustDescription("");
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 rounded-lg py-3"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjust}
                  disabled={adjustLoading || !adjustDescription.trim()}
                  className={`flex-1 rounded-lg py-3 font-medium disabled:opacity-50 ${
                    adjustType === "credit"
                      ? "bg-emerald-600 hover:bg-emerald-500"
                      : "bg-red-600 hover:bg-red-500"
                  }`}
                >
                  {adjustLoading
                    ? "Processing..."
                    : adjustType === "credit"
                      ? "Confirm Credit"
                      : "Confirm Debit"}
                </button>
              </div>
              {!adjustDescription.trim() && (
                <p className="text-xs text-amber-400 mt-2 text-center">
                  ⚠️ Reason is required for audit trail
                </p>
              )}
            </div>
          </div>
        )}

        {/* PATCH_67: UndoToast for wallet adjustments */}
        <UndoToast
          show={undoToast.show}
          message={undoToast.message}
          onUndo={undoToast.handleUndo}
          onExpire={undoToast.handleExpire}
        />
      </div>
    </div>
  );
}
