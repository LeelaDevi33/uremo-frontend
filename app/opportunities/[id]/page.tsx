import type { Metadata } from "next";
import OpportunityDetail from "@/components/opportunities/OpportunityDetail";

export const metadata: Metadata = { title: "Opportunity details" };

export default async function OpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OpportunityDetail key={id} id={id} />;
}
