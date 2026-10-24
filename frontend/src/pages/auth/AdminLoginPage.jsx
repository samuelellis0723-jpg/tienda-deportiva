import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import '../../assets/styles/admin.css';
export default function AdminLoginPage() {
 const { status, login } = useAuth(); const navigate = useNavigate(); const location = useLocation();
 const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
 if (status === 'authenticated') return <Navigate to="/admin" replace />;
 async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { await login(email.trim(), password); navigate(location.state?.from || '/admin', { replace: true }); } catch (cause) { setError(cause.message); } finally { setBusy(false); } }
 return <main className="login-wrap"><a className="skip-link" href="#login-form">Saltar al formulario</a><section className="login-card"><p className="eyebrow">OJE · JUDO · BJJ</p><h1 className="page-heading">Acceso administrativo</h1><p className="muted">Ingresa con la cuenta administrativa existente.</p><form id="login-form" onSubmit={submit}><label className="field">Correo electrónico<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label className="field">Contraseña<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>{error && <p className="notice error" role="alert">{error}</p>}<button className="button full" disabled={busy || status === 'loading'}>{busy ? 'Iniciando sesión…' : 'Iniciar sesión'}</button></form><p className="muted login-note">No hay registro público. La sesión se mantiene en una cookie segura del servidor.</p></section></main>;
}
