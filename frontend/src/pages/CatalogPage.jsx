import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getProductPage } from '../services/product-service.js';
import { useStore } from '../context/StoreContext.jsx';
import ProductCard from '../components/ui/ProductCard.jsx';
import { EmptyState, ErrorNotice, Loading } from '../components/ui/AsyncState.jsx';
import { Drawer } from '../components/ui/Overlay.jsx';
import { useCatalogRevision } from '../hooks/useCatalogRevision.js';
import { productTypeCategories, sportCategories, SPORTS } from '../utils/catalog-taxonomy.js';

export default function CatalogPage() {
  const catalogRevision = useCatalogRevision();
  const [params, setParams] = useSearchParams();
  const { categories } = useStore();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState(params.get('q') || '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const category = params.get('categoria') || '';
  const sport = params.get('deporte') || '';
  const type = params.get('tipo') || '';
  const sort = params.get('ordenar') || 'reciente';
  const available = params.get('disponible') === 'true';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('q') || '';
  const sports = sportCategories(categories);
  const types = productTypeCategories(categories);
  function change(key, value) { const next = new URLSearchParams(params); value ? next.set(key, value) : next.delete(key); if (key !== 'page') next.delete('page'); setParams(next); }
  useEffect(() => { setQuery(search); }, [search]);
  useEffect(() => {
    let active = true; setLoading(true); setError('');
    const filters = { ordenar: sort, direccion: sort === 'reciente' ? 'desc' : 'asc', limit: '12', page: String(page), ...(search ? { q: search } : {}), ...(category ? { categoria: category } : {}), ...(sport ? { deporte: sport } : {}), ...(type ? { tipo: type } : {}), ...(available ? { disponible: 'true' } : {}) };
    getProductPage(filters).then(result => {
      if (!active) return;
      const lastPage = Math.max(1, Math.ceil(result.meta.total / 12));
      if (page > lastPage) {
        setParams(current => { const next = new URLSearchParams(current); next.set('page', String(lastPage)); return next; }, { replace: true });
      }
      setProducts(result.data.filter(product => product.estado === 'publicado')); setTotal(result.meta.total);
    }).catch(reason => active && setError(reason.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [search, category, sport, type, sort, available, page, revision, catalogRevision]);
  const selectedSport = SPORTS.find(item=>item.slug===sport);
  const selectedType = types.find(item=>item.slug===type) || productTypeCategories(categories).find(item=>item.slug===type);
  const filterFields = <><form role="search" onSubmit={event => { event.preventDefault(); change('q', query.trim()); }}><label className="field">Buscar equipo<input type="search" maxLength="120" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre del producto"/></label><button className="button secondary full" type="submit">Buscar →</button></form><label className="field">Deporte<select value={sport} onChange={event => {const next=new URLSearchParams(params);const nextSport=event.target.value;const chosenCategory=categories.find(item=>item.slug===next.get('categoria'));const roots=sportCategories(categories);const specificRoot=roots.find(root=>String(root.id)===String(chosenCategory?.parentId))||roots.find(root=>String(root.id)===String(chosenCategory?.id));if(specificRoot&&specificRoot.slug!==nextSport)next.delete('categoria');nextSport?next.set('deporte',nextSport):next.delete('deporte');next.delete('tipo');next.delete('page');setParams(next);}}><option value="">Todos los deportes</option>{sports.map(item=><option key={item.id} value={item.slug}>{item.name}</option>)}</select></label><label className="field">Tipo de producto<select value={type} onChange={event => change('tipo',event.target.value)}><option value="">Todos los tipos</option>{types.map(item=><option key={item.id} value={item.slug}>{item.name}</option>)}</select></label><h2>Categoría</h2><label className="field"><span className="sr-only">Categoría</span><select value={category} onChange={event => change('categoria', event.target.value)}><option value="">Todas las categorías</option>{categories.map(item => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label><label className="checkbox-label"><input type="checkbox" checked={available} onChange={event => change('disponible', event.target.checked ? 'true' : '')}/>Solo disponibles</label></>;
  return <section className="container catalog-shell"><nav className="breadcrumbs" aria-label="Ubicación"><Link to="/">Inicio</Link><span>/</span>{selectedSport?<><Link to={`/catalogo?deporte=${selectedSport.slug}`}>{selectedSport.label}</Link><span>/</span></>:null}<span aria-current="page">{selectedType?.name||selectedSport?.label||'Catálogo'}</span></nav><div className="catalog-top"><span className="eyebrow">OJE / EQUIPO PARA EL TATAMI</span><h1 className="page-heading">{selectedType?.name||selectedSport?.label||'Tu siguiente round.'}</h1><p className="page-intro">Buscá por disciplina, elegí tu talla y prepará tu próxima práctica.</p></div><div className="catalog-layout"><aside className="catalog-sidebar" aria-label="Filtros de productos">{filterFields}</aside><div><div className="catalog-toolbar"><p className="catalog-meta" role="status">{loading ? 'Consultando catálogo…' : `${total} ${total === 1 ? 'producto' : 'productos'}`}</p><button className="button secondary filter-mobile" onClick={() => setFiltersOpen(true)}>Filtrar +</button><label className="field"><span className="sr-only">Ordenar productos</span><select value={sort} onChange={event => change('ordenar', event.target.value)}><option value="reciente">Más recientes</option><option value="nombre">Nombre A–Z</option><option value="precio">Menor precio</option></select></label></div><div className="filter-chips">{search && <button onClick={() => change('q','')}>“{search}” ×</button>}{sport && <button onClick={() => change('deporte','')}>{selectedSport?.label||sport} ×</button>}{type && <button onClick={() => change('tipo','')}>{selectedType?.name||type} ×</button>}{category && <button onClick={() => change('categoria','')}>{categories.find(item => item.slug === category)?.name || category} ×</button>}{available && <button onClick={() => change('disponible','')}>Disponibles ×</button>}</div>{loading ? <Loading label="Buscando productos…"/> : error ? <ErrorNotice message={error} onRetry={() => setRevision(value => value + 1)}/> : products.length ? <><div className="grid-products">{products.map(product => <ProductCard key={product.id} product={product}/>)}</div><nav className="pagination" aria-label="Páginas del catálogo"><button className="button secondary" disabled={page <= 1} onClick={() => change('page',String(page-1))}>← Anterior</button><span aria-current="page">{page} / {Math.max(1,Math.ceil(total/12))}</span><button className="button secondary" disabled={page*12 >= total} onClick={() => change('page',String(page+1))}>Siguiente →</button></nav></> : <EmptyState title="Probemos otro camino." action={<button className="button secondary" onClick={() => setParams({})}>Quitar filtros</button>}>No encontramos productos con estos filtros.</EmptyState>}</div></div><Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtrá tu equipo">{filterFields}<button className="button full" onClick={() => setFiltersOpen(false)}>Ver resultados →</button></Drawer></section>;
}
