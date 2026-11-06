// These pages send signed-out visitors to login with a return destination.
const returnPathPattern =
  /^\/(?:(?:services|orders|payment)\/[\da-f]{24}|finance\/withdrawals)(?:[?#].*)?$/i;

export function authReturnPath(value: string | null): string | null {
  return value && returnPathPattern.test(value) ? value : null;
}
