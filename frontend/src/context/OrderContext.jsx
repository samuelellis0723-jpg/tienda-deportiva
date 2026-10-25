import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createOrder } from '../services/order-service.js';
import { createOrderAttempt } from '../services/order-attempt.js';
import { useCart } from './CartContext.jsx';

const OrderContext = createContext(null);
const emptyDraft = () => ({ email: '', firstName: '', lastName: '', phone: '', cityId: '', addressLine: '' });
export function OrderProvider({ children }) {
  const cart = useCart();
  const attempt = useRef(null);
  if (!attempt.current) attempt.current = createOrderAttempt(createOrder);
  const busy = useRef(false);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState(emptyDraft);
  const [coupon, setCoupon] = useState('');
  useEffect(() => {
    if (result && cart.items.length) { setResult(null); setStatus('idle'); setError(''); }
  }, [cart.items, result]);
  useEffect(() => {
    if (!['submitting', 'uncertain'].includes(status)) return;
    const preventLoss = event => { event.preventDefault(); event.returnValue = ''; };
    globalThis.addEventListener('beforeunload', preventLoss);
    return () => globalThis.removeEventListener('beforeunload', preventLoss);
  }, [status]);
  async function submit(payload) {
    if (busy.current) return null;
    if (!attempt.current.snapshot && cart.isLocked) return null;
    busy.current = true; setError('');
    if (!attempt.current.snapshot) {
      const stock = await cart.revalidate();
      const currentItems = stock.items?.map(item => ({ variantId: Number(item.variant.id), quantity: item.quantity }));
      const editedWhileChecking = JSON.stringify(currentItems) !== JSON.stringify(payload?.items);
      if (!stock.verified || stock.changed || editedWhileChecking) {
        setStatus('error'); setError(stock.verified ? 'La disponibilidad o el precio cambiaron. Revisá el carrito actualizado antes de crear la orden.' : 'Necesitamos verificar los artículos antes de crear la orden. Reintentá la consulta de disponibilidad.');
        busy.current = false;
        return null;
      }
    }
    cart.setLocked(true); setStatus('submitting');
    try {
      const order = await attempt.current.run(payload);
      setResult(order); setStatus('success'); cart.clear(); cart.setLocked(false);
      setDraft(emptyDraft()); setCoupon('');
      return order;
    } catch (cause) {
      const uncertain = !cause.status || cause.status >= 500;
      setStatus(uncertain ? 'uncertain' : 'error');
      setError(uncertain ? 'No recibimos la confirmación. Reintentá la misma solicitud para consultar el resultado sin duplicar tu orden.' : cause.message);
      if (!uncertain) { cart.setLocked(false); if (cause.status === 409) await cart.revalidate(); }
      return null;
    } finally { busy.current = false; }
  }
  function reset() { if (!busy.current && !attempt.current.snapshot) { setResult(null); setStatus('idle'); setError(''); } }
  return <OrderContext.Provider value={{ status, result, error, submit, reset, draft, setDraft, coupon, setCoupon, attempt: attempt.current.snapshot }}>{children}</OrderContext.Provider>;
}
export const useOrder = () => useContext(OrderContext);
