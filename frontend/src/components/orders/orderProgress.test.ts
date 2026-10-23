import { test } from "node:test";
import assert from "node:assert/strict";
import { currentStepIndex, routeProgress, trackerSteps } from "./orderProgress.ts";

test("delivery orders end with out-for-delivery then delivered; pickup orders end with ready then collected", () => {
  assert.deepEqual(trackerSteps("LOCAL_DELIVERY").map((s) => s.status), ["PENDING", "CONFIRMED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"]);
  assert.deepEqual(trackerSteps("PICKUP").map((s) => s.status), ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERED"]);
  assert.equal(trackerSteps("PICKUP")[3].pickupLabel, true);
});

test("current step follows the status and is -1 for cancelled or rejected orders", () => {
  assert.equal(currentStepIndex("PENDING", "SHIPPING"), 0);
  assert.equal(currentStepIndex("OUT_FOR_DELIVERY", "SHIPPING"), 3);
  assert.equal(currentStepIndex("DELIVERED", "SHIPPING"), 4);
  assert.equal(currentStepIndex("READY", "PICKUP"), 3);
  assert.equal(currentStepIndex("READY", "SHIPPING"), 2);
  assert.equal(currentStepIndex("CANCELLED", "SHIPPING"), -1);
  assert.equal(currentStepIndex("REJECTED", "PICKUP"), -1);
});

test("route progress only moves forward and stays within 0..1", () => {
  const order = ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"] as const;
  const values = order.map((s) => routeProgress(s));
  for (let i = 1; i < values.length; i++) assert.ok(values[i] > values[i - 1]);
  assert.equal(values[0], 0);
  assert.equal(values[values.length - 1], 1);
  assert.equal(routeProgress("CANCELLED"), 0);
});
