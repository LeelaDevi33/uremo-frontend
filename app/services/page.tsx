import { redirect } from "next/navigation";

/**
 * DEPRECATED COMPATIBILITY ROUTE (Phase 4)
 *
 * Kept for backwards-compatible links/bookmarks.
 * Canonical destination: `/open-roles`.
 *
 * Do not create new links to `/services`.
 */

export default function ServicesIndexPage() {
  // PATCH_38: Redirect /services to /open-roles
  redirect("/open-roles");
}
