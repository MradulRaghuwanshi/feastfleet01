import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ restaurantId: null, restaurantName: '', restaurantHasOwnDelivery: null, items: [] });

  const addItem = (item, restaurantId, restaurantName, restaurantHasOwnDelivery) => {
    setCart(prev => {
      // Clear cart if switching restaurants
      if (prev.restaurantId && prev.restaurantId !== restaurantId) {
        if (!window.confirm(`Your cart has items from ${prev.restaurantName}. Clear cart and add from ${restaurantName}?`))
          return prev;
        return { restaurantId, restaurantName, restaurantHasOwnDelivery, items: [{ ...item, quantity: 1 }] };
      }
      const existing = prev.items.find(i => i.id === item.id);
      const items = existing
        ? prev.items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev.items, { ...item, quantity: 1 }];
      return { restaurantId, restaurantName, restaurantHasOwnDelivery, items };
    });
  };

  const removeItem = (itemId) => {
    setCart(prev => {
      const items = prev.items
        .map(i => i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i)
        .filter(i => i.quantity > 0);
      return { ...prev, items, restaurantId: items.length ? prev.restaurantId : null, restaurantName: items.length ? prev.restaurantName : '', restaurantHasOwnDelivery: items.length ? prev.restaurantHasOwnDelivery : null };
    });
  };

  const clearCart = () => setCart({ restaurantId: null, restaurantName: '', restaurantHasOwnDelivery: null, items: [] });

  const totalItems = cart.items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = cart.items.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, clearCart, totalItems, subtotal }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
