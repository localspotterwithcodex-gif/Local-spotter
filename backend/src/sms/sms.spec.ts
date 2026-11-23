import { SmsPurpose, SmsStatus } from '@prisma/client';
import { BirdSmsSender, DevFileSmsSender, SmsSendError, smsSenderFromConfig, UnconfiguredSmsSender } from './sms-sender';
import { phoneLast4, SmsService } from './sms.service';

const REQ = { to: '+31612345678', text: 'LocalSpotter: je code is 123456.', category: 'authentication' as const, idempotencyKey: 'otp:abc:1' };
const res = (status: number, body: unknown = {}, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers });

function bird(responses: (Response | Error)[]) {
  const fetchFn = jest.fn(async () => {
    const next = responses.shift()!;
    if (next instanceof Error) throw next;
    return next;
  });
  const sleep = jest.fn(async () => undefined);
  const sender = new BirdSmsSender({ apiKey: 'bk_eu1_test', baseUrl: 'https://eu1.platform.bird.com/', from: 'LocalSpotter', fetchFn: fetchFn as never, sleep });
  return { sender, fetchFn, sleep };
}

describe('BirdSmsSender', () => {
  it('posts to the EU host with bearer key, Idempotency-Key and the documented body', async () => {
    const { sender, fetchFn } = bird([res(202, { id: 'msg-1' })]);
    await expect(sender.send(REQ)).resolves.toEqual({ providerMessageId: 'msg-1' });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://eu1.platform.bird.com/v1/sms/messages');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer bk_eu1_test', 'Idempotency-Key': 'otp:abc:1' });
    expect(JSON.parse(init.body as string)).toEqual({ from: 'LocalSpotter', to: REQ.to, text: REQ.text, category: 'authentication' });
  });

  it('retries network errors and 429 (honouring Retry-After) at most twice, always with the same key', async () => {
    const { sender, fetchFn, sleep } = bird([new Error('ECONNRESET'), res(429, {}, { 'retry-after': '3' }), res(200, { id: 'm' })]);
    await expect(sender.send(REQ)).resolves.toEqual({ providerMessageId: 'm' });
    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenLastCalledWith(3000);
    const keys = fetchFn.mock.calls.map((c) => ((c as unknown as [string, RequestInit])[1].headers as Record<string, string>)['Idempotency-Key']);
    expect(new Set(keys)).toEqual(new Set(['otp:abc:1']));
    const gaveUp = bird([res(429), res(429), res(429)]);
    await expect(gaveUp.sender.send(REQ)).rejects.toMatchObject({ code: 'HTTP_429' });
    expect(gaveUp.fetchFn).toHaveBeenCalledTimes(3);
  });

  it('never retries a 5xx (Bird does not retain them, a retry could send twice) or another 4xx', async () => {
    for (const status of [500, 503, 421, 422]) {
      const { sender, fetchFn } = bird([res(status), res(200)]);
      await expect(sender.send(REQ)).rejects.toEqual(new SmsSendError(`HTTP_${status}`));
      expect(fetchFn).toHaveBeenCalledTimes(1);
    }
  });
});

describe('provider selection', () => {
  const cfg = (env: Record<string, string>) => (k: string) => env[k];
  it('bird when SMS_PROVIDER=bird, dev-file outside production by default, nothing in production', () => {
    expect(smsSenderFromConfig(cfg({ SMS_PROVIDER: 'bird', BIRD_API_KEY: 'k', BIRD_SMS_FROM: 'LocalSpotter' }))).toBeInstanceOf(BirdSmsSender);
    expect(smsSenderFromConfig(cfg({}))).toBeInstanceOf(DevFileSmsSender);
    const env = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      expect(smsSenderFromConfig(cfg({}))).toBeInstanceOf(UnconfiguredSmsSender);
      expect(() => new DevFileSmsSender()).toThrow('not allowed in production');
    } finally {
      process.env.NODE_ENV = env;
    }
  });
});

describe('SmsService', () => {
  function make(sender: { send: jest.Mock }) {
    const rows = new Map<string, any>();
    const prisma = {
      smsMessage: {
        upsert: jest.fn(async ({ where, create }: any) => rows.get(where.idempotencyKey) ?? (rows.set(create.idempotencyKey, { id: `s${rows.size + 1}`, status: SmsStatus.QUEUED, ...create }), rows.get(create.idempotencyKey))),
        findUnique: jest.fn(async ({ where }: any) => [...rows.values()].find((r) => r.id === where.id) ?? null),
        update: jest.fn(async ({ where, data }: any) => Object.assign([...rows.values()].find((r) => r.id === where.id), data)),
      },
    };
    return { service: new SmsService(prisma as never, { provider: 'bird', isConfigured: () => true, ...sender } as never), rows };
  }
  const msg = { purpose: SmsPurpose.OTP_SIGNUP, to: '+31612345678', text: 'x', category: 'authentication' as const, idempotencyKey: 'k1' };

  it('records the last 4 digits only, marks SENT, and never sends one idempotency key twice', async () => {
    const send = jest.fn(async () => ({ providerMessageId: 'p1' }));
    const { service, rows } = make({ send });
    expect(await service.send(msg)).toBe(true);
    expect(await service.send(msg)).toBe(true);
    expect(send).toHaveBeenCalledTimes(1);
    expect(rows.get('k1')).toMatchObject({ status: SmsStatus.SENT, phoneLast4: '5678', providerMessageId: 'p1' });
    expect(JSON.stringify([...rows.values()])).not.toContain('612345678');
  });

  it('marks FAILED with the error code and returns false instead of throwing', async () => {
    const { service, rows } = make({ send: jest.fn(async () => Promise.reject(new SmsSendError('HTTP_500'))) });
    expect(await service.send(msg)).toBe(false);
    expect(rows.get('k1')).toMatchObject({ status: SmsStatus.FAILED, errorCode: 'HTTP_500' });
  });

  it('phoneLast4', () => expect(phoneLast4('+31 6 1234 5678')).toBe('5678'));
});
