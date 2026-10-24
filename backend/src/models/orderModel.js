import { withTransaction, query } from '../config/database.js';
import { randomBytes } from 'node:crypto';

async function loadOrder(client, id) {
  const result = await client.query(`
    SELECT o.id, o.public_id AS "publicId", o.order_number AS "orderNumber", o.status,
      o.currency, o.subtotal, o.discount_total AS "discountTotal", o.shipping_total AS "shippingTotal",
      o.tax_total AS "taxTotal", o.total, o.shipping_city_name AS "shippingCityName",
      o.shipping_province AS "shippingProvince", o.shipping_address_line AS "shippingAddressLine",
      o.shipping_cost_snapshot AS "shippingCost", o.placed_at AS "placedAt", o.shipped_at AS "shippedAt",
      o.cancelled_at AS "cancelledAt",
      json_build_object('id',cu.id,'email',cu.email,'firstName',cu.first_name,'lastName',cu.last_name,'phone',cu.phone) AS customer,
      cp.code AS "couponCode",
      COALESCE((SELECT json_agg(json_build_object('id',oi.id,'variantId',oi.variant_id,'productName',oi.product_name_snapshot,
        'sku',oi.sku_snapshot,'variant',oi.variant_snapshot,'quantity',oi.quantity,'unitPrice',oi.unit_price,'lineTotal',oi.line_total)
        ORDER BY oi.id) FROM order_items oi WHERE oi.order_id=o.id), '[]'::json) AS items,
      COALESCE((SELECT json_agg(json_build_object('from',oe.from_status,'to',oe.to_status,'note',oe.note,'at',oe.created_at)
        ORDER BY oe.created_at,oe.id) FROM order_events oe WHERE oe.order_id=o.id), '[]'::json) AS events,
      COALESCE((SELECT json_agg(json_build_object('provider',p.provider,'status',p.status,'amount',p.amount,'currency',p.currency,'createdAt',p.created_at)
        ORDER BY p.created_at,p.id) FROM payments p WHERE p.order_id=o.id), '[]'::json) AS payments,
      (SELECT json_build_object('carrier',s.carrier,'trackingNumber',s.tracking_number,'status',s.status,'shippedAt',s.shipped_at,'deliveredAt',s.delivered_at)
        FROM shipments s WHERE s.order_id=o.id) AS shipment
    FROM orders o JOIN customers cu ON cu.id=o.customer_id LEFT JOIN coupons cp ON cp.id=o.coupon_id
    WHERE o.id=$1`, [id]);
  return result.rows[0] ?? null;
}

function cents(value) { return Math.round(Number(value) * 100); }
function amount(value) { return Number((value / 100).toFixed(2)); }

async function activeCoupon(client, code, customerId) {
  const found = await client.query(`SELECT id, code, discount_type AS "discountType", discount_value AS "discountValue",
      starts_at AS "startsAt", expires_at AS "expiresAt", usage_limit AS "usageLimit",
      per_customer_limit AS "perCustomerLimit", minimum_subtotal AS "minimumSubtotal", is_active AS "isActive"
    FROM coupons WHERE code=$1 FOR UPDATE`, [code]);
  const coupon = found.rows[0];
  if (!coupon) throw Object.assign(new Error('El cupón no existe.'), { status: 409 });
  const usage = await client.query(`SELECT count(*) FILTER (WHERE status='redeemed')::int AS total,
      count(*) FILTER (WHERE status='redeemed' AND customer_id=$2)::int AS customer_total
    FROM coupon_redemptions WHERE coupon_id=$1`, [coupon.id, customerId]);
  const counts = usage.rows[0];
  const now = Date.now();
  if (!coupon.isActive || new Date(coupon.startsAt).getTime() > now || new Date(coupon.expiresAt).getTime() <= now) {
    throw Object.assign(new Error('El cupón no está vigente.'), { status: 409 });
  }
  if (coupon.usageLimit !== null && counts.total >= coupon.usageLimit) throw Object.assign(new Error('El cupón agotó sus usos disponibles.'), { status: 409 });
  if (counts.customer_total >= coupon.perCustomerLimit) throw Object.assign(new Error('Este cliente ya usó el cupón el máximo de veces permitido.'), { status: 409 });
  return coupon;
}

export async function createOrder(input) {
  return withTransaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [input.idempotencyKey]);
    const prior = await client.query('SELECT id, idempotency_fingerprint AS fingerprint FROM orders WHERE idempotency_key=$1', [input.idempotencyKey]);
    if (prior.rowCount) {
      if (prior.rows[0].fingerprint !== input.fingerprint) throw Object.assign(new Error('La clave de idempotencia ya se usó con otros datos.'), { status: 409 });
      return loadOrder(client, prior.rows[0].id);
    }

    const customerInsert = await client.query(`INSERT INTO customers (email,first_name,last_name,phone)
      VALUES ($1,$2,$3,$4) ON CONFLICT (email) DO NOTHING RETURNING id`,
    [input.customer.email, input.customer.firstName, input.customer.lastName, input.customer.phone]);
    let customerId = customerInsert.rows[0]?.id;
    if (!customerId) {
      const existingCustomer = await client.query('SELECT id FROM customers WHERE email=$1', [input.customer.email]);
      customerId = existingCustomer.rows[0]?.id;
    }
    if (!customerId) throw Object.assign(new Error('No se pudo resolver el cliente del checkout.'), { status: 409 });

    const cityResult = await client.query(`SELECT id,name,province,shipping_cost AS "shippingCost",is_active AS "isActive"
      FROM cities WHERE id=$1 FOR SHARE`, [input.cityId]);
    const city = cityResult.rows[0];
    if (!city) throw Object.assign(new Error('La ciudad no existe.'), { status: 404 });
    if (!city.isActive) throw Object.assign(new Error('La ciudad no tiene cobertura.'), { status: 409 });

    const setting = await client.query(`SELECT setting_value->>'amount' AS amount FROM app_settings
      WHERE setting_key='free_shipping_threshold_crc' FOR SHARE`);
    if (!setting.rows[0]) throw Object.assign(new Error('No está configurado el umbral de envío gratis.'), { status: 503 });
    const freeShippingThreshold = Number(setting.rows[0].amount);

    const coupon = input.couponCode ? await activeCoupon(client, input.couponCode, customerId) : null;
    const variantsResult = await client.query(`SELECT v.id AS "variantId",v.sku,v.size,v.color,p.name AS "productName",
        p.price AS "unitPrice",i.on_hand AS "onHand",i.reserved
      FROM product_variants v JOIN products p ON p.id=v.product_id JOIN inventory i ON i.variant_id=v.id
      WHERE v.id=ANY($1::bigint[]) AND v.is_active=true AND p.status='publicado'
      ORDER BY v.id FOR UPDATE OF i,v,p`, [input.items.map((item) => item.variantId)]);
    if (variantsResult.rows.length !== input.items.length) throw Object.assign(new Error('Una o más variantes no existen, están inactivas o no pertenecen a productos publicados.'), { status: 409 });
    const variants = new Map(variantsResult.rows.map((row) => [String(row.variantId), row]));
    let subtotalCents = 0;
    for (const item of input.items) {
      const variant = variants.get(String(item.variantId));
      const available = variant.onHand - variant.reserved;
      if (available < item.quantity) throw Object.assign(new Error(`Stock insuficiente para la variante ${item.variantId}.`), { status: 409 });
      subtotalCents += cents(variant.unitPrice) * item.quantity;
    }
    if (!Number.isSafeInteger(subtotalCents)) throw Object.assign(new Error('El subtotal excede el límite permitido.'), { status: 400 });

    let discountCents = 0;
    if (coupon) {
      if (subtotalCents < cents(coupon.minimumSubtotal)) throw Object.assign(new Error('El subtotal no alcanza el mínimo requerido por el cupón.'), { status: 409 });
      const discount = coupon.discountType === 'percent'
        ? Math.round(subtotalCents * Number(coupon.discountValue) / 100)
        : cents(coupon.discountValue);
      discountCents = Math.min(subtotalCents, discount);
    }
    const eligibleSubtotalCents = subtotalCents - discountCents;
    const shippingCents = eligibleSubtotalCents >= cents(freeShippingThreshold) ? 0 : cents(city.shippingCost);
    const subtotal = amount(subtotalCents);
    const discountTotal = amount(discountCents);
    const shippingTotal = amount(shippingCents);
    const total = amount(eligibleSubtotalCents + shippingCents);
    const orderNumber = `OJE-${randomBytes(8).toString('hex').toUpperCase()}`;

    const insertedOrder = await client.query(`INSERT INTO orders
      (order_number,customer_id,status,currency,subtotal,discount_total,shipping_total,tax_total,total,coupon_id,
       shipping_city_name,shipping_province,shipping_address_line,shipping_cost_snapshot,idempotency_key,idempotency_fingerprint)
      VALUES ($1,$2,'pending_payment','CRC',$3,$4,$5,0,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [orderNumber, customerId, subtotal, discountTotal, shippingTotal, total, coupon?.id ?? null,
      city.name, city.province, input.addressLine, Number(city.shippingCost), input.idempotencyKey, input.fingerprint]);
    const orderId = insertedOrder.rows[0].id;

    for (const item of input.items) {
      const variant = variants.get(String(item.variantId));
      const unitCents = cents(variant.unitPrice);
      const inventoryUpdate = await client.query(`UPDATE inventory SET on_hand=on_hand-$2,updated_at=now()
        WHERE variant_id=$1 AND on_hand-reserved >= $2`, [item.variantId, item.quantity]);
      if (!inventoryUpdate.rowCount) throw Object.assign(new Error(`Stock insuficiente para la variante ${item.variantId}.`), { status: 409 });
      await client.query(`INSERT INTO order_items
        (order_id,variant_id,product_name_snapshot,sku_snapshot,variant_snapshot,quantity,unit_price,line_total)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [orderId, item.variantId, variant.productName, variant.sku, `${variant.size} / ${variant.color}`,
        item.quantity, amount(unitCents), amount(unitCents * item.quantity)]);
    }
    if (coupon) await client.query(`INSERT INTO coupon_redemptions (coupon_id,customer_id,order_id,status)
      VALUES ($1,$2,$3,'redeemed')`, [coupon.id, customerId, orderId]);
    await client.query(`INSERT INTO order_events (order_id,from_status,to_status,note)
      VALUES ($1,NULL,'pending_payment','Orden creada; pendiente de confirmación de pago')`, [orderId]);
    return loadOrder(client, orderId);
  });
}

export async function listOrders({ statuses, from, to, q, limit, offset }) {
  const values = [];
  const clauses = [];
  const add = (value) => { values.push(value); return `$${values.length}`; };
  if (statuses) clauses.push(`o.status=ANY(${add(statuses)}::text[])`);
  if (from) clauses.push(`o.placed_at >= ${add(from)}`);
  if (to) clauses.push(`o.placed_at <= ${add(to)}`);
  if (q) { const parameter = add(`%${q}%`); clauses.push(`(o.order_number ILIKE ${parameter} OR cu.email ILIKE ${parameter})`); }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const filterValues = [...values];
  const count = await query(`SELECT count(*)::int AS total FROM orders o JOIN customers cu ON cu.id=o.customer_id ${where}`, filterValues);
  const limitParam = `$${values.length + 1}`;
  const offsetParam = `$${values.length + 2}`;
  const rows = await query(`SELECT o.id,o.public_id AS "publicId",o.order_number AS "orderNumber",o.status,
      o.currency,o.subtotal,o.discount_total AS "discountTotal",o.shipping_total AS "shippingTotal",o.total,
      o.placed_at AS "placedAt",cu.email AS "customerEmail",cu.first_name AS "customerFirstName",
      cu.last_name AS "customerLastName",o.shipping_city_name AS "shippingCityName"
    FROM orders o JOIN customers cu ON cu.id=o.customer_id ${where}
    ORDER BY o.placed_at DESC,o.id DESC LIMIT ${limitParam} OFFSET ${offsetParam}`, [...filterValues, limit, offset]);
  return { data: rows.rows, total: count.rows[0].total };
}

export async function getOrder(id) {
  const result = await query('SELECT id FROM orders WHERE id=$1', [id]);
  if (!result.rowCount) return null;
  return withTransaction((client) => loadOrder(client, id));
}

export async function advanceOrder(id, toStatus, actorId) {
  return withTransaction(async (client) => {
    const found = await client.query('SELECT id,status FROM orders WHERE id=$1 FOR UPDATE', [id]);
    if (!found.rowCount) return null;
    const current = found.rows[0].status;
    const allowed = (toStatus === 'paid' && current === 'pending_payment')
      || (toStatus === 'shipped' && ['paid','processing'].includes(current))
      || (toStatus === 'delivered' && current === 'shipped');
    if (!allowed) throw Object.assign(new Error('La transición de estado no está permitida.'), { status: 409 });
    if (toStatus === 'paid') {
      const payment = await client.query(`SELECT id FROM payments WHERE order_id=$1 AND status='paid'
        AND currency='CRC' AND amount=(SELECT total FROM orders WHERE id=$1) LIMIT 1 FOR UPDATE`, [id]);
      if (!payment.rowCount) throw Object.assign(new Error('No se puede marcar pagada sin un pago confirmado.'), { status: 409 });
    }
    await client.query(`UPDATE orders SET status=$2,shipped_at=CASE WHEN $2='shipped' THEN now() ELSE shipped_at END
      WHERE id=$1`, [id, toStatus]);
    if (toStatus === 'delivered') await client.query(`UPDATE shipments SET status='delivered',delivered_at=now() WHERE order_id=$1`, [id]);
    await client.query(`INSERT INTO order_events (order_id,from_status,to_status,note)
      VALUES ($1,$2,$3,'Cambio administrativo de estado')`, [id, current, toStatus]);
    await client.query(`INSERT INTO audit_log (actor_user_id,action,resource_type,resource_id,metadata)
      VALUES ($1,'order.status_changed','order',$2,jsonb_build_object('from',$3,'to',$4))`, [actorId, String(id), current, toStatus]);
    return loadOrder(client, id);
  });
}

export async function confirmManualPayment(id, { reference, note }, actorId) {
  return withTransaction(async (client) => {
    const found = await client.query(`SELECT id,status,total,currency FROM orders WHERE id=$1 FOR UPDATE`, [id]);
    if (!found.rowCount) return null;
    const order = found.rows[0];
    if (order.status !== 'pending_payment') throw Object.assign(new Error('Solo se puede confirmar el pago de una orden nueva.'), { status: 409 });
    const existing = await client.query(`SELECT id FROM payments WHERE order_id=$1 AND status='paid' FOR UPDATE`, [id]);
    if (existing.rowCount) throw Object.assign(new Error('El pago de esta orden ya fue confirmado.'), { status: 409 });
    const inserted = await client.query(`INSERT INTO payments
      (order_id,provider,provider_reference,status,amount,currency)
      VALUES ($1,'manual',$2,'paid',$3,$4)
      RETURNING id,order_id AS "orderId",provider,provider_reference AS reference,status,amount,currency,created_at AS "createdAt"`,
    [id, reference ?? null, order.total, order.currency]);
    await client.query(`INSERT INTO order_events (order_id,from_status,to_status,note)
      VALUES ($1,'pending_payment','pending_payment',$2)`, [id, note || 'Pago externo confirmado manualmente por administración']);
    await client.query(`INSERT INTO audit_log (actor_user_id,action,resource_type,resource_id,metadata)
      VALUES ($1,'payment.manual_confirmed','order',$2,jsonb_build_object('payment_id',$3,'reference',$4))`,
    [actorId, String(id), inserted.rows[0].id, reference ?? null]);
    return inserted.rows[0];
  });
}

export async function cancelOrder(id, actorId) {
  return withTransaction(async (client) => {
    const found = await client.query('SELECT id,status,coupon_id FROM orders WHERE id=$1 FOR UPDATE', [id]);
    if (!found.rowCount) return null;
    const order = found.rows[0];
    if (['shipped','delivered','cancelled'].includes(order.status)) throw Object.assign(new Error('La orden no se puede cancelar en su estado actual.'), { status: 409 });
    const config = await client.query(`SELECT setting_value FROM app_settings WHERE setting_key='coupon_restore_on_cancel' FOR SHARE`);
    const restoration = config.rows[0]?.setting_value;
    if (order.coupon_id) {
      const redemption = await client.query(`SELECT cr.id,c.is_active,c.starts_at,c.expires_at
        FROM coupon_redemptions cr JOIN coupons c ON c.id=cr.coupon_id
        WHERE cr.order_id=$1 AND cr.status='redeemed' FOR UPDATE OF cr,c`, [id]);
      if (redemption.rowCount && restoration?.enabled && restoration?.only_before_shipment && restoration?.only_if_coupon_current) {
        const coupon = redemption.rows[0];
        const now = Date.now();
        if (coupon.is_active && new Date(coupon.starts_at).getTime() <= now && new Date(coupon.expires_at).getTime() > now) {
          await client.query(`UPDATE coupon_redemptions SET status='reversed',reversed_at=now() WHERE id=$1 AND status='redeemed'`, [coupon.id]);
        }
      }
    }
    const items = await client.query('SELECT variant_id AS "variantId",quantity FROM order_items WHERE order_id=$1 ORDER BY variant_id', [id]);
    const inventory = await client.query(`SELECT variant_id FROM inventory WHERE variant_id=ANY($1::bigint[]) ORDER BY variant_id FOR UPDATE`, [items.rows.map((item) => item.variantId)]);
    if (inventory.rowCount !== items.rowCount) throw Object.assign(new Error('No se pudo restituir el inventario de la orden.'), { status: 409 });
    for (const item of items.rows) {
      const update = await client.query('UPDATE inventory SET on_hand=on_hand+$2,updated_at=now() WHERE variant_id=$1', [item.variantId, item.quantity]);
      if (!update.rowCount) throw Object.assign(new Error('No se pudo restituir el inventario de la orden.'), { status: 409 });
    }
    await client.query(`UPDATE orders SET status='cancelled',cancelled_at=now() WHERE id=$1`, [id]);
    await client.query(`INSERT INTO order_events (order_id,from_status,to_status,note)
      VALUES ($1,$2,'cancelled','Orden cancelada antes del envío')`, [id, order.status]);
    await client.query(`INSERT INTO audit_log (actor_user_id,action,resource_type,resource_id,metadata)
      VALUES ($1,'order.cancelled','order',$2,'{}'::jsonb)`, [actorId, String(id)]);
    return loadOrder(client, id);
  });
}
