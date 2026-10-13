/**
 * Flat delivery fee in EUR, configured with FLAT_SHIPPING_FEE (default 0).
 * Single source of truth for the cart preview and the order total so they never disagree.
 */
export function getFlatShippingFee(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.FLAT_SHIPPING_FEE;
  if (raw === undefined || raw.trim() === '') return 0;
  const fee = Number(raw.replace(',', '.'));
  if (!Number.isFinite(fee) || fee < 0 || fee > 1000) return 0;
  return Math.round(fee * 100) / 100;
}
