import { test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "./api/client.ts";
import { validationDetail } from "./validation-detail.ts";

test("returns the backend validation messages for a 400", () => {
  const err = new ApiError("x", 400, { message: ["De starttijd moet in de toekomst liggen", "b"] });
  assert.equal(validationDetail(err), "De starttijd moet in de toekomst liggen · b");
});

test("accepts a single string message", () => {
  assert.equal(validationDetail(new ApiError("x", 400, { message: "Ongeldig" })), "Ongeldig");
});

test("ignores non-validation errors and unknown values", () => {
  assert.equal(validationDetail(new ApiError("x", 500, { message: "boom" })), "");
  assert.equal(validationDetail(new Error("x")), "");
});
