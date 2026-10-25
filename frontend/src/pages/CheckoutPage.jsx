import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext.jsx';
import { validateCoupon } from '../services/coupon-service.js';
import { useOrder } from '../context/OrderContext.jsx';
import { estimateShipping, getCities, isShippingWebhookConfigured } from '../services/shipping-service.js';
import { formatCRC } from '../utils/format.js';
import { ErrorNotice, EmptyState } from '../components/ui/AsyncState.jsx';


export default function CheckoutPage() {
  const cart = useCart(); const order = useOrder();
  const form = order.draft; const setForm = order.setDraft;
  const [cities, setCities] = useState([]); const [citiesLoading, setCitiesLoading] = useState(isShippingWebhookConfigured); const [shippingError, setShippingError] = useState('');
  const [shippingRevision, setShippingRevision] = useState(0);
  const [coverage, setCoverage] = useState(null); const [coverageLoading, setCoverageLoading] = useState(false);
  const coupon = order.coupon; const setCoupon = order.setCoupon; const [couponResult, setCouponResult] = useState(null); const [couponLoading, setCouponLoading] = useState(false);
  const [submitError, setSubmitError] = useState(''); const submitting = order.status === 'submitting'; const uncertain = order.status === 'uncertain'; const createdOrder = order.result;


  const currentCouponRequest = useRef('');
  const items = useMemo(() => cart.items.map((item) => ({ variantId: Number(item.variant.id), quantity: item.quantity })), [cart.items]);
  const discountEstimate = couponResult?.valid && couponResult.code === coupon.trim().toUpperCase() ? Number(couponResult.discount) : 0;
  const eligibleSubtotalEstimate = Math.max(0, cart.estimatedSubtotal - discountEstimate);
  const couponSignature = JSON.stringify([coupon, items]);
  currentCouponRequest.current = couponSignature;
  useEffect(() => { setCouponResult(null); }, [items]);

  useEffect(() => {
    if (!isShippingWebhookConfigured) { setCitiesLoading(false); setShippingError('No pudimos consultar las zonas de entrega. Intentá de nuevo más tarde.'); return; }
    let active = true; setCitiesLoading(true); setShippingError('');
    getCities().then((rows) => { if (active) setCities(rows); }).catch((error) => { if (active) setShippingError(error.message); }).finally(() => { if (active) setCitiesLoading(false); });
    return () => { active = false; };
  }, [shippingRevision]);



  useEffect(() => {
    if (!form.cityId || !cities.length || !isShippingWebhookConfigured) { setCoverage(null); setCoverageLoading(false); return; }
    let active = true; setCoverageLoading(true); setCoverage(null); setShippingError('');
    estimateShipping(form.cityId, eligibleSubtotalEstimate).then((result) => { if (active) setCoverage(result); }).catch((error) => { if (active) { setCoverage(null); setShippingError(error.message); } }).finally(() => { if (active) setCoverageLoading(false); });
    return () => { active = false; };
  }, [form.cityId, cities.length, eligibleSubtotalEstimate, shippingRevision]);

  const update = (event) => { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); setSubmitError(''); };
  const checkCoupon = async () => {
    if (!coupon.trim()) { setCouponResult(null); return; }
    const signature = couponSignature;
    setCouponLoading(true); setCouponResult(null); setSubmitError('');
    try { const result = await validateCoupon(coupon.trim(), items); if (currentCouponRequest.current === signature) setCouponResult(result); }
    catch (error) { if (currentCouponRequest.current === signature) setCouponResult({ valid: false, message: error.message }); }
    finally { setCouponLoading(false); }
  };
  const submit = async (event) => {
    event.preventDefault(); setSubmitError('');
    if (submitting) return;
    if (uncertain) { await order.submit(); return; }
    if (cart.isLocked || cart.checking || couponLoading || coverageLoading) return;
    if (!isShippingWebhookConfigured || shippingError || !coverage?.covered) { setSubmitError('Necesitamos confirmar la cobertura de la ciudad antes de crear la orden.'); return; }
    if (coupon.trim() && (!couponResult?.valid || couponResult.code !== coupon.trim().toUpperCase())) { setSubmitError('Valida el cupón antes de continuar o quítalo del formulario.'); return; }
    await order.submit({ customer: { email: form.email, firstName: form.firstName, lastName: form.lastName, ...(form.phone.trim() ? { phone: form.phone.trim() } : {}) }, cityId: Number(form.cityId), addressLine: form.addressLine, items, ...(coupon.trim() ? { couponCode: coupon.trim().toUpperCase() } : {}) });
  };

  if (createdOrder) return <section className="container checkout-page"><div className="order-success"><span className="eyebrow">Orden creada</span><h1>Gracias. Nos vemos en el tatami.</h1><p>Orden <strong>{createdOrder.orderNumber ?? createdOrder.id}</strong></p><p><span className="order-status">{'Pendiente de pago manual'}</span></p><div className="summary-line summary-total"><span>Total de la orden</span><strong>{formatCRC(createdOrder.total)}</strong></div><p>Tu orden está pendiente de pago manual. Conservá este número y confirmá las instrucciones con OJE antes de transferir. No se procesó ningún cobro.</p><Link className="button" to="/catalogo" onClick={order.reset}>Volver a la tienda</Link></div></section>;
  if (submitting || uncertain) return <section className="container checkout-page"><div className="order-success"><span className="eyebrow">TU SOLICITUD ESTÁ PROTEGIDA</span><h1>{submitting ? 'Confirmando tu orden.' : 'Confirmemos el resultado.'}</h1><p role="status">{submitting ? 'Esperá mientras confirmamos tu solicitud. Podés cambiar de página; el carrito permanece protegido.' : order.error}</p><h2>Datos enviados</h2><p>{order.attempt?.payload.customer.firstName} {order.attempt?.payload.customer.lastName}<br/>{order.attempt?.payload.customer.email}<br/>{order.attempt?.payload.addressLine}</p>{order.attempt?.payload.couponCode && <p>Cupón enviado: <strong>{order.attempt.payload.couponCode}</strong></p>}<ul>{cart.items.map(item => <li key={item.variant.id}>{item.quantity} × {item.product.name} · {item.variant.size} · {item.variant.color}</li>)}</ul><p>El total definitivo se mostrará cuando recibamos la confirmación.</p>{uncertain && <button className="button full" onClick={() => order.submit()}>Reintentar la misma orden →</button>}</div></section>;
  if (!cart.items.length) return <section className="container checkout-page"><EmptyState title="No hay productos para pagar">Agrega equipo al carrito para continuar.</EmptyState><p className="text-center"><Link className="button" to="/catalogo">Ir al catálogo</Link></p></section>;

  return <section className="container checkout-page"><span className="eyebrow">TU PRÓXIMA PRÁCTICA, MÁS CERCA</span><h1 className="page-heading">Finalizá tu orden.</h1><p className="page-intro">Revisá tus datos y el envío. El pago se coordina manualmente después de crear tu orden.</p><div className="checkout-steps" aria-label="Pasos de compra"><span>01 · Contacto</span><span>02 · Envío</span><span>03 · Revisar y crear</span></div>
    <div className="checkout-layout"><form className="checkout-form" onSubmit={submit}>
      <fieldset className="checkout-fieldset" disabled={submitting || uncertain}><legend className="sr-only">Datos de la orden</legend><h2>Datos de contacto</h2><div className="form-grid">
        <div className="field span-two"><label htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" autoComplete="email" required maxLength="254" value={form.email} onChange={update} /></div>
        <div className="field"><label htmlFor="firstName">Nombre</label><input id="firstName" name="firstName" autoComplete="given-name" required maxLength="120" value={form.firstName} onChange={update} /></div>
        <div className="field"><label htmlFor="lastName">Apellido</label><input id="lastName" name="lastName" autoComplete="family-name" required maxLength="120" value={form.lastName} onChange={update} /></div>
        <div className="field span-two"><label htmlFor="phone">Teléfono <span className="muted">(opcional)</span></label><input id="phone" name="phone" type="tel" autoComplete="tel" maxLength="40" value={form.phone} onChange={update} /></div>
      </div>
      <h2>Envío</h2>
      {!isShippingWebhookConfigured ? <div className="notice error" role="status">No podemos confirmar la cobertura en este momento. Intentá de nuevo más tarde.</div> : null}
      {shippingError && isShippingWebhookConfigured ? <ErrorNotice message={shippingError} onRetry={() => setShippingRevision(value => value + 1)} /> : null}
      <div className="field"><label htmlFor="cityId">Ciudad y zona</label><select id="cityId" name="cityId" required value={form.cityId} onChange={update} disabled={!isShippingWebhookConfigured || citiesLoading || !cities.length}><option value="">{citiesLoading ? 'Consultando ciudades…' : 'Selecciona una ciudad'}</option>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}{city.province ? ` · ${city.province}` : ''}</option>)}</select></div>
      <div className="field"><label htmlFor="addressLine">Dirección</label><textarea id="addressLine" name="addressLine" autoComplete="street-address" required maxLength="500" value={form.addressLine} onChange={update} /></div>
      {coverageLoading && <p className="muted" role="status">Consultando cobertura y tarifa…</p>}
      {coverage && <p className={`notice ${coverage.covered ? '' : 'error'}`} role="status">{coverage.message || (coverage.covered ? `Envío estimado: ${formatCRC(coverage.shippingCost)}` : 'Esta zona no tiene cobertura.')}{coverage.freeShipping && ' · Envío gratis estimado'}</p>}
      <h2>Cupón</h2><div className="coupon-row"><label className="field"><span className="sr-only">Código de cupón</span><input value={coupon} maxLength="80" onChange={(event) => { setCoupon(event.target.value); setCouponResult(null); }} placeholder="Código de cupón" /></label><button className="button secondary" type="button" onClick={checkCoupon} disabled={couponLoading || !coupon.trim() || !items.length}>{couponLoading ? 'Validando…' : 'Validar'}</button></div>
      {couponResult && <p className={`coupon-result ${couponResult.valid ? 'notice success' : 'notice error'}`} role="status">{couponResult.message}{couponResult.valid && ` Descuento estimado: ${formatCRC(couponResult.discount)}.`}</p>}
      {(submitError || order.error) && <p className="notice error" role="alert">{submitError || order.error}</p>}
      <div className="checkout-actions"><button className="button full" type="submit" disabled={submitting || cart.checking || Boolean(cart.stockError) || citiesLoading || coverageLoading || couponLoading || !coverage?.covered || !isShippingWebhookConfigured}>{submitting ? 'Creando orden…' : 'Crear orden pendiente de pago →'}</button></div></fieldset>{uncertain && <div className="notice error" role="alert"><p>{order.error}</p><button className="button full" type="button" onClick={() => order.submit()}>Reintentar la misma orden →</button></div>}
    </form><aside className="summary-card"><h2>Tu orden</h2>{cart.items.map((item) => <div className="summary-line" key={item.variant.id}><span>{item.quantity} × {item.product.name} <small className="muted">{item.variant.size}</small></span><span>{formatCRC(item.product.precio * item.quantity)}</span></div>)}<div className="summary-line"><span>Subtotal estimado</span><span>{formatCRC(cart.estimatedSubtotal)}</span></div>{discountEstimate > 0 && <div className="summary-line"><span>Descuento estimado</span><span>−{formatCRC(discountEstimate)}</span></div>}<div className="summary-line"><span>Envío estimado</span><span>{coverage?.covered ? (coverage.shippingCost === 0 ? 'Gratis' : formatCRC(coverage.shippingCost)) : 'Por confirmar'}</span></div><div className="summary-line summary-total"><span>Total estimado</span><span>{formatCRC(eligibleSubtotalEstimate + (coverage?.covered ? Number(coverage.shippingCost) : 0))}</span></div><p className="muted">El total definitivo se confirma al crear la orden. No se realizará ningún cobro en línea.</p><Link to="/carrito">Volver al carrito</Link></aside></div>
  </section>;
}
