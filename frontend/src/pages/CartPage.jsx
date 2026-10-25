import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import ProductArtwork from '../components/ui/ProductArtwork.jsx';
import { EmptyState } from '../components/ui/AsyncState.jsx';
import { formatCRC } from '../utils/format.js';
import StockStatus from '../components/ui/StockStatus.jsx';
import CartEstimate from '../components/ui/CartEstimate.jsx';
import RecommendedProducts from '../components/ui/RecommendedProducts.jsx';

export default function CartPage() {
  const { items, setQuantity, removeItem, estimatedSubtotal, isLocked, checking } = useCart();
  if (!items.length) return <section className="container cart-page"><EmptyState title="Tu carrito está vacío">El equipo para tu próxima práctica te espera.</EmptyState><p className="text-center"><Link className="button" to="/catalogo">Explorar catálogo</Link></p></section>;
  return <section className="container cart-page"><span className="eyebrow">Antes del siguiente round</span><h1 className="page-heading">Tu carrito</h1><p className="muted">Revisá las tallas y cantidades antes de continuar. El total se confirma al crear tu orden.</p><div className="cart-layout"><div>{items.map((item) => <article className="cart-line" key={item.variant.id}><ProductArtwork product={item.product} /><div><h2>{item.product.name}</h2><p className="muted">{item.variant.size}{item.variant.color ? ` · ${item.variant.color}` : ''} · {item.variant.sku}</p><strong>{formatCRC(item.product.precio)}</strong><div className="cart-line-controls"><label>Cantidad <input type="number" disabled={isLocked || checking} min="1" max={item.variant.availableStock} value={Math.min(item.quantity, item.variant.availableStock)} onChange={(event) => setQuantity(item.variant.id, event.target.value)} aria-label={`Cantidad de ${item.product.name}`} /></label><button className="text-button" disabled={isLocked} type="button" onClick={() => removeItem(item.variant.id)}>Quitar</button></div><StockStatus variant={item.variant}/></div><strong>{formatCRC(item.product.precio * item.quantity)}</strong></article>)}</div><aside className="summary-card"><h2>Resumen estimado</h2><CartEstimate items={items} subtotal={estimatedSubtotal}/><div className="summary-line"><span>Subtotal</span><span>{formatCRC(estimatedSubtotal)}</span></div><p className="muted">El costo de envío depende de la cobertura. Confirmaremos los importes antes de registrar tu orden.</p><Link className="button full" to="/checkout">Continuar al checkout</Link><p className="text-center"><Link to="/catalogo">Seguir comprando</Link></p></aside></div><RecommendedProducts items={items}/></section>;
}
