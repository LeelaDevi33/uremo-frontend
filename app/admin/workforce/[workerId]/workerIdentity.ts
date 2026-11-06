type Account = {
  _id?: string | null;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string;
  createdAt?: string;
};

// The worker list includes the original populated user and a normalized userId.
// Older responses may supply only one. Never borrow identity from another ID.
export function workerIdentity(user?: Account | null, userId?: Account | null) {
  const account = user?._id ? user : userId;
  const normalized = account?._id && userId?._id === account._id ? userId : null;
  const [givenName, ...familyName] = (account?.name || "").trim().split(/\s+/);
  return {
    ...account,
    _id: account?._id || "",
    email: account?.email?.trim() || normalized?.email?.trim() || "",
    firstName: account?.firstName?.trim() || givenName || normalized?.firstName?.trim() || "",
    lastName: account?.lastName?.trim() || familyName.join(" ") || normalized?.lastName?.trim() || "",
  };
}
