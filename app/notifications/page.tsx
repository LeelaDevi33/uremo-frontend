"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import { EmojiNotifications } from "@/components/ui/Emoji";

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: "order" | "ticket" | "wallet" | "affiliate" | "rental" | "system";
  resourceType?: "order" | "ticket" | "rental" | "withdrawal" | null;
  resourceId?: string;
  isRead: boolean;
  createdAt: string;
}

const typeIcons: Record<string, string> = {
  order: "Order",
  ticket: "Ticket",
  wallet: "Wallet",
  affiliate: "Affiliate",
  rental: "Rental",
  system: "System",
};

const typeColors: Record<string, string> = {
  order: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ticket: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  wallet: "bg-green-500/20 text-green-400 border-green-500/30",
  affiliate: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  rental: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  system: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function NotificationsPage() {
  const router = useRouter();
  const { ready, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [unreadCount, setUnreadCount] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.push("/login");
    }
  }, [ready, isAuthenticated, router]);

  // Load notifications
  const loadNotifications = async (pageNum = 1) => {
    setLoading(true);
    try {
      const res = await apiRequest<any>(
        `/api/notifications?page=${pageNum}&limit=20`,
        "GET",
        null,
        true,
      );
      if (res.notifications) {
        setNotifications(res.notifications);
        setTotalPages(res.totalPages || 1);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err: any) {
      console.error("Failed to load notifications:", err);
      toast(err?.message || "Failed to load notifications", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications(page);
    }
  }, [isAuthenticated, page]);

  // Mark as read
  const markAsRead = async (notificationId: string) => {
    try {
      await apiRequest<any>(
        `/api/notifications/${notificationId}/read`,
        "PUT",
        {},
        true,
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n._id === notificationId ? { ...n, isRead: true } : n,
        ),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      await apiRequest<any>("/api/notifications/read-all", "PUT", {}, true);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // Handle notification click
  const handleClick = async (notification: Notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }

    if (notification.resourceType && notification.resourceId) {
      const routes: Record<string, string> = {
        order: `/orders/${notification.resourceId}`,
        ticket: `/support/tickets/${notification.resourceId}`,
        rental: `/rentals`,
        withdrawal: `/finance/withdrawals`,
      };
      const route = routes[notification.resourceType];
      if (route) router.push(route);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!ready || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <PageHeader
            title="Notifications"
            emoji={<EmojiNotifications />}
            description={
              unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "Stay updated with your activity"
            }
          />
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 rounded-lg transition"
            >
              Mark all as read
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon="System"
            title="No notifications yet"
            description="When you receive orders, wallet updates, or important alerts, they'll appear here. Start using UREMO to get your first notification!"
            ctaText="Explore Services"
            ctaHref="/explore-services"
            secondaryCtaText="Go to Dashboard"
            secondaryCtaHref="/dashboard"
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <button
                key={n._id}
                onClick={() => handleClick(n)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  !n.isRead
                    ? "bg-slate-800 border-emerald-500/30 hover:border-emerald-500/50"
                    : "bg-slate-800/50 border-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex gap-4">
                  <span
                    className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-lg border ${typeColors[n.type] || typeColors.system}`}
                  >
                    {typeIcons[n.type] || "System"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={`text-sm ${!n.isRead ? "font-semibold" : ""}`}
                      >
                        {n.title}
                      </h3>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{n.message}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                  {n.resourceType && (
                    <div className="flex-shrink-0 self-center">
                      <svg
                        className="w-5 h-5 text-gray-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-slate-800 rounded-lg border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-400">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-slate-800 rounded-lg border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
