import type { Metadata } from "next";
import OpportunityDetail from "@/components/opportunities/OpportunityDetail";

export const metadata: Metadata = { title: "Project details" };

export default async function ProjectPage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ mode?: string }>;
}) {
  const [{ id }, { mode }] = await Promise.all([params, searchParams]);
  return <OpportunityDetail key={id} id={id} mode={mode === "rent" || mode === "buy" ? mode : undefined} />;
}
