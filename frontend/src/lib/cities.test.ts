import { test } from "node:test";
import assert from "node:assert/strict";
import { uniqueCities } from "./cities.ts";

test("uniqueCities de-duplicates case-insensitively, trims, drops blanks and sorts", () => {
  assert.deepEqual(uniqueCities(["Delft", " delft ", "Horn", "", null, undefined, "Aalsmeer"]), [
    "Aalsmeer",
    "Delft",
    "Horn",
  ]);
});

test("uniqueCities returns an empty list when there is no data", () => {
  assert.deepEqual(uniqueCities([]), []);
});
