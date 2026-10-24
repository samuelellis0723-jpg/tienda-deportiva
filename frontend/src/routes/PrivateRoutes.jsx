import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
export default function PrivateRoutes() {
  const { status, error, refresh } = useAuth(); const location = useLocation();
  if (status === 'loading') return <main className="admin-loading" aria-live="polite">Comprobando sesión…</main>;
  if (status === 'error') return <main className="admin-loading"><p role="alert">{error}</p><button className="button" onClick={refresh}>Reintentar</button></main>;
  if (status !== 'authenticated') return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
