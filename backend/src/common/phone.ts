/**
 * Mobile numbers are stored and sent in E.164 (+<country><number>), which SMS providers require.
 * Dutch "06…" numbers are converted; anything else must carry its country code, because a bare
 * national number (e.g. an Indian 10-digit number) can't be told apart from other countries'.
 * Returns null when the input is not a usable mobile number.
 */
export function normalizeMobile(raw: string): string | null {
  let value = raw.trim().replace(/[\s().-]/g, '');
  if (value.startsWith('00')) value = `+${value.slice(2)}`;
  if (/^06\d{8}$/.test(value)) value = `+31${value.slice(1)}`;
  return /^\+[1-9]\d{7,14}$/.test(value) ? value : null;
}
