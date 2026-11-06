"use client";

/**
 * PATCH_58: Premium Wallet Page Redesign
 * Trust-building, secure, professional wallet experience
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { EmojiWallet } from "@/components/ui/Emoji";

// ==================== SVG ICONS ====================
const IconShield = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

const IconWallet = () => (
  <svg
    className="w-7 h-7"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
    />
  </svg>
);

const IconPlus = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.5v15m7.5-7.5h-15"
    />
  </svg>
);

const IconArrowUp = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
    />
  </svg>
);

const IconArrowDown = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3"
    />
  </svg>
);

const IconLock = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

const IconHistory = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const IconInfo = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
    />
  </svg>
);

const IconCheck = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 12.75l6 6 9-13.5"
    />
  </svg>
);

interface Transaction {
  _id: string;
  type: "credit" | "debit";
  amount: number;
  source: string;
  description: string;
  balanceAfter: number;
  createdAt: string;
  // PATCH_80: Transaction status
  // PATCH_82: Added paid_unverified for PayPal
  status?: "initiated" | "pending" | "paid_unverified" | "success" | "failed";
  provider?: string;
  failureReason?: string;
}

interface WalletStats {
  totalCredits: number;
  totalDebits: number;
  transactionCount: number;
}

export default function WalletPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { ready, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTopUp, setShowTopUp] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [stats, setStats] = useState<WalletStats>({
    totalCredits: 0,
    totalDebits: 0,
    transactionCount: 0,
  });

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      router.push("/login");
      return;
    }
    fetchData();
    handlePayPalReturn(); // PATCH_82
  }, [ready, isAuthenticated, router]);

  // PATCH_82: Handle PayPal return URL params
  const handlePayPalReturn = async () => {
    const params = new URLSearchParams(window.location.search);
    const paypalStatus = params.get("paypal");
    const token = params.get("token"); // PayPal order ID in URL

    if (paypalStatus === "success" && token) {
      toast("Confirming PayPal payment...", "info");
      try {
        const res = await apiRequest(
          "/api/wallet/topup/paypal/confirm",
          "POST",
          {
            paypalOrderId: token,
          },
        );
        if (res.alreadyConfirmed || res.alreadyProcessed) {
          toast("Payment already processed", "info");
        } else {
          toast(
            "PayPal payment confirmed! Awaiting admin verification.",
            "success",
          );
        }
        fetchData();
      } catch (err: any) {
        toast(err.message || "Failed to confirm PayPal payment", "error");
      }
      // Clear URL params
      window.history.replaceState({}, "", "/wallet");
    } else if (paypalStatus === "cancelled") {
      toast("PayPal payment was cancelled", "info");
      window.history.replaceState({}, "", "/wallet");
    }
  };

  const fetchData = async () => {
    try {
      const [balanceRes, txRes] = await Promise.all([
        apiRequest("/api/wallet/balance", "GET"),
        apiRequest("/api/wallet/transactions", "GET"),
      ]);
      setBalance(balanceRes.balance || 0);
      const txList = txRes.transactions || [];
      setTransactions(txList);

      // Calculate stats
      const credits = txList
        .filter((t: Transaction) => t.type === "credit")
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      const debits = txList
        .filter((t: Transaction) => t.type === "debit")
        .reduce((sum: number, t: Transaction) => sum + t.amount, 0);
      setStats({
        totalCredits: credits,
        totalDebits: debits,
        transactionCount: txList.length,
      });
    } catch (err: any) {
      toast(err.message || "Failed to load wallet", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount);
    if (!amount || amount < 1) {
      toast("Minimum top-up amount is $1", "error");
      return;
    }

    // PATCH_81: Prevent double-click
    if (topUpLoading) {
      return;
    }

    setTopUpLoading(true);
    try {
      const res = await apiRequest("/api/wallet/topup", "POST", { amount });
      // PATCH_80: Topup now creates pending transaction, not instant credit
      if (res.status === "initiated") {
        toast("Top-up request submitted. Pending verification.", "info");
      } else {
        toast(res.message || "Top-up submitted!", "success");
      }
      // Balance doesn't change immediately - keep current balance
      setBalance(res.currentBalance || balance);
      setShowTopUp(false);
      setTopUpAmount("");
      fetchData(); // Refresh to show pending transaction
    } catch (err: any) {
      // PATCH_81: Handle duplicate request gracefully
      if (err.retryAfter) {
        toast("Request already submitted - please wait", "info");
        setShowTopUp(false);
        fetchData();
      } else {
        toast(err.message || "Top-up failed", "error");
      }
    } finally {
      setTopUpLoading(false);
    }
  };

  const getSourceLabel = (source: string) => {
    const labels: Record<string, string> = {
      topup: "Wallet Top-up",
      service_purchase: "Service Purchase",
      rental_purchase: "Rental Purchase",
      admin_adjustment: "Admin Adjustment",
      refund: "Refund",
      earnings: "Work Earnings",
      affiliate: "Referral Bonus",
    };
    return labels[source] || source;
  };

  const getSourceIcon = (source: string, type: string) => {
    if (type === "credit") {
      return <IconArrowDown />;
    }
    return <IconArrowUp />;
  };

  // PATCH_80: Get status badge for transaction
  // PATCH_82: Added paid_unverified for PayPal
  const getStatusBadge = (status?: string, provider?: string) => {
    if (!status || status === "success") {
      return null; // No badge needed for completed transactions
    }

    const badges: Record<string, { label: string; className: string }> = {
      initiated: {
        label: "Pending",
        className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      },
      pending: {
        label: "Processing",
        className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      },
      paid_unverified: {
        label: "Paid - Awaiting Verification",
        className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      },
      failed: {
        label: "Failed",
        className: "bg-red-500/20 text-red-400 border-red-500/30",
      },
    };

    const badge = badges[status];
    if (!badge) return null;

    return (
      <span
        className={`px-2 py-0.5 text-xs font-medium rounded-full border ${badge.className}`}
      >
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading your wallet...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* ===== HEADER WITH SECURITY BADGE ===== */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-2">
              <EmojiWallet /> My Wallet
            </h1>
            <Link href="/finance/withdrawals" className="mt-2 inline-flex text-sm text-teal-300 underline underline-offset-4">Withdraw earnings</Link>
            <p className="text-slate-400 mt-1">Manage your balance securely</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2">
            <IconShield />
            <span className="text-sm text-emerald-400 font-medium">
              256-bit Encrypted
            </span>
          </div>
        </motion.div>

        {/* ===== MAIN BALANCE CARD ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-600 rounded-2xl p-8 mb-8 shadow-2xl shadow-emerald-500/20"
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern
                  id="wallet-grid"
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 10 0 L 0 0 0 10"
                    fill="none"
                    stroke="white"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#wallet-grid)" />
            </svg>
          </div>

          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <IconWallet />
              </div>
              <div>
                <p className="text-emerald-100 text-sm font-medium">
                  Available Balance
                </p>
                <div className="flex items-center gap-2">
                  <IconLock />
                  <span className="text-xs text-emerald-200">Secure</span>
                </div>
              </div>
            </div>

            <p className="text-5xl font-bold tracking-tight mb-6">
              ${balance.toFixed(2)}
              <span className="text-lg font-normal text-emerald-200 ml-2">
                USD
              </span>
            </p>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowTopUp(true)}
                className="flex items-center gap-2 bg-white text-emerald-700 px-6 py-3 rounded-xl font-semibold hover:bg-emerald-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <IconPlus />
                Add Balance
              </button>
              <Link
                href="/explore-services"
                className="flex items-center gap-2 bg-white/20 backdrop-blur-sm text-white px-6 py-3 rounded-xl font-medium hover:bg-white/30 transition-all border border-white/20"
              >
                Use Balance
              </Link>
            </div>
          </div>
        </motion.div>

        {/* ===== STATS ROW ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-4 mb-8"
        >
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <IconArrowDown />
              <span className="text-xs font-medium uppercase tracking-wide">
                Total In
              </span>
            </div>
            <p className="text-xl font-bold text-white">
              ${stats.totalCredits.toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-2 text-orange-400 mb-2">
              <IconArrowUp />
              <span className="text-xs font-medium uppercase tracking-wide">
                Total Out
              </span>
            </div>
            <p className="text-xl font-bold text-white">
              ${stats.totalDebits.toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <IconHistory />
              <span className="text-xs font-medium uppercase tracking-wide">
                Transactions
              </span>
            </div>
            <p className="text-xl font-bold text-white">
              {stats.transactionCount}
            </p>
          </div>
        </motion.div>

        {/* ===== TOP-UP MODAL ===== */}
        <AnimatePresence>
          {showTopUp && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowTopUp(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-slate-700 shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400">
                    <IconPlus />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Add Balance</h2>
                    <p className="text-sm text-slate-400">
                      Secure payment processing
                    </p>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-slate-300 mb-2 font-medium">
                    Amount (USD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                      $
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      value={topUpAmount}
                      onChange={(e) => setTopUpAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl pl-10 pr-4 py-4 text-white text-2xl font-bold focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Quick amounts */}
                <div className="grid grid-cols-4 gap-2 mb-6">
                  {[10, 25, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTopUpAmount(String(amt))}
                      className={`py-3 rounded-xl text-sm font-medium transition-all ${
                        topUpAmount === String(amt)
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300"
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowTopUp(false);
                      setTopUpAmount("");
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 rounded-xl py-3 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleTopUp}
                    disabled={topUpLoading || !topUpAmount}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 rounded-xl py-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {topUpLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <IconCheck />
                        Request ${topUpAmount || "0"}
                      </>
                    )}
                  </button>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== TRANSACTION HISTORY ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800 overflow-hidden"
        >
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <IconHistory />
              <h2 className="text-lg font-semibold">Transaction History</h2>
            </div>
            <span className="text-sm text-slate-400">
              {transactions.length} transactions
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <IconHistory />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Your wallet is empty
              </h3>
              <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                Add funds to your wallet to purchase services instantly, or earn
                money by working on tasks.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => setShowTopUp(true)}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  <IconPlus />
                  Add Balance
                </button>
                <Link
                  href="/apply-to-work"
                  className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-xl font-medium transition-colors"
                >
                  Start Earning
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/50">
              {transactions.map((tx, index) => (
                <motion.div
                  key={tx._id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors ${
                    tx.status && tx.status !== "success" ? "opacity-75" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                        tx.status === "failed"
                          ? "bg-red-500/20 text-red-400"
                          : tx.status === "initiated" || tx.status === "pending"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : tx.type === "credit"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-orange-500/20 text-orange-400"
                      }`}
                    >
                      {getSourceIcon(tx.source, tx.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">
                          {getSourceLabel(tx.source)}
                        </p>
                        {/* PATCH_80: Show status badge for non-success transactions */}
                        {getStatusBadge(tx.status)}
                      </div>
                      <p className="text-sm text-slate-400">
                        {tx.status === "failed" && tx.failureReason
                          ? tx.failureReason
                          : tx.description || getSourceLabel(tx.source)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(tx.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${
                        tx.status === "failed"
                          ? "text-red-400 line-through"
                          : tx.status === "initiated" || tx.status === "pending"
                            ? "text-yellow-400"
                            : tx.type === "credit"
                              ? "text-emerald-400"
                              : "text-orange-400"
                      }`}
                    >
                      {tx.type === "credit" ? "+" : "-"}${tx.amount.toFixed(2)}
                    </p>
                    {/* PATCH_80: Only show balance after if transaction is complete */}
                    {tx.status === "success" || !tx.status ? (
                      <p className="text-xs text-slate-500">
                        Bal: ${(tx.balanceAfter || 0).toFixed(2)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">
                        {tx.status === "failed"
                          ? "Not applied"
                          : "Processing..."}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* ===== INFO CARD ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-6 bg-slate-900/50 rounded-xl p-5 border border-slate-800"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400 flex-shrink-0">
              <IconInfo />
            </div>
            <div>
              <h3 className="font-semibold mb-2">How to use your wallet</h3>
              <ul className="text-sm text-slate-400 space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Add balance securely using the button above
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Use wallet balance for instant checkout on services
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Earn balance from work, referrals, and refunds
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  All transactions are encrypted and secure
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* ===== FOOTER TRUST ===== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center justify-center gap-6 text-xs text-slate-500"
        >
          <div className="flex items-center gap-1.5">
            <IconShield />
            <span>Bank-level Security</span>
          </div>
          <div className="flex items-center gap-1.5">
            <IconLock />
            <span>SSL Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5">
            <IconCheck />
            <span>PCI Compliant</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
