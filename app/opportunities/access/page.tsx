import type { Metadata } from "next";
import OpportunityAccess from "@/components/opportunities/OpportunityAccess";

export const metadata: Metadata = { title: "My opportunity access", robots: { index: false, follow: false } };

export default function AccessPage() {
  return <OpportunityAccess />;
}
