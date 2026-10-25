import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProduct, getProducts } from '../services/product-service.js';
import { useCart } from '../context/CartContext.jsx';
import { availableStock, productPrice, variantsOf, formatCRC } from '../utils/format.js';
import { cartQuantity } from '../utils/cart-quantity.js';
import { useDocumentTitle } from '../hooks/useDocumentTitle.js';
import { useCatalogRevision } from '../hooks/useCatalogRevision.js';
import ProductDate from '../components/ui/ProductDate.jsx';
import StockStatus from '../components/ui/StockStatus.jsx';
import ProductArtwork from '../components/ui/ProductArtwork.jsx';
import Toast from '../components/ui/Toast.jsx';
import ProductCard from '../components/ui/ProductCard.jsx';
import { Modal } from '../components/ui/Overlay.jsx';
import { ErrorNotice, Loading } from '../components/ui/AsyncState.jsx';
import SportBadges from '../components/ui/SportBadges.jsx';
import { productTypeOf, sportsOf } from '../utils/catalog-taxonomy.js';

export default function ProductPage() {
  const { id } = useParams();
  const catalogRevision = useCatalogRevision();
  const previousId = useRef(null);
  const { addItem, isLocked } = useCart();
  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [variantId, setVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [revision, setRevision] = useState(0);
  useDocumentTitle(`/productos/${id}`, product?.name);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setNotFound(false); setProduct(null); setRelated([]); setAdded(false);
    if (previousId.current !== id) { setVariantId(''); setQuantity(1); previousId.current = id; }
    getProduct(id).then(row => {
      if (row.estado !== 'publicado') throw new Error('Este producto no está disponible en el catálogo.');
      if (!active) return;
      setProduct(row);
      const disciplines = sportsOf(row);
      const relatedQueries = disciplines.length ? disciplines.map(sport => getProducts({ deporte: sport.slug, disponible: 'true', limit: '20' })) : [getProducts({ disponible: 'true', limit: '20' })];
      Promise.all(relatedQueries).then(groups => { if (active) { const unique=new Map(groups.flat().filter(item=>item.estado==='publicado'&&String(item.id)!==String(id)).map(item=>[String(item.id),item]));setRelated([...unique.values()].slice(0,4)); } }).catch(() => {});
    }).catch(reason => { if (active) { setError(reason.message); setNotFound(reason.status === 404); } }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [id, revision, catalogRevision]);
  const variants = useMemo(() => variantsOf(product).filter(variant => variant.isActive !== false && variant.is_active !== false), [product]);
  const selected = variants.find(variant => String(variant.id) === variantId);
  useEffect(() => { if (!loading) setQuantity(value => selected ? Math.max(1, cartQuantity(value, availableStock(selected))) : 1); }, [selected, loading]);
  if (loading) return <div className="container"><Loading label="Cargando producto…"/></div>;
  if (error || !product) return <section className="container section">{notFound ? <div className="empty-state"><h1>Este producto ya no está en el catálogo.</h1><p>Podés explorar el equipo disponible.</p></div> : <ErrorNotice message={error || 'Producto no encontrado.'} onRetry={() => setRevision(value => value + 1)}/>}<p><Link to="/catalogo">Volver al catálogo</Link></p></section>;
  const stock = selected ? availableStock(selected) : 0;
  const disciplines=sportsOf(product);const primarySport=disciplines[0];const typeName=productTypeOf(product);const listedSizes=[...new Set(variants.map(variant=>variant.size))].filter(Boolean);
  return <><div className="container"><nav className="breadcrumbs" aria-label="Ubicación"><Link to="/">Inicio</Link><span>/</span>{primarySport?<><Link to={`/catalogo?deporte=${primarySport.slug}`}>{primarySport.label}</Link><span>/</span></>:<><Link to="/catalogo">Catálogo</Link><span>/</span></>}<span aria-current="page">{product.name}</span></nav><section className="detail-layout"><div><button className="gallery-zoom" onClick={() => setZoom(true)} aria-label={`Ampliar imagen de ${product.name}`}><ProductArtwork product={product} variant={selected} className="detail-art"/></button><p className="gallery-caption">Seleccioná la imagen para ampliarla ↗</p><table className="spec-table"><caption className="sr-only">Especificaciones de {product.name}</caption><tbody><tr><th scope="row">SKU</th><td>{product.sku}</td></tr><tr><th scope="row">Deporte</th><td>{disciplines.map(item=>item.label).join(' + ')||'Deporte por confirmar'}</td></tr><tr><th scope="row">Tipo</th><td>{typeName||'Tipo por confirmar'}</td></tr><tr><th scope="row">Tallas en catálogo</th><td>{listedSizes.join(' · ') || 'Sin variantes activas'}</td></tr><tr><th scope="row">Colores en catálogo</th><td>{[...new Set(variants.map(variant => variant.color))].join(' · ') || 'Sin variantes activas'}</td></tr></tbody></table></div><div className="detail-info"><span className="eyebrow">{typeName||'OJE / EQUIPO DE TATAMI'}</span><h1>{product.name}</h1><SportBadges product={product}/><ProductDate product={product}/><p className="detail-price">{formatCRC(productPrice(product))}</p>{product.description && <p className="page-intro">{product.description}</p>}<div className="field"><span>Elegí talla y color</span><div className="variant-list" role="group" aria-label="Talla y color">{variants.map(variant => <button className="variant-option" key={variant.id} aria-pressed={String(selected?.id) === String(variant.id)} disabled={availableStock(variant) < 1} onClick={() => { setVariantId(String(variant.id)); setQuantity(1); setAdded(false); }}><span>{variant.size} · {variant.color}</span><StockStatus variant={variant}/></button>)}</div><Link to="/ayuda/tallas">¿Cómo elijo mi talla? ↗</Link></div>{selected ? <p role="status"><StockStatus variant={selected}/></p> : <p className="muted">{variants.some(variant => availableStock(variant)>0) ? 'Seleccioná tu variante para continuar.' : 'Agotado · Por ahora no hay variantes disponibles.'}</p>}<div className="purchase-row"><label><span className="sr-only">Cantidad</span><input type="number" min="1" max={stock || 1} value={quantity} disabled={!stock} onChange={event => setQuantity(cartQuantity(event.target.value,stock))}/></label><button className="button" disabled={!stock || isLocked} onClick={() => { addItem(product,selected,quantity); setAdded(true); }}>{added ? 'Agregado ✓' : 'Agregar al carrito +'}</button></div>{added && <p className="notice success" role="status">Tu equipo está en el carrito. <Link to="/carrito">Ver carrito →</Link></p>}<details><summary>Guía de tallas para este modelo</summary><p>Tallas disponibles en este producto: {listedSizes.join(', ')||'No hay tallas activas'}. No hay medidas en centímetros cargadas para este modelo; consultá la guía para comparar tus medidas sin asumir equivalencias universales. <Link to="/ayuda/tallas">Abrir guía de tallas ↗</Link></p></details><details><summary>Cuidado de tu equipo</summary><p>Revisá la etiqueta del fabricante antes de lavar o secar. El tejido y el encogimiento dependen de cada modelo; no asumás que todos los gis admiten el mismo tratamiento.</p></details><details><summary>Envío y compra</summary><p>Consultá cobertura y costo de envío en el checkout. Tu orden queda pendiente de pago manual. <Link to="/ayuda/envios">Conocer el proceso.</Link></p></details><details><summary>Antes de elegir o cambiar talla</summary><p>Comprobá talla, color y cantidad antes de crear tu orden. No hay una política de cambios publicada en este catálogo; confirmá las condiciones con OJE antes de pagar.</p></details></div></section>{related.length > 0 && <section className="section"><div className="section-heading"><div><span className="eyebrow">SEGUÍ PREPARANDO TU PRÁCTICA</span><h2>Equipo relacionado del mismo deporte.</h2></div></div><div className="grid-products">{related.map(row => <ProductCard key={row.id} product={row}/>)}</div></section>}</div><Toast open={added} onClose={() => setAdded(false)}><strong>Tu equipo está en el carrito.</strong><p><Link to="/carrito">Ver mi carrito →</Link></p></Toast><Modal open={zoom} onClose={() => setZoom(false)} title={product.name} className="zoom-dialog"><ProductArtwork product={product} variant={selected}/></Modal></>;
}
