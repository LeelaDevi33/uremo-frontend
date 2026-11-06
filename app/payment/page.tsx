import { redirect } from "next/navigation";

export default async function PaymentIndex({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string | string[] }>;
}) {
  const { orderId } = await searchParams;
  if (typeof orderId === "string" && /^[a-f\d]{24}$/i.test(orderId)) {
    redirect(`/payment/${orderId}`);
  }
  redirect("/orders");
}
