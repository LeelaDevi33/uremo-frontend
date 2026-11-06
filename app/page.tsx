import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const role = (await cookies()).get("role")?.value;
  redirect(role === "user" || role === "admin" ? "/dashboard" : "/explore-services");
}
