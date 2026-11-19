import { base32Decode, base32Encode, generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, totpAt, verifyTotp } from './totp';

// RFC 6238 appendix B test vectors (SHA-1 seed "12345678901234567890"), last 6 digits.
const RFC_SECRET = base32Encode(Buffer.from('12345678901234567890'));

describe('TOTP', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
  ])('matches the RFC 6238 vector at t=%i', (t, code) => {
    expect(totpAt(RFC_SECRET, t)).toBe(code);
  });

  it('round-trips base32', () => {
    const buf = Buffer.from([0, 1, 2, 250, 251, 255, 17]);
    expect(base32Decode(base32Encode(buf))).toEqual(buf);
  });

  it('accepts the current and adjacent step, rejects others and malformed input', () => {
    const secret = generateTotpSecret();
    const now = 1_800_000_000_000;
    expect(verifyTotp(secret, totpAt(secret, now / 1000), now)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, now / 1000 - 30), now)).toBe(true);
    expect(verifyTotp(secret, totpAt(secret, now / 1000 - 90), now)).toBe(false);
    expect(verifyTotp(secret, '12345', now)).toBe(false);
    expect(verifyTotp(secret, 'abcdef', now)).toBe(false);
  });

  it('makes 10 distinct recovery codes and stores only hashes', () => {
    const { codes, hashes } = generateRecoveryCodes();
    expect(new Set(codes).size).toBe(10);
    expect(hashes[0]).toBe(hashRecoveryCode(codes[0].toUpperCase()));
    expect(hashes.join()).not.toContain(codes[0]);
  });
});
