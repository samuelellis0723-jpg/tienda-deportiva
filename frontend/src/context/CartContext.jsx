import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { availableStock, productPrice } from '../utils/format.js';
import { cartQuantity } from '../utils/cart-quantity.js';
import { reconcileCart } from '../utils/reconcile-cart.js';
import { getProduct } from '../services/product-service.js';
import { useCatalogRevision } from '../hooks/useCatalogRevision.js';

const CartContext = createContext(null);
function withoutImageFields(product) {
  const details = { ...product };
  for (const key of ['imageUrl', 'image_url', 'image', 'imagenes']) delete details[key];
  return details;
}
function readCart() {
  try {
    const value = JSON.parse(localStorage.getItem('oje-cart') || '[]');
    return Array.isArray(value) ? value.filter(item => item?.variant?.id && item?.product?.id && Number.isFinite(Number(item.variant.availableStock)) && Number(item.variant.availableStock) > 0).map((item) => ({ ...item, quantity: cartQuantity(item.quantity, item.variant.availableStock), product: withoutImageFields(item.product || {}) })) : [];
  }
  catch { return []; }
}
export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart);
  const [isLocked, setIsLocked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [stockError, setStockError] = useState('');
  const [stockChanges, setStockChanges] = useState([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const version = useRef(0);
  const revision = useCatalogRevision();
  const { pathname } = useLocation();
  const productIds = [...new Set(items.map(item => String(item.product.id)))].sort().join(',');
  const lock = useRef(false);
  function setLocked(value) { lock.current = value; setIsLocked(value); }
  const revalidate = useCallback(async () => {
    if (lock.current) return { verified: false, changed: false };
    const currentVersion = ++version.current;
    const ids = [...new Set(itemsRef.current.map(item => String(item.product.id)))];
    if (!ids.length) { setChecking(false); setStockError(''); return { verified: true, changed: false, items: [] }; }
    setChecking(true); setStockError('');
    const results = new Map(await Promise.all(ids.map(async id => {
      try { return [id, { product: await getProduct(id) }]; }
      catch (cause) { return [id, cause.status === 404 ? { missing: true } : { error: true }]; }
    })));
    if (currentVersion !== version.current || lock.current) return { verified: false, changed: false };
    const result = reconcileCart(itemsRef.current, results);
    const changed = result.changes.length > 0;
    if (result.items.some((item,index) => item !== itemsRef.current[index]) || result.items.length !== itemsRef.current.length) {
      itemsRef.current = result.items;
      setItems(result.items);
    }
    if (changed) setStockChanges(current => [...current, ...result.changes].slice(-20));
    if (!result.verified) setStockError('No pudimos verificar todos los artículos. Reintentá antes de crear la orden.');
    setChecking(false);
    return { verified: result.verified, changed, items: result.items };
  }, []);
  useEffect(() => { revalidate(); return () => { version.current++; }; }, [revalidate, revision, pathname, productIds, isLocked]);
  useEffect(() => {
    const cartForStorage = items.map(({ product, ...item }) => ({ ...item, product: withoutImageFields(product) }));
    try { localStorage.setItem('oje-cart', JSON.stringify(cartForStorage)); } catch { /* El carrito sigue disponible en memoria si el navegador bloquea persistencia. */ }
  }, [items]);
  const value = useMemo(() => {
    const addItem = (product, variant, quantity) => setItems((current) => {
      if (lock.current) return current;
      const key = String(variant.id);
      const existing = current.find((item) => String(item.variant.id) === key);
      const nextQuantity = cartQuantity((existing?.quantity ?? 0) + cartQuantity(quantity, availableStock(variant)), availableStock(variant));
      if (nextQuantity < 1) return current;
      const line = { product: { id: product.id, name: product.name, slug: product.slug, precio: productPrice(product), imageUrl: product.imageUrl ?? product.image_url ?? product.image ?? null }, variant: { id: variant.id, sku: variant.sku, size: variant.size, color: variant.color, availableStock: availableStock(variant), stockStatus: variant.stockStatus, lowStockThreshold: variant.lowStockThreshold }, quantity: nextQuantity };
      return existing ? current.map((item) => String(item.variant.id) === key ? { ...line } : item) : [...current, line];
    });
    const setQuantity = (variantId, quantity) => { if (!lock.current) setItems((current) => current.map((item) => String(item.variant.id) === String(variantId) ? { ...item, quantity: cartQuantity(quantity, item.variant.availableStock) } : item)); };
    const removeItem = (variantId) => { if (!lock.current) setItems((current) => current.filter((item) => String(item.variant.id) !== String(variantId))); };
    const clear = () => setItems([]);
    return { items, isLocked, setLocked, addItem, setQuantity, removeItem, clear, checking, stockError, stockChanges, revalidate, dismissStockChanges: () => setStockChanges([]), itemCount: items.reduce((sum, item) => sum + item.quantity, 0), estimatedSubtotal: items.reduce((sum, item) => sum + Number(item.product.precio) * item.quantity, 0) };
  }, [items, isLocked, checking, stockError, stockChanges, revalidate]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart() { const value = useContext(CartContext); if (!value) throw new Error('useCart debe usarse dentro de CartProvider'); return value; }
