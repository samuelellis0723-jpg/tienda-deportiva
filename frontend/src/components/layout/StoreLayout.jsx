import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useOrder } from '../../context/OrderContext.jsx';
import { StoreProvider } from '../../context/StoreContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import StoreHeader from './StoreHeader.jsx';
import CartStockNotice from '../ui/CartStockNotice.jsx';
import '../../assets/styles/store.css';

function StoreFooter() {
  const [notice, setNotice] = useState(() => { try { return !localStorage.getItem('oje-privacy-notice'); } catch { return true; } });
  const dismiss = () => { try { localStorage.setItem('oje-privacy-notice', 'read'); } catch { /* El aviso funciona sin persistencia. */ } setNotice(false); };
  return <><footer className="site-footer"><div className="container footer-grid"><div className="footer-intro"><Link className="footer-logo" to="/">OJE<span>®</span></Link><p>El camino se entrena.<br/>Un día a la vez.</p><span>JUDO · BJJ · COSTA RICA</span></div><nav aria-label="Tienda"><h2>Al tatami</h2><Link to="/catalogo">Todo el equipo</Link><Link to="/carrito">Tu carrito</Link><Link to="/ayuda/tallas">Guía de tallas</Link></nav><nav aria-label="Ayuda"><h2>Antes de comprar</h2><Link to="/ayuda/envios">Envíos y cobertura</Link><Link to="/ayuda/compras">Compras y pago manual</Link><Link to="/ayuda/privacidad">Privacidad y cookies</Link></nav><div className="footer-statement"><span className="eyebrow">RESPETO POR EL PROCESO.</span><p>Desde tu primera caída<br/>hasta tu próximo podio.</p><Link to="/catalogo">Encontrá tu equipo ↗</Link></div></div><div className="container footer-bottom"><span>© {new Date().getFullYear()} OJE</span><span>Costa Rica · Colones (CRC)</span><Link to="/admin/login">Administración ↗</Link></div></footer>{notice && <aside className="cookie-notice" aria-label="Aviso de almacenamiento"><div><strong>Lo esencial para tu visita.</strong><p>Guardamos tu carrito en este navegador y usamos cookies para la sesión administrativa. <Link to="/ayuda/privacidad">Ver privacidad</Link></p></div><button className="button secondary" onClick={dismiss}>Entendido</button></aside>}</>;
}
export default function StoreLayout({ children }) {
  const { pathname } = useLocation(); const order = useOrder();
  useDocumentTitle(pathname);
  return <StoreProvider><a className="skip-link" href="#contenido">Saltar al contenido</a><StoreHeader/>{pathname !== '/' && <nav className="container back-home-nav" aria-label="Volver a la tienda"><Link to="/" className="back-home-link">← Volver al inicio</Link></nav>}{["submitting","uncertain"].includes(order.status) && <div className="order-progress" role="status"><span>{order.status === "submitting" ? "Estamos confirmando tu orden. El carrito está protegido mientras termina la solicitud." : "Tu orden necesita confirmación. Reintentá la misma solicitud desde el checkout."}</span><Link to="/checkout">Ver mi orden →</Link></div>}<main id="contenido" tabIndex="-1"><div className="container"><CartStockNotice/></div>{children}</main><StoreFooter/></StoreProvider>;
}
