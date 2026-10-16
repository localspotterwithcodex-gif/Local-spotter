import { test } from "node:test";
import assert from "node:assert/strict";
import { planAllows } from "./plan-access.ts";

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();
const sub = (planSlug: "webshop" | "shoproutes" | "workshop", status = "ACTIVE" as const, currentPeriodEnd = future) => ({
  planSlug,
  status,
  currentPeriodEnd,
});

test("webshop plan only allows products", () => {
  assert.equal(planAllows(sub("webshop"), "products"), true);
  assert.equal(planAllows(sub("webshop"), "shoproutes"), false);
  assert.equal(planAllows(sub("webshop"), "workshops"), false);
});

test("shoproutes plan allows products and routes, not workshops", () => {
  assert.equal(planAllows(sub("shoproutes"), "shoproutes"), true);
  assert.equal(planAllows(sub("shoproutes"), "workshops"), false);
});

test("workshop plan allows everything", () => {
  for (const f of ["products", "shoproutes", "workshops"] as const) assert.equal(planAllows(sub("workshop"), f), true);
});

test("inactive, expired or missing subscription allows nothing", () => {
  assert.equal(planAllows(sub("workshop", "INACTIVE" as never), "products"), false);
  assert.equal(planAllows(sub("workshop", "ACTIVE", past), "products"), false);
  assert.equal(planAllows(null, "products"), false);
});
