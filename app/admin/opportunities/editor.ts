export type ListingStatus = "draft" | "published" | "archived";
export type Opportunity = {
  _id: string;
  revision: string;
  title: string;
  description: string;
  category: string;
  status: ListingStatus;
  availability: "available" | "rented" | "sold";
  firstPublishedAt: string | null;
  applyEnabled: boolean;
  workPositionId: string | null;
  rentEnabled: boolean;
  rentPrice: number;
  rentalDays: number;
  buyEnabled: boolean;
  buyPrice: number;
  currency: "USD";
  rightsConfirmed: boolean;
};
export type OpportunityDetail = Opportunity & { deliverable: string };
export type WorkRole = { _id: string; title: string; active?: boolean };
export const projectCategories = [
  ["development", "Development"], ["design", "Design"], ["operations", "Operations"],
  ["writing", "Writing"], ["data", "Data"], ["research", "Research"], ["other", "Other project work"],
] as const;
export type Draft = {
  title: string;
  description: string;
  category: string;
  applyEnabled: boolean;
  workPositionId: string;
  rentEnabled: boolean;
  rentPrice: string;
  rentalDays: string;
  buyEnabled: boolean;
  buyPrice: string;
  deliverable: string;
  rightsConfirmed: boolean;
};

export function toDraft(row?: OpportunityDetail): Draft {
  return {
    title: row?.title ?? "",
    description: row?.description ?? "",
    category: row?.category ?? "",
    applyEnabled: row?.applyEnabled ?? false,
    workPositionId: row?.workPositionId ?? "",
    rentEnabled: row?.rentEnabled ?? false,
    rentPrice: row?.rentPrice ? String(row.rentPrice) : "",
    rentalDays: row?.rentalDays ? String(row.rentalDays) : "",
    buyEnabled: row?.buyEnabled ?? false,
    buyPrice: row?.buyPrice ? String(row.buyPrice) : "",
    deliverable: row?.deliverable ?? "",
    rightsConfirmed: row?.rightsConfirmed ?? false,
  };
}

function validPrice(input: string) {
  const price = Number(input);
  return (
    /^\d+(\.\d{1,2})?$/.test(input) &&
    price > 0 &&
    Number.isSafeInteger(Math.round(price * 100))
  );
}

export function editorError(
  draft: Draft,
  status: ListingStatus,
  roles: WorkRole[],
  existing?: OpportunityDetail,
): string | null {
  if (existing?.availability === "sold")
    return "Sold projects are closed to edits.";
  if (
    existing?.firstPublishedAt &&
    (existing.workPositionId ?? "") !== draft.workPositionId
  ) {
    return "The role linked to a published project is fixed.";
  }
  const publish = status === "published";
  if (
    publish &&
    (!draft.title.trim() || !draft.description.trim() || !draft.category.trim())
  ) {
    return "Enter a title, public description and category before publishing.";
  }
  if (publish && !draft.applyEnabled && !draft.rentEnabled && !draft.buyEnabled)
    return "Enable at least one way to access this project.";
  if (
    publish &&
    draft.applyEnabled &&
    !roles.some(
      (role) => role._id === draft.workPositionId && role.active !== false,
    )
  ) {
    return "Choose an active work role before publishing applications.";
  }
  if (draft.rentEnabled) {
    if ((publish || draft.rentPrice !== "") && !validPrice(draft.rentPrice))
      return "Enter a positive rental price in USD with at most two decimal places.";
    if (
      (publish || draft.rentalDays !== "") &&
      (!/^\d+$/.test(draft.rentalDays) ||
        Number(draft.rentalDays) < 1 ||
        Number(draft.rentalDays) > 365)
    ) {
      return "Enter a rental duration from 1 to 365 whole days.";
    }
  }
  if (
    draft.buyEnabled &&
    (publish || draft.buyPrice !== "") &&
    !validPrice(draft.buyPrice)
  )
    return "Enter a positive buyout price in USD with at most two decimal places.";
  if (
    publish &&
    (draft.rentEnabled || draft.buyEnabled) &&
    !draft.deliverable.trim()
  )
    return "Enter private handoff instructions for the paid project.";
  if (publish && !draft.rightsConfirmed)
    return "Confirm the owner's authority to offer the project before publishing.";
  return null;
}

export function listingPayload(draft: Draft, status: ListingStatus) {
  return {
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category.trim(),
    status,
    applyEnabled: draft.applyEnabled,
    workPositionId: draft.workPositionId || null,
    rentEnabled: draft.rentEnabled,
    rentPrice: draft.rentEnabled ? Number(draft.rentPrice) : 0,
    rentalDays: draft.rentEnabled ? Number(draft.rentalDays) : 0,
    buyEnabled: draft.buyEnabled,
    buyPrice: draft.buyEnabled ? Number(draft.buyPrice) : 0,
    currency: "USD",
    deliverable: draft.deliverable.trim(),
    rightsConfirmed: draft.rightsConfirmed,
  };
}
