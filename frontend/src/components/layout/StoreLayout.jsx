import { Link } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { useDocumentTitle } from '../../hooks/useDocumentTitle.js';
import '../../assets/styles/store.css';

function StoreHeader() {
  const { itemCount } = useCart();
  return <><div className="announcement">Equipo para entrenar con propósito · Envíos sujetos a cobertura</div><header className="site-header"><div className="container header-inner">
    <Link className="wordmark" to="/" aria-label="OJE, inicio"><span>OJE</span><small>JUDO · BJJ</small></Link>
    <nav className="main-nav" aria-label="Navegación principal"><Link to="/catalogo">Catálogo</Link><Link to="/catalogo?categoria=judo">Judo</Link><Link to="/catalogo?categoria=bjj">BJJ</Link></nav>
    <Link className="cart-link" to="/carrito" aria-label={`Carrito, ${itemCount} artículos`}><span>Carrito</span><span className="cart-count">{itemCount}</span></Link>
  </div></header></>;
}
function StoreFooter() { return <footer className="site-footer"><div className="container footer-inner"><Link className="wordmark footer-mark" to="/"><span>OJE</span><small>JUDO · BJJ</small></Link><p>Equipo para el camino y el tatami.</p><span>San José, Costa Rica · ₡ CRC</span></div></footer>; }
export default function StoreLayout({ children }) { const { pathname } = useLocation(); useDocumentTitle(pathname); return <><a className="skip-link" href="#contenido">Saltar al contenido</a><StoreHeader /><main id="contenido">{children}</main><StoreFooter /></>; }
