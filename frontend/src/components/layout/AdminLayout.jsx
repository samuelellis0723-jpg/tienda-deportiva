import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import '../../assets/styles/admin.css';
const links = [{ to: '/admin', label: 'Resumen', icon: '◫' }, { to: '/admin/productos', label: 'Productos', icon: '▣' }, { to: '/admin/ordenes', label: 'Órdenes', icon: '≡' }, { to: '/admin/cupones', label: 'Cupones', icon: '◇' }];
export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false); const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const current = links.find(link => link.to === location.pathname)?.label || 'Administración';
  async function handleLogout() { setError(''); setBusy(true); try { await logout(); navigate('/admin/login', { replace: true }); } catch (cause) { setError(cause.message); } finally { setBusy(false); } }
  return <div className={`admin-shell ${collapsed ? 'is-sidebar-collapsed' : ''} ${expanded ? 'admin-nav-open' : ''}`}><a className="skip-link" href="#admin-content">Saltar al contenido</a>
    <header className="admin-mobile-header"><NavLink to="/admin" className="admin-brand">OJE<span>Administración</span></NavLink><button className="button secondary" aria-expanded={expanded} aria-controls="admin-sidebar" onClick={() => setExpanded(!expanded)}>{expanded ? 'Cerrar menú' : 'Abrir menú'}</button></header>
    <aside id="admin-sidebar" className="admin-sidebar" aria-label="Panel de administración"><NavLink to="/admin" className="admin-brand">OJE<span>Administración</span></NavLink><p className="admin-nav-caption">ESPACIO DE TRABAJO</p><nav aria-label="Administración">{links.map(link => <NavLink key={link.to} end={link.to === '/admin'} to={link.to} aria-label={link.label} onClick={() => setExpanded(false)}><span aria-hidden="true">{link.icon}</span><span className="admin-nav-label">{link.label}</span></NavLink>)}</nav><div className="admin-sidebar-footer"><NavLink to="/">↗ Visitar tienda</NavLink><div className="admin-account"><span className="admin-avatar" aria-hidden="true">{user?.email?.slice(0, 1).toUpperCase() || 'A'}</span><span><strong>Cuenta administrativa</strong><small>{user?.email}</small></span></div><button className="text-button" disabled={busy} onClick={handleLogout}>{busy ? 'Cerrando sesión…' : 'Cerrar sesión'}</button></div></aside>
    <div className="admin-workspace"><header className="admin-topbar"><button className="icon-button desktop-sidebar-toggle" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed} aria-controls="admin-sidebar" aria-label={collapsed ? "Expandir navegación" : "Contraer navegación"}>☰</button><nav className="admin-breadcrumbs" aria-label="Ruta de navegación"><NavLink to="/admin">Administración</NavLink><span aria-hidden="true">/</span><span aria-current="page">{current}</span></nav><Link className="button secondary admin-home-link" to="/" onClick={()=>setExpanded(false)}>Volver al inicio</Link><span className="admin-workspace-label">OJE · OPERACIONES</span></header><main id="admin-content" className="admin-main">{error && <p role="alert" className="notice error">{error}</p>}<Outlet /></main><footer className="admin-footer">OJE — Equipo para seguir avanzando.</footer></div>
  </div>;
}
