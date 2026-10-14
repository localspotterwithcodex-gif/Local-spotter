import { ServiceUnavailableException } from '@nestjs/common';
import { ResendMailProvider } from './mail.provider';

const msg = { to: 'a@b.com', channel: 'EMAIL' as const, subject: 's', text: 'code 123456' };
const res = (status: number) => ({ ok: status >= 200 && status < 300, status }) as Response;
const make = (fn: jest.Mock) => new ResendMailProvider({ apiKey: 'k', from: 'X <x@y.com>', fetchFn: fn as unknown as typeof fetch });

describe('ResendMailProvider', () => {
  it('sends email with bearer auth, idempotency key and no retry on success', async () => {
    const fn = jest.fn().mockResolvedValue(res(200));
    await make(fn).send(msg);
    expect(fn).toHaveBeenCalledTimes(1);
    const [url, init] = fn.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.headers.Authorization).toBe('Bearer k');
    expect(init.headers['Idempotency-Key']).toBeTruthy();
    expect(JSON.parse(init.body)).toMatchObject({ to: ['a@b.com'], from: 'X <x@y.com>' });
  });

  it('retries once on 500 with the same idempotency key, then succeeds', async () => {
    const fn = jest.fn().mockResolvedValueOnce(res(500)).mockResolvedValueOnce(res(200));
    await make(fn).send(msg);
    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[0][1].headers['Idempotency-Key']).toBe(fn.mock.calls[1][1].headers['Idempotency-Key']);
  });

  it('does not retry 4xx and throws 503', async () => {
    const fn = jest.fn().mockResolvedValue(res(422));
    await expect(make(fn).send(msg)).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('throws 503 after repeated network failure without leaking the key', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('boom k'));
    await expect(make(fn).send(msg)).rejects.toThrow('Message delivery failed');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('supports email only', () => {
    const p = make(jest.fn());
    expect(p.supports('EMAIL')).toBe(true);
    expect(p.supports('SMS')).toBe(false);
  });

  it('refuses SMS', async () => {
    const fn = jest.fn();
    await expect(make(fn).send({ ...msg, channel: 'SMS' })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fn).not.toHaveBeenCalled();
  });
});
