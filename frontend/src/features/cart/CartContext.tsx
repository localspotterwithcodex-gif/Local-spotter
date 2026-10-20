"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { api, type ServerCart, type FulfilmentOptions } from "@/lib/api";
import { describeError } from "@/lib/errors";
import { useLocale } from "@/i18n/LocaleContext";
import { useAuth } from "@/features/auth/AuthContext";
import {
  addToLocalCart,
  readLocalCart,
  setLocalQuantity,
  writeLocalCart,
  type LocalCartItem,
} from "@/lib/cart/localCart";

export interface CartLine {
  /** Server cart-item id (used for update / remove). */
  id: string;
  productId: string;
  variantId?: string;
  name: string;
  image: string;
  businessName: string;
  price: number;
  quantity: number;
  /** e.g. "M / Zwart" when the line is a product variant. */
  variantLabel?: string;
}

export interface CartStoreGroup {
  business: { id: string; name: string; city?: string };
  items: CartLine[];
  subtotal: number;
  fulfilmentOptions: FulfilmentOptions;
}

export interface AddCartItemInput {
  businessId: string;
  productId: string;
  variantId?: string;
  quantity: number;
  /** Display data, only used for a visitor who is not signed in (the server re-reads everything). */
  snapshot?: { name: string; image: string; price: number; businessName: string; variantLabel?: string };
}

interface CartContextType {
  items: CartLine[];
  itemCount: number; // total quantity across lines — drives the header badge
  /** First store of the cart. */
  business: { id: string; name: string } | null;
  /** The cart split per store (one checkout, one payment, per-store fulfilment). */
  groups: CartStoreGroup[];
  subtotal: number;
  deliveryFee: number;
  /** true while the visitor is not signed in: the cart then lives in this browser only. */
  isAnonymous: boolean;
  /** Names of items that could not be moved into the account cart after signing in. */
  mergeFailed: string[];
  /** true until the first cart response (only while a consumer is signed in) */
  isLoading: boolean;
  /** true while a mutation request is in flight */
  isUpdating: boolean;
  /** message of the last failed cart load, if any */
  error: string | undefined;
  reload: () => void;
  /** Mutations reject with an ApiError whose message is safe to show to the user. */
  addItem: (input: AddCartItemInput) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clear: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

interface Settled {
  userId: string;
  cart?: ServerCart;
  /** raw failure, translated at render so it follows the language toggle */
  err?: unknown;
  failed?: boolean;
}

/**
 * Cart backed by the server cart (GET/POST/PATCH/DELETE /cart…). Only signed-in
 * CONSUMER users have a cart; for everyone else the cart is empty and no request is made.
 */
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useLocale();
  const { user, role, isAuthenticated, isLoading: authLoading } = useAuth();
  const userId = isAuthenticated && role === "CONSUMER" && user ? user.id : null;
  const anonymous = !authLoading && !isAuthenticated;

  // Cart of a visitor who is not signed in (browser only).
  const [local, setLocal] = useState<LocalCartItem[]>([]);
  const [localReady, setLocalReady] = useState(false);
  const [merging, setMerging] = useState(false);
  const [mergeFailed, setMergeFailed] = useState<string[]>([]);
  const mergeStarted = useRef(false);
  useEffect(() => {
    setLocal(readLocalCart());
    setLocalReady(true);
  }, []);
  const updateLocal = useCallback((fn: (items: LocalCartItem[]) => LocalCartItem[]) => {
    setLocal((prev) => {
      const next = fn(prev);
      writeLocalCart(next);
      return next;
    });
  }, []);

  const [settled, setSettled] = useState<Settled | null>(null);
  const [nonce, setNonce] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (userId === null) return;
    let cancelled = false;
    api.getCart().then(
      (cart) => {
        if (!cancelled) setSettled({ userId, cart });
      },
      (err: unknown) => {
        if (!cancelled) setSettled({ userId, err, failed: true });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [userId, nonce]);

  // Signing in (or starting a guest checkout) moves the browser cart into the account cart.
  useEffect(() => {
    if (userId === null || !localReady || mergeStarted.current) return;
    const pending = readLocalCart();
    if (pending.length === 0) return;
    mergeStarted.current = true;
    writeLocalCart([]);
    setLocal([]);
    setMerging(true);
    void (async () => {
      const failed: string[] = [];
      for (const item of pending) {
        try {
          await api.addToCart({ businessId: item.businessId, productId: item.productId, variantId: item.variantId, quantity: item.quantity });
        } catch {
          failed.push(item.name);
        }
      }
      setMergeFailed(failed);
      setMerging(false);
      mergeStarted.current = false;
      setNonce((n) => n + 1);
    })();
  }, [userId, localReady]);

  const current = userId !== null && settled && settled.userId === userId ? settled : null;
  const cart = current?.cart ?? null;

  /** Runs a mutation, then re-reads the cart so the UI always shows server truth. */
  const mutate = useCallback(
    async (action: () => Promise<unknown>) => {
      if (userId === null) throw new Error("Log in als consument om de winkelwagen te gebruiken.");
      setPendingCount((n) => n + 1);
      try {
        await action();
      } finally {
        try {
          const fresh = await api.getCart();
          setSettled({ userId, cart: fresh });
        } catch (err) {
          setSettled({ userId, err, failed: true });
        }
        setPendingCount((n) => n - 1);
      }
    },
    [userId]
  );

  const addItem = useCallback(
    async (input: AddCartItemInput) => {
      if (anonymous) {
        const snap = input.snapshot;
        if (!snap) throw new Error("Missing product details");
        updateLocal((items) =>
          addToLocalCart(items, {
            businessId: input.businessId,
            businessName: snap.businessName,
            productId: input.productId,
            variantId: input.variantId,
            name: snap.name,
            image: snap.image,
            price: snap.price,
            quantity: input.quantity,
            variantLabel: snap.variantLabel,
          })
        );
        return;
      }
      const { snapshot: _snapshot, ...serverInput } = input;
      void _snapshot;
      await mutate(() => api.addToCart(serverInput));
    },
    [anonymous, mutate, updateLocal]
  );
  const removeItem = useCallback(
    async (id: string) => {
      if (anonymous) return updateLocal((items) => items.filter((i) => i.id !== id));
      await mutate(() => api.removeCartItem(id));
    },
    [anonymous, mutate, updateLocal]
  );
  const updateQuantity = useCallback(
    async (id: string, quantity: number) => {
      if (anonymous) return updateLocal((items) => setLocalQuantity(items, id, quantity));
      await mutate(() => (quantity <= 0 ? api.removeCartItem(id) : api.updateCartItem(id, quantity)));
    },
    [anonymous, mutate, updateLocal]
  );
  const clear = useCallback(async () => {
    if (anonymous) return updateLocal(() => []);
    await mutate(() => api.clearCart());
  }, [anonymous, mutate, updateLocal]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const groups = useMemo<CartStoreGroup[]>(
    () =>
      (cart?.groups ?? []).map((g) => ({
        business: g.business,
        subtotal: g.subtotal,
        fulfilmentOptions: g.fulfilmentOptions,
        items: g.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          variantId: i.variantId,
          name: i.productName,
          image: i.imageUrl ?? "",
          businessName: g.business.name,
          price: i.unitPrice,
          quantity: i.quantity,
          variantLabel: i.variantLabel,
        })),
      })),
    [cart]
  );

  const items = useMemo<CartLine[]>(
    () =>
      anonymous
        ? local.map((i) => ({
            id: i.id,
            productId: i.productId,
            variantId: i.variantId,
            name: i.name,
            image: i.image,
            businessName: i.businessName,
            price: i.price,
            quantity: i.quantity,
            variantLabel: i.variantLabel,
          }))
        : groups.flatMap((g) => g.items),
    [anonymous, local, groups]
  );

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const value: CartContextType = {
    items,
    itemCount,
    business: anonymous ? (local[0] ? { id: local[0].businessId, name: local[0].businessName } : null) : (cart?.business ?? null),
    groups,
    subtotal: anonymous ? local.reduce((sum, i) => sum + i.price * i.quantity, 0) : (cart?.subtotal ?? 0),
    deliveryFee: cart?.deliveryFee ?? 0,
    isAnonymous: anonymous,
    mergeFailed,
    isLoading: authLoading || (anonymous && !localReady) || merging || (userId !== null && current === null),
    isUpdating: pendingCount > 0,
    error: current?.failed ? describeError(current.err, t) : undefined,
    reload,
    addItem,
    removeItem,
    updateQuantity,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};
