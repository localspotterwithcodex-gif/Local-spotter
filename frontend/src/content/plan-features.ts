import type { PlanSlug } from "@/types/subscription";
import type { TranslationKey } from "@/i18n/dictionaries";

/**
 * Marketing copy for each subscription plan. Prices, names and availability come
 * from the backend (GET /subscriptions/plans); only the feature bullet text is
 * presentation content and lives in the frontend.
 */
export const PLAN_FEATURES: Record<PlanSlug, string[]> = {
  webshop: [
    "Eigen winkelprofiel & logo",
    "Onbeperkt producten toevoegen (max 3 foto's p/p)",
    "Voorraadbeheer & varianten",
    "Directe verkoop & bestelafhandeling",
    "Basis statistieken",
  ],
  shoproutes: [
    "Alles uit Webshop plan",
    "Exacte GPS & winkelkaart weergave",
    "Deelname aan lokale Shoproutes",
    "Winkelroute navigatie voor bezoekers",
    "Zichtbaarheid op stadskaarten",
  ],
  workshop: [
    "Alles uit Webshop & Shoproutes",
    "Workshops organiseren & ticketverkoop",
    "Volgers opbouwen & meldingen sturen",
    "Klantbeoordelingen & foto-reviews",
    "Reacties & community interactie",
  ],
};

/**
 * Dictionary keys for the same bullets, so UI can show them in the active
 * language (PLAN_FEATURES above is kept for the API mapper, which has no locale).
 */
export const PLAN_FEATURE_KEYS: Record<PlanSlug, TranslationKey[]> = {
  webshop: ["plans.webshop.f1", "plans.webshop.f2", "plans.webshop.f3", "plans.webshop.f4", "plans.webshop.f5"],
  shoproutes: ["plans.shoproutes.f1", "plans.shoproutes.f2", "plans.shoproutes.f3", "plans.shoproutes.f4", "plans.shoproutes.f5"],
  workshop: ["plans.workshop.f1", "plans.workshop.f2", "plans.workshop.f3", "plans.workshop.f4", "plans.workshop.f5"],
};

/** Plan description keys (the API stores one Dutch description per plan). */
export const PLAN_DESCRIPTION_KEYS: Record<PlanSlug, TranslationKey> = {
  webshop: "plans.webshop.desc",
  shoproutes: "plans.shoproutes.desc",
  workshop: "plans.workshop.desc",
};
