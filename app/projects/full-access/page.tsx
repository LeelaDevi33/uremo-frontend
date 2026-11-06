import type { Metadata } from "next";
import { Suspense } from "react";
import OpportunityCatalog from "@/components/opportunities/OpportunityCatalog";
import { LoadingState, MarketPage } from "@/components/opportunities/MarketUI";

export const metadata: Metadata = { title: "Full Access projects", description: "Review permanent access to specialized projects." };

export default function CatalogPage() {
  return <Suspense fallback={<MarketPage><LoadingState label="Loading…" /></MarketPage>}><OpportunityCatalog view="buy" /></Suspense>;
}
