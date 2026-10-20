/**
 * Cart of a visitor who is not signed in. It lives only in this browser; when a
 * guest or normal session starts it is moved into the server cart (the server
 * re-checks price, stock and availability — nothing here is trusted).
 */
export interface LocalCartItem {
  /** Client-side id; becomes the server id after the merge. */
  id: string;
  businessId: string;
  businessName: string;
  productId: string;
  variantId?: string;
  name: string;
  image: string;
  /** Display price only; the server uses its own price. */
  price: number;
  quantity: number;
  variantLabel?: string;
}

export const LOCAL_CART_KEY = "ls_anon_cart";
export const MAX_LINE_QUANTITY = 99;
const MAX_LINES = 50;

const keyOf = (i: Pick<LocalCartItem, "productId" | "variantId">) => `${i.productId}:${i.variantId ?? ""}`;

/** Adds to an existing line (same product + variant) or appends one; quantities are clamped. */
export function addToLocalCart(items: LocalCartItem[], add: Omit<LocalCartItem, "id">): LocalCartItem[] {
  const qty = Math.max(1, Math.min(MAX_LINE_QUANTITY, Math.floor(add.quantity) || 1));
  const existing = items.find((i) => keyOf(i) === keyOf(add));
  if (existing) {
    return items.map((i) => (i === existing ? { ...i, quantity: Math.min(MAX_LINE_QUANTITY, i.quantity + qty) } : i));
  }
  if (items.length >= MAX_LINES) return items;
  return [...items, { ...add, quantity: qty, id: `local-${keyOf(add)}` }];
}

export function setLocalQuantity(items: LocalCartItem[], id: string, quantity: number): LocalCartItem[] {
  if (quantity <= 0) return items.filter((i) => i.id !== id);
  return items.map((i) => (i.id === id ? { ...i, quantity: Math.min(MAX_LINE_QUANTITY, Math.floor(quantity)) } : i));
}

/** Accepts only well-formed lines from storage (it is user-editable data). */
export function parseLocalCart(raw: string | null): LocalCartItem[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const out: LocalCartItem[] = [];
    for (const row of data.slice(0, MAX_LINES)) {
      const r = row as Partial<LocalCartItem> | null;
      if (
        !r ||
        typeof r.id !== "string" ||
        typeof r.businessId !== "string" ||
        typeof r.productId !== "string" ||
        typeof r.name !== "string" ||
        typeof r.quantity !== "number" ||
        !Number.isFinite(r.quantity) ||
        r.quantity < 1
      ) {
        continue;
      }
      out.push({
        id: r.id,
        businessId: r.businessId,
        businessName: typeof r.businessName === "string" ? r.businessName : "",
        productId: r.productId,
        variantId: typeof r.variantId === "string" ? r.variantId : undefined,
        name: r.name,
        image: typeof r.image === "string" ? r.image : "",
        price: typeof r.price === "number" && Number.isFinite(r.price) ? r.price : 0,
        quantity: Math.min(MAX_LINE_QUANTITY, Math.floor(r.quantity)),
        variantLabel: typeof r.variantLabel === "string" ? r.variantLabel : undefined,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function readLocalCart(): LocalCartItem[] {
  try {
    return parseLocalCart(window.localStorage.getItem(LOCAL_CART_KEY));
  } catch {
    return [];
  }
}

export function writeLocalCart(items: LocalCartItem[]): void {
  try {
    if (items.length === 0) window.localStorage.removeItem(LOCAL_CART_KEY);
    else window.localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable: the cart then lives for this page view only */
  }
}
