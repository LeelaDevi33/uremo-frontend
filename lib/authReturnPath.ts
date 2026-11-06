// These pages send signed-out visitors to login with a return destination.
const returnPathPattern =
  /^\/(?:(?:services|orders|payment|opportunities)\/[\da-f]{24}|finance\/withdrawals|opportunities\/access|apply-to-work\?positionId=[\da-f]{24})(?:[?#].*)?$/i;

export function authReturnPath(value: string | null): string | null {
  return value && returnPathPattern.test(value) ? value : null;
}
