export type Opportunity = {
  _id: string;
  title: string;
  description: string;
  revision?: string;
  category: string;
  status: "draft" | "published" | "archived";
  availability: "available" | "rented" | "sold";
  kind?: "project" | "legacy";
  needsReview?: boolean;
  canRent?: boolean;
  canBuy?: boolean;
  projectId?: string | null;
  projectTitle?: string;
  workPositionTitle?: string;
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
  projectScope?: string;
  projectId?: string;
  title: string;
  type: "rent" | "buy";
  amount: number;
  currency: "USD";
  startsAt: string;
  endsAt: string | null;
  active: boolean;
};

export type PaidIntent = "rent" | "buy";
export const catalogPaths = { roles: "/open-roles", rent: "/projects/rent", buy: "/projects/full-access" } as const;
export type Catalog = keyof typeof catalogPaths;
export function legacyCatalogPath(intent?: string) {
  if (intent === "rent") return catalogPaths.rent;
  if (intent === "buy" || intent === "full-access") return catalogPaths.buy;
  return catalogPaths.roles;
}

export type OpenRole = {
  _id: string; title: string; category: string; description?: string; requirements?: string; active?: boolean;
};
const validId = (value?: string | null) => !!value && /^[a-f\d]{24}$/i.test(value);

export function roleApplicationPath(role: OpenRole) {
  return role.active !== false && validId(role._id) ? `/apply-to-work?positionId=${role._id}` : null;
}

export function isProjectOffer(item: Opportunity) {
  return item.kind === "project" && item.needsReview === false && item.applyEnabled === false
    && validId(item._id) && validId(item.projectId) && validId(item.workPositionId);
}

export function availableFor(item: Opportunity, type: PaidIntent) {
  if (!isProjectOffer(item) || item.status !== "published" || item.availability !== "available" || item.currency !== "USD") return false;
  const price = type === "rent" ? item.rentPrice : item.buyPrice;
  if (!Number.isFinite(price) || price <= 0) return false;
  return type === "rent" ? item.rentEnabled && Number.isInteger(item.rentalDays) && item.rentalDays > 0 : item.buyEnabled;
}

export function matchesCatalogSearch(fields: (string | null | undefined)[], search: string) {
  const words = search.trim().toLowerCase().split(/\s+/);
  const text = fields.filter(Boolean).join(" ").toLowerCase();
  return words.every(word => text.includes(word));
}

export function chargeTerms(item: Opportunity, type: PaidIntent) {
  const quote = type === "rent"
    ? { expectedAmount: item.rentPrice, expectedRentalDays: item.rentalDays }
    : { expectedAmount: item.buyPrice };
  return item.revision ? { ...quote, expectedRevision: item.revision } : quote;
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
