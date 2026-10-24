import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCategories, getProducts } from '../services/product-service.js';
import ProductCard from '../components/ui/ProductCard.jsx';
import { ErrorNotice, Loading } from '../components/ui/AsyncState.jsx';

export default function HomePage() {
  const [products, setProducts] = useState([]); const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try { const [productRows, categoryRows] = await Promise.all([getProducts({ ordenar: 'reciente', direccion: 'desc', limit: '8' }), getCategories()]); setProducts(productRows.filter((product) => product.estado === 'publicado')); setCategories(categoryRows); }
    catch (reason) { setError(reason.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const featured = ['judo', 'bjj'].map((slug) => categories.find((category) => category.slug === slug)).filter(Boolean);
  return <>
    <section className="home-hero"><div className="container hero-inner"><div className="hero-copy"><span className="eyebrow">Judo · Brazilian Jiu-Jitsu</span><h1>Forjado para<br />el camino.</h1><p>Equipo pensado para entrenar con constancia. Uniformes y básicos para cada día en el tatami.</p><Link className="button" to="/catalogo">Explorar catálogo</Link></div><div className="hero-art" role="img" aria-label="Ilustración editorial de un uniforme oscuro de entrenamiento"><span className="hero-stamp">HECHO<br />PARA EL<br />TATAMI</span></div></div></section>
    <section className="section container"><div className="section-heading"><div><span className="eyebrow">Encuentra tu camino</span><h2>Colecciones destacadas</h2></div><Link to="/catalogo">Ver todo →</Link></div>
      {featured.length ? <div className="collection-grid">{featured.map((category) => <Link className="collection-tile" key={category.id} to={`/catalogo?categoria=${encodeURIComponent(category.slug)}`}><span>Selección OJE · {category.name}</span><h3>{category.name}</h3><span>Explorar selección ↗</span></Link>)}</div> : <div className="notice">Las categorías destacadas no están disponibles ahora.</div>}
    </section>
    <section className="section container"><div className="section-heading"><div><span className="eyebrow">Selección de la tienda</span><h2>Equipo para volver mañana</h2></div><Link to="/catalogo">Todo el catálogo →</Link></div>
      {loading ? <Loading label="Cargando productos…" /> : error ? <ErrorNotice message={error} onRetry={load} /> : products.length ? <div className="grid-products">{products.slice(0, 4).map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="notice">Todavía no hay productos publicados.</div>}
    </section>
  </>;
}
