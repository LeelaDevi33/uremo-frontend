type Position = {
  _id: string;
  serviceId?: string | { _id: string } | null;
  active?: boolean;
};

export function applicationHref(serviceId: string, positionId?: string) {
  const query = new URLSearchParams({ serviceId });
  if (positionId) query.set("positionId", positionId);
  return `/apply-to-work?${query}`;
}

// undefined means general browsing. null means the requested role could not be verified.
export function linkedApplicationPosition<T extends Position>(
  positions: T[],
  query: URLSearchParams,
): T | null | undefined {
  if (query.has("projectId") || query.has("opportunityId")) return null;
  const serviceIds = query.getAll("serviceId").map(id => id.trim().toLowerCase());
  const roleIds = [...query.getAll("positionId"), ...query.getAll("jobId")]
    .map(id => id.trim().toLowerCase());
  if (!serviceIds.length && !roleIds.length) return undefined;
  if ([...serviceIds, ...roleIds].some(id => !/^[a-f\d]{24}$/.test(id)) ||
      new Set(serviceIds).size > 1 || new Set(roleIds).size > 1) return null;

  const matches = positions.filter(position => {
    const serviceId = typeof position.serviceId === "string" ? position.serviceId : position.serviceId?._id;
    return position.active !== false &&
      (!roleIds.length || position._id.toLowerCase() === roleIds[0]) &&
      (!serviceIds.length || serviceId?.toLowerCase() === serviceIds[0]);
  });
  return matches.length === 1 ? matches[0] : null;
}
