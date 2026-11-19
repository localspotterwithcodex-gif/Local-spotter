import { validateAdminInput } from './create-admin';
import { parsePlanPrices } from './seed-plans';

describe('create-admin input', () => {
  const ok = 'a-long-enough-pass!';
  it('accepts a valid e-mail and a confirmed password of 14+ characters', () => {
    expect(validateAdminInput('admin@example.nl', ok, ok)).toEqual([]);
  });
  it('rejects short, mismatched, padded and over-72-byte passwords and bad e-mail, without echoing the password', () => {
    expect(validateAdminInput('admin@example.nl', 'short', 'short')).toEqual([expect.stringContaining('at least 14')]);
    expect(validateAdminInput('admin@example.nl', ok, ok + 'x')).toEqual([expect.stringContaining('do not match')]);
    expect(validateAdminInput('admin@example.nl', ` ${ok}`, ` ${ok}`)).toEqual([expect.stringContaining('space')]);
    expect(validateAdminInput('admin@example.nl', 'é'.repeat(40), 'é'.repeat(40))).toEqual([expect.stringContaining('72 bytes')]);
    expect(validateAdminInput('not-an-email', ok, ok)).toEqual([expect.stringContaining('ADMIN_EMAIL')]);
    expect(validateAdminInput('x', 'secret-value', 'other').join(' ')).not.toContain('secret-value');
  });
});

describe('seed-plans arguments', () => {
  it('parses all three prices', () => {
    expect(parsePlanPrices(['--webshop=12', '--shoproutes=27.5', '--workshop=57.00'])).toEqual({ WEBSHOP: '12', SHOPROUTES: '27.5', WORKSHOP: '57.00' });
  });
  it('rejects missing, unknown, negative, over-limit and over-precise prices', () => {
    expect(() => parsePlanPrices(['--webshop=12', '--shoproutes=27'])).toThrow('Missing --workshop');
    expect(() => parsePlanPrices(['--webshop=12', '--shoproutes=27', '--workshop=57', '--gold=1'])).toThrow('Unknown plan');
    expect(() => parsePlanPrices(['--webshop=-1', '--shoproutes=27', '--workshop=57'])).toThrow('--webshop');
    expect(() => parsePlanPrices(['--webshop=10001', '--shoproutes=27', '--workshop=57'])).toThrow('--webshop');
    expect(() => parsePlanPrices(['--webshop=1.999', '--shoproutes=27', '--workshop=57'])).toThrow('--webshop');
    expect(() => parsePlanPrices(['12'])).toThrow('Unexpected argument');
  });
});
