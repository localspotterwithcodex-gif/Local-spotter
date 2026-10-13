import type { PlanSlug } from "@/types/subscription";

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
