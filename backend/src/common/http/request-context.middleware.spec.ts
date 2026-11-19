import { requestContext } from './request-context.middleware';

function run(headers: Record<string, string>, originalUrl = '/api/v1/orders?token=secret') {
  const set: Record<string, string> = {};
  const listeners: Record<string, () => void> = {};
  const res = { statusCode: 200, setHeader: (k: string, v: string) => (set[k] = v), on: (e: string, fn: () => void) => (listeners[e] = fn) };
  const next = jest.fn();
  requestContext({ headers, originalUrl, path: originalUrl.split('?')[0], method: 'GET' } as never, res as never, next);
  return { set, next, finish: () => listeners.finish() };
}

describe('requestContext', () => {
  it('keeps a well-formed incoming request id and sets API security headers', () => {
    const { set, next } = run({ 'x-request-id': 'abc12345-req' });
    expect(set['X-Request-Id']).toBe('abc12345-req');
    expect(set['X-Content-Type-Options']).toBe('nosniff');
    expect(set['X-Frame-Options']).toBe('DENY');
    expect(set['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(next).toHaveBeenCalled();
  });

  it('replaces a malformed request id and never logs the query string', () => {
    const write = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { set, finish } = run({ 'x-request-id': 'bad id\n{injected}' });
    expect(set['X-Request-Id']).toMatch(/^[0-9a-f-]{36}$/);
    finish();
    const logged = String(write.mock.calls[0][0]);
    write.mockRestore();
    expect(JSON.parse(logged)).toMatchObject({ method: 'GET', path: '/api/v1/orders', status: 200 });
    expect(logged).not.toContain('secret');
  });
});
