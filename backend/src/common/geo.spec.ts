import { boundingBox, haversineKm, hasGeo } from './geo';

describe('geo', () => {
  it('computes Amsterdam–Rotterdam distance (~58 km)', () => {
    const d = haversineKm(52.3676, 4.9041, 51.9244, 4.4777);
    expect(d).toBeGreaterThan(53);
    expect(d).toBeLessThan(62);
  });
  it('is zero for the same point', () => {
    expect(haversineKm(52, 4, 52, 4)).toBeCloseTo(0, 6);
  });
  it('bounding box contains points within the radius', () => {
    const box = boundingBox(52.0, 4.0, 10);
    expect(box.minLat).toBeLessThan(52 - 0.08);
    expect(box.maxLat).toBeGreaterThan(52 + 0.08);
    expect(box.maxLng - box.minLng).toBeGreaterThan(box.maxLat - box.minLat);
  });
  it('hasGeo needs all three values', () => {
    expect(hasGeo({ lat: 1, lng: 2 })).toBe(false);
    expect(hasGeo({ lat: 1, lng: 2, radiusKm: 5 })).toBe(true);
  });
});

import { routeStats } from './geo';

describe('routeStats', () => {
  it('sums consecutive legs in sequence order and adds visiting time', () => {
    const stops = [
      { latitude: 52.0, longitude: 4.0, sequence: 2 },
      { latitude: 52.0, longitude: 4.0, sequence: 0 },
      { latitude: 52.009, longitude: 4.0, sequence: 1 },
    ];
    const s = routeStats(stops);
    expect(s.distanceKm).toBeGreaterThan(1.9);
    expect(s.distanceKm).toBeLessThan(2.1);
    expect(s.durationMinutes).toBeGreaterThanOrEqual(30 + 20);
    expect(s.durationMinutes % 5).toBe(0);
  });
  it('is zero for an empty route and ignores stops without coordinates', () => {
    expect(routeStats([])).toEqual({ distanceKm: 0, durationMinutes: 0 });
    expect(routeStats([{ latitude: null, longitude: 4 }]).distanceKm).toBe(0);
  });
});
