import { Inject, Injectable, Logger } from '@nestjs/common';
import { Locale } from './locale';
import { TRANSLATION_PROVIDER, TranslationProvider } from './translation.provider';

export type TranslatableFields = Record<string, string | null | undefined>;

export interface TranslationBundle {
  sourceLocale: Locale | null;
  /** { en: {field: text}, nl: {field: text} } or null when no translation could be produced. */
  translations: Record<Locale, Record<string, string>> | null;
}

const MAX_TOTAL_CHARS = 5000;
const EMPTY: TranslationBundle = { sourceLocale: null, translations: null };

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);

  private lastFailureAt = 0;
  private lastError: string | null = null;
  private lastSuccessAt: number | null = null;
  private static readonly FAILURE_COOLDOWN_MS = 5 * 60 * 1000;
  private static readonly BACKFILL_PER_REQUEST = 4;

  constructor(@Inject(TRANSLATION_PROVIDER) private readonly provider: TranslationProvider) {}

  /** Operational status for admins (no secrets, no user text). */
  status() {
    return {
      configured: this.provider.isConfigured(),
      lastSuccessAt: this.lastSuccessAt ? new Date(this.lastSuccessAt).toISOString() : null,
      lastFailureAt: this.lastFailureAt ? new Date(this.lastFailureAt).toISOString() : null,
      lastError: this.lastError,
    };
  }

  /**
   * Fills in missing translations for rows that were saved before translation worked
   * (provider not configured, outage, quota). Bounded per call, skipped during a short
   * cool-down after a failure, never throws. Mutates the rows so the current response
   * already carries the translations.
   */
  async backfill<T extends { translations?: unknown; sourceLocale?: string | null }>(
    rows: T[],
    fields: string[],
    persist: (row: T, bundle: TranslationBundle) => Promise<unknown>,
  ): Promise<void> {
    if (!this.provider.isConfigured() || Date.now() - this.lastFailureAt < TranslationService.FAILURE_COOLDOWN_MS) return;
    const todo = rows
      .filter((r) => !r.translations && fields.some((f) => typeof (r as any)[f] === 'string' && (r as any)[f].trim()))
      .slice(0, TranslationService.BACKFILL_PER_REQUEST);
    for (const row of todo) {
      const bundle = await this.translateFields(Object.fromEntries(fields.map((f) => [f, (row as any)[f]])));
      if (!bundle.translations) {
        if (Date.now() - this.lastFailureAt < 1000) return; // provider just failed: stop for the cool-down
        continue;
      }
      try {
        await persist(row, bundle);
        row.translations = bundle.translations;
        row.sourceLocale = bundle.sourceLocale;
      } catch (err) {
        this.logger.warn(`Could not store translations (${err instanceof Error ? err.message : 'unknown error'})`);
      }
    }
  }

  isConfigured(): boolean {
    return this.provider.isConfigured();
  }

  /**
   * Produces an English and a Dutch version of the given text fields.
   * Never throws: when the provider is missing or fails the caller simply stores
   * the original text without translations (content is still shown as typed).
   */
  async translateFields(fields: TranslatableFields): Promise<TranslationBundle> {
    if (!this.provider.isConfigured()) return EMPTY;

    const keys = Object.keys(fields).filter((k) => typeof fields[k] === 'string' && (fields[k] as string).trim().length > 0);
    if (keys.length === 0) return EMPTY;
    const texts = keys.map((k) => (fields[k] as string).trim());
    if (texts.reduce((n, t) => n + t.length, 0) > MAX_TOTAL_CHARS) {
      this.logger.warn('Skipping translation: text exceeds the size limit');
      return EMPTY;
    }

    try {
      const toEn = await this.provider.translate(texts, 'en');
      const source = toEn.detectedSource;
      let en: string[];
      let nl: string[];
      let sourceLocale: Locale | null;
      if (source === 'nl') {
        sourceLocale = 'nl';
        nl = texts;
        en = toEn.texts;
      } else {
        sourceLocale = source === 'en' ? 'en' : null;
        en = source === 'en' ? texts : toEn.texts;
        nl = (await this.provider.translate(texts, 'nl')).texts;
      }
      const build = (arr: string[]) => Object.fromEntries(keys.map((k, i) => [k, arr[i]]));
      this.lastSuccessAt = Date.now();
      return { sourceLocale, translations: { en: build(en), nl: build(nl) } };
    } catch (err) {
      this.lastFailureAt = Date.now();
      this.lastError = err instanceof Error ? err.message : 'unknown error';
      this.logger.warn(`Translation failed, storing original text only (${err instanceof Error ? err.message : 'unknown error'})`);
      return EMPTY;
    }
  }
}
