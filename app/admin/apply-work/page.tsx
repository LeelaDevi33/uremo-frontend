import { redirect } from "next/navigation";

export default function LegacyApplicationsManager() {
  redirect("/admin/applications");
}
