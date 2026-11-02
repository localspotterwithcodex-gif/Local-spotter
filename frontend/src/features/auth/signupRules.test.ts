import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PASSWORD_RULES, emailLooksValid, fullMobile, mobileLooksValid, passwordOk } from "./signupRules.ts";

const failing = (p: string) => PASSWORD_RULES.filter((r) => !r.test(p)).map((r) => r.key);

describe("password rules", () => {
  it("names exactly the missing requirement", () => {
    assert.deepEqual(failing("sterk-wachtw00rd"), ["upper"]);
    assert.deepEqual(failing("STERK-WACHTW00RD"), ["lower"]);
    assert.deepEqual(failing("Sterk-Wachtwoord"), ["number"]);
    assert.deepEqual(failing("SterkWachtw00rd"), ["special"]);
    assert.deepEqual(failing("Aa1-aaa"), ["length"]);
  });

  it("accepts a password meeting all of them", () => {
    assert.equal(passwordOk("Sterk-Wachtw00rd"), true);
    assert.equal(passwordOk(""), false);
  });
});

describe("mobile number", () => {
  it("joins the dial code and drops the national 0", () => {
    assert.equal(fullMobile("+31", "06 1234 5678"), "+31612345678");
    assert.equal(fullMobile("+31", "612345678"), "+31612345678");
    assert.equal(fullMobile("+91", "63741 74789"), "+916374174789");
  });

  it("keeps a number typed with its own country code", () => {
    assert.equal(fullMobile("+31", "+32 470 12 34 56"), "+32470123456");
    assert.equal(fullMobile("+31", "0049 1512 3456789"), "+4915123456789");
  });

  it("flags numbers that are too short", () => {
    assert.equal(mobileLooksValid(fullMobile("+31", "0612")), false);
    assert.equal(mobileLooksValid(fullMobile("+31", "0612345678")), true);
  });
});

describe("email", () => {
  it("needs a domain with a real-looking extension", () => {
    assert.equal(emailLooksValid("a@gmail.com"), true);
    assert.equal(emailLooksValid("test@gmial"), false);
    assert.equal(emailLooksValid("a@b.c"), false);
  });
});
