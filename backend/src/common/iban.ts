/** Registry lengths for the SEPA area; other countries are rejected (payouts are SEPA transfers). */
const SEPA_LENGTHS: Record<string, number> = {
  AD: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20, ES: 24, FI: 18, FR: 27, GB: 22,
  GI: 23, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27, LI: 21, LT: 20, LU: 20, LV: 21, MC: 27, MT: 31, NL: 18,
  NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19, SK: 24, SM: 27, VA: 22,
};

export function normalizeIban(input: string): string {
  return input.replace(/\s+/g, '').toUpperCase();
}

/** Country length + ISO 7064 mod-97 check. */
export function isValidIban(input: string): boolean {
  const iban = normalizeIban(input);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) return false;
  if (SEPA_LENGTHS[iban.slice(0, 2)] !== iban.length) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const value = ch >= 'A' && ch <= 'Z' ? String(ch.charCodeAt(0) - 55) : ch;
    for (const digit of value) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/** `NL91 •••• •••• 00` style display: country + check digits and last 4 only. */
export function maskIban(input: string): string {
  const iban = normalizeIban(input);
  return `${iban.slice(0, 4)} •••• ${iban.slice(-4)}`;
}
