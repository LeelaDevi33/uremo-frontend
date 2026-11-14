"use client";

import { Fragment, Suspense, useEffect, useMemo, useState } from "react";
import Card from "@/components/Card";
import FilePreview from "@/components/FilePreview";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useRouter, useSearchParams } from "next/navigation";
import { maskEmail } from "@/lib/maskEmail";
import PageHeader from "@/components/ui/PageHeader";
import { EmojiOrders } from "@/components/ui/Emoji";
import { getStatusColor, getStatusLabel } from "@/lib/statusConfig";
import ConfirmModal from "@/components/admin/v2/ConfirmModal";

interface Order {
  _id: string;
  status: string;
  amount?: number;
  isRejectedArchive?: boolean;
  createdAt?: string;
  userId?: { email: string; name?: string };
  serviceId?: { title: string };
  payment?: {
    methodId?: {
      name: string;
      type: string;
      details: string;
      instructions?: string;
    };
    reference?: string;
    proofUrl?: string;
    submittedAt?: string;
  };
  timeline?: Array<{
    message: string;
    by: "system" | "admin";
    createdAt: string;
  }>;
}

// PATCH_52: Use centralized status from statusConfig
const getOrderStatusClass = (status: string) => {
  return `inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${getStatusColor(status)}`;
};

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<div className="p-6 text-[#9CA3AF]">Loading…</div>}>
      <AdminOrdersContent />
    </Suspense>
  );
}

function AdminOrdersContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  // PATCH_66: Confirmation modals
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    title: string;
    description: string;
    orderId: string;
    action: string;
    newStatus?: string;
    variant: "danger" | "warning" | "info" | "success";
    inputValue?: string;
  }>({
    open: false,
    title: "",
    description: "",
    orderId: "",
    action: "",
    variant: "warning",
    inputValue: "",
  });
  const [confirmLoading, setConfirmLoading] = useState(false);

  const status = useMemo(() => {
    const v = String(searchParams.get("status") || "all")
      .trim()
      .toLowerCase();
    return v || "all";
  }, [searchParams]);

  const setStatus = (next: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!next || next === "all") params.delete("status");
    else params.set("status", next);
    const qs = params.toString();
    router.push(qs ? `/admin/orders?${qs}` : "/admin/orders");
  };

  const load = async (statusValue: string) => {
    const qs =
      statusValue && statusValue !== "all"
        ? `?status=${encodeURIComponent(statusValue)}`
        : "";
    const data = await apiRequest(`/api/admin/orders${qs}`, "GET", null, true);
    setOrders(data);
  };

  const addNote = async (id: string) => {
    if (!noteText.trim()) return;
    try {
      await apiRequest(
        `/api/admin/orders/${id}/note`,
        "POST",
        { message: noteText },
        true,
      );
      setNoteText("");
      setSelectedOrderId(null);
      load(status);
    } catch (err) {
      toast("Failed to add note", "error");
    }
  };

  const updateStatus = async (id: string, nextStatus: string) => {
    // PATCH_66: Show confirmation modal instead of immediate update
    const order = orders.find((o) => o._id === id);
    const requiresInput =
      nextStatus === "completed" || nextStatus === "cancelled";
    setConfirmModal({
      open: true,
      title: `Change Order Status`,
      description: `You are about to change this order from "${order?.status || "current"}" to "${nextStatus}". ${
        nextStatus === "completed"
          ? "Please provide a completion note describing the deliverable."
          : nextStatus === "cancelled"
            ? "Please provide a reason for cancellation."
            : "The user will be notified of this change."
      }`,
      orderId: id,
      action: "updateStatus",
      newStatus: nextStatus,
      variant:
        nextStatus === "cancelled"
          ? "danger"
          : requiresInput
            ? "success"
            : "warning",
      inputValue: "",
    });
  };

  const executeStatusUpdate = async () => {
    if (!confirmModal.orderId || !confirmModal.newStatus) return;
    setConfirmLoading(true);
    try {
      const payload: { status: string; note?: string; reason?: string } = {
        status: confirmModal.newStatus,
      };
      // Add note for completed, reason for cancelled
      if (confirmModal.newStatus === "completed") {
        payload.note = confirmModal.inputValue?.trim();
      }
      if (confirmModal.newStatus === "cancelled") {
        payload.reason = confirmModal.inputValue?.trim();
      }

      await apiRequest(
        `/api/admin/orders/${confirmModal.orderId}`,
        "PUT",
        payload,
        true,
      );
      toast("Order updated", "success");
      load(status);
      setConfirmModal({ ...confirmModal, open: false });
    } catch (err: any) {
      toast(err?.message || "Failed to update status", "error");
    } finally {
      setConfirmLoading(false);
    }
  };

  const verifyPayment = async (id: string) => {
    // PATCH_66: Show confirmation modal
    const order = orders.find((o) => o._id === id);
    setConfirmModal({
      open: true,
      title: `Verify Payment`,
      description: `You are about to verify the payment for this order. This will move the order to "In Progress" and notify the user that their payment was received.`,
      orderId: id,
      action: "verifyPayment",
      variant: "success",
    });
  };

  const executeVerifyPayment = async () => {
    if (!confirmModal.orderId) return;
    setConfirmLoading(true);
    try {
      await apiRequest(
        `/api/admin/orders/${confirmModal.orderId}/verify-payment`,
        "PUT",
        {},
        true,
      );

      toast("Payment verified. Order moved to in progress.", "success");
      load(status);
      setConfirmModal({ ...confirmModal, open: false });
    } catch (err: any) {
      toast(err?.message || "Failed to verify payment", "error");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleConfirmAction = () => {
    if (confirmModal.action === "updateStatus") {
      executeStatusUpdate();
    } else if (confirmModal.action === "verifyPayment") {
      executeVerifyPayment();
    }
  };

  const archiveCancelled = async (id: string) => {
    try {
      await apiRequest(
        `/api/admin/orders/${id}/archive-cancelled`,
        "PUT",
        {},
        true,
      );
      load(status);
    } catch (err) {
      toast("Failed to move order to cancelled list", "error");
    }
  };

  useEffect(() => {
    load(status);
  }, [status]);

  // PATCH_66: Order flow stages for timeline display
  const orderFlowStages = [
    { key: "created", label: "Created", icon: "•" },
    { key: "payment_pending", label: "Payment Pending", icon: "$" },
    { key: "payment_submitted", label: "Proof Submitted", icon: "•" },
    { key: "in_progress", label: "Verified", icon: "✓" },
    { key: "completed", label: "Completed", icon: "✓" },
  ];

  const getOrderStageIndex = (orderStatus: string) => {
    const stageMap: Record<string, number> = {
      pending: 0,
      payment_pending: 1,
      payment_submitted: 2,
      waiting_user: 2,
      in_progress: 3,
      completed: 4,
      cancelled: -1,
    };
    return stageMap[orderStatus] ?? 0;
  };

  return (
    <div className="space-y-6">
      {/* PATCH_66: Confirmation Modal */}
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ ...confirmModal, open: false })}
        onConfirm={handleConfirmAction}
        title={confirmModal.title}
        description={confirmModal.description}
        variant={confirmModal.variant}
        loading={confirmLoading}
        confirmLabel={
          confirmModal.action === "verifyPayment"
            ? "Verify Payment"
            : confirmModal.newStatus === "completed"
              ? "Complete Order"
              : confirmModal.newStatus === "cancelled"
                ? "Cancel Order"
                : "Confirm Change"
        }
        inputLabel={
          confirmModal.newStatus === "completed"
            ? "Completion Note"
            : confirmModal.newStatus === "cancelled"
              ? "Cancellation Reason"
              : undefined
        }
        inputPlaceholder={
          confirmModal.newStatus === "completed"
            ? "e.g., Deliverables sent. Logo files provided via chat."
            : confirmModal.newStatus === "cancelled"
              ? "e.g., Client requested refund. Payment not received."
              : undefined
        }
        inputValue={confirmModal.inputValue}
        onInputChange={(val) =>
          setConfirmModal({ ...confirmModal, inputValue: val })
        }
        inputRequired={
          confirmModal.newStatus === "completed" ||
          confirmModal.newStatus === "cancelled"
        }
      />

      <PageHeader
        title="Orders"
        emoji={<EmojiOrders />}
        description="Review payments and update order status"
      />

      {/* PATCH_56: Professional Tab Bar */}
      <div className="flex items-center gap-1 p-1 bg-white/5 rounded-xl border border-white/10 overflow-x-auto">
        {[
          { key: "all", label: "All", icon: "•" },
          {
            key: "payment_submitted",
            label: "Payment Submitted",
            icon: "!",
            alert: true,
          },
          { key: "pending", label: "Pending", icon: "•" },
          { key: "in_progress", label: "In Progress", icon: "↻" },
          { key: "waiting_user", label: "Waiting User", icon: "..." },
          { key: "completed", label: "Completed", icon: "✓" },
          { key: "cancelled", label: "Cancelled", icon: "x" },
        ].map((t) => {
          const active = status === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatus(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                active
                  ? t.alert
                    ? "bg-amber-500/20 border border-amber-500/30 text-amber-300 shadow-lg shadow-amber-500/10"
                    : "bg-blue-500/20 border border-blue-500/30 text-blue-300 shadow-lg shadow-blue-500/10"
                  : "text-slate-400 hover:bg-white/5 hover:text-white border border-transparent"
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <Card>
        <div className="overflow-x-auto focus-visible:outline-2" role="region" aria-label="Orders table" tabIndex={0}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left sticky top-0 bg-[#0B1220]/90 backdrop-blur border-b border-white/10">
                <th className="p-3 text-xs tracking-widest text-[#9CA3AF]">
                  User
                </th>
                <th className="p-3 text-xs tracking-widest text-[#9CA3AF]">
                  Service
                </th>
                <th className="p-3 text-xs tracking-widest text-[#9CA3AF]">
                  Payment
                </th>
                <th className="p-3 text-xs tracking-widest text-[#9CA3AF]">
                  Status
                </th>
                <th className="p-3 text-xs tracking-widest text-[#9CA3AF]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-3 text-[#9CA3AF]">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map((o, rowIdx) => (
                  <Fragment key={o._id}>
                    <tr
                      className={`border-b border-white/10 hover:bg-white/5 transition ${
                        rowIdx % 2 === 0 ? "bg-white/[0.02]" : "bg-transparent"
                      }`}
                    >
                      <td className="p-3">
                        <div className="group relative inline-flex items-center gap-2">
                          <span className="text-sm">
                            {maskEmail(o.userId?.email)}
                          </span>
                          {o.userId?.email && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(o.userId!.email);
                                toast("Email copied", "success");
                              }}
                              className="opacity-0 group-hover:opacity-100 transition text-xs text-slate-400 hover:text-white px-2 py-1 rounded border border-white/10 bg-white/5"
                              title={o.userId.email}
                            >
                              Copy
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="p-3">{o.serviceId?.title}</td>

                      <td className="p-3 space-y-1">
                        {o.payment?.methodId ? (
                          <>
                            <div className="font-semibold text-sm">
                              {o.payment.methodId.name}
                            </div>
                            <div className="text-xs text-[#9CA3AF]">
                              {o.payment.methodId.type}
                            </div>
                            <div className="text-xs font-mono bg-[#111827] p-1 rounded mt-1 break-all">
                              {o.payment.methodId.details}
                            </div>
                            {o.payment.methodId.instructions && (
                              <div className="text-xs text-[#9CA3AF] mt-1">
                                {o.payment.methodId.instructions}
                              </div>
                            )}
                            {o.payment.reference && (
                              <div className="text-xs text-[#9CA3AF] mt-1">
                                Ref: {o.payment.reference}
                              </div>
                            )}
                            {o.payment.proofUrl && (
                              <div className="mt-2">
                                <FilePreview
                                  url={o.payment.proofUrl}
                                  label="View proof"
                                />
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-[#9CA3AF]">—</span>
                        )}
                      </td>

                      <td className="p-3">
                        <span className={getOrderStatusClass(o.status)}>
                          {getStatusLabel(o.status)}
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() =>
                              setSelectedOrderId(
                                selectedOrderId === o._id ? null : o._id,
                              )
                            }
                            className="btn-secondary px-3 py-1 text-xs"
                          >
                            {selectedOrderId === o._id ? "Hide" : "View"}
                          </button>

                          {o.status === "cancelled" && !o.isRejectedArchive && (
                            <button
                              type="button"
                              onClick={() => archiveCancelled(o._id)}
                              className="px-3 py-1 text-xs rounded bg-red-600/20 border border-red-500/30 text-red-200 hover:bg-red-600/30"
                            >
                              Move to Cancelled Archive
                            </button>
                          )}

                          {o.status === "waiting_user" && (
                            <button
                              type="button"
                              onClick={() => verifyPayment(o._id)}
                              className="px-3 py-1 text-xs rounded bg-emerald-600/20 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-600/30"
                            >
                              Verify Payment
                            </button>
                          )}

                          <select
                            className="px-2 py-1 text-xs rounded bg-[#020617] border border-white/10 text-white"
                            value={o.status}
                            onChange={(e) =>
                              updateStatus(o._id, e.target.value)
                            }
                          >
                            <option value="pending">pending</option>
                            <option value="in_progress">in progress</option>
                            <option value="waiting_user">
                              waiting on user
                            </option>
                            <option value="completed">completed</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </div>
                      </td>
                    </tr>

                    {selectedOrderId === o._id && (
                      <tr className="border-b border-white/10">
                        <td colSpan={5} className="p-4">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold mb-2">Timeline</h4>
                              <div className="space-y-2 text-xs">
                                {o.timeline && o.timeline.length > 0 ? (
                                  o.timeline.map((t, idx) => (
                                    <div
                                      key={idx}
                                      className="pl-2 border-l border-[#1F2937]"
                                    >
                                      <span className="text-[#9CA3AF]">
                                        {new Date(t.createdAt).toLocaleString()}
                                      </span>
                                      {" — "}
                                      {t.message}
                                      {t.by === "admin" && (
                                        <span className="ml-2 text-[#9CA3AF]">
                                          (Admin)
                                        </span>
                                      )}
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-[#9CA3AF]">
                                    No timeline events yet.
                                  </p>
                                )}
                              </div>
                            </div>

                            <div>
                              <h4 className="font-semibold mb-2">Add Note</h4>
                              <textarea
                                placeholder="Type a note..."
                                value={noteText}
                                onChange={(e) => setNoteText(e.target.value)}
                                className="u-textarea text-sm"
                                rows={2}
                              />
                              <button
                                onClick={() => addNote(o._id)}
                                className="mt-2 btn-primary px-3 py-1 text-xs"
                              >
                                Add Note
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
