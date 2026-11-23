import { FulfilmentMethod, OrderStatus, SmsPurpose } from '@prisma/client';
import { orderSmsPurpose, orderSmsText } from './order-sms';

describe('order SMS rules', () => {
  it('maps status changes to the four messages; pickup orders have no "shipped"', () => {
    expect(orderSmsPurpose(OrderStatus.OUT_FOR_DELIVERY, FulfilmentMethod.SHIPPING)).toBe(SmsPurpose.ORDER_SHIPPED);
    expect(orderSmsPurpose(OrderStatus.DELIVERED, FulfilmentMethod.LOCAL_DELIVERY)).toBe(SmsPurpose.ORDER_DELIVERED);
    expect(orderSmsPurpose(OrderStatus.CANCELLED, FulfilmentMethod.SHIPPING)).toBe(SmsPurpose.ORDER_CANCELLED);
    expect(orderSmsPurpose(OrderStatus.REJECTED, FulfilmentMethod.PICKUP)).toBe(SmsPurpose.ORDER_CANCELLED);
    expect(orderSmsPurpose(OrderStatus.READY, FulfilmentMethod.PICKUP)).toBe(SmsPurpose.ORDER_READY);
    expect(orderSmsPurpose(OrderStatus.READY, FulfilmentMethod.SHIPPING)).toBeNull();
    expect(orderSmsPurpose(OrderStatus.CONFIRMED, FulfilmentMethod.SHIPPING)).toBeNull();
    expect(orderSmsPurpose(OrderStatus.PREPARING, FulfilmentMethod.PICKUP)).toBeNull();
  });

  it('uses the prompt templates and always fits one GSM segment (accents dropped, long shop names shortened)', () => {
    const link = 'https://www.localspotter.nl/account/orders';
    expect(orderSmsText(SmsPurpose.ORDER_SHIPPED, 'LS-ABC-12', 'Boetiek Amsterdam', link)).toBe(
      `LocalSpotter: je bestelling #LS-ABC-12 van Boetiek Amsterdam is verzonden. Volg: ${link}`,
    );
    expect(orderSmsText(SmsPurpose.ORDER_READY, 'LS-ABC-12', 'Café Ü', link, 'en')).toBe(`LocalSpotter: your order #LS-ABC-12 is ready for pickup at Cafe U. Info: ${link}`);
    for (const p of [SmsPurpose.ORDER_SHIPPED, SmsPurpose.ORDER_DELIVERED, SmsPurpose.ORDER_CANCELLED, SmsPurpose.ORDER_READY]) {
      const text = orderSmsText(p, 'LS-M0NX1Q2Z-AB12', 'De Allerlangste Winkelnaam Van Heel Nederland En Omstreken Met Ëxtra', link);
      expect(text.length).toBeLessThanOrEqual(160);
      expect(/^[\x20-\x7E]+$/.test(text)).toBe(true);
      expect(text).toContain(link);
    }
  });
});
