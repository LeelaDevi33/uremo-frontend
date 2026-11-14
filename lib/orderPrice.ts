type PriceSource = { price?: number; currency?: string };

type PricedOrder = {
  settledAmount?: number | null;
  settledCurrency?: string;
  quotedAmount?: number | null;
  quotedCurrency?: string;
  orderType?: string;
  rentalId?: PriceSource | string | null;
  serviceId?: PriceSource | null;
};

export type OrderPrice = {
  amount: number;
  currency: string;
  estimated: boolean;
};

export function getOrderPrice(order: PricedOrder | null): OrderPrice | null {
  if (!order) return null;

  let amount = order.settledAmount ?? order.quotedAmount;
  let currency = order.settledAmount != null ? order.settledCurrency : order.quotedCurrency;
  let estimated = false;
  if (amount == null) {
    const isRental = order.orderType === "rental" || !!order.rentalId;
    const source = isRental ? order.rentalId : order.serviceId;
    if (!source || typeof source !== "object") return null;
    amount = source.price;
    currency = source.currency || "USD";
    estimated = !isRental;
  }

  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) return null;
  if (!currency || !/^[A-Z]{3}$/i.test(currency)) return null;
  return { amount, currency: currency.toUpperCase(), estimated };
}

export function formatOrderPrice(price: OrderPrice | null): string {
  if (!price) return "Amount unavailable";
  const formatted = formatPrice(price.amount, price.currency);
  return price.estimated ? `${formatted} (catalog estimate)` : formatted;
}

export function formatPrice(amount: number | null | undefined, currency = "USD"): string {
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || !/^[A-Z]{3}$/i.test(currency)) {
    return "Amount unavailable";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}
