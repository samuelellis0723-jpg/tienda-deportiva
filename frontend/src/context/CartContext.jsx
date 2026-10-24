import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { availableStock, productPrice } from '../utils/format.js';

const CartContext = createContext(null);
function withoutImageFields(product) {
  const details = { ...product };
  for (const key of ['imageUrl', 'image_url', 'image', 'imagenes']) delete details[key];
  return details;
}
function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem('oje-cart') || '[]');
    return Array.isArray(value) ? value.map((item) => ({ ...item, product: withoutImageFields(item.product || {}) })) : [];
  }
  catch { return []; }
}
export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);
  useEffect(() => {
    const cartForStorage = items.map(({ product, ...item }) => ({ ...item, product: withoutImageFields(product) }));
    localStorage.setItem('oje-cart', JSON.stringify(cartForStorage));
  }, [items]);
  const value = useMemo(() => {
    const addItem = (product, variant, quantity) => setItems((current) => {
      const key = String(variant.id);
      const existing = current.find((item) => String(item.variant.id) === key);
      const nextQuantity = Math.min(availableStock(variant), (existing?.quantity ?? 0) + quantity);
      if (nextQuantity < 1) return current;
      const line = { product: { id: product.id, name: product.name, slug: product.slug, precio: productPrice(product), imageUrl: product.imageUrl ?? product.image_url ?? product.image ?? null }, variant: { id: variant.id, sku: variant.sku, size: variant.size, color: variant.color, availableStock: availableStock(variant) }, quantity: nextQuantity };
      return existing ? current.map((item) => String(item.variant.id) === key ? { ...line } : item) : [...current, line];
    });
    const setQuantity = (variantId, quantity) => setItems((current) => current.map((item) => String(item.variant.id) === String(variantId) ? { ...item, quantity: Math.max(1, Math.min(Number(quantity) || 1, item.variant.availableStock)) } : item));
    const removeItem = (variantId) => setItems((current) => current.filter((item) => String(item.variant.id) !== String(variantId)));
    const clear = () => setItems([]);
    return { items, addItem, setQuantity, removeItem, clear, itemCount: items.reduce((sum, item) => sum + item.quantity, 0), estimatedSubtotal: items.reduce((sum, item) => sum + Number(item.product.precio) * item.quantity, 0) };
  }, [items]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const value = useContext(CartContext); if (!value) throw new Error('useCart debe usarse dentro de CartProvider'); return value; }
