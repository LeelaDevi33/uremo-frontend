import type { Metadata } from "next";
import OpportunityAccess from "@/components/opportunities/OpportunityAccess";

export const metadata: Metadata = { title: "My project access", robots: { index: false, follow: false } };

export default async function AccessPage({ searchParams }: { searchParams: Promise<{ grant?: string }> }) {
  return <OpportunityAccess selectedGrant={(await searchParams).grant} />;
}
