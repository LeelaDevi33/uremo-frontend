// These pages send signed-out visitors to login with a return destination.
const returnPathPattern =
  /^\/(?:(?:services|orders|payment|opportunities)\/[\da-f]{24}|projects\/(?:rent|full-access)|profile|finance\/withdrawals|opportunities\/access|apply-to-work)(?:[?#].*)?$/i;

export function authReturnPath(value: string | null): string | null {
  return value && returnPathPattern.test(value) ? value : null;
}
