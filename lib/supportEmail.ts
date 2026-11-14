const legacySupportEmail = "support@uremo.online";
const supportEmailPattern = /^[^\s@<>?#,;:]+@[^\s@<>?#,;:]+\.[^\s@<>?#,;:]+$/;

export function isValidSupportEmail(value: string): boolean {
  const email = value.trim();
  return email.length <= 120 && supportEmailPattern.test(email);
}

export function publicSupportEmail(value: unknown, emailVisible?: boolean): string {
  if (typeof value !== "string") return "";
  const email = value.trim();
  if (!isValidSupportEmail(email)) return "";
  const visible = emailVisible === undefined ? email.toLowerCase() !== legacySupportEmail : emailVisible === true;
  return visible ? email : "";
}
