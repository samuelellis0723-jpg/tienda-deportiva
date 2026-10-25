export function cartQuantity(value, available) {
  const stock = Math.max(0, Math.floor(Number(available) || 0));
  return Math.min(stock, Math.max(1, Math.floor(Number(value) || 1)));
}
