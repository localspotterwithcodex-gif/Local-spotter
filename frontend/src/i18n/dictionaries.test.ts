import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { dictionaries, dictionaryModules } from "./dictionaries.ts";
import { placeholdersOf, interpolate } from "./define.ts";

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

  it("no key is defined in two modules (a later module would silently win)", () => {
    const seen = new Map<string, string>();
    const dupes: string[] = [];
    for (const [moduleName, mod] of Object.entries(dictionaryModules)) {
      for (const key of Object.keys(mod.en)) {
        const prev = seen.get(key);
        if (prev) dupes.push(`${key} (${prev} and ${moduleName})`);
        else seen.set(key, moduleName);
      }
    }
    assert.deepEqual(dupes, []);
  });

  it("English and Dutch use the same {placeholders}", () => {
    const bad: string[] = [];
    for (const key of Object.keys(dictionaries.en) as (keyof typeof dictionaries.en)[]) {
      const a = placeholdersOf(dictionaries.en[key]).join(",");
      const b = placeholdersOf((dictionaries.nl as Record<string, string>)[key]).join(",");
      if (a !== b) bad.push(`${key}: en{${a}} nl{${b}}`);
    }
    assert.deepEqual(bad, []);
  });

  it("interpolates placeholders and leaves unknown ones visible", () => {
    assert.equal(interpolate("Page {page} of {total}", { page: 2, total: 5 }), "Page 2 of 5");
    assert.equal(interpolate("Hi {name}", {}), "Hi {name}");
  });
});
