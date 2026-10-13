"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { api, type ServerCart } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useAuth } from "@/features/auth/AuthContext";

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

export interface AddCartItemInput {
  businessId: string;
  productId: string;
  variantId?: string;
  quantity: number;
}

interface CartContextType {
  items: CartLine[];
  itemCount: number; // total quantity across lines — drives the header badge
  business: { id: string; name: string } | null;
  subtotal: number;
  deliveryFee: number;
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
  error?: string;
}

/**
 * Cart backed by the server cart (GET/POST/PATCH/DELETE /cart…). Only signed-in
 * CONSUMER users have a cart; for everyone else the cart is empty and no request is made.
 */
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, isAuthenticated } = useAuth();
  const userId = isAuthenticated && role === "CONSUMER" && user ? user.id : null;

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
        if (!cancelled) setSettled({ userId, error: getErrorMessage(err, "Winkelwagen kon niet worden geladen.") });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [userId, nonce]);

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
          setSettled({ userId, error: getErrorMessage(err, "Winkelwagen kon niet worden geladen.") });
        }
        setPendingCount((n) => n - 1);
      }
    },
    [userId]
  );

  const addItem = useCallback((input: AddCartItemInput) => mutate(() => api.addToCart(input)), [mutate]);
  const removeItem = useCallback((id: string) => mutate(() => api.removeCartItem(id)), [mutate]);
  const updateQuantity = useCallback(
    (id: string, quantity: number) =>
      mutate(() => (quantity <= 0 ? api.removeCartItem(id) : api.updateCartItem(id, quantity))),
    [mutate]
  );
  const clear = useCallback(() => mutate(() => api.clearCart()), [mutate]);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const items = useMemo<CartLine[]>(
    () =>
      (cart?.items ?? []).map((i) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        name: i.productName,
        image: i.imageUrl ?? "",
        businessName: cart?.business?.name ?? "",
        price: i.unitPrice,
        quantity: i.quantity,
        variantLabel: i.variantLabel,
      })),
    [cart]
  );

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const value: CartContextType = {
    items,
    itemCount,
    business: cart?.business ?? null,
    subtotal: cart?.subtotal ?? 0,
    deliveryFee: cart?.deliveryFee ?? 0,
    isLoading: userId !== null && current === null,
    isUpdating: pendingCount > 0,
    error: current?.error,
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
