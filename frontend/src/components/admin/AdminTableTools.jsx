import { useEffect, useState } from 'react';
import { productTypeImage, safeProductImage } from '../../utils/catalog-taxonomy.js';
import { variantsOf } from '../../utils/format.js';
export function useTable(rows, initialKey = 'name', pageSize = 10) {
  const [sort, setSort] = useState({ key: initialKey, direction: 'asc' });
  const [requestedPage, setPage] = useState(1);
  const sorted = [...rows].sort((a, b) => {
    const left = a[sort.key] ?? ''; const right = b[sort.key] ?? '';
    const comparison = typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right), 'es', { numeric: true });
    return sort.direction === 'asc' ? comparison : -comparison;
  });
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const page = Math.min(requestedPage, pages);
  function onSort(key) { setSort(current => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' })); setPage(1); }
  return { sort, onSort, page, pages, setPage, total: rows.length, rows: sorted.slice((page - 1) * pageSize, page * pageSize) };
}
export function SortHeading({ table, field, children }) {
  const active = table.sort.key === field;
  return <th scope="col" aria-sort={active ? (table.sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="sort-button" onClick={() => table.onSort(field)}>{children}<span aria-hidden="true">{active ? (table.sort.direction === 'asc' ? ' ↑' : ' ↓') : ' ↕'}</span></button></th>;
}
export function TablePagination({ table, label = 'registros' }) {
  return <nav className="pagination" aria-label={`Paginación de ${label}`}><span className="table-meta">{table.total} {label} · Página {table.page} de {table.pages}</span><div><button type="button" className="button secondary" disabled={table.page <= 1} onClick={() => table.setPage(table.page - 1)}>Anterior</button><button type="button" className="button secondary" disabled={table.page >= table.pages} onClick={() => table.setPage(table.page + 1)}>Siguiente</button></div></nav>;
}
export function AdminImage({ src, alt = '', className = '', product }) {
  const [failedSource, setFailedSource] = useState(null);
  const [fallbackFailed, setFallbackFailed] = useState(false);
  const safeSource = safeProductImage(src);
  const fallback = productTypeImage(product?.tipoProducto, variantsOf(product).find(variant => variant.isActive !== false && variant.is_active !== false)?.color);
  const usingFallback = !safeSource || failedSource === safeSource;
  const source = usingFallback ? fallback : safeSource;
  useEffect(() => { setFailedSource(null); setFallbackFailed(false); }, [safeSource, fallback]);
  if (fallbackFailed) return <span className={`admin-image-placeholder ${className}`} role="img" aria-label={alt || `Ilustración OJE de ${product?.tipoProducto?.name || 'equipo deportivo'}`}>OJE</span>;
  return <img className={className} src={source} width="80" height="90" loading="lazy" decoding="async" alt={alt || `Ilustración OJE de ${product?.tipoProducto?.name || 'equipo deportivo'}`} onError={() => { if (!usingFallback) setFailedSource(safeSource); else setFallbackFailed(true); }} />;
}
