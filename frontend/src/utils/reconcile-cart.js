import { availableStock, productPrice, variantsOf } from './format.js';
import { cartQuantity } from './cart-quantity.js';

export function reconcileCart(items, results) {
  const changes = [];
  let verified = true;
  const next = [];
  for (const item of items) {
    const result = results.get(String(item.product.id));
    if (!result || result.error) { verified = false; next.push(item); continue; }
    const product = result.product;
    const variant = product && variantsOf(product).find(value => String(value.id) === String(item.variant.id) && value.isActive !== false && value.is_active !== false);
    if (!product || product.estado !== 'publicado' || !variant || availableStock(variant) === 0) {
      changes.push(`${item.product.name} · ${item.variant.size}: retirado del carrito porque ya no está disponible.`);
      continue;
    }
    const stock = availableStock(variant);
    const quantity = cartQuantity(item.quantity, stock);
    if (quantity !== item.quantity) changes.push(`${product.name} · ${variant.size}: ajustamos la cantidad de ${item.quantity} a ${quantity} por disponibilidad.`);
    else if (stock !== item.variant.availableStock) changes.push(`${product.name} · ${variant.size}: disponibilidad actualizada a ${stock} unidades.`);
    if (productPrice(product) !== Number(item.product.precio)) changes.push(`${product.name}: el precio cambió; revisá el resumen antes de continuar.`);
    const line = {
      product: { id: product.id, name: product.name, slug: product.slug, precio: productPrice(product), imageUrl: product.imageUrl ?? null },
      variant: { id: variant.id, sku: variant.sku, size: variant.size, color: variant.color, availableStock: stock, stockStatus: variant.stockStatus, lowStockThreshold: variant.lowStockThreshold },
      quantity,
    };
    next.push(JSON.stringify(line) === JSON.stringify(item) ? item : line);
  }
  return { items: next, changes, verified };
}
