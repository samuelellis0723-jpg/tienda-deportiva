import { useEffect } from 'react';
export default function Toast({ open, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, 6000);
    return () => clearTimeout(timer);
  }, [open, onClose]);
  return open ? <aside className="toast" role="status"><div>{children}</div><button className="icon-button" onClick={onClose} aria-label="Cerrar aviso">×</button></aside> : null;
}
