import { redirect } from "next/navigation";

export default function LegacyListingPage() {
  redirect("/explore-services?intent=rent");
}
