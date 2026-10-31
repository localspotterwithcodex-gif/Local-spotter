import { HealthController } from './health.controller';

const make = (key: string | undefined, dbOk = true) =>
  new HealthController(
    { $queryRaw: dbOk ? jest.fn().mockResolvedValue([1]) : jest.fn().mockRejectedValue(new Error('down')) } as never,
    { get: (k: string) => (k === 'STRIPE_SECRET_KEY' ? key : undefined) } as never,
  );

describe('HealthController', () => {
  it('reports payments as configured when a Stripe key is set, without leaking it', async () => {
    const res = await make('sk_test_secret').checkHealth();
    expect(res.paymentsConfigured).toBe(true);
    expect(JSON.stringify(res)).not.toContain('sk_test_secret');
  });

  it('reports payments as not configured when the key is missing or blank', async () => {
    expect((await make(undefined).checkHealth()).paymentsConfigured).toBe(false);
    expect((await make('   ').checkHealth()).paymentsConfigured).toBe(false);
  });

  it('answers 503 with a degraded body when the database is unreachable', async () => {
    const err = await make('x', false).checkHealth().catch((e) => e);
    expect(err.getStatus()).toBe(503);
    expect(err.getResponse()).toMatchObject({ status: 'degraded', databaseConnected: false });
  });
});
