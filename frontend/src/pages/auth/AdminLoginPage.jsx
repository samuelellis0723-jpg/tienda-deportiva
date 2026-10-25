import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import '../../assets/styles/admin.css';
export default function AdminLoginPage() {
 const { status, login } = useAuth(); const navigate = useNavigate(); const location = useLocation();
 const [showPassword,setShowPassword]=useState(false);const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
 if (status === 'authenticated') return <Navigate to="/admin" replace />;
 async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { await login(email.trim(), password); navigate(location.state?.from || '/admin', { replace: true }); } catch (cause) { setError(cause.message); } finally { setBusy(false); } }
 return <main className="login-wrap"><a className="skip-link" href="#login-form">Saltar al formulario</a><section className="login-card"><Link to="/" className="back-home-link">← Volver al inicio</Link><p className="eyebrow">OJE · JUDO · BJJ</p><h1 className="page-heading">Acceso administrativo</h1><p className="muted">Tu tienda, lista para el siguiente paso.</p><form id="login-form" onSubmit={submit}><label className="field">Correo electrónico<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label className="field">Contraseña<input type={showPassword?'text':'password'} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label><button type="button" className="text-button password-toggle" aria-pressed={showPassword} onClick={()=>setShowPassword(!showPassword)}>{showPassword?'Ocultar contraseña':'Mostrar contraseña'}</button>{error && <p className="notice error" role="alert">{error}</p>}<button className="button full" disabled={busy || status === 'loading'}>{busy ? 'Iniciando sesión…' : 'Iniciar sesión'}</button></form><p className="muted login-note">Acceso exclusivo para el equipo OJE.</p></section></main>;
}
