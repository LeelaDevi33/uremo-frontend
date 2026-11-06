"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { formatOrderPrice, getOrderPrice } from "@/lib/orderPrice";
import { orderPaymentState } from "@/lib/orderPaymentState";
import { useToast } from "@/hooks/useToast";
import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  useSiteSettings,
} from "@/hooks/useSiteSettings";
import EmptyState from "@/components/ui/EmptyState";
import { EmojiOrders } from "@/components/ui/Emoji";
import { getStatusLabel, getStatusColor } from "@/lib/statusConfig";

/* ───────────────────────── TYPES ───────────────────────── */
type TabKey = "all" | "pending" | "active" | "completed" | "rejected";

interface StatCard {
  label: string;
  count: number;
  color: string;
  bgColor: string;
  borderColor: string;
}

/* ───────────────────────── STATUS HELPERS ───────────────────────── */
const STATUS_STRIPE: Record<string, string> = {
  pending: "bg-amber-500",
  waiting_user: "bg-amber-500",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
  cancelled: "bg-red-500",
  rejected: "bg-red-500",
  archived: "bg-slate-500",
};

const PAYMENT_BADGE: Record<string, { label: string; cls: string }> = {
  paid: {
    label: "Paid",
    cls: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
  },
  unpaid: {
    label: "Unpaid",
    cls: "border-red-500/30 bg-red-500/15 text-red-300",
  },
  pending: {
    label: "Pay Pending",
    cls: "border-amber-500/30 bg-amber-500/15 text-amber-300",
  },
  refunded: {
    label: "Refunded",
    cls: "border-slate-500/30 bg-slate-500/15 text-slate-300",
  },
};

/* ───────────────────────── COMPONENT ───────────────────────── */
export default function OrdersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: settings } = useSiteSettings();
  const copy =
    settings?.orders?.list || DEFAULT_PUBLIC_SITE_SETTINGS.orders.list;

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  /* ── Fetch (unchanged API call) ── */
  const loadOrders = async () => {
    setError(null);
    try {
      const data = await apiRequest("/api/orders/my", "GET", null, true);
      setOrders(data);
    } catch (err: any) {
      const msg = err?.message || "Failed to load orders";
      setError(msg);
      toast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Client-side computed stats ── */
  const stats = useMemo<StatCard[]>(() => {
    const total = orders.length;
    const pending = orders.filter(
      (o) => o.status === "pending" || o.status === "waiting_user",
    ).length;
    const active = orders.filter((o) => o.status === "in_progress").length;
    const completed = orders.filter((o) => o.status === "completed").length;
    const rejected = orders.filter(
      (o) =>
        o.status === "rejected" ||
        o.status === "cancelled" ||
        o.status === "archived",
    ).length;

    return [
      {
        label: "Total",
        count: total,
        color: "text-slate-100",
        bgColor: "bg-slate-800/60",
        borderColor: "border-slate-700/50",
      },
      {
        label: "Pending",
        count: pending,
        color: "text-amber-300",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/20",
      },
      {
        label: "Active",
        count: active,
        color: "text-blue-300",
        bgColor: "bg-blue-500/10",
        borderColor: "border-blue-500/20",
      },
      {
        label: "Completed",
        count: completed,
        color: "text-emerald-300",
        bgColor: "bg-emerald-500/10",
        borderColor: "border-emerald-500/20",
      },
      {
        label: "Rejected",
        count: rejected,
        color: "text-red-300",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/20",
      },
    ];
  }, [orders]);

  /* ── Filter by tab (no refetch) ── */
  const filtered = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return orders.filter(
          (o) => o.status === "pending" || o.status === "waiting_user",
        );
      case "active":
        return orders.filter((o) => o.status === "in_progress");
      case "completed":
        return orders.filter((o) => o.status === "completed");
      case "rejected":
        return orders.filter(
          (o) =>
            o.status === "rejected" ||
            o.status === "cancelled" ||
            o.status === "archived",
        );
      default:
        return orders;
    }
  }, [orders, activeTab]);

  /* ── Tab definitions ── */
  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "active", label: "Active" },
    { key: "completed", label: "Completed" },
    { key: "rejected", label: "Rejected" },
  ];

  /* ── Primary CTA per order ── */
  const getPrimaryCTA = (o: any) => {
    if (orderPaymentState(o) === "unpaid") {
      return {
        label:
          o.status === "cancelled" ? "Retry Payment" : copy.completePaymentText,
        onClick: () => router.push(`/payment/${o._id}`),
        cls: "bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-lg shadow-blue-500/20",
      };
    }
    if (o.status === "in_progress" || o.status === "waiting_user") {
      return {
        label: copy.openChatText,
        onClick: () => router.push(`/orders/${o._id}?chat=1`),
        cls: "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white shadow-lg shadow-purple-500/20",
      };
    }
    if (o.status === "completed") {
      return {
        label: copy.viewDetailsText,
        onClick: () => router.push(`/orders/${o._id}`),
        cls: "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-lg shadow-emerald-500/20",
      };
    }
    // rejected / archived
    return {
      label: "View Status",
      onClick: () => router.push(`/orders/${o._id}`),
      cls: "bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10",
    };
  };

  /* ───────────── RENDER ───────────── */
  return (
    <div className="u-container max-w-6xl">
      {/* ─── HEADER ─── */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <EmojiOrders /> Order Control Center
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Track and manage all your service orders
            </p>
          </div>
          <Link
            href="/explore-services"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-200 hover:bg-white/10 transition-all"
          >
            Browse Marketplace
          </Link>
        </div>
      </div>

      {/* ─── LOADING ─── */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">{copy.loadingText}</p>
          </div>
        </div>
      )}

      {/* ─── ERROR ─── */}
      {!loading && error && (
        <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-5">
          <p className="text-sm text-red-200">{error}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              loadOrders();
            }}
            className="mt-3 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm hover:bg-red-500/30 transition-all"
          >
            {copy.retryText}
          </button>
        </div>
      )}

      {/* ─── EMPTY STATE ─── */}
      {!loading && !error && orders.length === 0 && (
        <EmptyState
          icon="Info"
          title="Your control center is empty"
          description="Explore our marketplace to find professional services for your needs, or apply to work and start earning."
          ctaText="Browse Marketplace"
          ctaHref="/explore-services"
          secondaryCtaText="Apply to Work"
          secondaryCtaHref="/apply-to-work"
        />
      )}

      {/* ─── CONTROL CENTER ─── */}
      {!loading && !error && orders.length > 0 && (
        <>
          {/* ── STATS RIBBON ── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {stats.map((s) => (
              <div
                key={s.label}
                className={`rounded-xl border ${s.borderColor} ${s.bgColor} p-4 backdrop-blur-sm`}
              >
                <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
                  {s.label}
                </p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                  {s.count}
                </p>
              </div>
            ))}
          </div>

          {/* ── FILTER TABS ── */}
          <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? "bg-white/10 text-white border border-white/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="ml-auto text-xs text-slate-500 whitespace-nowrap pl-4">
              {filtered.length} order{filtered.length === 1 ? "" : "s"}
            </div>
          </div>

          {/* ── TAB EMPTY ── */}
          {filtered.length === 0 && (
            <div className="rounded-xl border border-white/5 bg-slate-900/50 p-10 text-center">
              <p className="text-slate-400 text-sm">
                No {activeTab === "all" ? "" : activeTab} orders found.
              </p>
            </div>
          )}

          {/* ── ORDER ROWS ── */}
          <div className="space-y-3">
            {filtered.map((o) => {
              const payStatus = orderPaymentState(o);
              const payBadge = PAYMENT_BADGE[payStatus];
              const stripe = STATUS_STRIPE[o.status] || "bg-slate-600";
              const cta = getPrimaryCTA(o);
              const hasUnread = o.lastMessage?.senderRole === "admin";
              const isRental = o.orderType === "rental" || !!o.rentalId;

              return (
                <div
                  key={o._id}
                  className="relative group rounded-xl border border-white/8 bg-gradient-to-r from-slate-900/80 to-slate-800/40 backdrop-blur-sm hover:border-white/15 transition-all"
                >
                  {/* Status stripe */}
                  <div
                    className={`absolute top-0 left-0 w-full h-0.5 rounded-t-xl ${stripe}`}
                  />

                  <div className="p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      {/* LEFT — Service info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={
                              o.serviceId?._id
                                ? `/services/${o.serviceId._id}`
                                : "#"
                            }
                            className="font-semibold text-white truncate hover:text-blue-300 transition-colors"
                          >
                            {o.serviceId?.title || "Service"}
                          </Link>
                          {hasUnread && (
                            <span className="shrink-0 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                          <span className="text-xs text-slate-500 font-mono">
                            #{o._id?.slice(-8).toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(o.createdAt).toLocaleDateString()}
                          </span>
                          <span className="text-sm font-semibold text-emerald-400">
                            {formatOrderPrice(getOrderPrice(o))}
                          </span>
                        </div>
                      </div>

                      {/* CENTER — Badges */}
                      <div className="flex items-center gap-2 flex-wrap sm:justify-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${getStatusColor(o.status)}`}
                        >
                          {getStatusLabel(o.status)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium border ${payBadge.cls}`}
                        >
                          {payBadge.label}
                        </span>
                        {isRental && (
                          <span className="inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium border border-purple-500/30 bg-purple-500/15 text-purple-300">
                            Rental
                          </span>
                        )}
                      </div>

                      {/* RIGHT — Actions */}
                      <div className="flex items-center gap-2 sm:justify-end shrink-0">
                        <button
                          onClick={cta.onClick}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${cta.cls}`}
                        >
                          {cta.label}
                        </button>
                        <button
                          onClick={() =>
                            router.push(`/support?orderId=${o._id}`)
                          }
                          className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent hover:border-white/10 transition-all"
                        >
                          Support
                        </button>
                      </div>
                    </div>

                    {/* Expiry warning for pending */}
                    {o.status === "pending" && o.expiresAt && (
                      <div className="mt-3 text-xs text-orange-400/80">
                        {copy.expiresPrefix}{" "}
                        {new Date(o.expiresAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
