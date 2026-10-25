export const formatCRC = (value) => new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(Number(value) || 0);
export const availableStock = (variant) => Math.max(0, Number(variant?.on_hand != null ? Number(variant.on_hand) - Number(variant.reserved ?? 0) : variant?.availableStock ?? variant?.available_stock ?? 0));
export const variantsOf = (product) => product?.variantes ?? product?.variants ?? [];
export const categoriesOf = (product) => product?.categorias ?? product?.categories ?? [];
export const productPrice = (product) => Number(product?.precio ?? product?.price ?? 0);
export const productImage = (product) => product?.imageUrl ?? product?.image_url ?? product?.image ?? product?.imagenes?.[0]?.url ?? null;
export const productStatus = (product) => product?.estado ?? product?.status;
