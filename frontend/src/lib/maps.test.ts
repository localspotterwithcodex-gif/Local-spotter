import { test } from "node:test";
import assert from "node:assert/strict";
import { appleStopUrl, formatDuration, googleRouteUrl, googleStopUrl } from "./maps.ts";

const A = { lat: 52.1, lng: 4.3 };
const B = { lat: 52.2, lng: 4.4 };
const C = { lat: 52.3, lng: 4.5 };

test("googleRouteUrl builds origin, waypoints and destination in order", () => {
  const r = googleRouteUrl([A, B, C])!;
  const u = new URL(r.url);
  assert.equal(u.searchParams.get("origin"), "52.1,4.3");
  assert.equal(u.searchParams.get("waypoints"), "52.2,4.4");
  assert.equal(u.searchParams.get("destination"), "52.3,4.5");
  assert.equal(u.searchParams.get("travelmode"), "walking");
  assert.equal(r.truncated, false);
});

test("googleRouteUrl uses the visitor position as origin when given", () => {
  const u = new URL(googleRouteUrl([A, B], { lat: 51, lng: 5 })!.url);
  assert.equal(u.searchParams.get("origin"), "51,5");
  assert.equal(u.searchParams.get("waypoints"), "52.1,4.3");
  assert.equal(u.searchParams.get("destination"), "52.2,4.4");
});

test("googleRouteUrl skips stops without coordinates and returns null when none are left", () => {
  assert.equal(googleRouteUrl([{ lat: 0, lng: 0 }]), null);
  const u = new URL(googleRouteUrl([{ lat: 0, lng: 0 }, A])!.url);
  assert.equal(u.searchParams.get("destination"), "52.1,4.3");
  assert.equal(u.searchParams.get("waypoints"), null);
});

test("googleRouteUrl truncates very long routes and says so", () => {
  const many = Array.from({ length: 15 }, (_, i) => ({ lat: 52 + i / 100, lng: 4 }));
  const r = googleRouteUrl(many)!;
  assert.equal(r.truncated, true);
  assert.equal(new URL(r.url).searchParams.get("waypoints")!.split("|").length, 9);
});

test("single-stop links and duration formatting", () => {
  assert.match(googleStopUrl(A)!, /destination=52.1,4.3/);
  assert.match(appleStopUrl(A)!, /daddr=52.1,4.3/);
  assert.equal(googleStopUrl({ lat: 0, lng: 0 }), null);
  assert.equal(formatDuration(45), "45 min");
  assert.equal(formatDuration(75), "1 h 15 min");
  assert.equal(formatDuration(120), "2 h");
});
