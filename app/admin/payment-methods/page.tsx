import { redirect } from "next/navigation";

export default function LegacyPaymentSettings() {
  redirect("/admin/payments");
}
