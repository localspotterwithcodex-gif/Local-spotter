export interface ReturnLine {
  orderItemId: string;
  quantity: number;
  unitPriceCents: number;
}

export interface OrderLine {
  orderItemId: string;
  quantity: number;
}

/**
 * What the customer gets back for a return: the returned items at the price paid, plus the delivery fee
 * once the return completes the return of the whole order. `alreadyReturned` = quantities per item that
 * earlier, received returns of the same order cover.
 */
export function computeReturnRefundCents(
  lines: ReturnLine[],
  orderLines: OrderLine[],
  alreadyReturned: Map<string, number>,
  deliveryFeeCents: number,
): number {
  const items = lines.reduce((sum, l) => sum + l.unitPriceCents * l.quantity, 0);
  const thisReturn = new Map(lines.map((l) => [l.orderItemId, l.quantity]));
  const coversEverything = orderLines.every((o) => (alreadyReturned.get(o.orderItemId) ?? 0) + (thisReturn.get(o.orderItemId) ?? 0) >= o.quantity);
  return items + (coversEverything ? Math.max(0, deliveryFeeCents) : 0);
}

/** Open returns reserve quantity; rejected / cancelled ones release it. */
export const QUANTITY_HOLDING_STATUSES = ['REQUESTED', 'APPROVED', 'RECEIVED', 'REFUNDED'] as const;
