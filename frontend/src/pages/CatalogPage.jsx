import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getCategories, getProducts } from '../services/product-service.js';
import ProductCard from '../components/ui/ProductCard.jsx';
import { EmptyState, ErrorNotice, Loading } from '../components/ui/AsyncState.jsx';

export default function CatalogPage() {
  const [params, setParams] = useSearchParams();
  const [categories, setCategories] = useState([]); const [products, setProducts] = useState([]);
  const [query, setQuery] = useState(params.get('q') || ''); const [category, setCategory] = useState(params.get('categoria') || '');
  const [sort, setSort] = useState('reciente'); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => { getCategories().then(setCategories).catch((reason) => setError(reason.message)); }, []);
  useEffect(() => { setQuery(params.get('q') || ''); setCategory(params.get('categoria') || ''); }, [params]);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    const filters = { ordenar: sort, direccion: sort === 'nombre' || sort === 'precio' ? 'asc' : 'desc', limit: '100' };
    if (query.trim()) filters.q = query.trim(); if (category) filters.categoria = category;
    getProducts(filters).then((rows) => { if (active) setProducts(rows.filter((product) => product.estado === 'publicado')); }).catch((reason) => { if (active) setError(reason.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [query, category, sort, revision]);
  const submitSearch = (event) => { event.preventDefault(); const next = new URLSearchParams(params); query.trim() ? next.set('q', query.trim()) : next.delete('q'); category ? next.set('categoria', category) : next.delete('categoria'); setParams(next, { replace: true }); setRevision((current) => current + 1); };
  return <section className="container catalog-shell"><span className="eyebrow">La tienda</span><h1 className="page-heading">Catálogo</h1><p className="page-intro">Equipo para entrenar, competir y construir tu práctica.</p>
    <form className="catalog-filters" onSubmit={submitSearch} role="search"><label className="field"><span className="sr-only">Buscar productos</span><input className="filter-control" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar equipo o uniforme" /></label>
      <label className="field"><span className="sr-only">Filtrar por categoría</span><select className="filter-control" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">Todas las categorías</option>{categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>
      <label className="field"><span className="sr-only">Ordenar productos</span><select className="filter-control" value={sort} onChange={(event) => setSort(event.target.value)}><option value="reciente">Más recientes</option><option value="nombre">Nombre A–Z</option><option value="precio">Precio menor primero</option></select></label>
      <button type="submit" className="sr-only">Aplicar búsqueda</button></form>
    {loading ? <Loading label="Buscando productos…" /> : error ? <ErrorNotice message={error} onRetry={() => setRevision((current) => current + 1)} /> : products.length ? <><p className="catalog-meta" aria-live="polite">{products.length} {products.length === 1 ? 'producto' : 'productos'}</p><div className="grid-products">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></> : <EmptyState title="No encontramos productos">Prueba otra búsqueda o elige una categoría distinta.</EmptyState>}
  </section>;
}
