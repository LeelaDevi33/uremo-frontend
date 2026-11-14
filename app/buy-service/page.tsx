import { redirect } from "next/navigation";

export default function LegacyListingPage() {
  redirect("/projects/full-access");
}
