import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requiredRoleForPath, routeForRole, safeRedirect } from "./redirect.ts";

describe("safeRedirect", () => {
  it("allows same-origin relative paths", () => {
    assert.equal(safeRedirect("/owner/orders?x=1", "/"), "/owner/orders?x=1");
  });
  it("rejects absolute, protocol-relative and scheme URLs", () => {
    for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)", "evil.com", "/ok\nSet-Cookie:x"]) {
      assert.equal(safeRedirect(bad, "/fallback"), "/fallback", bad);
    }
  });
  it("falls back when empty", () => {
    assert.equal(safeRedirect(null, "/x"), "/x");
    assert.equal(safeRedirect("", "/x"), "/x");
  });
});

describe("routeForRole / requiredRoleForPath", () => {
  it("maps roles to landing pages", () => {
    assert.equal(routeForRole("SUPER_ADMIN"), "/admin");
    assert.equal(routeForRole("BUSINESS_OWNER"), "/owner");
    assert.equal(routeForRole("CONSUMER"), "/products");
  });
  it("maps protected prefixes to roles", () => {
    assert.equal(requiredRoleForPath("/admin/orders"), "SUPER_ADMIN");
    assert.equal(requiredRoleForPath("/owner"), "BUSINESS_OWNER");
    assert.equal(requiredRoleForPath("/account/orders"), "CONSUMER");
    assert.equal(requiredRoleForPath("/administrator"), undefined);
    assert.equal(requiredRoleForPath("/checkout"), undefined);
  });
});
