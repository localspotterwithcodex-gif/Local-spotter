/** Live sign-up checks. The API re-checks every one of them; these only drive the form. */

export const PASSWORD_RULES = [
  { key: "length", test: (p: string) => p.length >= 8 },
  { key: "upper", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lower", test: (p: string) => /[a-z]/.test(p) },
  { key: "number", test: (p: string) => /\d/.test(p) },
  { key: "special", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export type PasswordRuleKey = (typeof PASSWORD_RULES)[number]["key"];

export const passwordOk = (password: string) => PASSWORD_RULES.every((r) => r.test(password));

/** Format check only; the API also checks that the domain can receive mail (e.g. rejects "gmial.con"). */
export const emailLooksValid = (email: string) => /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-zA-Z]{2,}$/.test(email.trim());

/**
 * Joins the selected dial code and the typed number into E.164 ("+31" + "06 1234 5678" -> "+31612345678").
 * A number typed with its own "+" or "00" prefix wins over the selector.
 */
export function fullMobile(dialCode: string, local: string): string {
  const digits = local.trim().replace(/[\s().-]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  return `${dialCode}${digits.replace(/^0/, "")}`;
}

export const mobileLooksValid = (e164: string) => /^\+[1-9]\d{7,14}$/.test(e164);
