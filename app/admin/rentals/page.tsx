"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import PageHeader from "@/components/ui/PageHeader";
import { EmojiRentals } from "@/components/ui/Emoji";
import { getStatusColor, getStatusLabel } from "@/lib/statusConfig";

interface Rental {
  _id: string;
  user: {
    _id: string;
    email: string;
    name?: string;
  };
  service: {
    _id: string;
    title: string;
  };
  order: {
    _id: string;
    status: string;
  };
  rentalType: "days" | "months";
  duration: number;
  price: number;
  startDate: string | null;
  endDate: string | null;
  status: "pending" | "active" | "expired" | "cancelled" | "renewed";
  isActive: boolean;
  daysRemaining: number;
  accessDetails?: string;
  adminNotes?: string;
  createdAt: string;
}

export default function AdminRentalsPage() {
  const { toast } = useToast();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [editingAccess, setEditingAccess] = useState<string | null>(null);
  const [accessDetails, setAccessDetails] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    loadRentals();
  }, [page, statusFilter]);

  const loadRentals = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "20");
      if (statusFilter) params.set("status", statusFilter);

      const data = await apiRequest(
        `/api/admin/rentals?${params.toString()}`,
        "GET",
        null,
        true,
      );
      setRentals(Array.isArray(data?.rentals) ? data.rentals : []);
      setTotal(data?.total || 0);
    } catch (err: any) {
      toast(err?.message || "Failed to load rentals", "error");
    } finally {
      setLoading(false);
    }
  };

  const activateRental = async (rentalId: string) => {
    try {
      await apiRequest(
        `/api/admin/rentals/${rentalId}/activate`,
        "PUT",
        null,
        true,
      );
      toast("Rental activated", "success");
      loadRentals();
    } catch (err: any) {
      toast(err?.message || "Failed to activate rental", "error");
    }
  };

  const cancelRental = async (rentalId: string) => {
    if (!confirm("Are you sure you want to cancel this rental?")) return;
    try {
      await apiRequest(
        `/api/admin/rentals/${rentalId}/cancel`,
        "PUT",
        null,
        true,
      );
      toast("Rental cancelled", "success");
      loadRentals();
    } catch (err: any) {
      toast(err?.message || "Failed to cancel rental", "error");
    }
  };

  const openAccessEdit = (rental: Rental) => {
    setEditingAccess(rental._id);
    setAccessDetails(rental.accessDetails || "");
    setAdminNotes(rental.adminNotes || "");
  };

  const saveAccessDetails = async () => {
    if (!editingAccess) return;
    try {
      await apiRequest(
        `/api/admin/rentals/${editingAccess}/access`,
        "PUT",
        {
          accessDetails,
          adminNotes,
        },
        true,
      );
      toast("Access details updated", "success");
      setEditingAccess(null);
      loadRentals();
    } catch (err: any) {
      toast(err?.message || "Failed to update access details", "error");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-emerald-300 bg-emerald-500/20";
      case "pending":
        return "text-yellow-300 bg-yellow-500/20";
      case "expired":
        return "text-red-300 bg-red-500/20";
      case "cancelled":
        return "text-slate-400 bg-slate-500/20";
      case "renewed":
        return "text-purple-300 bg-purple-500/20";
      default:
        return "text-slate-300 bg-slate-500/20";
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="u-container">
      <PageHeader
        title="Manage Rentals"
        emoji={<EmojiRentals />}
        description={`${total} total rentals`}
      />

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="u-select w-48"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="expired">Expired</option>
          <option value="cancelled">Cancelled</option>
          <option value="renewed">Renewed</option>
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
      ) : rentals.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">🔑</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            No Rentals Yet
          </h3>
          <p className="text-slate-400 mb-2">
            This view tracks existing service rentals.
          </p>
          <p className="text-xs text-slate-500">
            Manage new project rentals in{" "}
            <a href="/admin/opportunities" className="text-cyan-400 hover:underline">
              Opportunities
            </a>{" "}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rentals.map((rental) => (
            <div key={rental._id} className="card">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">
                      {rental.service?.title || "Unknown Service"}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(rental.status)}`}
                    >
                      {rental.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400 mt-1">
                    User:{" "}
                    <span className="text-slate-200">
                      {rental.user?.email || "Unknown"}
                    </span>
                  </p>
                  <p className="text-sm text-slate-400">
                    {rental.duration} {rental.rentalType} • ${rental.price}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDate(rental.startDate)} →{" "}
                    {formatDate(rental.endDate)}
                    {rental.isActive && ` (${rental.daysRemaining} days left)`}
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  {rental.status === "pending" && (
                    <button
                      onClick={() => activateRental(rental._id)}
                      className="text-xs px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded hover:bg-emerald-500/30"
                    >
                      Activate
                    </button>
                  )}
                  <button
                    onClick={() => openAccessEdit(rental)}
                    className="text-xs px-3 py-1 bg-blue-500/20 text-blue-300 rounded hover:bg-blue-500/30"
                  >
                    Edit Access
                  </button>
                  {(rental.status === "pending" ||
                    rental.status === "active") && (
                    <button
                      onClick={() => cancelRental(rental._id)}
                      className="text-xs px-3 py-1 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>

              {(rental.accessDetails || rental.adminNotes) && (
                <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                  {rental.accessDetails && (
                    <p className="text-slate-300">
                      <span className="text-slate-500">Access:</span>{" "}
                      {rental.accessDetails}
                    </p>
                  )}
                  {rental.adminNotes && (
                    <p className="text-slate-400 mt-1">
                      <span className="text-slate-500">Notes:</span>{" "}
                      {rental.adminNotes}
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

      {/* Edit Access Modal */}
      {editingAccess && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setEditingAccess(null);
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-white/10 bg-[#0B1220] p-6">
            <h3 className="text-lg font-semibold mb-4">Edit Rental Access</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1">
                  Access Details (visible to user)
                </label>
                <textarea
                  value={accessDetails}
                  onChange={(e) => setAccessDetails(e.target.value)}
                  placeholder="Login credentials, access links, etc."
                  className="u-input min-h-[100px]"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">
                  Admin Notes (internal only)
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes..."
                  className="u-input min-h-[80px]"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setEditingAccess(null)}
                  className="text-sm px-4 py-2 bg-white/10 rounded hover:bg-white/20"
                >
                  Cancel
                </button>
                <button
                  onClick={saveAccessDetails}
                  className="text-sm px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
