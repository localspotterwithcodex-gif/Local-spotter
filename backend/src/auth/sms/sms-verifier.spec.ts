import { ServiceUnavailableException } from '@nestjs/common';
import { TwilioVerify } from './sms-verifier';

function make(responses: Array<{ status: number; body?: unknown }>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetchFn = jest.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = responses.shift() ?? { status: 200, body: {} };
    return { ok: r.status < 300, status: r.status, json: async () => r.body } as Response;
  });
  const verify = new TwilioVerify({ accountSid: 'AC1', authToken: 'tok', serviceSid: 'VA1', fetchFn: fetchFn as unknown as typeof fetch });
  return { verify, calls };
}

describe('TwilioVerify', () => {
  it('starts an SMS verification with basic auth and form fields', async () => {
    const { verify, calls } = make([{ status: 201 }]);
    await verify.start('+31612345678');
    expect(calls[0].url).toBe('https://verify.twilio.com/v2/Services/VA1/Verifications');
    expect((calls[0].init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from('AC1:tok').toString('base64')}`);
    expect(String(calls[0].init.body)).toBe('To=%2B31612345678&Channel=sms');
  });

  it('approves only an "approved" check; expired or rate-limited codes are just wrong', async () => {
    const { verify } = make([{ status: 200, body: { status: 'approved' } }, { status: 200, body: { status: 'pending' } }, { status: 404 }, { status: 429 }]);
    await expect(verify.check('+31612345678', '123456')).resolves.toBe(true);
    await expect(verify.check('+31612345678', '000000')).resolves.toBe(false);
    await expect(verify.check('+31612345678', '123456')).resolves.toBe(false);
    await expect(verify.check('+31612345678', '123456')).resolves.toBe(false);
  });

  it('reports provider failures as 503 instead of pretending', async () => {
    const { verify } = make([{ status: 500 }, { status: 401 }]);
    await expect(verify.start('+31612345678')).rejects.toThrow(ServiceUnavailableException);
    await expect(verify.check('+31612345678', '123456')).rejects.toThrow(ServiceUnavailableException);
  });
});
