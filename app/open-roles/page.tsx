import type { Metadata } from "next";
import { Suspense } from "react";
import OpportunityCatalog from "@/components/opportunities/OpportunityCatalog";
import { LoadingState, MarketPage } from "@/components/opportunities/MarketUI";

export const metadata: Metadata = { title: "Open roles", description: "Browse specializations and apply to an open role for free." };

export default function CatalogPage() {
  return <Suspense fallback={<MarketPage><LoadingState label="Loading…" /></MarketPage>}><OpportunityCatalog view="roles" /></Suspense>;
}
