import { isValidIban, maskIban, normalizeIban } from './iban';

describe('iban', () => {
  it('accepts valid SEPA IBANs (spaces and case are ignored)', () => {
    expect(isValidIban('NL91 ABNA 0417 1643 00')).toBe(true);
    expect(isValidIban('nl91abna0417164300')).toBe(true);
    expect(isValidIban('DE89 3704 0044 0532 0130 00')).toBe(true);
    expect(isValidIban('BE68 5390 0754 7034')).toBe(true);
  });
  it('rejects wrong checksum, wrong length, junk and non-SEPA countries', () => {
    expect(isValidIban('NL91 ABNA 0417 1643 01')).toBe(false);
    expect(isValidIban('NL91 ABNA 0417 1643')).toBe(false);
    expect(isValidIban('')).toBe(false);
    expect(isValidIban('12345678901234567890')).toBe(false);
    expect(isValidIban('US64SVBKUS6S3300958879')).toBe(false);
    expect(isValidIban("NL91 ABNA 0417 1643 00'; DROP")).toBe(false);
  });
  it('masks everything but country, check digits and last four', () => {
    expect(normalizeIban(' nl91 abna 0417 1643 00 ')).toBe('NL91ABNA0417164300');
    expect(maskIban('NL91ABNA0417164300')).toBe('NL91 •••• 4300');
  });
});
