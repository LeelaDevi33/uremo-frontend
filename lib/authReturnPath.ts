// These pages send signed-out visitors to login with a return destination.
const returnPathPattern =
  /^\/(?:(?:services|orders|payment|opportunities)\/[\da-f]{24}|projects\/(?:rent|full-access)|wallet|profile|finance\/withdrawals|opportunities\/access|apply-to-work)(?:[?#].*)?$/i;

export function isPrivateMemberPath(pathname: string): boolean {
  return /^\/(?:affiliate|dashboard|notifications|profile|orders(?:\/[\da-f]{24})?|payment\/[\da-f]{24}|rentals|finance\/withdrawals|wallet|opportunities\/access|support\/tickets(?:\/[\da-f]{24})?|workspace(?:\/(?:projects|my-proofs|(?:project|screening)\/[\da-f]{24}))?)\/?$/i.test(pathname);
}

export function authReturnPath(value: string | null): string | null {
  if (value && isPrivateMemberPath(value.split(/[?#]/, 1)[0])) return value;
  if (value && /^\/admin(?:\/[a-z\d-]+)*\/?(?:[?#].*)?$/i.test(value)) return value;
  return value && returnPathPattern.test(value) ? value : null;
}
