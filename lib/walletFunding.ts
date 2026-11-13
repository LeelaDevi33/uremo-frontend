export interface FundingMethod {
  _id: string;
  name: string;
  details: string;
  instructions: string;
  active: boolean;
  updatedAt: string;
}

export interface FundingOptions {
  methods: FundingMethod[];
  paypal: { available: boolean; mode?: string };
}

export interface AdminFundingOptions extends FundingOptions {
  paypal: FundingOptions["paypal"] & {
    configured: boolean;
    enabled: boolean;
    webhookConfigured: boolean;
    updatedAt: string | null;
  };
}

export function paypalApprovalUrl(raw: unknown, mode?: string): string {
  if (typeof raw !== "string") throw new Error("PayPal did not return a checkout link. Please try again.");
  const url = new URL(raw);
  const allowed = mode === "sandbox" ? ["www.sandbox.paypal.com", "sandbox.paypal.com"] : ["www.paypal.com", "paypal.com"];
  if (url.protocol !== "https:" || url.username || url.password || url.port || !allowed.includes(url.hostname)) {
    throw new Error("PayPal returned an unexpected checkout address. Please reload your funding options.");
  }
  return url.href;
}
