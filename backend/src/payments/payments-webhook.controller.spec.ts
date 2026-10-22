import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PaymentsWebhookController } from './payments-webhook.controller';

// The controller only needs the service as an injected object; skip loading the heavy real module.
jest.mock('./payments.service', () => ({ PaymentsService: class {} }));

const SECRET = 'whsec_testsecret123456';
const cfg = (values: Record<string, string>) => ({ get: (k: string) => values[k] }) as any;

function signed(body: string) {
  const t = Math.floor(Date.now() / 1000);
  return { req: { rawBody: Buffer.from(body) } as any, header: `t=${t},v1=${createHmac('sha256', SECRET).update(`${t}.${body}`).digest('hex')}` };
}

describe('PaymentsWebhookController (Stripe)', () => {
  const payments = { handleProviderWebhook: jest.fn() };
  const make = (values: Record<string, string> = { STRIPE_WEBHOOK_SECRET: SECRET }) => new PaymentsWebhookController(payments as any, cfg(values));
  beforeEach(() => payments.handleProviderWebhook.mockReset());

  const event = (type: string) => JSON.stringify({ id: 'evt_1', type, data: { object: { id: 'cs_test_abc12345' } } });

  it('hands the session id of a signed checkout event to the payment sync', async () => {
    const body = event('checkout.session.completed');
    const { req, header } = signed(body);
    await expect(make().stripe(req, header)).resolves.toEqual({ ok: true });
    expect(payments.handleProviderWebhook).toHaveBeenCalledWith('cs_test_abc12345');
  });

  it('ignores event types it does not handle', async () => {
    const { req, header } = signed(event('charge.refunded'));
    await make().stripe(req, header);
    expect(payments.handleProviderWebhook).not.toHaveBeenCalled();
  });

  it('rejects a missing or wrong signature without touching any payment', async () => {
    const body = event('checkout.session.completed');
    const { req } = signed(body);
    await expect(make().stripe(req, undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(make().stripe(req, 't=1,v1=abcd')).rejects.toBeInstanceOf(BadRequestException);
    await expect(make().stripe({} as any, 't=1,v1=abcd')).rejects.toBeInstanceOf(BadRequestException);
    expect(payments.handleProviderWebhook).not.toHaveBeenCalled();
  });

  it('answers 503 when the webhook secret is not configured', async () => {
    const { req, header } = signed(event('checkout.session.completed'));
    await expect(make({}).stripe(req, header)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
