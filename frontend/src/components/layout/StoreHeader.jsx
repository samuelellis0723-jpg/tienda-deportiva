import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { useStore } from '../../context/StoreContext.jsx';
import { getProducts } from '../../services/product-service.js';
import { formatCRC } from '../../utils/format.js';
import { Drawer } from '../ui/Overlay.jsx';
import StockStatus from '../ui/StockStatus.jsx';
import CartStockNotice from '../ui/CartStockNotice.jsx';
import { useCatalogRevision } from '../../hooks/useCatalogRevision.js';
import ProductArtwork from '../ui/ProductArtwork.jsx';
import { sportCategories, productTypeCategories, SPORTS, categoryHref, PRODUCT_TYPE_ROOT } from '../../utils/catalog-taxonomy.js';

export default function StoreHeader() {
  const cart = useCart();
  const catalogRevision = useCatalogRevision();
  const { categories, threshold } = useStore();
  const [panel, setPanel] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchState, setSearchState] = useState('');
  const headerRef = useRef(null);
  const categoryButton = useRef(null);
  const sportButtons = useRef(new Map());
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => { setPanel(''); }, [location]);
  useEffect(() => {
    if (!['categories', 'judo', 'bjj'].includes(panel)) return;
    const close = event => {
      if (event.type === 'keydown' && event.key === 'Escape') { setPanel(''); (panel==='categories'?categoryButton.current:sportButtons.current.get(panel))?.focus(); }
      if ((event.type === 'pointerdown' || event.type === 'focusin') && !headerRef.current?.contains(event.target)) setPanel('');
    };
    document.addEventListener('keydown', close); document.addEventListener('pointerdown', close); document.addEventListener('focusin', close);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', close); document.removeEventListener('focusin', close); };
  }, [panel]);
  useEffect(() => {
    if (!query.trim() || panel !== 'search') { setResults([]); setSearchState(''); return; }
    let active = true;
    setSearchState('Buscando…'); setResults([]);
    const timer = setTimeout(() => getProducts({ q: query.trim(), limit: '5' }).then(rows => {
      if (active) { setResults(rows.filter(row => row.estado === 'publicado')); setSearchState(rows.length ? '' : 'No encontramos productos con ese nombre.'); }
    }).catch(() => active && setSearchState('No pudimos buscar. Intentá de nuevo.')), 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query, panel, catalogRevision]);
  const sportRoots = sportCategories(categories);
  const typeCategories = productTypeCategories(categories);
  const typeRoot = categories.find(category => category.slug === PRODUCT_TYPE_ROOT && category.parentId == null);
  const categoryLinks = [
    ...typeCategories.map(category => <Link key={category.id} to={categoryHref(category)}>{category.name}<span aria-hidden="true">↗</span></Link>),
    ...categories.filter(category => !sportRoots.some(sport=>String(sport.id)===String(category.id)) && String(category.id)!==String(typeRoot?.id) && !sportRoots.some(sport=>String(sport.id)===String(category.parentId)) && !typeCategories.some(type=>String(type.id)===String(category.id))).map(category => <Link key={category.id} to={`/catalogo?categoria=${encodeURIComponent(category.slug)}`}>{category.name}<span aria-hidden="true">↗</span></Link>),
  ];
  const currentSport = SPORTS.find(sport=>sport.slug===panel);
  const currentRoot = sportRoots.find(sport=>sport.slug===panel);
  const currentTypes = currentRoot ? typeCategories : [];
  return <><div className="announcement"><span>DEL DOJO A TU PRÓXIMO DESAFÍO</span><span>{threshold ? `Envío gratis desde ${formatCRC(threshold)} · Según cobertura` : 'Judo & BJJ · Costa Rica'}</span></div>
    <header className="site-header" ref={headerRef}><div className="container header-inner">
      <button className="icon-button mobile-menu-button" aria-label="Abrir menú" onClick={() => setPanel('menu')}>☰</button>
      <Link className="wordmark" to="/" aria-label="OJE, inicio">OJE<span className="brand-dot">®</span><small>EL CAMINO SE ENTRENA.</small></Link>
      <nav className="main-nav" aria-label="Navegación principal">{SPORTS.map(sport=><button key={sport.slug} className="nav-disclosure" ref={element=>element?sportButtons.current.set(sport.slug,element):sportButtons.current.delete(sport.slug)} aria-expanded={panel===sport.slug} aria-controls="category-menu" onClick={()=>setPanel(panel===sport.slug?'':sport.slug)}>{sport.label}<span aria-hidden="true">⌄</span></button>)}<button className="nav-disclosure" ref={categoryButton} aria-expanded={panel === 'categories'} aria-controls="category-menu" onClick={() => setPanel(panel === 'categories' ? '' : 'categories')}>Categorías <span aria-hidden="true">⌄</span></button><Link to="/catalogo">Todo el catálogo</Link><Link to="/ayuda/tallas">Encontrá tu talla</Link></nav>
      <div className="header-actions"><button className="icon-button" aria-label="Buscar productos" onClick={() => setPanel('search')}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/></svg></button><Link className="icon-button header-account" to="/admin/login" aria-label="Iniciar sesión"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><circle cx="12" cy="7.2" r="3.6"/><path d="M4.5 21v-2.2a7.5 7.5 0 0 1 15 0V21Z"/></svg></Link><button className="cart-link" disabled={cart.isLocked} aria-label={`Abrir carrito, ${cart.itemCount} artículos`} onClick={() => setPanel('cart')}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="m8 3 4 7 4-7M5 10h14l-1.5 11h-11Z"/><path d="m9.5 13 1 5m3-5-.5 5"/></svg><span className="cart-count">{cart.itemCount}</span></button></div>
    </div>{['categories','judo','bjj'].includes(panel) && <div className="mega-menu container" id="category-menu" onKeyDown={event => { if (event.key === 'Escape') setPanel(''); }}><div><span className="eyebrow">{currentSport?`OJE / ${currentSport.label}`:'Elegí tu equipo'}</span><h2>{currentSport?<>Equipo para<br/>{currentSport.label}.</>:<>Tu práctica.<br/>Tu siguiente paso.</>}</h2><Link to={currentSport?`/catalogo?deporte=${currentSport.slug}`:'/catalogo'}>{currentSport?`Ver todo ${currentSport.label}`:'Explorar todo'} →</Link></div><nav aria-label={currentSport?`Tipos de producto para ${currentSport.label}`:'Otras categorías'}>{currentSport?currentTypes.map(category=><Link key={category.id} to={categoryHref(category,currentSport.slug)}>{category.name}<span aria-hidden="true">↗</span></Link>):categoryLinks.length?categoryLinks:<Link to="/catalogo">Consultar catálogo →</Link>}</nav><button className="icon-button mega-close" aria-label="Cerrar menú" onClick={() => setPanel('')}>×</button></div>}</header>
    <Drawer open={panel === 'menu'} onClose={() => setPanel('')} title="Explorá OJE"><nav className="drawer-navigation" aria-label="Menú móvil"><Link to="/catalogo">Todo el catálogo →</Link>{SPORTS.map(sport=>{const root=sportRoots.find(item=>item.slug===sport.slug);return <section className="drawer-sport" key={sport.slug}><Link className="drawer-sport-title" to={`/catalogo?deporte=${sport.slug}`}>{sport.label} →</Link>{root&&typeCategories.map(category=><Link key={category.id} to={categoryHref(category,sport.slug)}>{category.name}</Link>)}</section>})}{categoryLinks}<Link to="/ayuda/tallas">Guía de tallas →</Link><Link to="/ayuda/envios">Envíos y compras →</Link></nav></Drawer>
    <Drawer open={panel === 'search'} onClose={() => setPanel('')} title="¿Qué llevás al tatami?"><form role="search" onSubmit={event => { event.preventDefault(); navigate(`/catalogo?q=${encodeURIComponent(query.trim())}`); }}><label className="field">Buscar equipo<input type="search" maxLength="120" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre, uniforme, cinturón…" autoFocus /></label><button className="button full" type="submit">Ver resultados →</button></form><p role="status" className="muted">{searchState}</p><ul className="search-results">{results.map(product => <li key={product.id}><Link to={`/productos/${product.id}`}>{product.name}<span>Ver producto ↗</span></Link></li>)}</ul></Drawer>
    <Drawer open={panel === 'cart'} onClose={() => setPanel('')} title={`Tu carrito (${cart.itemCount})`}><CartStockNotice/>{cart.items.length ? <><div className="mini-cart-lines">{cart.items.map(item => <article className="mini-cart-line" key={item.variant.id}><ProductArtwork product={item.product} variant={item.variant}/><div><Link to={`/productos/${item.product.id}`}>{item.product.name}</Link><p className="muted">{item.variant.size} · {item.variant.color}</p><StockStatus variant={item.variant}/><label className="field">Cantidad<input type="number" disabled={cart.isLocked || cart.checking} min="1" max={item.variant.availableStock} value={item.quantity} onChange={event => cart.setQuantity(item.variant.id, event.target.value)}/></label><button className="text-button" disabled={cart.isLocked} onClick={() => cart.removeItem(item.variant.id)}>Quitar</button></div><strong>{formatCRC(item.product.precio * item.quantity)}</strong></article>)}</div><div className="summary-line"><span>Subtotal estimado</span><strong>{formatCRC(cart.estimatedSubtotal)}</strong></div><p className="muted">Envío y descuentos se confirman al finalizar.</p><Link className="button full" to="/checkout">Continuar con mi orden →</Link><Link className="button secondary full" to="/carrito">Ver carrito</Link></> : <div className="empty-state"><h3>Tu próxima práctica empieza acá.</h3><p>Elegí el equipo que te acompaña.</p><Link className="button" to="/catalogo">Explorar catálogo →</Link></div>}</Drawer>
  </>;
}
