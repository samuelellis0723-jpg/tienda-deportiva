export function Loading({ label = 'Cargando…' }) { return <div className="loading" role="status">{label}</div>; }
export function ErrorNotice({ message, onRetry }) { return <div className="notice error" role="alert">{message}{onRetry && <button className="inline-button" onClick={onRetry}>Intentar de nuevo</button>}</div>; }
export function EmptyState({ title, children, action }) { return <div className="empty-state"><h2>{title}</h2><p className="muted">{children}</p>{action}</div>; }
