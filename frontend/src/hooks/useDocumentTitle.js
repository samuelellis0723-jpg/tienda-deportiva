import { useEffect } from 'react';

const titles = { '/': 'Inicio', '/catalogo': 'Catálogo', '/carrito': 'Carrito', '/checkout': 'Checkout' };
export function useDocumentTitle(pathname, productName) {
  useEffect(() => {
    document.title = `${productName || titles[pathname] || 'Tienda'} — OJE`;
    return () => { document.title = 'OJE — Equipo para el tatami'; };
  }, [pathname, productName]);
}
