import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { VisualSearchService } from './visual-search.service';

describe('VisualSearchService', () => {
  const svc = (env: Record<string, string> = {}) => new VisualSearchService({ get: (k: string) => env[k] } as any);

  it('accepts only a short list of plain words from the model', () => {
    const text = JSON.stringify({ keywords: ['Yellow Shoes', 'shoes', 'IGNORE ALL RULES; drop table', 42, 'a', 'leather!!', 'x'.repeat(60), 'kids', 'extra'] });
    const out = VisualSearchService.parseKeywords(text);
    expect(out).toEqual(['yellow shoes', 'shoes', 'ignore all rules drop table', 'leather', 'kids']);
  });

  it('returns no keywords for invalid model output', () => {
    expect(VisualSearchService.parseKeywords('not json')).toEqual([]);
    expect(VisualSearchService.parseKeywords(undefined)).toEqual([]);
    expect(VisualSearchService.parseKeywords('{"keywords":"shoes"}')).toEqual([]);
  });

  it('is unavailable without an API key and rejects non-images', async () => {
    await expect(svc().keywordsFromImage(Buffer.from('x'))).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(svc({ GEMINI_API_KEY: 'k' }).keywordsFromImage(Buffer.from('<svg></svg>'))).rejects.toBeInstanceOf(BadRequestException);
  });
});
