import { useState } from 'react';
import { Link } from 'react-router-dom';
import { availableStock, productPrice, variantsOf, formatCRC } from '../../utils/format.js';
import { useCart } from '../../context/CartContext.jsx';
import ProductArtwork from './ProductArtwork.jsx';
import ProductDate from './ProductDate.jsx';
import StockStatus from './StockStatus.jsx';
import SportBadges from './SportBadges.jsx';
import { productTypeOf } from '../../utils/catalog-taxonomy.js';

export default function ProductCard({ product }) {
  const { addItem, isLocked } = useCart();
  const [variantId, setVariantId] = useState('');
  const [added, setAdded] = useState(false);
  if (product?.estado !== 'publicado') return null;
  const variants = variantsOf(product).filter(variant => variant.isActive !== false && variant.is_active !== false);
  const selected = variants.find(variant => String(variant.id) === variantId);
  return <article className="product-card">
    <Link className="product-card-link" to={`/productos/${product.id}`}>
      <ProductArtwork product={product} variant={selected}/>
      <div className="product-card-info"><SportBadges product={product}/><span className="product-overline">{productTypeOf(product) || 'OJE / TATAMI'}</span><h3>{product.name}</h3><p className="product-price">{formatCRC(productPrice(product))}</p></div>
    </Link>
    <ProductDate product={product}/>
    <ul className="variant-stock-list" aria-label={`Disponibilidad de ${product.name}`}>
      {variants.map(variant => <li key={variant.id}><span>{variant.size} · {variant.color}</span><StockStatus variant={variant}/></li>)}
      {!variants.length && <li><span className="stock-status stock-out_of_stock">Agotado · Sin variantes activas</span></li>}
    </ul>
    <div className="quick-add"><label><span className="sr-only">Talla y color de {product.name}</span><select value={selected ? variantId : ''} onChange={event => { setVariantId(event.target.value); setAdded(false); }}><option value="">Elegí tu talla / color</option>{variants.map(variant => <option key={variant.id} value={variant.id} disabled={availableStock(variant) < 1}>{variant.size} · {variant.color}{availableStock(variant) < 1 ? ' · Agotado' : ''}</option>)}</select></label><button className="button secondary" disabled={isLocked || !selected || availableStock(selected)<1} onClick={() => { addItem(product, selected, 1); setAdded(true); }}>{!variants.some(variant => availableStock(variant)>0) ? 'Agotado' : added ? 'Agregado ✓' : 'Agregar al carrito +'}</button><span className="sr-only" role="status">{added ? `${product.name} agregado al carrito.` : ''}</span></div>
  </article>;
}
