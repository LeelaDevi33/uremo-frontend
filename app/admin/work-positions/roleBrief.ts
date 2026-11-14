export const experienceLabels = {
  entry: "Entry level",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export const workModeLabels = {
  remote: "Remote",
  hybrid: "Hybrid",
  onsite: "On-site",
};

export type RoleBrief = {
  description?: string;
  requirements?: string;
  experienceLevel?: keyof typeof experienceLabels | "";
  workMode?: keyof typeof workModeLabels | "";
  locationEligibility?: string;
  timeCommitment?: string;
  skills?: string[];
  responsibilities?: string[];
};

type DirectoryRole = RoleBrief & {
  _id: string; title: string; active?: boolean; isSpecialization?: boolean;
  hasScreening?: boolean; screeningId?: unknown; screeningIds?: unknown[];
};

export function roleReviewNotes(roles: DirectoryRole[]) {
  const titles = new Map<string, number>();
  const normalize = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
  const publicRoles = roles.filter(role => role.active !== false && role.isSpecialization !== false);
  for (const role of publicRoles) {
    const title = normalize(role.title);
    titles.set(title, (titles.get(title) || 0) + 1);
  }
  const notes = new Map<string, string[]>();
  for (const role of publicRoles) {
    const findings: string[] = [];
    if ((titles.get(normalize(role.title)) || 0) > 1) findings.push("Another open role uses this title");
    if (!role.requirements?.trim()) findings.push("Requirements are empty");
    if (!role.description?.trim()) findings.push("Public description is empty");
    if (role.hasScreening && !role.screeningId && !role.screeningIds?.length) findings.push("Screening enabled without a linked assessment");
    if (findings.length) notes.set(role._id, findings);
  }
  return notes;
}

export function briefFields(role?: RoleBrief) {
  return {
    description: role?.description ?? "",
    requirements: role?.requirements ?? "",
    experienceLevel: role?.experienceLevel ?? "",
    workMode: role?.workMode ?? "",
    locationEligibility: role?.locationEligibility ?? "",
    timeCommitment: role?.timeCommitment ?? "",
    skills: role?.skills?.join("\n") ?? "",
    responsibilities: role?.responsibilities?.join("\n") ?? "",
  };
}

function listValues(text: string, label: string, limit: number): string[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length > 12) throw new Error(`Enter up to 12 ${label}.`);
  if (lines.some(line => line.length > limit)) {
    throw new Error(`Each entry under ${label} can contain up to ${limit} characters.`);
  }
  if (new Set(lines.map(line => line.toLowerCase())).size !== lines.length) {
    throw new Error(`Remove repeated entries under ${label}.`);
  }
  return lines;
}

export function briefPayload(fields: ReturnType<typeof briefFields>): RoleBrief {
  return {
    description: fields.description.trim(),
    requirements: fields.requirements.trim(),
    experienceLevel: fields.experienceLevel,
    workMode: fields.workMode,
    locationEligibility: fields.locationEligibility.trim(),
    timeCommitment: fields.timeCommitment.trim(),
    skills: listValues(fields.skills, "skills", 64),
    responsibilities: listValues(fields.responsibilities, "responsibilities", 240),
  };
}
