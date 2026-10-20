import { BadRequestException } from '@nestjs/common';
import { FulfilmentMethod } from '@prisma/client';
import { FulfilmentSettings, fulfilmentOptions, quoteFulfilment, shippingFeeFor } from './fulfilment';

const shop = (extra: Partial<FulfilmentSettings> = {}): FulfilmentSettings => ({
  pickupEnabled: true,
  shippingEnabled: true,
  localDeliveryEnabled: true,
  shippingFee: 4.95,
  freeShippingThreshold: null,
  localDeliveryFee: 2.5,
  localDeliveryRadiusKm: null,
  latitude: 52.3676,
  longitude: 4.9041,
  city: 'Amsterdam',
  ...extra,
});

describe('fulfilment rules', () => {
  const OLD = process.env.FLAT_SHIPPING_FEE;
  afterEach(() => {
    if (OLD === undefined) delete process.env.FLAT_SHIPPING_FEE;
    else process.env.FLAT_SHIPPING_FEE = OLD;
  });

  it('pickup is free and only when enabled', () => {
    expect(quoteFulfilment(shop(), FulfilmentMethod.PICKUP, 50)).toBe(0);
    expect(() => quoteFulfilment(shop({ pickupEnabled: false }), FulfilmentMethod.PICKUP, 50)).toThrow(BadRequestException);
  });

  it('shipping uses the shop fee, the platform default when unset, and is free above the threshold', () => {
    expect(quoteFulfilment(shop(), FulfilmentMethod.SHIPPING, 20)).toBe(4.95);
    process.env.FLAT_SHIPPING_FEE = '6,50';
    expect(shippingFeeFor(shop({ shippingFee: null }), 20)).toBe(6.5);
    expect(shippingFeeFor(shop({ freeShippingThreshold: 50 }), 49.99)).toBe(4.95);
    expect(shippingFeeFor(shop({ freeShippingThreshold: 50 }), 50)).toBe(0);
    expect(() => quoteFulfilment(shop({ shippingEnabled: false }), FulfilmentMethod.SHIPPING, 10)).toThrow(BadRequestException);
  });

  it('local delivery without a radius is limited to the shop town (case-insensitive)', () => {
    expect(quoteFulfilment(shop(), FulfilmentMethod.LOCAL_DELIVERY, 10, { city: ' amsterdam ' })).toBe(2.5);
    expect(() => quoteFulfilment(shop(), FulfilmentMethod.LOCAL_DELIVERY, 10, { city: 'Utrecht' })).toThrow(BadRequestException);
    expect(() => quoteFulfilment(shop({ localDeliveryEnabled: false }), FulfilmentMethod.LOCAL_DELIVERY, 10, { city: 'Amsterdam' })).toThrow(BadRequestException);
  });

  it('local delivery with a radius checks the distance and needs coordinates', () => {
    const radius = shop({ localDeliveryRadiusKm: 5 });
    expect(quoteFulfilment(radius, FulfilmentMethod.LOCAL_DELIVERY, 10, { latitude: 52.37, longitude: 4.9 })).toBe(2.5); // ~0.4 km
    expect(() => quoteFulfilment(radius, FulfilmentMethod.LOCAL_DELIVERY, 10, { latitude: 52.0907, longitude: 5.1214 })).toThrow(BadRequestException); // Utrecht ~35 km
    expect(() => quoteFulfilment(radius, FulfilmentMethod.LOCAL_DELIVERY, 10, { city: 'Amsterdam' })).toThrow(BadRequestException);
  });

  it('describes the options for the cart', () => {
    expect(fulfilmentOptions(shop({ freeShippingThreshold: 30, localDeliveryRadiusKm: 7.5 }), 40)).toEqual({
      pickup: { enabled: true, fee: 0 },
      shipping: { enabled: true, fee: 0, freeAbove: 30 },
      localDelivery: { enabled: true, fee: 2.5, radiusKm: 7.5 },
    });
  });
});
