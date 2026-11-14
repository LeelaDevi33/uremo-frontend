import type { Metadata } from "next";
import { Suspense } from "react";
import OpenRolesBoard, { BoardLoading } from "@/components/opportunities/OpenRolesBoard";

export const metadata: Metadata = { title: "Open roles", description: "Find an open specialization, read its responsibilities and requirements, and apply for free." };

export default function CatalogPage() {
  return <Suspense fallback={<BoardLoading />}><OpenRolesBoard /></Suspense>;
}
