import { test } from "node:test";
import assert from "node:assert/strict";
import { addToLocalCart, parseLocalCart, setLocalQuantity, MAX_LINE_QUANTITY, type LocalCartItem } from "./localCart.ts";

const base = { businessId: "b1", businessName: "Shop", productId: "p1", name: "Mok", image: "", price: 5, quantity: 1 };

test("adds a new line and merges the same product + variant", () => {
  let cart: LocalCartItem[] = [];
  cart = addToLocalCart(cart, base);
  cart = addToLocalCart(cart, { ...base, quantity: 2 });
  assert.equal(cart.length, 1);
  assert.equal(cart[0].quantity, 3);
  cart = addToLocalCart(cart, { ...base, variantId: "v1" });
  assert.equal(cart.length, 2);
});

test("clamps quantities to a sane range", () => {
  let cart = addToLocalCart([], { ...base, quantity: 5000 });
  assert.equal(cart[0].quantity, MAX_LINE_QUANTITY);
  cart = addToLocalCart(cart, { ...base, quantity: 10 });
  assert.equal(cart[0].quantity, MAX_LINE_QUANTITY);
  assert.equal(addToLocalCart([], { ...base, quantity: -3 })[0].quantity, 1);
  assert.equal(addToLocalCart([], { ...base, quantity: Number.NaN })[0].quantity, 1);
});

test("setLocalQuantity updates and removes", () => {
  const cart = addToLocalCart([], base);
  const id = cart[0].id;
  assert.equal(setLocalQuantity(cart, id, 4)[0].quantity, 4);
  assert.equal(setLocalQuantity(cart, id, 0).length, 0);
});

test("parseLocalCart ignores malformed or tampered storage", () => {
  assert.deepEqual(parseLocalCart(null), []);
  assert.deepEqual(parseLocalCart("not json"), []);
  assert.deepEqual(parseLocalCart("{}"), []);
  const good = { id: "a", businessId: "b", productId: "p", name: "n", quantity: 2 };
  const parsed = parseLocalCart(JSON.stringify([good, { id: 1 }, null, { ...good, quantity: 0 }, { ...good, id: "c", quantity: 9999 }]));
  assert.equal(parsed.length, 2);
  assert.equal(parsed[1].quantity, MAX_LINE_QUANTITY);
  assert.equal(parsed[0].price, 0);
});
