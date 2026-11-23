/**
 * Supabase Storage over its REST API (no SDK). Calls and shapes follow supabase-js storage-js (checked 2026-11-23):
 * every request sends `apikey` and `Authorization: Bearer <key>`; paths are relative to {SUPABASE_URL}/storage/v1.
 * Only the backend holds the service-role key. Object paths are built by the backend (safe characters only).
 */
export interface SupabaseStorageOptions {
  url: string;
  serviceKey: string;
  timeoutMs?: number;
  fetchFn?: typeof fetch;
}

export interface BucketSpec {
  id: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
}

export class StorageRequestError extends Error {
  constructor(
    readonly status: number,
    readonly op: string,
  ) {
    super(`Storage ${op} failed (status ${status})`);
  }
}

const SAFE_PATH = /^[a-z0-9][a-z0-9/_.-]*$/i;

export class SupabaseStorageClient {
  private readonly base: string;
  private readonly fetchFn: typeof fetch;

  constructor(private readonly opts: SupabaseStorageOptions) {
    this.base = `${opts.url.replace(/\/+$/, '')}/storage/v1`;
    this.fetchFn = opts.fetchFn ?? fetch;
  }

  private async call(op: string, method: string, route: string, init: { body?: BodyInit; json?: unknown; headers?: Record<string, string> } = {}) {
    const headers: Record<string, string> = { apikey: this.opts.serviceKey, Authorization: `Bearer ${this.opts.serviceKey}`, ...init.headers };
    let body = init.body;
    if (init.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(init.json);
    }
    try {
      return await this.fetchFn(`${this.base}/${route}`, { method, headers, body, signal: AbortSignal.timeout(this.opts.timeoutMs ?? 15_000) });
    } catch {
      throw new StorageRequestError(0, op);
    }
  }

  private static key(bucket: string, path: string): string {
    if (!SAFE_PATH.test(bucket) || !SAFE_PATH.test(path) || path.includes('..')) throw new Error('Unsafe storage path');
    return `${bucket}/${path}`;
  }

  publicUrl(bucket: string, path: string): string {
    return `${this.base}/object/public/${SupabaseStorageClient.key(bucket, path)}`;
  }

  /** Signed URL the browser PUTs the file to (valid 2 hours, single object, no overwrite). */
  async signUpload(bucket: string, path: string): Promise<{ signedUrl: string; token: string }> {
    const res = await this.call('sign-upload', 'POST', `object/upload/sign/${SupabaseStorageClient.key(bucket, path)}`, { json: {} });
    if (!res.ok) throw new StorageRequestError(res.status, 'sign-upload');
    const data = (await res.json()) as { url?: string };
    const url = new URL(this.base + (data.url ?? ''));
    const token = url.searchParams.get('token');
    if (!token) throw new StorageRequestError(res.status, 'sign-upload');
    return { signedUrl: url.toString(), token };
  }

  /** Size and content type as stored, or null when the object does not exist. */
  async info(bucket: string, path: string): Promise<{ size: number; contentType: string | null } | null> {
    const res = await this.call('info', 'GET', `object/info/${SupabaseStorageClient.key(bucket, path)}`);
    if (res.status === 404 || res.status === 400) return null;
    if (!res.ok) throw new StorageRequestError(res.status, 'info');
    const data = (await res.json()) as { size?: number; content_type?: string };
    return typeof data.size === 'number' ? { size: data.size, contentType: data.content_type ?? null } : null;
  }

  /** `length` bytes from `start` (HTTP Range). Used to read magic bytes and the MP4 header, never whole files. */
  async readRange(bucket: string, path: string, start: number, length: number): Promise<Buffer> {
    const res = await this.call('read', 'GET', `object/${SupabaseStorageClient.key(bucket, path)}`, { headers: { Range: `bytes=${start}-${start + length - 1}` } });
    if (res.status === 206) return Buffer.from(await res.arrayBuffer());
    if (res.status === 200 && start === 0 && res.body) {
      // Range ignored: read only the first bytes and stop the download.
      const reader = res.body.getReader();
      const chunks: Buffer[] = [];
      let got = 0;
      while (got < length) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(Buffer.from(value));
        got += value.length;
      }
      await reader.cancel().catch(() => undefined);
      return Buffer.concat(chunks).subarray(0, length);
    }
    throw new StorageRequestError(res.status, 'read');
  }

  /** Server-side upload (small images only; large files go browser -> signed URL). */
  async upload(bucket: string, path: string, data: Buffer, contentType: string): Promise<void> {
    const res = await this.call('upload', 'POST', `object/${SupabaseStorageClient.key(bucket, path)}`, {
      body: data as unknown as BodyInit,
      headers: { 'Content-Type': contentType, 'x-upsert': 'false', 'cache-control': 'max-age=31536000' },
    });
    if (!res.ok) throw new StorageRequestError(res.status, 'upload');
  }

  /** Short-lived read URL for a private object (chat attachments). */
  async signDownload(bucket: string, path: string, expiresInSeconds: number): Promise<string> {
    const res = await this.call('sign-download', 'POST', `object/sign/${SupabaseStorageClient.key(bucket, path)}`, { json: { expiresIn: expiresInSeconds } });
    if (!res.ok) throw new StorageRequestError(res.status, 'sign-download');
    const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
    const rel = data.signedURL ?? data.signedUrl;
    if (!rel) throw new StorageRequestError(res.status, 'sign-download');
    return new URL(this.base + rel).toString();
  }

  async remove(bucket: string, paths: string[]): Promise<void> {
    if (!paths.length) return;
    paths.forEach((p) => SupabaseStorageClient.key(bucket, p));
    const res = await this.call('remove', 'DELETE', `object/${bucket}`, { json: { prefixes: paths } });
    if (!res.ok) throw new StorageRequestError(res.status, 'remove');
  }

  /** Object names directly under `prefix` (first 1000). */
  async list(bucket: string, prefix: string): Promise<string[]> {
    const res = await this.call('list', 'POST', `object/list/${bucket}`, { json: { prefix, limit: 1000, offset: 0, sortBy: { column: 'name', order: 'asc' } } });
    if (!res.ok) throw new StorageRequestError(res.status, 'list');
    return ((await res.json()) as { name: string }[]).map((o) => o.name);
  }

  /** Create the bucket, or bring an existing one in line with the spec (idempotent). */
  async ensureBucket(spec: BucketSpec): Promise<'created' | 'updated'> {
    const body = { id: spec.id, name: spec.id, public: spec.public, file_size_limit: spec.fileSizeLimit, allowed_mime_types: spec.allowedMimeTypes };
    const created = await this.call('create-bucket', 'POST', 'bucket', { json: body });
    if (created.ok) return 'created';
    const updated = await this.call('update-bucket', 'PUT', `bucket/${spec.id}`, { json: body });
    if (!updated.ok) throw new StorageRequestError(updated.status, 'update-bucket');
    return 'updated';
  }
}
