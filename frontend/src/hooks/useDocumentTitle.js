import { useEffect } from 'react';

const titles = { '/': 'Inicio', '/catalogo': 'Catálogo', '/carrito': 'Carrito', '/checkout': 'Finalizar orden', '/ayuda/tallas': 'Guía de tallas', '/ayuda/envios': 'Envíos y cobertura', '/ayuda/compras': 'Compras y pago', '/ayuda/privacidad': 'Privacidad' };
export function useDocumentTitle(pathname, productName) {
  useEffect(() => {
    document.title = `${productName || titles[pathname] || 'Tienda'} — OJE`;
    return () => { document.title = 'OJE — Equipo para el tatami'; };
  }, [pathname, productName]);
}
