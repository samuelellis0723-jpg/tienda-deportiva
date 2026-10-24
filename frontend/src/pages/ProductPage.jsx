import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct } from '../services/product-service.js';
import { useCart } from '../context/CartContext.jsx';
import { availableStock, productPrice, variantsOf } from '../utils/format.js';
import { formatCRC } from '../utils/format.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import ProductArtwork from '../components/ui/ProductArtwork.jsx';
import { ErrorNotice, Loading } from '../components/ui/AsyncState.jsx';

export default function ProductPage() {
  const { id } = useParams(); const { addItem } = useCart();
  const [product, setProduct] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [variantId, setVariantId] = useState(''); const [quantity, setQuantity] = useState(1); const [added, setAdded] = useState(false);
  useDocumentTitle(`/productos/${id}`, product?.name);
  const load = () => { setLoading(true); setError(''); getProduct(id).then((row) => { if (row.estado !== 'publicado') throw new Error('Este producto no está publicado.'); setProduct(row); }).catch((reason) => setError(reason.message)).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, [id]);
  const variants = useMemo(() => variantsOf(product).filter((variant) => variant.isActive !== false), [product]);
  const selected = variants.find((variant) => String(variant.id) === String(variantId)) ?? variants.find((variant) => availableStock(variant) > 0);
  useEffect(() => { if (selected && String(variantId) !== String(selected.id)) setVariantId(String(selected.id)); }, [selected, variantId]);
  if (loading) return <div className="container"><Loading label="Cargando producto…" /></div>;
  if (error || !product) return <section className="container section"><ErrorNotice message={error || 'Producto no encontrado.'} onRetry={load} /><p><Link to="/catalogo">Volver al catálogo</Link></p></section>;
  const stock = selected ? availableStock(selected) : 0;
  return <section className="container detail-layout"><ProductArtwork product={product} className="detail-art" /><div className="detail-info"><span className="eyebrow">{product.categorias?.[0]?.name ?? 'OJE · JUDO / BJJ'}</span><h1>{product.name}</h1><p className="detail-price">{formatCRC(productPrice(product))}</p><p className="page-intro">{product.description || 'Diseñado para acompañar el trabajo constante en el tatami.'}</p>
    <div className="field"><span className="eyebrow">Elige talla y color</span><div className="variant-list" role="group" aria-label="Variantes disponibles">{variants.map((variant) => <button className="variant-option" type="button" key={variant.id} aria-pressed={String(selected?.id) === String(variant.id)} disabled={availableStock(variant) < 1} onClick={() => { setVariantId(String(variant.id)); setQuantity(1); setAdded(false); }}>{variant.size}{variant.color && variant.color !== 'Único' ? ` · ${variant.color}` : ''}{availableStock(variant) < 1 ? ' · Agotado' : ''}</button>)}</div></div>
    {stock > 0 ? <><p className="stock-label in-stock">Disponible · {stock} en existencia</p><div className="purchase-row"><label><span className="sr-only">Cantidad</span><input type="number" min="1" max={stock} value={quantity} onChange={(event) => setQuantity(Math.max(1, Math.min(stock, Number(event.target.value) || 1)))} /></label><button className="button" type="button" onClick={() => { addItem(product, selected, quantity); setAdded(true); }}>Agregar al carrito</button></div>{added && <p className="notice success" role="status">Agregado al carrito. <Link to="/carrito">Ver carrito</Link></p>}</> : <p className="notice">Este producto no tiene variantes disponibles ahora.</p>}
    </div></section>;
}
