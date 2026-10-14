import { Logger } from '@nestjs/common';
import { Locale } from './locale';

export const TRANSLATION_PROVIDER = Symbol('TRANSLATION_PROVIDER');

export interface TranslationResult {
  texts: string[];
  /** Language the provider detected for the input (lower-case ISO code, e.g. 'nl'). */
  detectedSource: string | null;
}

export interface TranslationProvider {
  isConfigured(): boolean;
  translate(texts: string[], target: Locale): Promise<TranslationResult>;
}

export class UnconfiguredTranslationProvider implements TranslationProvider {
  isConfigured(): boolean {
    return false;
  }
  async translate(): Promise<TranslationResult> {
    throw new Error('Translation provider is not configured');
  }
}

const TARGET_CODE: Record<Locale, string> = { en: 'EN-GB', nl: 'NL' };

/**
 * DeepL API (Free or Pro). Keys ending in ":fx" use the free endpoint.
 * The API key is only ever sent in the Authorization header and never logged;
 * neither are the translated texts (they are user content).
 */
export class DeepLTranslationProvider implements TranslationProvider {
  private readonly logger = new Logger(DeepLTranslationProvider.name);
  private readonly baseUrl: string;

  constructor(private readonly opts: { apiKey: string; baseUrl?: string; timeoutMs?: number }) {
    this.baseUrl = opts.baseUrl ?? (opts.apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com');
  }

  isConfigured(): boolean {
    return true;
  }

  async translate(texts: string[], target: Locale): Promise<TranslationResult> {
    const res = await fetch(`${this.baseUrl}/v2/translate`, {
      method: 'POST',
      headers: { Authorization: `DeepL-Auth-Key ${this.opts.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texts, target_lang: TARGET_CODE[target], preserve_formatting: true }),
      signal: AbortSignal.timeout(this.opts.timeoutMs ?? 8000),
    });
    if (!res.ok) {
      this.logger.warn(`DeepL request failed with status ${res.status}`);
      throw new Error(`DeepL responded ${res.status}`);
    }
    const body = (await res.json()) as { translations?: { text: string; detected_source_language?: string }[] };
    const items = body.translations ?? [];
    if (items.length !== texts.length) throw new Error('DeepL returned an unexpected number of translations');
    return {
      texts: items.map((i) => i.text),
      detectedSource: items[0]?.detected_source_language?.toLowerCase().slice(0, 2) ?? null,
    };
  }
}
