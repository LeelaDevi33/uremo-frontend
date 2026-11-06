import type { Metadata } from "next";
import { Suspense } from "react";
import OpportunityCatalog from "@/components/opportunities/OpportunityCatalog";
import ExploreLoading from "./loading";

export const metadata: Metadata = {
  title: "Explore opportunities",
  description: "Browse work opportunities, compare rental and buyout terms, and find open roles.",
};

export default function ExploreOpportunities() {
  return <Suspense fallback={<ExploreLoading />}><OpportunityCatalog /></Suspense>;
}
