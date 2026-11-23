import { test } from "node:test";
import assert from "node:assert/strict";
import { portalDecision, portalFromEnv } from "./portal.ts";

test("public deployment: /admin and everything under it is 404, the rest continues", () => {
  assert.equal(portalDecision("public", "/admin"), "not-found");
  assert.equal(portalDecision("public", "/admin/reports"), "not-found");
  assert.equal(portalDecision("public", "/administrator-tips"), "continue");
  assert.equal(portalDecision("public", "/products"), "continue");
  assert.equal(portalDecision("public", "/"), "continue");
});

test("admin deployment: / goes to /admin; only admin and sign-in pages exist", () => {
  assert.deepEqual(portalDecision("admin", "/"), { redirect: "/admin" });
  for (const p of ["/admin", "/admin/users", "/login", "/forgot-password", "/reset-password"]) assert.equal(portalDecision("admin", p), "continue");
  for (const p of ["/signup", "/products", "/owner", "/checkout", "/account/orders", "/loginx"]) assert.equal(portalDecision("admin", p), "not-found");
});

test("anything but NEXT_PUBLIC_PORTAL=admin is the public portal", () => {
  assert.equal(portalFromEnv("admin"), "admin");
  assert.equal(portalFromEnv(undefined), "public");
  assert.equal(portalFromEnv("ADMIN"), "public");
});
