import { Link } from 'react-router-dom';
export default function NotFoundPage() {
  return <section className="container help-page"><span className="eyebrow">404 / FUERA DEL TATAMI</span><h1 className="page-heading">Este camino no llega a ningún lado.</h1><p className="page-intro">La dirección puede haber cambiado. Volvé al catálogo para encontrar tu equipo.</p><Link className="button" to="/catalogo">Volver al catálogo →</Link></section>;
}
