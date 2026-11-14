import type { Metadata } from "next";
import { Suspense } from "react";
import OpportunityCatalog from "@/components/opportunities/OpportunityCatalog";
import { LoadingState, MarketPage } from "@/components/opportunities/MarketUI";

export const metadata: Metadata = { title: "Rent projects", description: "Review time-limited access to specialized projects." };

export default function CatalogPage() {
  return <Suspense fallback={<MarketPage><LoadingState label="Loading…" /></MarketPage>}><OpportunityCatalog view="rent" /></Suspense>;
}
