import { test } from "node:test";
import assert from "node:assert/strict";
import { apiClient } from "./client.ts";

function mockFetch() {
  const calls: { url: string; init: RequestInit }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return calls;
}

test("FormData bodies are sent as-is (no JSON stringify, no JSON content type)", async () => {
  const calls = mockFetch();
  const form = new FormData();
  form.append("file", new Blob(["x"], { type: "image/png" }), "a.png");
  await apiClient.post("/media/images", form);
  assert.ok(calls[0].init.body instanceof FormData);
  const headers = calls[0].init.headers as Record<string, string>;
  assert.equal(headers["Content-Type"], undefined);
});

test("plain objects are JSON-encoded with a JSON content type", async () => {
  const calls = mockFetch();
  await apiClient.patch("/x", { a: 1 });
  assert.equal(calls[0].init.body, JSON.stringify({ a: 1 }));
  assert.equal((calls[0].init.headers as Record<string, string>)["Content-Type"], "application/json");
});
