"use client";

/**
 * PATCH_58: Premium Wallet Page Redesign
 * Trust-building, secure, professional wallet experience
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import WalletFundingDialog from "./WalletFundingDialog";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import { EmojiWallet } from "@/components/ui/Emoji";

// ==================== SVG ICONS ====================
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
  providerRef?: string;
  methodName?: string;
  paymentReference?: string;
  failureReason?: string;
}

async function confirmPayPalPayment(orderId: string) {
  const result = await apiRequest<{ success: boolean; status: string }>("/api/wallet/topup/paypal/confirm", "POST", { paypalOrderId: orderId }, true);
  if (!result.success || result.status !== "success") throw new Error("Your wallet credit is awaiting confirmation.");
}

export default function WalletPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { ready, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balance, setBalance] = useState(0);
  const [walletTotal, setWalletTotal] = useState(0);
  const [withdrawable, setWithdrawable] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPages, setHistoryPages] = useState(1);
  const [transactionCount, setTransactionCount] = useState(0);
  const [loadError, setLoadError] = useState("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showTopUp, setShowTopUp] = useState(false);
  const [returnError, setReturnError] = useState<{ message: string; canRetry: boolean } | null>(null);
  const [verifyingId, setVerifyingId] = useState("");
  const [returnAttempt, setReturnAttempt] = useState(0);
  const activeReturn = useRef("");
  const historyRequest = useRef(0);
  const fetchData = useCallback(async () => {
    const request = ++historyRequest.current;
    try {
      const [balanceRes, txRes] = await Promise.all([
        apiRequest("/api/wallet/balance", "GET"),
        apiRequest("/api/wallet/transactions?page=" + historyPage, "GET"),
      ]);
      if (request !== historyRequest.current) return;
      setLoadError("");
      setBalance(balanceRes.spendable ?? balanceRes.balance ?? 0);
      setWalletTotal(balanceRes.balance ?? 0);
      setWithdrawable(balanceRes.withdrawable ?? 0);
      setTransactions(txRes.transactions);
      setTransactionCount(txRes.pagination.total);
      setHistoryPages(Math.max(1, txRes.pagination.pages));
    } catch (cause) {
      if (request === historyRequest.current) setLoadError(cause instanceof Error ? cause.message : "Could not load your wallet.");
    } finally {
      if (request === historyRequest.current) setLoading(false);
    }
  }, [historyPage]);

  useEffect(() => {
    if (!ready) return;
    if (!isAuthenticated) {
      router.replace("/login?next=" + encodeURIComponent("/wallet" + window.location.search));
      return;
    }
    void fetchData();
    const params = new URLSearchParams(window.location.search);
    const state = params.get("paypal");
    const orderId = params.get("token");
    if (state !== "success" || !orderId) {
      if (state === "cancelled") {
        toast("PayPal checkout cancelled.", "info");
        window.history.replaceState(null, "", "/wallet");
      }
      if (state === "success") setReturnError({ message: "PayPal did not return an order ID. Check your wallet history or contact support.", canRetry: false });
      return;
    }
    const key = orderId + ":" + returnAttempt;
    if (activeReturn.current === key) return;
    activeReturn.current = key;
    setReturnError(null);
    async function confirm(id: string) {
      try {
        await confirmPayPalPayment(id);
        window.history.replaceState(null, "", "/wallet");
        toast("PayPal payment confirmed. Your wallet has been credited.", "success");
      } catch (cause) {
        setReturnError({ message: cause instanceof Error ? cause.message : "PayPal confirmation could not be completed.", canRetry: true });
      } finally { await fetchData(); }
    }
    void confirm(orderId);
  }, [ready, isAuthenticated, router, toast, returnAttempt, fetchData]);

  async function verifyPayment(providerRef: string) {
    if (verifyingId) return;
    setVerifyingId(providerRef);
    try {
      await confirmPayPalPayment(providerRef);
      toast("PayPal payment confirmed. Your wallet has been credited.", "success");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "Could not verify the PayPal payment.", "error");
    } finally {
      await fetchData();
      setVerifyingId("");
    }
  }

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
        {loadError && <div role="alert" className="mb-4 rounded-lg border border-amber-600/50 p-3 text-amber-200">
          {loadError} <button className="ml-2 underline" onClick={fetchData}>Reload wallet</button>
        </div>}
        {returnError && <div role="alert" className="mb-4 rounded-lg border border-amber-600/50 p-3 text-amber-200">
          {returnError.message} {returnError.canRetry && <button className="ml-2 underline" onClick={() => setReturnAttempt(value => value + 1)}>Check payment again</button>}
        </div>}
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
              </div>
            </div>

            <p className="text-5xl font-bold tracking-tight mb-6">
              {loadError ? "—" : "$" + balance.toFixed(2)}
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
                href="/projects/full-access"
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
          className="grid grid-cols-2 gap-3 mb-8 sm:grid-cols-3"
        >
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <IconArrowDown />
              <span className="text-xs font-medium uppercase tracking-wide">
                Wallet total
              </span>
            </div>
            <p className="text-xl font-bold text-white">
              {loadError ? "—" : "$" + walletTotal.toFixed(2)}
            </p>
          </div>
          <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl p-4 border border-slate-800">
            <div className="flex items-center gap-2 text-orange-400 mb-2">
              <IconArrowUp />
              <span className="text-xs font-medium uppercase tracking-wide">
                Withdrawable
              </span>
            </div>
            <p className="text-xl font-bold text-white">
              {loadError ? "—" : "$" + withdrawable.toFixed(2)}
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
              {transactionCount}
            </p>
          </div>
        </motion.div>

        {showTopUp && <WalletFundingDialog onClose={() => setShowTopUp(false)} onSubmitted={() => {
          setShowTopUp(false);
          toast("Transfer submitted for verification.", "success");
          void fetchData();
        }} />}

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
              {transactionCount} transactions
            </span>
          </div>

          {loadError ? null : transactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-teal-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                <IconHistory />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No transactions yet
              </h3>
              <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
                Fund your wallet to rent an eligible project or purchase exclusive access.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={() => setShowTopUp(true)}
                  className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 px-6 py-3 rounded-xl font-medium transition-colors"
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
                  className={`p-4 flex flex-wrap gap-3 items-center justify-between hover:bg-slate-800/30 transition-colors ${
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
                      <p className="text-xs text-slate-400 mt-0.5">
                        {tx.methodName && <span className="block">{tx.methodName}</span>}
                        {tx.paymentReference && <span className="block break-all">Transfer reference: {tx.paymentReference}</span>}
                        {new Date(tx.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {tx.provider === "paypal" && tx.source === "topup" && tx.status === "paid_unverified" && tx.providerRef && /^[A-Z0-9]{1,36}$/.test(tx.providerRef) &&
                        <button type="button" disabled={!!verifyingId} className="mt-2 text-sm text-teal-300 underline disabled:opacity-50"
                          onClick={() => void verifyPayment(tx.providerRef!)}>{verifyingId === tx.providerRef ? "Verifying…" : "Verify PayPal payment"}</button>}
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
                      <p className="text-xs text-slate-400">
                        Bal: ${(tx.balanceAfter || 0).toFixed(2)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-400">
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

        {historyPages > 1 && <nav aria-label="Wallet history pages" className="mt-4 flex items-center justify-between gap-3">
          <button className="underline disabled:opacity-40" disabled={historyPage <= 1} onClick={() => setHistoryPage(page => page - 1)}>Previous page</button>
          <span>Page {historyPage} of {historyPages}</span>
          <button className="underline disabled:opacity-40" disabled={historyPage >= historyPages} onClick={() => setHistoryPage(page => page + 1)}>Next page</button>
        </nav>}
      </div>
    </div>
  );
}
