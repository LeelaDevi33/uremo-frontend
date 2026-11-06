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
