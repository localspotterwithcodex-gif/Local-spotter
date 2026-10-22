import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { Locale, resolveLocale } from './locale';

/**
 * Replaces user-entered text fields with their translation for the requested
 * language. Any object that carries `translations` ({ en: {...}, nl: {...} })
 * has the matching string fields overridden; the `translations` and
 * `sourceLocale` properties stay in the payload so an owner's edit form can
 * still recover the text exactly as it was typed.
 */
/** Only plain data objects are walked; class instances (Prisma Decimal, Buffer, ...) keep their own toJSON. */
function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function localizeDeep(value: unknown, lang: Locale, depth = 0): unknown {
  if (depth > 8 || value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (!Array.isArray(value) && !isPlainObject(value)) return value;
  if (Array.isArray(value)) return value.map((v) => localizeDeep(v, lang, depth + 1));

  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = localizeDeep(v, lang, depth + 1);

  const tr = obj.translations as Record<string, Record<string, unknown>> | null | undefined;
  const forLang = tr && typeof tr === 'object' ? tr[lang] : undefined;
  if (forLang && typeof forLang === 'object') {
    for (const [field, text] of Object.entries(forLang)) {
      if (typeof text === 'string' && text.length > 0 && typeof obj[field] === 'string') out[field] = text;
    }
  }
  return out;
}

@Injectable()
export class LocalizeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    const lang = resolveLocale(req);
    if (!lang) return next.handle();
    return next.handle().pipe(map((body) => localizeDeep(body, lang)));
  }
}
