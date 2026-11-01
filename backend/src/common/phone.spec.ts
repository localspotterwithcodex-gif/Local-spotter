import { normalizeMobile } from './phone';

describe('normalizeMobile', () => {
  it.each([
    ['06 12345678', '+31612345678'],
    ['0612345678', '+31612345678'],
    ['+31 6 1234 5678', '+31612345678'],
    ['0031612345678', '+31612345678'],
    ['+91 63741 74789', '+916374174789'],
    ['+91-6374-174789', '+916374174789'],
  ])('%s -> %s', (raw, expected) => {
    expect(normalizeMobile(raw)).toBe(expected);
  });

  it.each(['6374174789', '12345', '+0123456789', 'abc', '+31 6 12', ''])('rejects %p', (raw) => {
    expect(normalizeMobile(raw)).toBeNull();
  });
});
