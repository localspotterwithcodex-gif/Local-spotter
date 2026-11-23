import { FulfilmentMethod, OrderStatus, SmsPurpose } from '@prisma/client';

/**
 * Which status change sends an SMS (MASTER-PROMPT 8.4): shipped, delivered, cancelled (also when the shop rejects
 * it: for the customer it is cancelled) and, for pickup orders, ready for pickup (D8).
 */
export function orderSmsPurpose(status: OrderStatus, method: FulfilmentMethod): SmsPurpose | null {
  switch (status) {
    case OrderStatus.OUT_FOR_DELIVERY:
      return SmsPurpose.ORDER_SHIPPED;
    case OrderStatus.DELIVERED:
      return SmsPurpose.ORDER_DELIVERED;
    case OrderStatus.CANCELLED:
    case OrderStatus.REJECTED:
      return SmsPurpose.ORDER_CANCELLED;
    case OrderStatus.READY:
      return method === FulfilmentMethod.PICKUP ? SmsPurpose.ORDER_READY : null;
    default:
      return null;
  }
}

const TEMPLATES: Record<'nl' | 'en', Partial<Record<SmsPurpose, string>>> = {
  nl: {
    ORDER_SHIPPED: 'LocalSpotter: je bestelling #{nr} van {shop} is verzonden. Volg: {link}',
    ORDER_DELIVERED: 'LocalSpotter: je bestelling #{nr} van {shop} is bezorgd. Bedankt! {link}',
    ORDER_CANCELLED: 'LocalSpotter: je bestelling #{nr} van {shop} is geannuleerd. Info: {link}',
    ORDER_READY: 'LocalSpotter: je bestelling #{nr} ligt klaar bij {shop}. Info: {link}',
  },
  en: {
    ORDER_SHIPPED: 'LocalSpotter: your order #{nr} from {shop} has been shipped. Track: {link}',
    ORDER_DELIVERED: 'LocalSpotter: your order #{nr} from {shop} has been delivered. Thanks! {link}',
    ORDER_CANCELLED: 'LocalSpotter: your order #{nr} from {shop} has been cancelled. Info: {link}',
    ORDER_READY: 'LocalSpotter: your order #{nr} is ready for pickup at {shop}. Info: {link}',
  },
};

/** GSM-7 friendly: accents dropped and anything else outside printable ASCII removed, so one segment holds 160 chars. */
const plain = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '').trim();

/** One SMS segment (<= 160 characters): the shop name is shortened if the whole text would not fit. */
export function orderSmsText(purpose: SmsPurpose, orderNumber: string, shopName: string, link: string, locale: 'nl' | 'en' = 'nl'): string {
  const template = TEMPLATES[locale][purpose];
  if (!template) throw new Error(`No SMS template for ${purpose}`);
  const fill = (shop: string) => template.replace('{nr}', orderNumber).replace('{shop}', shop).replace('{link}', link);
  let shop = plain(shopName) || 'de winkel';
  const room = 160 - fill('').length;
  if (shop.length > room) shop = `${shop.slice(0, Math.max(1, room - 1)).trimEnd()}.`;
  return fill(shop);
}
