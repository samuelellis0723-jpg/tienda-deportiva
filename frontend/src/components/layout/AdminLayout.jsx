import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth.js';
import '../../assets/styles/admin.css';
export default function AdminLayout() {
  const { user, logout } = useAuth(); const navigate = useNavigate(); const [error,setError]=useState('');
  async function handleLogout() { setError('');try{await logout();navigate('/admin/login',{replace:true});}catch(e){setError(e.message);} }
  return <div className="admin-shell"><a className="skip-link" href="#admin-content">Saltar al contenido</a><header className="admin-header"><NavLink to="/admin" className="admin-brand">OJE <span>Administración</span></NavLink><nav aria-label="Administración"><NavLink end to="/admin">Resumen</NavLink><NavLink to="/admin/productos">Productos</NavLink><NavLink to="/admin/ordenes">Órdenes</NavLink><NavLink to="/admin/cupones">Cupones</NavLink></nav><div className="admin-account"><span>{user?.email}</span><button className="button secondary" onClick={handleLogout}>Cerrar sesión</button></div></header><main id="admin-content" className="admin-main">{error&&<p role="alert" className="notice error">{error}</p>}<Outlet /></main></div>;
}
