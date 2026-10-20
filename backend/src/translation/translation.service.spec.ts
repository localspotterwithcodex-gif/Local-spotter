import { TranslationService } from './translation.service';
import { TranslationProvider } from './translation.provider';
import { localizeDeep } from './localize.interceptor';
import { resolveLocale } from './locale';

function provider(overrides: Partial<TranslationProvider> = {}): TranslationProvider {
  return { isConfigured: () => true, translate: jest.fn(), ...overrides } as TranslationProvider;
}

describe('TranslationService', () => {
  it('returns no translations when the provider is not configured', async () => {
    const svc = new TranslationService(provider({ isConfigured: () => false }));
    expect(await svc.translateFields({ name: 'Tas' })).toEqual({ sourceLocale: null, translations: null });
  });

  it('keeps Dutch input as the Dutch version and translates once to English', async () => {
    const translate = jest.fn().mockResolvedValue({ texts: ['Leather bag', 'Handmade'], detectedSource: 'nl' });
    const svc = new TranslationService(provider({ translate }));
    const out = await svc.translateFields({ name: 'Leren tas', description: 'Handgemaakt' });
    expect(translate).toHaveBeenCalledTimes(1);
    expect(out.sourceLocale).toBe('nl');
    expect(out.translations).toEqual({
      nl: { name: 'Leren tas', description: 'Handgemaakt' },
      en: { name: 'Leather bag', description: 'Handmade' },
    });
  });

  it('keeps English input and translates it to Dutch', async () => {
    const translate = jest
      .fn()
      .mockResolvedValueOnce({ texts: ['Leather bag'], detectedSource: 'en' })
      .mockResolvedValueOnce({ texts: ['Leren tas'], detectedSource: 'en' });
    const svc = new TranslationService(provider({ translate }));
    const out = await svc.translateFields({ name: 'Leather bag', description: '  ' });
    expect(out.sourceLocale).toBe('en');
    expect(out.translations?.nl).toEqual({ name: 'Leren tas' });
    expect(out.translations?.en).toEqual({ name: 'Leather bag' });
  });

  it('never throws when the provider fails', async () => {
    const svc = new TranslationService(provider({ translate: jest.fn().mockRejectedValue(new Error('boom')) }));
    expect(await svc.translateFields({ name: 'Tas' })).toEqual({ sourceLocale: null, translations: null });
  });

  it('skips oversized text', async () => {
    const translate = jest.fn();
    const svc = new TranslationService(provider({ translate }));
    expect((await svc.translateFields({ description: 'x'.repeat(6000) })).translations).toBeNull();
    expect(translate).not.toHaveBeenCalled();
  });
});

describe('localizeDeep', () => {
  const product = { id: '1', name: 'Leren tas', description: 'Mooi', translations: { en: { name: 'Leather bag' }, nl: { name: 'Leren tas' } }, sourceLocale: 'nl' };

  it('overrides translated string fields for the requested language', () => {
    const out = localizeDeep({ items: [product] }, 'en') as any;
    expect(out.items[0].name).toBe('Leather bag');
    expect(out.items[0].description).toBe('Mooi'); // no translation stored → original kept
    expect(out.items[0].translations).toBeDefined(); // kept for owner edit forms
  });

  it('leaves objects without translations, dates and primitives untouched', () => {
    const d = new Date();
    expect(localizeDeep({ name: 'x', at: d, n: 1 }, 'en')).toEqual({ name: 'x', at: d, n: 1 });
  });
});

describe('resolveLocale', () => {
  it('reads ?lang= first, then Accept-Language', () => {
    expect(resolveLocale({ query: { lang: 'en' }, headers: { 'accept-language': 'nl' } })).toBe('en');
    expect(resolveLocale({ headers: { 'accept-language': 'nl-NL,nl;q=0.9' } })).toBe('nl');
    expect(resolveLocale({ headers: { 'accept-language': 'de' } })).toBeUndefined();
    expect(resolveLocale({})).toBeUndefined();
  });
});

describe('TranslationService.backfill', () => {
  const okProvider = (): TranslationProvider => ({
    isConfigured: () => true,
    translate: jest.fn().mockImplementation(async (texts: string[], target: string) => ({
      texts: texts.map((t) => `${target}:${t}`),
      detectedSource: 'nl',
    })),
  });

  it('translates and stores rows that were saved without translations, leaving translated rows alone', async () => {
    const svc = new TranslationService(okProvider());
    const rows: any[] = [
      { id: 'a', name: 'Leren tas', translations: null },
      { id: 'b', name: 'Done', translations: { en: { name: 'Done' }, nl: { name: 'Klaar' } } },
    ];
    const persist = jest.fn().mockResolvedValue(undefined);
    await svc.backfill(rows, ['name'], persist);
    expect(persist).toHaveBeenCalledTimes(1);
    expect(rows[0].translations.en.name).toBe('en:Leren tas');
    expect(rows[0].sourceLocale).toBe('nl');
  });

  it('does nothing when the provider is not configured', async () => {
    const svc = new TranslationService({ isConfigured: () => false, translate: jest.fn() });
    const persist = jest.fn();
    await svc.backfill([{ id: 'a', name: 'x', translations: null }] as any[], ['name'], persist);
    expect(persist).not.toHaveBeenCalled();
  });

  it('backs off after a provider failure and reports the error in status()', async () => {
    const translate = jest.fn().mockRejectedValue(new Error('DeepL responded 456'));
    const svc = new TranslationService({ isConfigured: () => true, translate });
    const persist = jest.fn();
    const rows: any[] = [{ id: 'a', name: 'x', translations: null }, { id: 'b', name: 'y', translations: null }];
    await svc.backfill(rows, ['name'], persist);
    const calls = translate.mock.calls.length;
    await svc.backfill(rows, ['name'], persist); // within the cool-down: no new provider calls
    expect(translate.mock.calls.length).toBe(calls);
    expect(persist).not.toHaveBeenCalled();
    expect(svc.status()).toMatchObject({ configured: true, lastError: 'DeepL responded 456' });
  });
});
