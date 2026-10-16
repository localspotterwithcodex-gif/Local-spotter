import type { PlanSlug } from "@/types/subscription";
import type { TranslationKey } from "@/i18n/dictionaries";

/**
 * Marketing copy for each subscription plan. Prices, names and availability come
 * from the backend (GET /subscriptions/plans); only the feature bullet text is
 * presentation content and lives in the frontend.
 */
export const PLAN_FEATURES: Record<PlanSlug, string[]> = {
  webshop: [
    "Bedrijfsprofiel met winkelafbeeldingen",
    "Productaanbod met details en tot 3 foto's per product",
    "Voorraadbeheer en varianten (maten, kleuren)",
    "Producten verkopen en bestellingen afhandelen",
    "Winkeladres opgeslagen (geen kaartweergave)",
  ],
  shoproutes: [
    "Alles uit het Webshop-pakket",
    "Kaartweergave met GPS-coördinaten",
    "Routebeschrijving naar je winkel",
    "Eigen shoproutes maken",
    "Deelnemen aan shoproutes",
  ],
  workshop: [
    "Alles uit Webshop & Shoproutes",
    "Workshops organiseren en boekingen ontvangen",
    "Volgers",
    "Reviews, beoordelingen, review-foto's en productreviews",
    "Reacties en community-interactie",
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
