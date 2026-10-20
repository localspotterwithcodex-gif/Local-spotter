"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { api } from "@/lib/api";

type Target = "product" | "business";

interface FavoritesContextType {
  /** false for guests and non-consumer roles: hearts then ask the visitor to sign in. */
  canFavorite: boolean;
  isFavorite: (target: Target, id: string) => boolean;
  /** Optimistic toggle; resolves to the new state, or null when it failed (state is rolled back). */
  toggle: (target: Target, id: string) => Promise<boolean | null>;
}

interface FavoriteStore {
  userId: string;
  products: Set<string>;
  businesses: Set<string>;
}

const EMPTY: Set<string> = new Set();

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const canFavorite = isAuthenticated && user?.role === "CONSUMER" && user.isGuest !== true;
  const uid = user?.id ?? null;
  // Sets belong to the user they were loaded for, so a sign-out/sign-in never shows stale hearts.
  const [store, setStore] = useState<FavoriteStore | null>(null);
  const active = canFavorite && store !== null && store.userId === uid ? store : null;
  const products = active?.products ?? EMPTY;
  const businesses = active?.businesses ?? EMPTY;

  useEffect(() => {
    if (!canFavorite || uid === null) return;
    let cancelled = false;
    api
      .getFavoriteIds()
      .then((ids) => {
        if (cancelled) return;
        setStore({ userId: uid, products: new Set(ids.productIds), businesses: new Set(ids.businessIds) });
      })
      .catch(() => {
        /* hearts simply start empty; a toggle will surface a real error */
      });
    return () => {
      cancelled = true;
    };
  }, [canFavorite, uid]);

  const isFavorite = useCallback(
    (target: Target, id: string) => (target === "product" ? products.has(id) : businesses.has(id)),
    [products, businesses]
  );

  const toggle = useCallback(
    async (target: Target, id: string) => {
      if (!canFavorite || uid === null) return null;
      const field = target === "product" ? "products" : "businesses";
      const next = !(target === "product" ? products : businesses).has(id);
      const apply = (on: boolean) =>
        setStore((prev) => {
          const base: FavoriteStore =
            prev && prev.userId === uid ? prev : { userId: uid, products: new Set(), businesses: new Set() };
          const copy = new Set(base[field]);
          if (on) copy.add(id);
          else copy.delete(id);
          return { ...base, [field]: copy };
        });
      apply(next);
      try {
        await api.setFavorite(target, id, next);
        return next;
      } catch {
        apply(!next);
        return null;
      }
    },
    [canFavorite, uid, products, businesses]
  );

  const value = useMemo(() => ({ canFavorite, isFavorite, toggle }), [canFavorite, isFavorite, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export function useFavorites(): FavoritesContextType {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within a FavoritesProvider");
  return ctx;
}
