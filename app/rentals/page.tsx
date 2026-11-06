"use client";

/**
 * PATCH_109: My Rentals Enterprise Page
 * Enhanced rental cards with status badges, computed expiry, activation timestamps
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { EmojiRentals } from "@/components/ui/Emoji";

interface Rental {
  _id: string;
  service: {
    _id: string;
    title: string;
    imageUrl?: string;
  };
  rentalType: "days" | "months";
  duration: number;
  price: number;
  startDate: string | null;
  endDate: string | null;
  status: "pending" | "active" | "expired" | "cancelled" | "renewed";
  isActive: boolean;
  daysRemaining: number;
  isExpiringSoon?: boolean;
  accessDetails?: string;
  activatedAt?: string | null;
  createdAt: string;
}

// PATCH_109: Compute frontend display status (overrides DB if logically expired)
function computeDisplayStatus(rental: Rental): string {
  if (rental.status === "active" && rental.endDate) {
    const now = new Date();
    const end = new Date(rental.endDate);
    if (now > end) return "expired";
    const diffMs = end.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (daysLeft <= 3) return "expiring_soon";
  }
  return rental.status;
}

function getDisplayStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "Pending",
    active: "Active",
    expiring_soon: "Expiring Soon",
    expired: "Expired",
    cancelled: "Cancelled",
    renewed: "Renewed",
  };
  return labels[status] || status;
}

function getDisplayStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "border-yellow-500/30 bg-yellow-500/10 text-yellow-300",
    active: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    expiring_soon: "border-orange-500/30 bg-orange-500/10 text-orange-300",
    expired: "border-red-500/30 bg-red-500/10 text-red-300",
    cancelled: "border-slate-500/30 bg-slate-500/10 text-slate-300",
    renewed: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  };
  return colors[status] || "border-white/10 bg-white/5 text-slate-300";
}

export default function MyRentalsPage() {
  const { toast } = useToast();
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRentals();
  }, []);

  const loadRentals = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/api/rentals/my", "GET", null, true);
      setRentals(Array.isArray(data?.rentals) ? data.rentals : []);
    } catch (err: any) {
      toast(err?.message || "Failed to load rentals", "error");
    } finally {
      setLoading(false);
    }
  };

  const cancelRental = async (rentalId: string) => {
    if (!confirm("Are you sure you want to cancel this rental?")) return;

    try {
      await apiRequest(`/api/rentals/${rentalId}/cancel`, "PUT", null, true);
      toast("Rental cancelled", "success");
      loadRentals();
    } catch (err: any) {
      toast(err?.message || "Failed to cancel rental", "error");
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

  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="u-container max-w-5xl">
        <h1 className="text-3xl font-bold mb-6">My Rentals</h1>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-6 w-48 bg-white/10 rounded" />
              <div className="h-4 w-32 bg-white/10 rounded mt-2" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="u-container max-w-5xl"
    >
      <PageHeader
        title="My Rentals"
        emoji={<EmojiRentals />}
        description="View your earlier service rentals and their access periods."
        actionLabel="Rent projects"
        actionHref="/projects/rent"
      />

      {rentals.length === 0 ? (
        <div className="card">
          <EmptyState
            icon="Rent"
            title="No past service rentals"
            description="Any earlier service rentals associated with your account appear here."
            ctaText="Rent projects"
            ctaHref="/projects/rent"
          />
        </div>
      ) : (
        <div className="space-y-4">
          {rentals.map((rental, idx) => {
            const displayStatus = computeDisplayStatus(rental);
            const daysLeft = rental.endDate
              ? Math.max(
                  0,
                  Math.ceil(
                    (new Date(rental.endDate).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24),
                  ),
                )
              : 0;

            return (
              <motion.div
                key={rental._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="card"
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {rental.service?.imageUrl ? (
                      <img
                        src={rental.service.imageUrl}
                        alt={rental.service.title}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-2xl">🔑</span>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-white">
                        {rental.service?.title || "Unknown Service"}
                      </h3>
                      <p className="text-sm text-slate-400 mt-0.5">
                        {rental.duration} {rental.rentalType} • ${rental.price}
                      </p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${getDisplayStatusColor(displayStatus)}`}
                        >
                          {getDisplayStatusLabel(displayStatus)}
                        </span>
                        {(displayStatus === "active" ||
                          displayStatus === "expiring_soon") &&
                          daysLeft > 0 && (
                            <span
                              className={`text-xs font-medium ${displayStatus === "expiring_soon" ? "text-orange-400" : "text-slate-400"}`}
                            >
                              {daysLeft} day{daysLeft !== 1 ? "s" : ""}{" "}
                              remaining
                            </span>
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 min-w-[180px]">
                    <div className="text-right text-sm space-y-1">
                      <p className="text-slate-400">
                        Start:{" "}
                        <span className="text-slate-200">
                          {formatDate(rental.startDate)}
                        </span>
                      </p>
                      <p className="text-slate-400">
                        End:{" "}
                        <span className="text-slate-200">
                          {formatDate(rental.endDate)}
                        </span>
                      </p>
                      {rental.activatedAt && (
                        <p className="text-slate-400">
                          Activated:{" "}
                          <span className="text-emerald-300 text-xs">
                            {formatDateTime(rental.activatedAt)}
                          </span>
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 mt-1">
                      {(displayStatus === "active" ||
                        displayStatus === "expiring_soon") && (
                        <>
                          <button
                            onClick={() => cancelRental(rental._id)}
                            className="text-xs px-3 py-1.5 bg-red-500/20 text-red-300 rounded-lg hover:bg-red-500/30 transition"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {rental.status === "pending" && (
                        <Link
                          href="/orders"
                          className="text-xs px-3 py-1.5 bg-yellow-500/20 text-yellow-300 rounded-lg hover:bg-yellow-500/30 transition"
                        >
                          Complete Payment
                        </Link>
                      )}

                    </div>
                  </div>
                </div>

                {rental.accessDetails && (
                  <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">
                      Access Details
                    </p>
                    <p className="text-sm text-white whitespace-pre-wrap">
                      {rental.accessDetails}
                    </p>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
