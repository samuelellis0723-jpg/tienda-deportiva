import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProductPage, getProducts, getProductTypes } from '../services/product-service.js';
import { useStore } from '../context/StoreContext.jsx';
import ProductCard from '../components/ui/ProductCard.jsx';
import { ErrorNotice, Loading } from '../components/ui/AsyncState.jsx';
import TatamiArtwork from '../components/ui/TatamiArtwork.jsx';
import { useCatalogRevision } from '../hooks/useCatalogRevision.js';
import { categoryHref, productTypeImage, SPORTS, sportCategories } from '../utils/catalog-taxonomy.js';

export default function HomePage() {
  const revision = useCatalogRevision();
  const requestVersion = useRef(0);
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const { categories } = useStore();
  const sportRoots = sportCategories(categories);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productTypes, setProductTypes] = useState([]);
  const [typeProducts, setTypeProducts] = useState({});
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState('');
  const load = async () => {
    const version = ++requestVersion.current;
    setLoading(true); setError('');
    try {
      const result = await getProductPage({ ordenar: 'reciente', direccion: 'desc', limit: '4', page: String(page) });
      if (version === requestVersion.current) {
        setProducts(result.data.filter(product => product.estado === 'publicado')); setTotal(result.meta.total);
        const lastPage = Math.max(1, Math.ceil(result.meta.total / 4)); if (page > lastPage) setPage(lastPage);
      }
    }
    catch (reason) { if (version === requestVersion.current) setError(reason.message); }
    finally { if (version === requestVersion.current) setLoading(false); }
  };
  useEffect(() => { load(); return () => { requestVersion.current++; }; }, [revision, page]);
  useEffect(() => {
    let active = true;
    setTypesLoading(true); setTypesError('');
    getProductTypes().then(async rows => {
      const productsByType = await Promise.all(rows.map(async type => [type.slug, await getProducts({ tipo: type.slug, disponible: 'true', limit: '4' })]));
      if (active) { setProductTypes(rows); setTypeProducts(Object.fromEntries(productsByType)); }
    }).catch(reason => { if (active) { setProductTypes([]); setTypeProducts({}); setTypesError(reason.message || 'No se pudieron cargar los tipos de producto.'); } })
      .finally(() => { if (active) setTypesLoading(false); });
    return () => { active = false; };
  }, [revision]);
  return <>
    <section className="home-hero"><div className="container hero-inner"><div className="hero-copy"><span className="eyebrow">JUDO & BRAZILIAN JIU-JITSU / COSTA RICA</span><h1>El camino<br/>se <em>entrena.</em></h1><p>Para la primera caída. Para un round más.<br/>Encontrá el equipo que acompaña tu práctica.</p><Link className="button accent" to="/catalogo">Encontrá tu equipo <span aria-hidden="true">↗</span></Link><div className="hero-caption"><span className="hero-line"/> MENOS EXCUSAS. MÁS TATAMI.</div></div><div className="hero-art"><TatamiArtwork/><span className="hero-art-caption">EST. EN EL TATAMI<br/>JUDO / BJJ / OJE</span><span className="hero-art-number" aria-hidden="true">01—∞</span></div></div><div className="hero-bottom container"><span>RESPETO. DISCIPLINA. CONSTANCIA.</span><Link to="/ayuda/tallas">El ajuste es parte del camino ↗</Link></div></section>
    <div className="benefits-strip"><div className="container"><span><b>01</b> Equipo para Judo y BJJ</span><span><b>02</b> Envíos según tu zona</span><span><b>03</b> Disponibilidad por talla</span><span><b>04</b> Compra con pago manual</span></div></div>
    <section className="section container sport-entry-section"><div className="section-heading"><div><span className="eyebrow">CADA DISCIPLINA, SU EQUIPO</span><h2>Elegí tu camino.</h2></div><Link to="/catalogo">Explorar todo el catálogo ↗</Link></div><div className="sport-feature-grid">{SPORTS.map((sport,index)=>{const root=sportRoots.find(category=>category.slug===sport.slug);const types=root?categories.filter(category=>String(category.parentId)===String(root.id)):[];return <article className={`sport-feature sport-feature-${sport.slug}`} key={sport.slug}><span className="eyebrow">OJE / 0{index+1}</span><h3>{sport.label}</h3><p>{sport.slug==='judo'?'Judogis y equipo para acompañar tu práctica de Judo.':'Gis y equipo para acompañar tu práctica de Brazilian Jiu-Jitsu.'}</p><div className="sport-feature-links"><Link to={`/catalogo?deporte=${sport.slug}`}>Todo {sport.label} ↗</Link>{types.map(category=><Link key={category.id} to={categoryHref(category,sport.slug)}>{category.name} ↗</Link>)}</div></article>})}</div></section>
    <section className="section container type-shopping-section"><div className="section-heading"><div><span className="eyebrow">EQUIPO PARA TU PR&Aacute;CTICA</span><h2>Compra por tipo de producto.</h2></div></div>{typesError ? <ErrorNotice message={typesError}/> : typesLoading ? <Loading label="Cargando tipos de producto..."/> : productTypes.length ? <div className="product-type-grid">{productTypes.map(type=><Link className={`product-type-tile${type.slug==='medias'?' product-type-brand':''}`} key={type.id} to={`/catalogo?tipo=${encodeURIComponent(type.slug)}`}><img src={productTypeImage(type)} width="320" height="240" loading="lazy" decoding="async" alt=""/><span className="eyebrow">{type.slug==='medias'?'MERCHANDISING OJE':'EXPLORAR OJE'}</span><h3>{type.name}</h3><p>{type.productCount} {type.productCount===1?'producto publicado':'productos publicados'}</p><span className="type-tile-link">Ver productos &rarr;</span></Link>)}</div> : <p className="empty-state">Todavia no hay tipos de producto activos. El catalogo se mostrara cuando se configure su clasificacion.</p>}</section>
    {!typesError && !typesLoading && productTypes.length>0 && <section className="section container type-featured-section"><div className="section-heading"><div><span className="eyebrow">NOVEDADES CON DISPONIBILIDAD</span><h2>Encuentra tu próximo equipo.</h2></div><Link to="/catalogo">Ver catálogo &rarr;</Link></div>{productTypes.map(type=><section className={`type-featured-row${type.slug==='medias'?' type-featured-brand':''}`} key={type.id}><div className="type-featured-heading"><h3>{type.name}</h3><Link to={`/catalogo?tipo=${encodeURIComponent(type.slug)}&disponible=true`}>Ver tipo &rarr;</Link></div>{typeProducts[type.slug]?.length ? <div className="grid-products">{typeProducts[type.slug].map(product=><ProductCard key={product.id} product={product}/>)}</div> : <p className="muted">No hay productos con disponibilidad ahora.</p>}</section>)}</section>}
    <section className="section product-section"><div className="container"><div className="section-heading"><div><span className="eyebrow">LO MÁS RECIENTE DEL CATÁLOGO</span><h2>Prepará tu próximo round.</h2></div><Link to="/catalogo">Ver todo el equipo ↗</Link></div>{loading ? <Loading label="Cargando equipo…"/> : error ? <ErrorNotice message={error} onRetry={load}/> : products.length ? <div className="grid-products">{products.map(product => <ProductCard key={product.id} product={product}/>)}</div> : <div className="empty-state"><h3>Estamos preparando el equipo.</h3><p>El catálogo mostrará los productos cuando estén publicados.</p></div>}{!loading && !error && total>4 && <nav className="pagination" aria-label="Equipo en la página de inicio"><button className="button secondary" disabled={page<=1} onClick={()=>setPage(value=>value-1)}>← Anterior</button><span>{page} / {Math.ceil(total/4)}</span><button className="button secondary" disabled={page*4>=total} onClick={()=>setPage(value=>value+1)}>Más equipo →</button></nav>}</div></section>
    <section className="fit-section container"><div className="fit-art" aria-hidden="true"><span>A</span><div className="measure-line"/><span>B</span></div><div className="fit-copy"><span className="eyebrow">EMPEZÁ POR EL AJUSTE</span><h2>Tu gi tiene que<br/>moverse con vos.</h2><p>Las tallas cambian entre modelos y disciplinas. Antes de elegir, tomá tus medidas y revisá las variantes del producto.</p><Link className="button secondary" to="/ayuda/tallas">Cómo elegir tu talla ↗</Link></div></section>
    <section className="manifesto"><div className="container"><span className="eyebrow">LO QUE NOS LLEVA AL TATAMI</span><h2>Nadie empieza<br/>con cinturón negro.</h2><p>Se empieza apareciendo. Aprendiendo a caer.<br/>Volviendo a intentarlo. El equipo acompaña. El camino es tuyo.</p><Link className="button accent" to="/catalogo">Nos vemos en el tatami ↗</Link><span className="manifesto-mark" aria-hidden="true">OJE</span></div></section>
  </>;
}
