"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

interface Withdrawal {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    referralCode: string;
  };
  amount: number;
  paymentMethod: string;
  paymentDetails: string;
  status: string;
  adminNotes?: string;
  transactionId?: string;
  processedBy?: { name: string; email: string };
  processedAt?: string;
  createdAt: string;
}

export default function AdminAffiliateWithdrawalsPage() {
  const { toast } = useToast();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  // Approval modal
  const [actionModal, setActionModal] = useState<{
    type: "approve" | "reject";
    withdrawal: Withdrawal;
  } | null>(null);
  const [transactionId, setTransactionId] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadWithdrawals();
  }, [page, statusFilter]);

  const loadWithdrawals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (statusFilter) params.set("status", statusFilter);

      const data = await apiRequest(
        `/api/admin/affiliate/withdrawals?${params.toString()}`,
        "GET",
        null,
        true,
      );
      setWithdrawals(data?.withdrawals || []);
      setTotal(data?.total || 0);
    } catch (err: any) {
      toast(err?.message || "Failed to load withdrawals", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    if (!actionModal) return;

    setSubmitting(true);
    try {
      const endpoint =
        actionModal.type === "approve"
          ? `/api/admin/affiliate/withdrawals/${actionModal.withdrawal._id}/approve`
          : `/api/admin/affiliate/withdrawals/${actionModal.withdrawal._id}/reject`;

      await apiRequest(
        endpoint,
        "PUT",
        {
          transactionId: transactionId || undefined,
          adminNotes: adminNotes || undefined,
        },
        true,
      );

      toast(
        actionModal.type === "approve"
          ? "Withdrawal approved and marked as paid"
          : "Withdrawal rejected and balance refunded",
        "success",
      );

      setActionModal(null);
      setTransactionId("");
      setAdminNotes("");
      loadWithdrawals();
    } catch (err: any) {
      toast(err?.message || "Failed to process withdrawal", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "text-emerald-300 bg-emerald-500/20";
      case "pending":
        return "text-yellow-300 bg-yellow-500/20";
      case "rejected":
        return "text-red-300 bg-red-500/20";
      default:
        return "text-slate-300 bg-slate-500/20";
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="u-container">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Affiliate Withdrawals</h1>
          <p className="text-slate-400 text-sm mt-1">
            {total} total withdrawal requests
          </p>
        </div>
        <Link href="/admin" className="text-sm text-slate-400 hover:text-white">
          ← Back to Admin
        </Link>
      </div>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          aria-label="Filter affiliate withdrawals by status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="u-select w-48"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-6 w-48 bg-white/10 rounded" />
              <div className="h-4 w-32 bg-white/10 rounded mt-2" />
            </div>
          ))}
        </div>
      ) : withdrawals.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-white">No withdrawal requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {withdrawals.map((wd) => (
            <div key={wd._id} className="card">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-white">
                      ${wd.amount?.toFixed(2)}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(wd.status)}`}
                    >
                      {wd.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    <span className="text-slate-200">
                      {wd.user?.name || wd.user?.email}
                    </span>
                    {" • "}
                    <span className="font-mono text-xs">
                      {wd.user?.referralCode}
                    </span>
                  </p>
                  <p className="text-sm text-slate-400">
                    {wd.paymentMethod}:{" "}
                    <span className="text-slate-300">{wd.paymentDetails}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Requested: {formatDate(wd.createdAt)}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {wd.status === "pending" && (
                    <>
                      <button
                        onClick={() => {
                          setActionModal({ type: "approve", withdrawal: wd });
                          setTransactionId("");
                          setAdminNotes("");
                        }}
                        className="text-xs px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded hover:bg-emerald-500/30"
                      >
                        ✓ Approve & Pay
                      </button>
                      <button
                        onClick={() => {
                          setActionModal({ type: "reject", withdrawal: wd });
                          setAdminNotes("");
                        }}
                        className="text-xs px-3 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30"
                      >
                        ✕ Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {(wd.adminNotes || wd.transactionId || wd.processedAt) && (
                <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                  {wd.transactionId && (
                    <p className="text-slate-300">
                      <span className="text-slate-400">Tx ID:</span>{" "}
                      {wd.transactionId}
                    </p>
                  )}
                  {wd.adminNotes && (
                    <p className="text-slate-400">
                      <span className="text-slate-400">Notes:</span>{" "}
                      {wd.adminNotes}
                    </p>
                  )}
                  {wd.processedAt && (
                    <p className="text-xs text-slate-400 mt-1">
                      Processed: {formatDate(wd.processedAt)}
                      {wd.processedBy && ` by ${wd.processedBy.email}`}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}

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
        </div>
      )}

      {/* Action Modal */}
      {actionModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActionModal(null);
          }}
        >
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#0B1220] p-6">
            <h3 className="text-lg font-semibold mb-4">
              {actionModal.type === "approve"
                ? "Approve Withdrawal"
                : "Reject Withdrawal"}
            </h3>
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-white/5">
                <p className="text-white font-bold">
                  ${actionModal.withdrawal.amount?.toFixed(2)}
                </p>
                <p className="text-sm text-slate-400">
                  {actionModal.withdrawal.paymentMethod}:{" "}
                  {actionModal.withdrawal.paymentDetails}
                </p>
              </div>

              {actionModal.type === "approve" && (
                <div>
                  <label htmlFor="withdrawal-transaction-id" className="text-sm text-slate-400 block mb-1">
                    Transaction ID (optional)
                  </label>
                  <input
                    id="withdrawal-transaction-id"
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="PayPal transaction ID, Tx hash, etc."
                    className="u-input"
                  />
                </div>
              )}

              <div>
                <label htmlFor="withdrawal-admin-notes" className="text-sm text-slate-400 block mb-1">
                  {actionModal.type === "approve"
                    ? "Notes (optional)"
                    : "Rejection Reason"}
                </label>
                <textarea
                  id="withdrawal-admin-notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder={
                    actionModal.type === "approve"
                      ? "Any notes..."
                      : "Reason for rejection..."
                  }
                  className="u-input min-h-[80px]"
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setActionModal(null)}
                  className="text-sm px-4 py-2 bg-white/10 rounded hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAction}
                  disabled={submitting}
                  className={`text-sm px-4 py-2 rounded disabled:opacity-50 ${
                    actionModal.type === "approve"
                      ? "bg-emerald-800 text-white hover:bg-emerald-900"
                      : "bg-red-800 text-white hover:bg-red-900"
                  }`}
                >
                  {submitting
                    ? "Processing..."
                    : actionModal.type === "approve"
                      ? "Approve & Mark Paid"
                      : "Reject & Refund"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
