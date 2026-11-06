export type ListingStatus = "draft" | "published" | "archived";

export type Opportunity = {
  _id: string;
  revision: string;
  kind: "project" | "legacy";
  needsReview: boolean;
  canConvert: boolean;
  projectId: string | null;
  workPositionId: string | null;
  title: string;
  description: string;
  category: string;
  status: ListingStatus;
  availability: "available" | "rented" | "sold";
  firstPublishedAt: string | null;
  applyEnabled: boolean;
  rentEnabled: boolean;
  rentPrice: number;
  rentalDays: number;
  buyEnabled: boolean;
  buyPrice: number;
  currency: "USD";
  rightsConfirmed: boolean;
};

export type OpportunityDetail = Opportunity & { deliverable: string };
export type ProjectChoice = {
  _id: string;
  title: string;
  status: string;
  workPositionId: { _id: string; title: string } | null;
  assignedTo?: unknown;
};

export const projectCategories = [
  ["development", "Development"], ["design", "Design"], ["operations", "Operations"],
  ["writing", "Writing"], ["data", "Data"], ["research", "Research"], ["other", "Other project work"],
] as const;

export type Draft = {
  projectId: string;
  title: string;
  description: string;
  category: string;
  rentEnabled: boolean;
  rentPrice: string;
  rentalDays: string;
  buyEnabled: boolean;
  buyPrice: string;
  deliverable: string;
  rightsConfirmed: boolean;
};

export function needsMapping(row: Opportunity) {
  return row.kind !== "project" || row.needsReview || !row.projectId || row.applyEnabled;
}

export function selectableProject(project: ProjectChoice) {
  return !!project.workPositionId?._id && !project.assignedTo && ["draft", "open"].includes(project.status);
}

export function toDraft(row?: OpportunityDetail): Draft {
  return {
    projectId: row?.projectId ?? "",
    title: row?.title ?? "",
    description: row?.description ?? "",
    category: row?.category ?? "",
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
  return /^\d+(\.\d{1,2})?$/.test(input) && price > 0 && Number.isSafeInteger(Math.round(price * 100));
}

export function editorError(
  draft: Draft,
  status: ListingStatus,
  projects: ProjectChoice[],
  existing?: OpportunityDetail,
): string | null {
  if (existing?.availability === "sold") return "Sold projects are closed to edits.";
  if (existing && needsMapping(existing)) {
    if (!existing.canConvert) return "This historical record can only be archived.";
    if (status !== "draft") return "Map this record to a project and save it as a draft first.";
  } else if (existing?.firstPublishedAt && existing.projectId !== draft.projectId) {
    return "The project linked to a published offer is fixed.";
  }
  const project = projects.find(row => row._id === draft.projectId);
  if (!project || !selectableProject(project)) return "Choose an available project linked to a specialization.";
  const publish = status === "published";
  if (publish && (!draft.title.trim() || !draft.description.trim() || !draft.category.trim()))
    return "Enter an offer title, description and category before publishing.";
  if (publish && !draft.rentEnabled && !draft.buyEnabled)
    return "Enable Rent or Full access before publishing.";
  if (draft.rentEnabled) {
    if ((publish || draft.rentPrice !== "") && !validPrice(draft.rentPrice))
      return "Enter a positive rental price in USD with at most two decimal places.";
    if ((publish || draft.rentalDays !== "") && (!/^\d+$/.test(draft.rentalDays) || Number(draft.rentalDays) < 1 || Number(draft.rentalDays) > 365))
      return "Enter a rental duration from 1 to 365 whole days.";
  }
  if (draft.buyEnabled && (publish || draft.buyPrice !== "") && !validPrice(draft.buyPrice))
    return "Enter a positive full-access price in USD with at most two decimal places.";
  if (publish && !draft.deliverable.trim()) return "Enter private handoff instructions for the paid project.";
  if (publish && !draft.rightsConfirmed) return "Confirm the owner's authority to offer this project before publishing.";
  return null;
}

export function listingPayload(draft: Draft, status: ListingStatus) {
  return {
    projectId: draft.projectId,
    title: draft.title.trim(),
    description: draft.description.trim(),
    category: draft.category.trim(),
    status,
    applyEnabled: false,
    rentEnabled: draft.rentEnabled,
    rentPrice: draft.rentEnabled ? Number(draft.rentPrice) : 0,
    rentalDays: draft.rentEnabled ? Number(draft.rentalDays) : 0,
    buyEnabled: draft.buyEnabled,
    buyPrice: draft.buyEnabled ? Number(draft.buyPrice) : 0,
    currency: "USD" as const,
    deliverable: draft.deliverable.trim(),
    rightsConfirmed: draft.rightsConfirmed,
  };
}
