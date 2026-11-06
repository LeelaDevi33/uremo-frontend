"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ApiError, apiRequest } from "@/lib/api";
import { formatOrderPrice, getOrderPrice } from "@/lib/orderPrice";
import { orderPaymentState } from "@/lib/orderPaymentState";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  useSiteSettings,
} from "@/hooks/useSiteSettings";
import {
  useChatSocket,
  ChatMessage,
  MessageStatus,
} from "@/hooks/useChatSocket";
import OrderSupportChat from "@/components/orders/OrderSupportChat";
import OrderStepper from "@/components/orders/OrderStepper";

interface Order {
  _id: string;
  status: string;
  orderType?: "buy" | "rental" | "deal";
  quotedAmount?: number;
  quotedCurrency?: string;
  settledAmount?: number;
  settledCurrency?: string;
  paymentStatus?: string;
  paidAt?: string | null;
  country?: string;
  serviceId: {
    title: string;
    price: number;
  };
  payment?: {
    verifiedAt?: string | null;
  };
  createdAt?: string;
  expiresAt?: string | null;
  statusLog?: Array<{
    text: string;
    at: string;
  }>;
  // PATCH_92: Populated rental details
  rentalId?: {
    _id: string;
    rentalType: string;
    duration: number;
    price: number;
    startDate?: string;
    endDate?: string;
    status: string;
    daysRemaining?: number;
  } | null;
}

type OrderMessage = ChatMessage;

export default function OrderDetailsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[#9CA3AF]">Loading…</div>}>
      <OrderDetailsContent />
    </Suspense>
  );
}

function OrderDetailsContent() {
  const { id: orderId } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { ready: authReady, isAuthenticated, user } = useAuth();
  const { data: settings } = useSiteSettings();

  const loggedInUserId = useMemo(() => {
    const maybeId = (user as any)?.id || (user as any)?._id;
    return maybeId ? String(maybeId) : null;
  }, [user]);

  const getMessageSenderRole = useMemo(() => {
    return (m: OrderMessage): "user" | "admin" => {
      const roleRaw = (m?.senderRole || "").toString();
      const role = roleRaw.trim().toLowerCase();

      if (role === "user") return "user";
      if (role === "admin" || role === "support") return "admin";

      // Fallback: if role is missing, infer based on sender id.
      const senderId = m?.senderId;
      if (senderId && loggedInUserId && String(senderId) === loggedInUserId) {
        return "user";
      }

      return "admin";
    };
  }, [loggedInUserId]);

  const ui =
    settings?.orders?.details || DEFAULT_PUBLIC_SITE_SETTINGS.orders.details;
  const expiresPrefix =
    (settings?.orders?.list?.expiresPrefix || "").trim() ||
    DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.expiresPrefix;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [chatGlow, setChatGlow] = useState(false);
  const chatSectionRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);
  const chatEnabled = authReady && isAuthenticated && order?._id === orderId &&
    (user?.role === "admin" || ["in_progress", "completed", "waiting_user"].includes(order.status));

  // Socket.io realtime chat
  const {
    connected,
    connecting,
    joined,
    messages,
    typingUsers,
    sendMessage: socketSendMessage,
    retryMessage,
    markSeen,
    startTyping,
    reconnect,
  } = useChatSocket({
    orderId: chatEnabled ? orderId : null,
    enabled: chatEnabled,
    onError: (err) => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Socket] Error:", err);
      }
    },
  });

  // Chat connection status
  const chatConnection = useMemo(() => {
    if (connecting) return "connecting";
    if (connected && joined) return "open";
    return "offline";
  }, [connected, joined, connecting]);

  const quickReplies = useMemo(() => {
    const list = settings?.orderSupport?.quickReplies;
    return Array.isArray(list) && list.length
      ? list
      : DEFAULT_PUBLIC_SITE_SETTINGS.orderSupport.quickReplies;
  }, [settings?.orderSupport?.quickReplies]);

  const supportGuidelines =
    (settings?.orderSupport?.supportGuidelines || "").trim() ||
    DEFAULT_PUBLIC_SITE_SETTINGS.orderSupport.supportGuidelines;

  const scrollToChat = (opts?: {
    focus?: boolean;
    behavior?: ScrollBehavior;
  }) => {
    const behavior = opts?.behavior || "smooth";
    const el = chatSectionRef.current;
    if (!el) return;

    // Avoid scrollIntoView jitter on some mobile browsers.
    const rect = el.getBoundingClientRect();
    const headerOffset = 72; // fixed navbar (56px) + small gap
    const top = Math.max(0, rect.top + window.scrollY - headerOffset);
    window.scrollTo({ top, behavior });

    if (opts?.focus) {
      // Focus after scrolling settles; preventScroll reduces jump.
      window.setTimeout(
        () => {
          const input = chatInputRef.current;
          if (!input) return;
          try {
            input.focus({ preventScroll: true } as any);
          } catch {
            input.focus();
          }
        },
        behavior === "smooth" ? 350 : 0,
      );
    }
  };

  const isValidOrderId = useMemo(() => {
    // Mongo ObjectId (most common in this project)
    return /^[a-f\d]{24}$/i.test(String(orderId || ""));
  }, [orderId]);

  const loadOrder = async () => {
    setLoadError(null);
    setNotFound(false);

    if (!isValidOrderId) {
      setOrder(null);
      setNotFound(true);
      setLoading(false);
      return;
    }

    try {
      const data = await apiRequest(
        `/api/orders/${orderId}`,
        "GET",
        null,
        true,
      );
      setOrder(data);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.status === 401 || apiErr?.status === 403) {
        router.replace(
          `/login?next=${encodeURIComponent(`/orders/${orderId}`)}`,
        );
        return;
      }

      if (apiErr?.status === 404) {
        setOrder(null);
        setNotFound(true);
        return;
      }

      setLoadError(ui.loadOrderFailedText);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  useEffect(() => {}, [messages.length]);

  // Mark messages as seen when they arrive
  useEffect(() => {
    if (!chatEnabled) return;
    const unreadIds = messages
      .filter((m) => getMessageSenderRole(m) === "admin" && m.status !== "seen")
      .map((m) => m._id);
    if (unreadIds.length > 0) {
      markSeen(unreadIds);
    }
  }, [chatEnabled, messages, markSeen, getMessageSenderRole]);

  // If deep-linked to chat via ?chat=1, open chat on load.
  useEffect(() => {
    const wantsChat = searchParams?.get("chat") === "1";
    if (!wantsChat) return;
    if (loading) return;
    if (!chatEnabled) return;

    scrollToChat({ focus: true, behavior: "auto" });
    setChatGlow(true);
    const id = window.setTimeout(() => setChatGlow(false), 2000);
    return () => window.clearTimeout(id);
  }, [searchParams, loading, chatEnabled]);

  const paymentState = order && orderPaymentState(order);
  const isPendingPayment = order?.status === "pending" && paymentState === "unpaid";
  const isPaymentVerified = paymentState === "paid";
  const expiresText = useMemo(() => {
    if (!isPendingPayment || !order?.expiresAt) return null;
    const expiresAt = new Date(order.expiresAt);
    return `${expiresPrefix} ${expiresAt.toLocaleString()}`;
  }, [isPendingPayment, order?.expiresAt]);

  // Check if any message is currently sending
  const sending = useMemo(() => {
    return messages.some((m) => m.status === "sending");
  }, [messages]);

  const handleSendMessage = useCallback(
    (
      text: string,
      attachments?: Array<{ url: string; filename: string; fileType: string }>,
    ) => {
      const clean = String(text || "").trim();
      if (!clean) return;

      if (!authReady || !isAuthenticated) {
        toast("Please login to chat", "error");
        return;
      }

      if (process.env.NODE_ENV !== "production") {
        console.log("sending", orderId, clean, attachments);
      }

      socketSendMessage(clean, attachments);
      toast(ui.messageSentToast, "success");
    },
    [
      authReady,
      isAuthenticated,
      orderId,
      socketSendMessage,
      toast,
      ui.messageSentToast,
    ],
  );

  // Get status indicator for a message
  const getMessageStatusIcon = (status: MessageStatus): string | null => {
    switch (status) {
      case "sending":
        return "...";
      case "sent":
        return "✓";
      case "delivered":
        return "✓✓";
      case "seen":
        return "✓✓";
      case "failed":
        return "!";
      default:
        return null;
    }
  };

  const getMessageStatusClass = (status: MessageStatus): string => {
    switch (status) {
      case "sending":
        return "text-slate-400";
      case "sent":
        return "text-slate-400";
      case "delivered":
        return "text-blue-400";
      case "seen":
        return "text-emerald-400";
      case "failed":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  if (loading) {
    return <div className="p-6">{ui.loadingText}</div>;
  }

  if (notFound) {
    return (
      <div className="p-6 max-w-3xl space-y-3">
        <h1 className="text-xl font-semibold">{ui.notFoundTitle}</h1>
        <p className="text-sm text-[#9CA3AF]">{ui.notFoundBody}</p>
        <button
          onClick={() => router.push("/orders")}
          className="btn-secondary w-fit"
        >
          {ui.backToOrdersText}
        </button>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 max-w-3xl space-y-3">
        <h1 className="text-xl font-semibold">{ui.loadErrorTitle}</h1>
        <p className="text-sm text-[#9CA3AF]">{loadError}</p>
        <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <button
            onClick={() => {
              setLoading(true);
              loadOrder();
            }}
            className="btn-primary w-full sm:w-fit"
          >
            {ui.loadErrorRetryText}
          </button>
          <button
            onClick={() => router.push("/orders")}
            className="btn-secondary w-full sm:w-fit"
          >
            {ui.backToOrdersText}
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6 max-w-3xl space-y-3">
        <h1 className="text-xl font-semibold">{ui.unavailableTitle}</h1>
        <button
          onClick={() => router.push("/orders")}
          className="btn-secondary w-fit"
        >
          {ui.backToOrdersText}
        </button>
      </div>
    );
  }

  return (
    <div className="u-container max-w-3xl space-y-6">
      <div>
        <button
          onClick={() => router.push("/orders")}
          className="text-[#3B82F6] underline text-sm mb-4"
        >
          {ui.backToOrdersText}
        </button>
        <h1 className="text-3xl font-bold">{ui.title}</h1>
      </div>

      {/* Support banner */}
      {chatEnabled && <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-white">
              {ui.supportBannerTitle}
            </p>
            <p className="mt-1 text-sm text-slate-200">
              {ui.supportBannerBody}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border border-emerald-500/25 bg-emerald-500/10 text-emerald-200">
              {ui.supportActivePill}{" "}
              <span className="text-emerald-200/70">•</span>{" "}
              {ui.supportActiveHint}
            </div>
          </div>

          <button
            type="button"
            onClick={() => scrollToChat({ focus: true })}
            className="btn-primary w-full sm:w-auto"
          >
            {ui.chatNowText}
          </button>
        </div>
      </div>}

      {/* PATCH_37: Order Progress Stepper */}
      <OrderStepper status={order.status} />

      {/* Order Info */}
      <div className="border border-[#1F2937] rounded-lg p-6 bg-[#0F172A]">
        <div className="space-y-3">
          <div>
            <p className="text-[#9CA3AF] text-sm">{ui.orderIdLabel}</p>
            <p className="font-mono text-sm">{order._id}</p>
          </div>

          <div>
            <p className="text-[#9CA3AF] text-sm">{ui.serviceLabel}</p>
            <p className="text-lg font-semibold">{order.serviceId?.title}</p>
          </div>

          {/* PATCH_92: Order type badge */}
          {order.orderType && order.orderType !== "buy" && (
            <div>
              <p className="text-[#9CA3AF] text-sm">Order Type</p>
              <span
                className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                  order.orderType === "rental"
                    ? "bg-purple-500/10 border border-purple-500/20 text-purple-200"
                    : "bg-amber-500/10 border border-amber-500/20 text-amber-200"
                }`}
              >
                {order.orderType === "rental" ? "Rental" : "Deal"}
              </span>
              {order.country && (
                <span className="ml-2 inline-block px-2 py-1 rounded text-xs bg-white/5 border border-white/10 text-slate-300">
                  {order.country}
                </span>
              )}
            </div>
          )}

          <div>
            <p className="text-[#9CA3AF] text-sm">{ui.amountLabel}</p>
            <p className="text-2xl font-bold text-[#22C55E]">
              {formatOrderPrice(getOrderPrice(order))}
            </p>
          </div>

          <div>
            <p className="text-[#9CA3AF] text-sm">{ui.statusLabel}</p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-block px-3 py-1 rounded bg-[#1F2937] text-sm">
                {order.status.replace(/_/g, " ")}
              </span>
              {isPaymentVerified && (
                <span className="inline-block px-3 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 text-sm">
                  {ui.paymentVerifiedText}
                </span>
              )}
              {paymentState === "refunded" && <span className="text-sm text-slate-300">Refunded</span>}
            </div>
            {expiresText && (
              <p className="text-xs text-[#9CA3AF] mt-2">{expiresText}</p>
            )}
          </div>

          {isPendingPayment && (
            <div>
              <button
                onClick={() => router.push(`/payment/${order._id}`)}
                className="inline-flex items-center justify-center px-4 py-2 rounded bg-[#3B82F6] text-white text-sm hover:bg-blue-500 transition"
              >
                {ui.completePaymentText}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PATCH_92: Rental Details Panel */}
      {order.orderType === "rental" && order.rentalId && (
        <div className="border border-purple-500/20 rounded-lg p-6 bg-[#0F172A]">
          <h3 className="font-semibold text-lg mb-4 text-purple-200">
            Rental Details
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-[#9CA3AF] text-xs">Duration</p>
              <p className="text-sm font-medium text-white">
                {order.rentalId.duration} {order.rentalId.rentalType}
              </p>
            </div>
            <div>
              <p className="text-[#9CA3AF] text-xs">Rental Price</p>
              <p className="text-sm font-bold text-emerald-300">
                {formatOrderPrice(getOrderPrice(order))}
              </p>
            </div>
            <div>
              <p className="text-[#9CA3AF] text-xs">Start Date</p>
              <p className="text-sm text-white">
                {order.rentalId.startDate
                  ? new Date(order.rentalId.startDate).toLocaleDateString()
                  : "Pending activation"}
              </p>
            </div>
            <div>
              <p className="text-[#9CA3AF] text-xs">End Date</p>
              <p className="text-sm text-white">
                {order.rentalId.endDate
                  ? new Date(order.rentalId.endDate).toLocaleDateString()
                  : "—"}
              </p>
            </div>
            <div>
              <p className="text-[#9CA3AF] text-xs">Rental Status</p>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                  order.rentalId.status === "active"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-200"
                    : order.rentalId.status === "pending"
                      ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-200"
                      : order.rentalId.status === "expired"
                        ? "bg-red-500/10 border border-red-500/20 text-red-200"
                        : "bg-white/5 border border-white/10 text-slate-300"
                }`}
              >
                {order.rentalId.status}
              </span>
            </div>
            {order.rentalId.status === "active" && order.rentalId.endDate && (
              <div>
                <p className="text-[#9CA3AF] text-xs">Days Remaining</p>
                <p className="text-sm font-bold text-blue-300">
                  {Math.max(
                    0,
                    Math.ceil(
                      (new Date(order.rentalId.endDate).getTime() -
                        Date.now()) /
                        (1000 * 60 * 60 * 24),
                    ),
                  )}{" "}
                  days
                </p>
              </div>
            )}
          </div>

          {/* Payment schedule info */}
          {order.rentalId.status === "active" && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <p className="text-xs font-semibold text-slate-300 mb-2">
                Upcoming Payments
              </p>
              <p className="text-xs text-slate-400">
                Payment milestones for this rental are tracked automatically.
                Check your email for payment reminders.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="border border-[#1F2937] rounded-lg p-6 bg-[#0F172A]">
        <h3 className="font-semibold text-lg mb-4">{ui.timelineTitle}</h3>

        <div className="space-y-3">
          {order.statusLog && order.statusLog.length > 0 ? (
            order.statusLog.map((entry, idx) => (
              <div
                key={idx}
                className="text-sm border-l-2 border-[#1F2937] pl-3 pb-3"
              >
                <div className="flex justify-between items-start">
                  <p className="text-[#9CA3AF]">
                    {new Date(entry.at).toLocaleString()}
                  </p>
                </div>
                <p className="mt-1 text-[#E5E7EB]">{entry.text}</p>
              </div>
            ))
          ) : (
            <p className="text-[#9CA3AF] text-sm">{ui.noTimelineText}</p>
          )}
        </div>
      </div>

      {chatEnabled ? <>
      <div className="space-y-3">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-white">
                {ui.supportGuideTitle}
              </p>
              <p className="mt-1 text-sm text-slate-200">
                {ui.supportGuideSubtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => scrollToChat({ focus: true })}
              className="btn-secondary w-full sm:w-auto"
            >
              {ui.openChatText}
            </button>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm font-semibold">{ui.supportGuidelinesTitle}</p>
          <p className="mt-2 text-xs text-[#9CA3AF]">{supportGuidelines}</p>
        </div>
      </div>

      {/* Chat */}
      <div
        ref={chatSectionRef}
        className={`scroll-mt-20 border border-[#1F2937] rounded-lg p-6 bg-[#0F172A] transition-shadow ${
          chatGlow ? "shadow-[0_0_0_3px_rgba(59,130,246,0.35)]" : ""
        }`}
      >
        <OrderSupportChat
          ui={ui}
          quickReplies={quickReplies}
          messages={messages}
          typingUsers={typingUsers}
          connection={chatConnection}
          authReady={authReady}
          isAuthenticated={isAuthenticated}
          sending={sending}
          getSenderRole={getMessageSenderRole}
          onSend={handleSendMessage}
          onRetry={(tempId) => retryMessage(tempId)}
          onReconnect={reconnect}
          onStartTyping={startTyping}
          inputRefExternal={chatInputRef}
        />
      </div>
      </> : <div className="rounded-xl border border-white/10 p-4">
        <p className="text-sm text-slate-300">Order chat is unavailable for this status.</p>
        <Link href="/support/tickets" className="mt-2 inline-block text-sm text-teal-200 underline">View support tickets</Link>
      </div>}
    </div>
  );
}
