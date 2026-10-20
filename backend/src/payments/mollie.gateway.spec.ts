import { BadGatewayException } from '@nestjs/common';
import { MollieGateway, formatMollieAmount, parseMollieAmount } from './mollie.gateway';

const make = (key: string | null = 'test_abcdefghijklmnopqrstuvwxyz123456') =>
  new MollieGateway({ get: (k: string) => (k === 'MOLLIE_API_KEY' ? key ?? undefined : undefined) } as never);

const reply = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, text: async () => JSON.stringify(body) });

describe('MollieGateway', () => {
  const fetchMock = jest.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    (global as unknown as { fetch: unknown }).fetch = fetchMock;
  });

  it('formats and parses amounts without float drift', () => {
    expect(formatMollieAmount(10050)).toBe('100.50');
    expect(formatMollieAmount(5)).toBe('0.05');
    expect(parseMollieAmount('100.50')).toBe(10050);
    expect(parseMollieAmount('0.29')).toBe(29);
  });

  it('is configured only with an API key', () => {
    expect(make().isConfigured()).toBe(true);
    expect(make(null).isConfigured()).toBe(false);
    expect(make('  ').isConfigured()).toBe(false);
  });

  it('creates a payment with amount, redirect, webhook, metadata and an idempotency key', async () => {
    fetchMock.mockResolvedValue(reply(201, { id: 'tr_1', _links: { checkout: { href: 'https://pay.mollie.com/c/tr_1' } } }));
    const result = await make().createPayment({
      amountCents: 12345,
      currency: 'EUR',
      description: 'LocalSpotter LS-1',
      redirectUrl: 'https://app/payment/return?payment=p1',
      webhookUrl: 'https://api/api/v1/payments/webhooks/mollie',
      method: 'IDEAL',
      metadata: { paymentId: 'p1' },
      idempotencyKey: 'intent-p1',
      locale: 'nl_NL',
    });
    expect(result).toEqual({ providerPaymentId: 'tr_1', checkoutUrl: 'https://pay.mollie.com/c/tr_1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.mollie.com/v2/payments');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer test_abcdefghijklmnopqrstuvwxyz123456');
    expect(init.headers['Idempotency-Key']).toBe('intent-p1');
    expect(JSON.parse(init.body)).toMatchObject({
      amount: { currency: 'EUR', value: '123.45' },
      redirectUrl: 'https://app/payment/return?payment=p1',
      webhookUrl: 'https://api/api/v1/payments/webhooks/mollie',
      method: 'ideal',
      metadata: { paymentId: 'p1' },
    });
  });

  it('omits the webhook and method when not given (customer picks on the Mollie page)', async () => {
    fetchMock.mockResolvedValue(reply(201, { id: 'tr_2', _links: {} }));
    await make().createPayment({ amountCents: 100, currency: 'EUR', description: 'x', redirectUrl: 'https://app/r', metadata: {}, idempotencyKey: 'k' });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).not.toHaveProperty('webhookUrl');
    expect(body).not.toHaveProperty('method');
  });

  it.each([
    ['open', 'PENDING'],
    ['pending', 'PENDING'],
    ['authorized', 'AUTHORIZED'],
    ['paid', 'PAID'],
    ['failed', 'FAILED'],
    ['canceled', 'CANCELLED'],
    ['expired', 'EXPIRED'],
  ])('maps Mollie status %s to %s', async (mollie, ours) => {
    fetchMock.mockResolvedValue(reply(200, { id: 'tr_3', status: mollie, amount: { value: '10.00', currency: 'EUR' }, metadata: { paymentId: 'p1' } }));
    const info = await make().getPayment('tr_3');
    expect(info).toMatchObject({ status: ours, amountCents: 1000, currency: 'EUR', metadata: { paymentId: 'p1' } });
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });

  it('rejects an unknown status from the provider', async () => {
    fetchMock.mockResolvedValue(reply(200, { id: 'tr_4', status: 'charged_back', amount: { value: '1.00', currency: 'EUR' } }));
    await expect(make().getPayment('tr_4')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('refunds with the idempotency key and returns the refund id', async () => {
    fetchMock.mockResolvedValue(reply(201, { id: 're_1' }));
    const result = await make().refund({ paymentId: 'p1', providerTransactionId: 'tr_5', amountCents: 2500, currency: 'EUR', idempotencyKey: 'led-1' });
    expect(result).toEqual({ providerRefundId: 're_1' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.mollie.com/v2/payments/tr_5/refunds');
    expect(init.headers['Idempotency-Key']).toBe('led-1');
    expect(JSON.parse(init.body)).toEqual({ amount: { currency: 'EUR', value: '25.00' } });
  });

  it('cannot refund a payment without a provider reference', async () => {
    await expect(make().refund({ paymentId: 'p1', providerTransactionId: null, amountCents: 100, currency: 'EUR', idempotencyKey: 'k' })).rejects.toBeInstanceOf(BadGatewayException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('turns provider errors and network failures into 502 without leaking details', async () => {
    fetchMock.mockResolvedValue(reply(422, { title: 'Unprocessable Entity', detail: 'secret detail' }));
    const err = await make().getPayment('tr_6').catch((e) => e);
    expect(err).toBeInstanceOf(BadGatewayException);
    expect(JSON.stringify(err.getResponse())).not.toContain('secret detail');

    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    await expect(make().getPayment('tr_6')).rejects.toBeInstanceOf(BadGatewayException);
  });

  it('refuses to call the provider without a key', async () => {
    await expect(make(null).getPayment('tr_7')).rejects.toBeInstanceOf(BadGatewayException);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
