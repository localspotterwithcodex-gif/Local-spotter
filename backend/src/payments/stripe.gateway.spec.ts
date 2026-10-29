import { BadGatewayException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { StripeGateway, verifyStripeSignature } from './stripe.gateway';

const cfg = (values: Record<string, string>) => ({ get: (k: string) => values[k] }) as any;
const SECRET = 'whsec_testsecret123456';

function sign(body: string, t: number, secret = SECRET) {
  const sig = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  return `t=${t},v1=${sig}`;
}

describe('verifyStripeSignature', () => {
  const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed' });
  const now = 1_800_000_000_000;
  const t = Math.floor(now / 1000);

  it('accepts a correct signature over the raw body', () => {
    expect(verifyStripeSignature(Buffer.from(body), sign(body, t), SECRET, now)).toBe(true);
  });

  it('rejects a tampered body, a wrong secret, a missing header and malformed headers', () => {
    expect(verifyStripeSignature(Buffer.from(body + ' '), sign(body, t), SECRET, now)).toBe(false);
    expect(verifyStripeSignature(Buffer.from(body), sign(body, t, 'whsec_other0000000'), SECRET, now)).toBe(false);
    expect(verifyStripeSignature(Buffer.from(body), undefined, SECRET, now)).toBe(false);
    expect(verifyStripeSignature(Buffer.from(body), 'garbage', SECRET, now)).toBe(false);
    expect(verifyStripeSignature(Buffer.from(body), `t=${t},v1=zz`, SECRET, now)).toBe(false);
    expect(verifyStripeSignature(Buffer.from(body), sign(body, t), '', now)).toBe(false);
  });

  it('rejects a replayed event older than the tolerance', () => {
    expect(verifyStripeSignature(Buffer.from(body), sign(body, t - 600), SECRET, now)).toBe(false);
  });
});

describe('StripeGateway', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
  });
  const reply = (status: number, json: unknown) => {
    const fn = jest.fn(async () => ({ ok: status < 400, status, text: async () => JSON.stringify(json) }));
    global.fetch = fn as any;
    return fn;
  };

  it('is configured only with STRIPE_SECRET_KEY', () => {
    expect(new StripeGateway(cfg({})).isConfigured()).toBe(false);
    expect(new StripeGateway(cfg({ STRIPE_SECRET_KEY: ' sk_test_abc1234567 ' })).isConfigured()).toBe(true);
  });

  it('creates a Checkout Session (methods managed in the Dashboard) with the amount, metadata and idempotency key', async () => {
    const fetchFn = reply(200, { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    const gw = new StripeGateway(cfg({ STRIPE_SECRET_KEY: 'sk_test_abc1234567' }));
    const out = await gw.createPayment({
      amountCents: 10050,
      currency: 'EUR',
      description: 'LocalSpotter order',
      redirectUrl: 'https://app.example.nl/payment/return?payment=pay-1',
      method: 'IDEAL',
      metadata: { paymentId: 'pay-1', scopeId: 'co-1' },
      idempotencyKey: 'intent-pay-1',
      locale: 'nl_NL',
    });
    expect(out).toEqual({ providerPaymentId: 'cs_test_1', checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_1' });
    const [url, init] = fetchFn.mock.calls[0] as any;
    expect(url).toBe('https://api.stripe.com/v1/checkout/sessions');
    expect(init.headers['Idempotency-Key']).toBe('intent-pay-1');
    expect(init.headers.Authorization).toBe('Bearer sk_test_abc1234567');
    const params = new URLSearchParams(init.body);
    // Current Stripe API versions refuse `payment_method_types`; the Dashboard decides which methods (iDEAL) are offered.
    expect(params.has('payment_method_types[0]')).toBe(false);
    expect(params.get('line_items[0][price_data][unit_amount]')).toBe('10050');
    expect(params.get('line_items[0][price_data][currency]')).toBe('eur');
    expect(params.get('metadata[paymentId]')).toBe('pay-1');
    expect(params.get('client_reference_id')).toBe('pay-1');
    expect(params.get('locale')).toBe('nl');
  });

  it.each([
    [{ id: 'cs_test_1', payment_status: 'paid', status: 'complete' }, 'PAID'],
    [{ id: 'cs_test_1', payment_status: 'unpaid', status: 'open' }, 'PENDING'],
    [{ id: 'cs_test_1', payment_status: 'unpaid', status: 'expired' }, 'EXPIRED'],
  ])('maps a Checkout Session to a gateway status (%j)', async (session, expected) => {
    reply(200, { ...session, amount_total: 1250, currency: 'eur', metadata: { paymentId: 'pay-1' }, url: null });
    const info = await new StripeGateway(cfg({ STRIPE_SECRET_KEY: 'sk_test_abc1234567' })).getPayment('cs_test_1');
    expect(info).toMatchObject({ status: expected, amountCents: 1250, currency: 'EUR', metadata: { paymentId: 'pay-1' } });
  });

  it('refunds the PaymentIntent of the paid session, with an idempotency key', async () => {
    const calls: any[] = [];
    global.fetch = jest.fn(async (url: string, init: any) => {
      calls.push([url, init]);
      const json = url.includes('/checkout/sessions/') ? { id: 'cs_test_1', payment_intent: 'pi_123' } : { id: 're_9' };
      return { ok: true, status: 200, text: async () => JSON.stringify(json) };
    }) as any;
    const gw = new StripeGateway(cfg({ STRIPE_SECRET_KEY: 'sk_test_abc1234567' }));
    const out = await gw.refund({ paymentId: 'pay-1', providerTransactionId: 'cs_test_1', amountCents: 500, currency: 'EUR', idempotencyKey: 'refund-1' });
    expect(out).toEqual({ providerRefundId: 're_9' });
    const params = new URLSearchParams(calls[1][1].body);
    expect(calls[1][0]).toBe('https://api.stripe.com/v1/refunds');
    expect(params.get('payment_intent')).toBe('pi_123');
    expect(params.get('amount')).toBe('500');
    expect(calls[1][1].headers['Idempotency-Key']).toBe('refund-1');
  });

  it('refuses to refund a session that was never paid, and a payment without provider reference', async () => {
    reply(200, { id: 'cs_test_1', payment_intent: null });
    const gw = new StripeGateway(cfg({ STRIPE_SECRET_KEY: 'sk_test_abc1234567' }));
    await expect(gw.refund({ paymentId: 'p', providerTransactionId: 'cs_test_1', amountCents: 1, currency: 'EUR', idempotencyKey: 'k' })).rejects.toBeInstanceOf(BadGatewayException);
    await expect(gw.refund({ paymentId: 'p', providerTransactionId: null, amountCents: 1, currency: 'EUR', idempotencyKey: 'k' })).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('turns provider errors and network failures into a 502 without leaking details', async () => {
    reply(402, { error: { code: 'card_declined', message: 'secret detail' } });
    const gw = new StripeGateway(cfg({ STRIPE_SECRET_KEY: 'sk_test_abc1234567' }));
    await expect(gw.getPayment('cs_test_1')).rejects.toThrow('The payment provider rejected the request');
    global.fetch = jest.fn(async () => {
      throw new Error('boom');
    }) as any;
    await expect(gw.getPayment('cs_test_1')).rejects.toThrow('unreachable');
    await expect(new StripeGateway(cfg({})).getPayment('cs_test_1')).rejects.toBeInstanceOf(BadGatewayException);
  });
});

describe('StripeGateway rejection', () => {
  const req: any = { amountCents: 1700, currency: 'EUR', description: 'LocalSpotter Webshop', redirectUrl: 'https://a.b/r', metadata: { paymentId: 'p1' }, idempotencyKey: 'intent-p1', locale: 'nl_NL' };
  afterEach(() => jest.restoreAllMocks());

  it('answers a Stripe 400 with the coded 502, once, and never sends payment_method_types', async () => {
    const f = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 400, text: async () => JSON.stringify({ error: { type: 'invalid_request_error', param: 'success_url', message: 'Not a valid URL' } }) } as any);
    await expect(new StripeGateway({ get: () => 'sk_test_x' } as any).createPayment(req)).rejects.toMatchObject({ response: { code: 'PAYMENT_PROVIDER_ERROR' } });
    expect(f).toHaveBeenCalledTimes(1);
    expect(String((f.mock.calls[0][1] as any).body)).not.toContain('payment_method_types');
  });
});
