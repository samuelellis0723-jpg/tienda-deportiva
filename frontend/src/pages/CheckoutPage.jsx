import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { validateCoupon } from '../services/coupon-service.js';
import { createOrder } from '../services/order-service.js';
import { estimateShipping, getCities, isShippingWebhookConfigured } from '../services/shipping-service.js';
import { formatCRC } from '../utils/format.js';
import { ErrorNotice, EmptyState, Loading } from '../components/ui/AsyncState.jsx';

function newIdempotencyKey() { return globalThis.crypto?.randomUUID?.() ?? `oje-${Date.now()}-${Math.random().toString(36).slice(2)}`; }

export default function CheckoutPage() {
  const cart = useCart();
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', phone: '', cityId: '', addressLine: '' });
  const [cities, setCities] = useState([]); const [citiesLoading, setCitiesLoading] = useState(isShippingWebhookConfigured); const [shippingError, setShippingError] = useState('');
  const [coverage, setCoverage] = useState(null); const [coverageLoading, setCoverageLoading] = useState(false);
  const [coupon, setCoupon] = useState(''); const [couponResult, setCouponResult] = useState(null); const [couponLoading, setCouponLoading] = useState(false);
  const [submitError, setSubmitError] = useState(''); const [submitting, setSubmitting] = useState(false); const [createdOrder, setCreatedOrder] = useState(null);
  const idempotencyKey = useRef(null);
  const items = useMemo(() => cart.items.map((item) => ({ variantId: Number(item.variant.id), quantity: item.quantity })), [cart.items]);
  const discountEstimate = couponResult?.valid && couponResult.code === coupon.trim().toUpperCase() ? Number(couponResult.discount) : 0;
  const eligibleSubtotalEstimate = Math.max(0, cart.estimatedSubtotal - discountEstimate);

  useEffect(() => {
    if (!isShippingWebhookConfigured) { setCitiesLoading(false); setShippingError('Las ciudades y la cobertura todavía no están configuradas en n8n.'); return; }
    let active = true; setCitiesLoading(true); setShippingError('');
    getCities().then((rows) => { if (active) setCities(rows); }).catch((error) => { if (active) setShippingError(error.message); }).finally(() => { if (active) setCitiesLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => { idempotencyKey.current = null; }, [form, coupon, cart.items]);

  useEffect(() => {
    if (!form.cityId || !cities.length || !isShippingWebhookConfigured) { setCoverage(null); return; }
    let active = true; setCoverageLoading(true); setShippingError('');
    estimateShipping(form.cityId, eligibleSubtotalEstimate).then((result) => { if (active) setCoverage(result); }).catch((error) => { if (active) { setCoverage(null); setShippingError(error.message); } }).finally(() => { if (active) setCoverageLoading(false); });
    return () => { active = false; };
  }, [form.cityId, cities.length, eligibleSubtotalEstimate]);

  const update = (event) => { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); setSubmitError(''); };
  const checkCoupon = async () => {
    if (!coupon.trim()) { setCouponResult(null); return; }
    setCouponLoading(true); setCouponResult(null); setSubmitError('');
    try { setCouponResult(await validateCoupon(coupon.trim(), items)); }
    catch (error) { setCouponResult({ valid: false, message: error.message }); }
    finally { setCouponLoading(false); }
  };
  const submit = async (event) => {
    event.preventDefault(); setSubmitError('');
    if (!isShippingWebhookConfigured || shippingError || !coverage?.covered) { setSubmitError('Necesitamos confirmar la cobertura de la ciudad antes de crear la orden.'); return; }
    if (coupon.trim() && (!couponResult?.valid || couponResult.code !== coupon.trim().toUpperCase())) { setSubmitError('Valida el cupón antes de continuar o quítalo del formulario.'); return; }
    setSubmitting(true); idempotencyKey.current ??= newIdempotencyKey();
    try {
      const order = await createOrder({ customer: { email: form.email, firstName: form.firstName, lastName: form.lastName, ...(form.phone.trim() ? { phone: form.phone.trim() } : {}) }, cityId: Number(form.cityId), addressLine: form.addressLine, items, ...(coupon.trim() ? { couponCode: coupon.trim().toUpperCase() } : {}) }, idempotencyKey.current);
      setCreatedOrder(order); cart.clear(); idempotencyKey.current = null;
    } catch (error) {
      const prefix = error.status === 409 ? 'La disponibilidad o las condiciones cambiaron. ' : error.status === 400 ? 'Revisa los datos del checkout. ' : '';
      setSubmitError(`${prefix}${error.message}`);
    } finally { setSubmitting(false); }
  };

  if (createdOrder) return <section className="container checkout-page"><div className="order-success"><span className="eyebrow">Orden creada</span><h1>Gracias. Nos vemos en el tatami.</h1><p>Orden <strong>{createdOrder.orderNumber ?? createdOrder.id}</strong></p><p><span className="order-status">{createdOrder.status ?? 'nueva'}</span></p><div className="summary-line summary-total"><span>Total de la orden</span><strong>{formatCRC(createdOrder.total)}</strong></div><p>Tu orden quedó nueva y pendiente de pago/confirmación. OJE no ha procesado ningún pago.</p><Link className="button" to="/catalogo">Volver a la tienda</Link></div></section>;
  if (!cart.items.length) return <section className="container checkout-page"><EmptyState title="No hay productos para pagar">Agrega equipo al carrito para continuar.</EmptyState><p style={{ textAlign: 'center' }}><Link className="button" to="/catalogo">Ir al catálogo</Link></p></section>;

  return <section className="container checkout-page"><span className="eyebrow">Último paso</span><h1 className="page-heading">Checkout</h1><p className="page-intro">La API vuelve a consultar precios, inventario, cupón y envío al crear la orden.</p>
    <div className="checkout-layout"><form className="checkout-form" onSubmit={submit}>
      <h2>Datos de contacto</h2><div className="form-grid">
        <div className="field span-two"><label htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" autoComplete="email" required maxLength="254" value={form.email} onChange={update} /></div>
        <div className="field"><label htmlFor="firstName">Nombre</label><input id="firstName" name="firstName" autoComplete="given-name" required maxLength="120" value={form.firstName} onChange={update} /></div>
        <div className="field"><label htmlFor="lastName">Apellido</label><input id="lastName" name="lastName" autoComplete="family-name" required maxLength="120" value={form.lastName} onChange={update} /></div>
        <div className="field span-two"><label htmlFor="phone">Teléfono <span className="muted">(opcional)</span></label><input id="phone" name="phone" type="tel" autoComplete="tel" maxLength="40" value={form.phone} onChange={update} /></div>
      </div>
      <h2>Envío</h2>
      {!isShippingWebhookConfigured ? <div className="notice error" role="status">Las ciudades y la verificación de cobertura no están configuradas. La orden no se puede enviar hasta configurar el webhook de n8n.</div> : null}
      {shippingError && isShippingWebhookConfigured ? <ErrorNotice message={shippingError} /> : null}
      <div className="field"><label htmlFor="cityId">Ciudad y zona</label><select id="cityId" name="cityId" required value={form.cityId} onChange={update} disabled={!isShippingWebhookConfigured || citiesLoading || !cities.length}><option value="">{citiesLoading ? 'Consultando ciudades…' : 'Selecciona una ciudad'}</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}{city.province ? ` · ${city.province}` : ''}</option>)}</select></div>
      <div className="field"><label htmlFor="addressLine">Dirección</label><textarea id="addressLine" name="addressLine" autoComplete="street-address" required maxLength="500" value={form.addressLine} onChange={update} /></div>
      {coverageLoading && <p className="muted" role="status">Consultando cobertura y tarifa…</p>}
      {coverage && <p className={`notice ${coverage.covered ? '' : 'error'}`} role="status">{coverage.message || (coverage.covered ? `Envío estimado: ${formatCRC(coverage.shippingCost)}` : 'Esta zona no tiene cobertura.')}{coverage.freeShipping && ' · Envío gratis estimado'}</p>}
      <h2>Cupón</h2><div className="coupon-row"><label className="field"><span className="sr-only">Código de cupón</span><input value={coupon} maxLength="80" onChange={(event) => { setCoupon(event.target.value); setCouponResult(null); }} placeholder="Código de cupón" /></label><button className="button secondary" type="button" onClick={checkCoupon} disabled={couponLoading || !coupon.trim() || !items.length}>{couponLoading ? 'Validando…' : 'Validar'}</button></div>
      {couponResult && <p className={`coupon-result ${couponResult.valid ? 'notice success' : 'notice error'}`} role="status">{couponResult.message}{couponResult.valid && ` Descuento estimado: ${formatCRC(couponResult.discount)}.`}</p>}
      {submitError && <p className="notice error" role="alert">{submitError}</p>}
      <div className="checkout-actions"><button className="button full" type="submit" disabled={submitting || citiesLoading || coverageLoading || !coverage?.covered || !isShippingWebhookConfigured}>{submitting ? 'Creando orden…' : 'Crear orden'}</button></div>
    </form><aside className="summary-card"><h2>Tu orden</h2>{cart.items.map((item) => <div className="summary-line" key={item.variant.id}><span>{item.quantity} × {item.product.name} <small className="muted">{item.variant.size}</small></span><span>{formatCRC(item.product.precio * item.quantity)}</span></div>)}<div className="summary-line"><span>Subtotal estimado</span><span>{formatCRC(cart.estimatedSubtotal)}</span></div>{discountEstimate > 0 && <div className="summary-line"><span>Descuento estimado</span><span>−{formatCRC(discountEstimate)}</span></div>}<div className="summary-line"><span>Envío estimado</span><span>{coverage?.covered ? (coverage.shippingCost === 0 ? 'Gratis' : formatCRC(coverage.shippingCost)) : 'Por confirmar'}</span></div><div className="summary-line summary-total"><span>Total estimado</span><span>{formatCRC(eligibleSubtotalEstimate + (coverage?.covered ? Number(coverage.shippingCost) : 0))}</span></div><p className="muted">Solo el total devuelto por la API al crear la orden será definitivo.</p><Link to="/carrito">Volver al carrito</Link></aside></div>
  </section>;
}
