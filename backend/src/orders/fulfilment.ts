import { BadRequestException } from '@nestjs/common';
import { FulfilmentMethod } from '@prisma/client';
import { getFlatShippingFee } from '../common/config/shipping';
import { haversineKm, toNum } from '../common/geo';

/** The part of a Business the fulfilment rules need. */
export interface FulfilmentSettings {
  pickupEnabled: boolean;
  shippingEnabled: boolean;
  localDeliveryEnabled: boolean;
  shippingFee: unknown;
  freeShippingThreshold: unknown;
  localDeliveryFee: unknown;
  localDeliveryRadiusKm: unknown;
  latitude: unknown;
  longitude: unknown;
  city: string;
}

export interface DeliveryTarget {
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function shippingFeeFor(b: FulfilmentSettings, subtotal: number): number {
  const threshold = toNum(b.freeShippingThreshold);
  if (threshold !== null && threshold > 0 && subtotal >= threshold) return 0;
  const own = toNum(b.shippingFee);
  return round2(own !== null ? own : getFlatShippingFee());
}

/** What a shop offers for a given cart subtotal (shown in the cart/checkout). */
export function fulfilmentOptions(b: FulfilmentSettings, subtotal: number) {
  return {
    pickup: { enabled: b.pickupEnabled, fee: 0 },
    shipping: { enabled: b.shippingEnabled, fee: shippingFeeFor(b, subtotal), freeAbove: toNum(b.freeShippingThreshold) },
    localDelivery: {
      enabled: b.localDeliveryEnabled,
      fee: round2(toNum(b.localDeliveryFee) ?? 0),
      radiusKm: toNum(b.localDeliveryRadiusKm),
    },
  };
}

export function requiresAddress(method: FulfilmentMethod): boolean {
  return method !== FulfilmentMethod.PICKUP;
}

/**
 * Validates the chosen method against the shop's settings and returns the fee.
 * Local delivery within a radius needs the delivery coordinates; without a
 * radius it is limited to the shop's own city.
 */
export function quoteFulfilment(b: FulfilmentSettings, method: FulfilmentMethod, subtotal: number, target?: DeliveryTarget): number {
  switch (method) {
    case FulfilmentMethod.PICKUP:
      if (!b.pickupEnabled) throw new BadRequestException('Deze winkel biedt geen afhalen aan');
      return 0;
    case FulfilmentMethod.SHIPPING:
      if (!b.shippingEnabled) throw new BadRequestException('Deze winkel biedt geen verzending aan');
      return shippingFeeFor(b, subtotal);
    case FulfilmentMethod.LOCAL_DELIVERY: {
      if (!b.localDeliveryEnabled) throw new BadRequestException('Deze winkel biedt geen lokale bezorging aan');
      const radius = toNum(b.localDeliveryRadiusKm);
      if (radius !== null && radius > 0) {
        const shopLat = toNum(b.latitude);
        const shopLng = toNum(b.longitude);
        const lat = target?.latitude ?? null;
        const lng = target?.longitude ?? null;
        if (shopLat === null || shopLng === null || lat === null || lng === null) {
          throw new BadRequestException('Kies een adres met locatie om lokale bezorging te controleren');
        }
        if (haversineKm(shopLat, shopLng, lat, lng) > radius) {
          throw new BadRequestException('Dit adres ligt buiten het bezorggebied van de winkel');
        }
      } else if ((target?.city ?? '').trim().toLowerCase() !== b.city.trim().toLowerCase()) {
        throw new BadRequestException('Lokale bezorging is alleen mogelijk binnen de plaats van de winkel');
      }
      return round2(toNum(b.localDeliveryFee) ?? 0);
    }
    default:
      throw new BadRequestException('Ongeldige leveringswijze');
  }
}
