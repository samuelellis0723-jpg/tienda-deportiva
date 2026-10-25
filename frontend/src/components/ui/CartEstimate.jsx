import { useEffect, useRef, useState } from 'react';
import { getCities, estimateShipping } from '../../services/shipping-service.js';
import { validateCoupon } from '../../services/coupon-service.js';
import { formatCRC } from '../../utils/format.js';

export default function CartEstimate({ items, subtotal }) {
  const [cities, setCities] = useState([]);
  const [city, setCity] = useState('');
  const [quote, setQuote] = useState(null);
  const [code, setCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const signature = JSON.stringify([code, items.map(item => [item.variant.id,item.quantity])]);
  const latest = useRef(signature);
  latest.current = signature;
  const discount = coupon?.valid ? Number(coupon.discount) : 0;
  useEffect(() => { getCities().then(setCities).catch(() => setError('No pudimos consultar las zonas. Podés reintentarlo en el checkout.')); }, []);
  useEffect(() => { setCoupon(null); }, [items]);
  useEffect(() => {
    if (!city) { setQuote(null); return; }
    let active = true; setLoading(true); setQuote(null); setError('');
    estimateShipping(city,Math.max(0,subtotal-discount)).then(result => active && setQuote(result)).catch(reason => active && setError(reason.message)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [city,subtotal,discount]);
  async function checkCoupon() {
    const request = signature;
    setBusy(true); setCoupon(null);
    try { const result = await validateCoupon(code.trim(),items.map(item => ({ variantId:Number(item.variant.id),quantity:item.quantity }))); if (latest.current === request) setCoupon(result); }
    catch (reason) { if (latest.current === request) setCoupon({ valid:false,message:reason.message }); }
    finally { setBusy(false); }
  }
  return <details><summary>Estimar envío y cupón</summary><label className="field">Ciudad<select value={city} onChange={event => setCity(event.target.value)}><option value="">Elegí tu ciudad</option>{cities.map(row => <option key={row.id} value={row.id}>{row.name} · {row.province}</option>)}</select></label>{error && <p className="notice error" role="alert">{error}</p>}{loading && <p role="status">Cotizando envío…</p>}{quote && <p role="status">{quote.covered ? `Envío estimado: ${formatCRC(quote.shippingCost)}` : 'Esta zona no tiene cobertura.'}</p>}<label className="field">Código de cupón<input maxLength="80" value={code} onChange={event => { setCode(event.target.value); setCoupon(null); }}/></label><button className="button secondary full" disabled={busy || !code.trim()} onClick={checkCoupon}>{busy ? 'Consultando…' : 'Validar cupón'}</button>{coupon && <p role="status" className={`notice ${coupon.valid ? 'success' : 'error'}`}>{coupon.message}{coupon.valid && ` Descuento estimado: ${formatCRC(coupon.discount)}`}</p>}<p className="muted">Esta es una estimación. Volvé a ingresar tu cupón y ciudad en el checkout para confirmar el total.</p></details>;
}
