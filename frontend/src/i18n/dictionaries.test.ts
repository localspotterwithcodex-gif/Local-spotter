import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dictionaries } from "./dictionaries.ts";

describe("i18n dictionaries", () => {
  const en = Object.keys(dictionaries.en).sort();
  const nl = Object.keys(dictionaries.nl).sort();

  it("every English key has a Dutch translation", () => {
    assert.deepEqual(en.filter((k) => !nl.includes(k)), []);
  });

  it("every Dutch key exists in English", () => {
    assert.deepEqual(nl.filter((k) => !en.includes(k)), []);
  });

  it("no translation is empty", () => {
    for (const locale of Object.keys(dictionaries) as (keyof typeof dictionaries)[]) {
      for (const [key, value] of Object.entries(dictionaries[locale])) {
        assert.ok(String(value).trim().length > 0, `${locale}:${key} is empty`);
      }
    }
  });
});
