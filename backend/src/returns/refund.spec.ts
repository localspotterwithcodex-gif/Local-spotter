import { computeReturnRefundCents } from './refund';

const order = [
  { orderItemId: 'a', quantity: 2 },
  { orderItemId: 'b', quantity: 1 },
];

describe('computeReturnRefundCents', () => {
  it('refunds the returned items at the price paid, without delivery for a partial return', () => {
    expect(computeReturnRefundCents([{ orderItemId: 'a', quantity: 1, unitPriceCents: 2500 }], order, new Map(), 495)).toBe(2500);
  });

  it('adds the delivery fee when the return covers the whole order', () => {
    const lines = [
      { orderItemId: 'a', quantity: 2, unitPriceCents: 2500 },
      { orderItemId: 'b', quantity: 1, unitPriceCents: 1000 },
    ];
    expect(computeReturnRefundCents(lines, order, new Map(), 495)).toBe(6000 + 495);
  });

  it('adds delivery to the return that completes an order that was returned in parts', () => {
    const earlier = new Map([['a', 2]]);
    expect(computeReturnRefundCents([{ orderItemId: 'b', quantity: 1, unitPriceCents: 1000 }], order, earlier, 495)).toBe(1495);
  });

  it('never adds delivery twice: an earlier partial return does not complete the order', () => {
    const earlier = new Map([['a', 1]]);
    expect(computeReturnRefundCents([{ orderItemId: 'a', quantity: 1, unitPriceCents: 2500 }], order, earlier, 495)).toBe(2500);
  });

  it('ignores a negative delivery fee', () => {
    const lines = [
      { orderItemId: 'a', quantity: 2, unitPriceCents: 100 },
      { orderItemId: 'b', quantity: 1, unitPriceCents: 100 },
    ];
    expect(computeReturnRefundCents(lines, order, new Map(), -50)).toBe(300);
  });
});
