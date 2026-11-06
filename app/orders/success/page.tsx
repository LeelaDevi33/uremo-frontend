import { redirect } from "next/navigation";
import { orderReturnPath } from "@/lib/orderReturnPath";

export default async function OrderReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string | string[] }>;
}) {
  const { id } = await searchParams;
  redirect(orderReturnPath(id));
}
