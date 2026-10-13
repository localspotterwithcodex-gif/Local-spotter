import { OptionalJwtAuthGuard } from './optional-jwt-auth.guard';
import { getFlatShippingFee } from '../config/shipping';

describe('OptionalJwtAuthGuard', () => {
  const guard = new OptionalJwtAuthGuard();
  it('passes a resolved user through', () => {
    const user = { id: 'u1', role: 'CONSUMER' };
    expect(guard.handleRequest(null, user)).toBe(user);
  });
  it('treats missing/invalid credentials as anonymous instead of throwing', () => {
    expect(guard.handleRequest(new Error('jwt expired'), false)).toBeUndefined();
    expect(guard.handleRequest(null, false)).toBeUndefined();
  });
});

describe('getFlatShippingFee', () => {
  it('defaults to 0 and ignores invalid values', () => {
    expect(getFlatShippingFee({})).toBe(0);
    expect(getFlatShippingFee({ FLAT_SHIPPING_FEE: 'abc' })).toBe(0);
    expect(getFlatShippingFee({ FLAT_SHIPPING_FEE: '-3' })).toBe(0);
    expect(getFlatShippingFee({ FLAT_SHIPPING_FEE: '99999' })).toBe(0);
  });
  it('accepts dot or comma decimals and rounds to cents', () => {
    expect(getFlatShippingFee({ FLAT_SHIPPING_FEE: '4.95' })).toBe(4.95);
    expect(getFlatShippingFee({ FLAT_SHIPPING_FEE: '4,955' })).toBe(4.96);
  });
});
