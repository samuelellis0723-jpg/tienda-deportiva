import { Link, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { listAdminOrders } from '../../services/admin-order-service.js';
import { getAdminSummary, getRestockReport, listStoreProducts } from '../../services/dashboard-service.js';
import { listAdminProducts } from '../../services/admin-product-service.js';
import { formatCRC, productImage, productPrice, productStatus, variantsOf } from '../../utils/format.js';
import { canonicalTypeSlug, productTypeOf, sportsOf } from '../../utils/catalog-taxonomy.js';
import { useCatalogRevision } from '../../hooks/useCatalogRevision.js';
import { AdminImage } from '../../components/admin/AdminTableTools.jsx';
import StockStatus from '../../components/ui/StockStatus.jsx';
import ProductArtwork from '../../components/ui/ProductArtwork.jsx';

async function listAllAdminProducts(filters) {
  const products = [];
  let page = 1;
  let total = Infinity;
  while (products.length < total) {
    const result = await listAdminProducts({ ...filters, page: String(page), limit: '100' });
    products.push(...(result.data || []));
    total = Number(result.meta?.total ?? products.length);
    if (!(result.data || []).length) break;
    page += 1;
  }
  return products;
}

export default function DashboardPage() {
  const { hash } = useLocation();
  const revision = useCatalogRevision();
  const [policy,setPolicy]=useState({});
  const [recent,setRecent]=useState([]);
  const [summary,setSummary]=useState(null);
  const [alerts,setAlerts]=useState([]);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [inventoryType,setInventoryType]=useState('');
  const [inventorySearch,setInventorySearch]=useState('');
  const [inventoryRows,setInventoryRows]=useState([]);
  const [inventoryLoading,setInventoryLoading]=useState(false);
  const [inventoryError,setInventoryError]=useState('');
  const [storeProducts,setStoreProducts]=useState([]);
  const [storeProductsLoading,setStoreProductsLoading]=useState(true);
  const [storeProductsError,setStoreProductsError]=useState('');
  const types=summary?.inventoryByType||[];
  const totals=useMemo(()=>types.reduce((acc,type)=>({products:acc.products+Number(type.productCount||0),units:acc.units+Number(type.availableUnits||0),low:acc.low+Number(type.lowStockProducts||0),out:acc.out+Number(type.outOfStockProducts||0)}),{products:0,units:0,low:0,out:0}),[types]);
  useEffect(()=>{let active=true;setLoading(true);setError('');Promise.all([getAdminSummary(),getRestockReport(),listAdminOrders({limit:5,page:1})]).then(([s,a,o])=>{if(active){setSummary(s);setAlerts(a.data||[]);setPolicy(a.meta||{});setRecent(o.data||[]);}}).catch(e=>active&&setError(e.message)).finally(()=>active&&setLoading(false));return()=>{active=false;};},[revision]);
  useEffect(()=>{let active=true;setStoreProductsLoading(true);setStoreProductsError('');listStoreProducts().then(products=>active&&setStoreProducts(products)).catch(cause=>active&&setStoreProductsError(cause.message||'No se pudo cargar el catálogo de la tienda.')).finally(()=>active&&setStoreProductsLoading(false));return()=>{active=false;};},[revision]);
  useEffect(()=>{if(!summary)return;let active=true;setInventoryLoading(true);setInventoryError('');const timer=setTimeout(()=>{Promise.all(['publicado','borrador'].map(estado=>listAllAdminProducts({estado,...(inventoryType?{tipo:inventoryType}:{}),...(inventorySearch.trim()?{q:inventorySearch.trim()}:{}),ordenar:'nombre',direccion:'asc'}))).then(results=>{if(active)setInventoryRows(results.flat());}).catch(cause=>{if(active)setInventoryError(cause.message||'No se pudo cargar el inventario.');}).finally(()=>active&&setInventoryLoading(false));},250);return()=>{active=false;clearTimeout(timer);};},[summary,inventoryType,inventorySearch,revision]);
  useEffect(()=>{if(!loading&&hash==='#reposicion'){const target=document.getElementById('reposicion');target?.scrollIntoView({block:'start'});target?.focus({preventScroll:true});}},[hash,loading]);
  const visibleTypes=inventoryType?types.filter(type=>type.slug===inventoryType):types;
  const grouped=visibleTypes.map(type=>({...type,products:inventoryRows.filter(product=>canonicalTypeSlug(product.tipoProducto?.slug)===type.slug)}));
  if(!inventoryType){const knownTypes=new Set(types.map(type=>type.slug));const unclassified=inventoryRows.filter(product=>!knownTypes.has(canonicalTypeSlug(product.tipoProducto?.slug)));if(unclassified.length)grouped.push({typeId:'unclassified',name:'Sin tipo asignado',products:unclassified});}
  return <section>
    <div className="admin-title"><div><p className="eyebrow">OJE / OPERACIONES</p><h1 className="page-heading">Resumen</h1><p className="muted">Una vista clara de tu tienda, inventario y ventas.</p></div><Link className="button" to="/admin/productos">Gestionar catalogo</Link></div>
    {loading?<p role="status">Cargando metricas...</p>:error?<div className="notice error" role="alert">{error}<button className="button secondary" onClick={()=>location.reload()}>Reintentar</button></div>:summary&&<>
      <div className="metric-grid"><article className="metric-card"><span>Valor promedio por orden</span><strong>{formatCRC(summary.averageOrderValue||0)}</strong></article><article className="metric-card"><span>Productos publicados</span><strong>{summary.productCounts?.published??0}</strong></article><article className="metric-card"><span>Productos en borrador</span><strong>{summary.productCounts?.draft??0}</strong></article><article className="metric-card"><span>Ordenes</span><strong>{(summary.orderCounts||[]).reduce((sum,x)=>sum+Number(x.count||0),0)}</strong></article></div>
      <section className="admin-card inventory-type-overview"><div className="admin-title"><div><h2>Inventario por tipo</h2><p className="muted">Incluye publicados y borradores. Disponibilidad = existencia en inventory menos reservas; las alertas consideran solo publicados.</p></div><Link className="button secondary" to="/admin#reposicion">Ver alertas de reposicion</Link></div>
        <div className="inventory-type-metrics">{types.length?types.map(type=><button type="button" className={`inventory-type-metric${inventoryType===type.slug?' is-selected':''}`} aria-pressed={inventoryType===type.slug} key={type.typeId} onClick={()=>{setInventoryType(current=>current===type.slug?'':type.slug);document.getElementById('inventario-por-tipo')?.scrollIntoView({block:'start'});}}><span>{type.name}</span><strong>{type.productCount} productos</strong><span>{type.availableUnits} unidades disponibles</span><span>! {type.lowStockProducts} productos con stock bajo</span><span>0 {type.outOfStockProducts} agotados</span></button>):<p className="muted">No hay tipos de producto configurados.</p>}</div>
        <p className="inventory-summary" aria-label="Totales de tipos">Total: {totals.products} productos, {totals.units} unidades disponibles, {totals.low} con stock bajo y {totals.out} agotados.</p>
      </section>
      <div className="admin-panels"><section className="admin-card"><h2>Ventas por categoria</h2>{(summary.salesByCategory||[]).length?<ul className="bar-list">{summary.salesByCategory.map(item=><li key={item.id}><div><span>{item.name}</span><strong>{formatCRC(item.sales||0)}</strong></div><progress aria-label={`Ventas ${item.name}`} max={Math.max(1,...summary.salesByCategory.map(x=>Number(x.sales)||0))} value={item.sales||0}/></li>)}</ul>:<p className="muted">Todavia no hay ventas.</p>}</section><section className="admin-card"><h2>Productos mas vendidos</h2>{(summary.topProducts||[]).length?<ol className="rank-list">{summary.topProducts.slice(0,3).map(p=><li key={p.id}><span>{p.name}</span><strong>{p.units_sold} uds.</strong></li>)}</ol>:<p className="muted">Todavia no hay productos vendidos.</p>}</section></div>
      <section className="admin-card dashboard-store-products"><div className="admin-title"><div><h2>Productos de la tienda</h2><p className="muted">Catálogo publicado que ve el cliente, con las mismas imágenes y datos de producto.</p></div><Link className="button secondary" to="/admin/productos">Gestionar productos</Link></div>{storeProductsLoading?<p role="status">Cargando productos de la tienda...</p>:storeProductsError?<p className="notice error" role="alert">{storeProductsError}</p>:storeProducts.length?<div className="dashboard-store-product-grid">{storeProducts.map(product=><article className="dashboard-store-product" key={product.id}><ProductArtwork product={product}/><div className="dashboard-store-product-info"><span className="eyebrow">{[...new Set(sportsOf(product).map(sport=>sport.label))].join(' + ')||'OJE'} · {productTypeOf(product)||'Producto'}</span><h3>{product.name}</h3><strong>{formatCRC(productPrice(product))}</strong><small>{variantsOf(product).length} variantes en la tienda</small></div></article>)}</div>:<p className="empty-state">No hay productos publicados en la tienda todavía.</p>}</section>
      <section className="admin-card inventory-browser" id="inventario-por-tipo"><div className="admin-title"><div><h2>Existencias y variantes</h2><p className="muted">Productos publicados y borradores; cada fila muestra el disponible real de cada variante.</p></div><Link className="button secondary" to="/admin#reposicion">Ir a alertas</Link></div><div className="inventory-browser-filters"><label className="field">Filtrar por tipo<select value={inventoryType} onChange={event=>setInventoryType(event.target.value)}><option value="">Todos los tipos</option>{types.map(type=><option key={type.typeId} value={type.slug}>{type.name}</option>)}</select></label><label className="field">Buscar producto<input type="search" value={inventorySearch} onChange={event=>setInventorySearch(event.target.value)} placeholder="Nombre o SKU"/></label></div>
        {inventoryLoading?<p role="status">Cargando inventario...</p>:inventoryError?<p className="notice error" role="alert">{inventoryError}</p>:inventoryRows.length===0?<p className="empty-state">No hay productos con esos filtros.</p>:grouped.map(type=><section className="inventory-type-group" key={type.typeId}><h3>{type.name}</h3>{type.products.length?<div className="table-scroll" role="region" tabIndex={0} aria-label={`Inventario de ${type.name}`}><table><thead><tr><th>Producto</th><th>Estado</th><th>Variantes y disponible</th></tr></thead><tbody>{type.products.map(product=><tr key={product.id}><td><div className="product-cell"><AdminImage src={productImage(product)} product={product} alt={`Imagen de ${product.name}`}/><span><strong>{product.name}</strong><small>{product.sku}</small></span></div></td><td>{productStatus(product)}</td><td><ul className="inventory-variant-list">{variantsOf(product).filter(variant=>variant.isActive!==false&&variant.is_active!==false).map(variant=><li key={variant.id||variant.sku}><span>{[variant.size,variant.color].filter(Boolean).join(' / ')||variant.sku}</span><StockStatus variant={variant}/></li>)}</ul></td></tr>)}</tbody></table></div>:<p className="muted">No hay filas coincidentes en este tipo.</p>}</section>)}
      </section>
      <section className="admin-card"><div className="admin-title"><h2>Ordenes recientes</h2><Link className="text-button" to="/admin/ordenes">Ver todas</Link></div>{recent.length?<div className="table-scroll" role="region" tabIndex={0} aria-label="Resumen de operaciones: tabla desplazable"><table><thead><tr><th>Orden</th><th>Cliente</th><th>Total</th><th>Estado</th></tr></thead><tbody>{recent.map(order=><tr key={order.id}><td><Link to="/admin/ordenes">{order.orderNumber}</Link></td><td>{order.customerEmail}</td><td>{formatCRC(order.total)}</td><td><span className="status-pill" data-status={order.status}>{order.status}</span></td></tr>)}</tbody></table></div>:<p className="muted">Las primeras ordenes apareceran aqui.</p>}</section>
      <section className="admin-card" id="reposicion" tabIndex={-1}><h2>Alertas de reposicion {policy.periodDays&&<span className="muted">/ ultimos {policy.periodDays} dias</span>}</h2><p><Link className="button secondary" to="/admin/productos?stockBajo=true">Ver productos con stock bajo</Link></p>{alerts.length?<div className="table-scroll" role="region" tabIndex={0} aria-label="Resumen de operaciones: tabla desplazable"><table><thead><tr><th>Producto / variante</th><th>Disponible</th><th>Venta diaria media</th><th>Dias de stock</th></tr></thead><tbody>{alerts.map(a=><tr key={a.variantId}><td>{a.productName} / {a.size||a.color||a.sku}</td><td>{a.availableStock}</td><td>{Number(a.averageDailySales||0).toFixed(2)}</td><td>{a.daysOfStockRemaining==null?'Sin ventas':Number(a.daysOfStockRemaining).toFixed(1)}</td></tr>)}</tbody></table></div>:<p className="muted">No hay alertas de reposicion.</p>}</section>
    </>}
  </section>;
}
