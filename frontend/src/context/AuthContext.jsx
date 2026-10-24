import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSession, loginRequest, logoutRequest } from '../services/auth-service.js';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [status, setStatus] = useState('loading');
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const refresh = useCallback(async () => {
    setStatus('loading'); setError('');
    try { const session = await getSession(); setUser(session.user); setStatus('authenticated'); return session.user; }
    catch (cause) { setUser(null); setStatus(cause.status === 401 ? 'anonymous' : 'error'); if (cause.status !== 401) setError(cause.message); return null; }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const login = useCallback(async (email, password) => { const result = await loginRequest(email, password); setUser(result.user); setStatus('authenticated'); setError(''); return result.user; }, []);
  const logout = useCallback(async () => { await logoutRequest(); setUser(null); setStatus('anonymous'); }, []);
  const value = useMemo(() => ({ status, user, error, login, logout, refresh }), [status, user, error, login, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuthContext() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider requerido'); return value; }
