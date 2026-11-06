export type Opportunity = {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: "draft" | "published" | "archived";
  availability: "available" | "rented" | "sold";
  applyEnabled: boolean;
  workPositionId: string | null;
  rentEnabled: boolean;
  rentPrice: number;
  rentalDays: number;
  buyEnabled: boolean;
  buyPrice: number;
  currency: "USD";
};

export type AccessGrant = {
  _id: string;
  opportunityId: string;
  title: string;
  type: "rent" | "buy";
  amount: number;
  currency: "USD";
  startsAt: string;
  endsAt: string | null;
  active: boolean;
};

export type PaidIntent = "rent" | "buy";
export type Intent = "all" | "apply" | PaidIntent;

export function readIntent(value: string | null): Intent {
  if (value === "earn") return "apply";
  return value === "apply" || value === "rent" || value === "buy" ? value : "all";
}

export function availableFor(item: Opportunity, intent: Exclude<Intent, "all">): boolean {
  if (item.status !== "published" || item.availability === "sold") return false;
  if (intent === "apply") return item.applyEnabled && /^[a-f\d]{24}$/i.test(item.workPositionId || "");
  if (item.availability !== "available" || item.currency !== "USD") return false;
  if (intent === "rent") {
    return item.rentEnabled && Number.isFinite(item.rentPrice) && item.rentPrice > 0 &&
      Number.isInteger(item.rentalDays) && item.rentalDays > 0;
  }
  return item.buyEnabled && Number.isFinite(item.buyPrice) && item.buyPrice > 0;
}

export function filteredOpportunities(
  items: Opportunity[], intent: Intent, category: string, search: string,
): Opportunity[] {
  const query = search.trim().toLowerCase();
  return items.filter(item =>
    item.status === "published" && item.availability !== "sold" &&
    (intent === "all" || availableFor(item, intent)) &&
    (!category || item.category === category) &&
    (!query || [item.title, item.description, item.category].some(text => text?.toLowerCase().includes(query))),
  );
}

export function applicationPath(item: Opportunity): string | null {
  return availableFor(item, "apply") ? `/apply-to-work?positionId=${encodeURIComponent(item.workPositionId!)}` : null;
}

export function chargeTerms(item: Opportunity, type: PaidIntent) {
  return type === "rent"
    ? { expectedAmount: item.rentPrice, expectedRentalDays: item.rentalDays }
    : { expectedAmount: item.buyPrice };
}

export function rentalTerm(days: number) {
  return `${days} ${days === 1 ? "day" : "days"}`;
}

export function grantDate(value: string | null): string {
  if (!value || !Number.isFinite(Date.parse(value))) return "Date unavailable";
  return new Intl.DateTimeFormat(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(value));
}
