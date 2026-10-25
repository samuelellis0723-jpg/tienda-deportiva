import { useEffect, useId, useRef } from 'react';

export function Modal({ open, onClose, title, children, className = '' }) {
  const ref = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const previous = document.activeElement;
    dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [open]);
  function closeOnBackdrop(event) {
    if (event.target !== ref.current) return;
    const bounds = ref.current.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
  }
  return open ? <dialog ref={ref} className={`overlay ${className}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }} onClick={closeOnBackdrop}><header className="overlay-heading"><h2 id={titleId}>{title}</h2><button className="icon-button" type="button" onClick={onClose} aria-label="Cerrar diálogo">×</button></header>{children}</dialog> : null;
}

export function Drawer(props) { return <Modal {...props} className={`drawer ${props.className || ''}`} />; }
