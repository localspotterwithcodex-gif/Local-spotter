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

  constructor(@Inject(TRANSLATION_PROVIDER) private readonly provider: TranslationProvider) {}

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
      return { sourceLocale, translations: { en: build(en), nl: build(nl) } };
    } catch (err) {
      this.logger.warn(`Translation failed, storing original text only (${err instanceof Error ? err.message : 'unknown error'})`);
      return EMPTY;
    }
  }
}
