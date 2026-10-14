/**
 * In-house i18n (no external dependency). Every user-visible string lives in
 * one of the typed modules under ./dict. `defineDict` forces each module to
 * have identical keys in English and Dutch; dictionaries.test.ts additionally
 * checks for duplicate keys across modules and matching {placeholders}.
 */
import { core } from "./dict/core.ts";
import { common } from "./dict/common.ts";
import { auth } from "./dict/auth.ts";
import { publicSite } from "./dict/public.ts";
import { account } from "./dict/account.ts";
import { owner } from "./dict/owner.ts";
import { admin } from "./dict/admin.ts";
import { manage } from "./dict/manage.ts";

export const dictionaryModules = { core, common, auth, publicSite, account, owner, admin, manage } as const;

export const dictionaries = {
  en: { ...core.en, ...common.en, ...auth.en, ...publicSite.en, ...account.en, ...owner.en, ...admin.en, ...manage.en },
  nl: { ...core.nl, ...common.nl, ...auth.nl, ...publicSite.nl, ...account.nl, ...owner.nl, ...admin.nl, ...manage.nl },
} as const;

export type Locale = keyof typeof dictionaries;
export type TranslationKey = keyof typeof dictionaries.en;
export const LOCALES: readonly Locale[] = ["en", "nl"];
