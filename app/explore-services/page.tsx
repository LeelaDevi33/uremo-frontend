import { redirect } from "next/navigation";
import { legacyCatalogPath } from "@/lib/opportunities";

export default async function MarketplaceBookmark({ searchParams }: {
  searchParams: Promise<{ intent?: string | string[]; category?: string | string[] }>;
}) {
  const { intent, category } = await searchParams;
  const path = legacyCatalogPath(typeof intent === "string" ? intent : undefined);
  redirect(path + (typeof category === "string" && category ? "?category=" + encodeURIComponent(category) : ""));
}
