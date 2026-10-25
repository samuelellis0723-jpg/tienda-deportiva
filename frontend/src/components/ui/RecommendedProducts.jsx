import { useEffect, useState } from 'react';
import { recommendProducts } from '../../services/n8n-service.js';
import ProductCard from './ProductCard.jsx';
import { useCatalogRevision } from '../../hooks/useCatalogRevision.js';

export default function RecommendedProducts({ items }) {
  const revision = useCatalogRevision();
  const [products, setProducts] = useState([]);
  const [state, setState] = useState('loading');
  useEffect(() => {
    if (!items.length) { setState('empty'); return undefined; }
    let active = true;
    const cartItems = items.map(({ product, variant, quantity }) => ({ productId: product.id, name: product.name, size: variant.size, color: variant.color, quantity }));
    setState('loading');
    recommendProducts(cartItems).then((rows) => { if (active) { setProducts(rows); setState(rows.length ? 'ready' : 'empty'); } })
      .catch(() => { if (active) setState('error'); });
    return () => { active = false; };
  }, [items, revision]);
  if (state === 'empty') return null;
  return <section className="section recommendations" aria-labelledby="recommendations-title"><div className="section-heading"><div><span className="eyebrow">Para acompañar tu práctica</span><h2 id="recommendations-title">También podría interesarte</h2></div></div>{state === 'loading' ? <p role="status" className="muted">Buscando equipo relacionado…</p> : state === 'error' ? <p className="notice" role="status">Las recomendaciones no están disponibles ahora.</p> : <div className="grid-products">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div>}</section>;
}
