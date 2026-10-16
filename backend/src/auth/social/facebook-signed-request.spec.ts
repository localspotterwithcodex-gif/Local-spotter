import { createHmac } from 'crypto';
import { parseFacebookSignedRequest } from './facebook-signed-request';

const sign = (payloadObj: object, secret: string) => {
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  const sig = createHmac('sha256', secret).update(payload).digest('base64url');
  return `${sig}.${payload}`;
};

describe('parseFacebookSignedRequest', () => {
  it('returns the user id for a valid signature', () => {
    expect(parseFacebookSignedRequest(sign({ algorithm: 'HMAC-SHA256', user_id: '123' }, 's3cret'), 's3cret')).toEqual({ userId: '123' });
  });
  it('rejects a wrong secret, tampering and malformed input', () => {
    const good = sign({ algorithm: 'HMAC-SHA256', user_id: '123' }, 's3cret');
    expect(parseFacebookSignedRequest(good, 'other')).toBeNull();
    expect(parseFacebookSignedRequest(good.replace(/.$/, 'A'), 's3cret')).toBeNull();
    expect(parseFacebookSignedRequest('garbage', 's3cret')).toBeNull();
    expect(parseFacebookSignedRequest(undefined, 's3cret')).toBeNull();
    expect(parseFacebookSignedRequest(sign({ algorithm: 'none', user_id: '1' }, 's3cret'), 's3cret')).toBeNull();
  });
});
