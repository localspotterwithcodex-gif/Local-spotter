"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export interface CartLine {
  id: string;
  productId: string;
  name: string;
  image: string;
  businessName: string;
  price: number;
  quantity: number;
  color?: string;
  size?: string;
}

interface CartContextType {
  items: CartLine[];
  itemCount: number; // total quantity across lines — drives the header badge
  addItem: (item: CartLine) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// TODO: once /cart is wired to backend/src/cart, replace this local state
// with a fetch of the authenticated user's Cart/CartItem rows and mutate
// through the real endpoints instead of client-only state.
export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartLine[]>([]);

  const addItem = useCallback((item: CartLine) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i));
      }
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    setItems((prev) =>
      quantity <= 0 ? prev.filter((i) => i.id !== id) : prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  return (
    <CartContext.Provider value={{ items, itemCount, addItem, removeItem, updateQuantity, clear }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
};
