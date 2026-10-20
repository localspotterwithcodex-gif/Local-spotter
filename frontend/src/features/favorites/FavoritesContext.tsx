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

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const canFavorite = isAuthenticated && user?.role === "CONSUMER" && user.isGuest !== true;
  const [products, setProducts] = useState<Set<string>>(new Set());
  const [businesses, setBusinesses] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!canFavorite) {
      setProducts(new Set());
      setBusinesses(new Set());
      return;
    }
    let cancelled = false;
    api
      .getFavoriteIds()
      .then((ids) => {
        if (cancelled) return;
        setProducts(new Set(ids.productIds));
        setBusinesses(new Set(ids.businessIds));
      })
      .catch(() => {
        /* hearts simply start empty; a toggle will surface a real error */
      });
    return () => {
      cancelled = true;
    };
  }, [canFavorite, user?.id]);

  const isFavorite = useCallback(
    (target: Target, id: string) => (target === "product" ? products.has(id) : businesses.has(id)),
    [products, businesses]
  );

  const toggle = useCallback(
    async (target: Target, id: string) => {
      if (!canFavorite) return null;
      const set = target === "product" ? products : businesses;
      const setter = target === "product" ? setProducts : setBusinesses;
      const next = !set.has(id);
      const apply = (on: boolean) =>
        setter((prev) => {
          const copy = new Set(prev);
          if (on) copy.add(id);
          else copy.delete(id);
          return copy;
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
    [canFavorite, products, businesses]
  );

  const value = useMemo(() => ({ canFavorite, isFavorite, toggle }), [canFavorite, isFavorite, toggle]);
  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
};

export function useFavorites(): FavoritesContextType {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within a FavoritesProvider");
  return ctx;
}
