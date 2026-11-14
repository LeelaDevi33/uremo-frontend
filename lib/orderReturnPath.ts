export function orderReturnPath(id: string | string[] | undefined): string {
  // The order page verifies ownership and reads the current status from the API.
  return typeof id === "string" && /^[a-f\d]{24}$/i.test(id)
    ? `/orders/${id}`
    : "/orders";
}
