type OrderPayment = {
  paymentStatus?: string;
  paidAt?: string | null;
  payment?: { verifiedAt?: string | null };
  status?: string;
};

export function orderPaymentState(order: OrderPayment) {
  if (order.paymentStatus === "refunded") return "refunded";
  if (order.paymentStatus === "paid" || order.paidAt || order.payment?.verifiedAt) return "paid";
  if (order.status === "pending" || order.status === "cancelled") return "unpaid";
  return "pending";
}
