import { useCart } from '../../context/CartContext.jsx';

export default function CartStockNotice() {
  const cart = useCart();
  if (cart.isLocked) return null;
  return <div className="cart-stock-notices">
    {cart.checking && <p className="muted" role="status">Verificando disponibilidad actual…</p>}
    {cart.stockChanges.length > 0 && <div className="notice stock-adjustment" role="status"><strong>Actualizamos tu carrito.</strong><ul>{cart.stockChanges.map((message,index) => <li key={`${message}-${index}`}>{message}</li>)}</ul><button className="text-button" onClick={cart.dismissStockChanges}>Entendido</button></div>}
    {cart.stockError && <div className="notice error" role="alert">{cart.stockError}<button className="inline-button" disabled={cart.checking} onClick={() => cart.revalidate()}>Reintentar</button></div>}
  </div>;
}
