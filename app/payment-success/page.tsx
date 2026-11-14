import { redirect } from "next/navigation";
import { orderReturnPath } from "@/lib/orderReturnPath";

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string | string[] }>;
}) {
  const { orderId } = await searchParams;
  redirect(orderReturnPath(orderId));
}
