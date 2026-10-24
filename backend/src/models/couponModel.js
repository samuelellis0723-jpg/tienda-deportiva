import { query } from '../config/database.js';

const fields = `id, code, discount_type AS "discountType", discount_value AS "discountValue",
  starts_at AS "startsAt", expires_at AS "expiresAt", usage_limit AS "usageLimit",
  per_customer_limit AS "perCustomerLimit", minimum_subtotal AS "minimumSubtotal", is_active AS "isActive"`;

export async function listCoupons() {
  const result = await query(`SELECT ${fields} FROM coupons ORDER BY created_at DESC, id DESC`);
  return result.rows;
}
export async function getCoupon(id) {
  const result = await query(`SELECT ${fields} FROM coupons WHERE id=$1`, [id]);
  return result.rows[0] ?? null;
}
export async function insertCoupon(coupon) {
  const result = await query(`INSERT INTO coupons
    (code,discount_type,discount_value,starts_at,expires_at,usage_limit,per_customer_limit,minimum_subtotal,is_active)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING ${fields}`,
  [coupon.code, coupon.discountType, coupon.discountValue, coupon.startsAt, coupon.expiresAt,
    coupon.usageLimit, coupon.perCustomerLimit, coupon.minimumSubtotal, coupon.isActive]);
  return result.rows[0];
}
export async function updateCoupon(id, coupon) {
  const result = await query(`UPDATE coupons SET code=$2,discount_type=$3,discount_value=$4,starts_at=$5,expires_at=$6,
    usage_limit=$7,per_customer_limit=$8,minimum_subtotal=$9,is_active=$10 WHERE id=$1 RETURNING ${fields}`,
  [id, coupon.code, coupon.discountType, coupon.discountValue, coupon.startsAt, coupon.expiresAt,
    coupon.usageLimit, coupon.perCustomerLimit, coupon.minimumSubtotal, coupon.isActive]);
  return result.rows[0] ?? null;
}
export async function deleteCoupon(id) {
  const result = await query('DELETE FROM coupons WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

export async function priceVariants(variantIds) {
  const result = await query(`SELECT v.id AS "variantId", p.price AS "unitPrice"
    FROM product_variants v JOIN products p ON p.id=v.product_id
    WHERE v.id=ANY($1::bigint[]) AND v.is_active=true AND p.status='publicado'`, [variantIds]);
  return result.rows;
}

export async function getCouponUsage(code, customerId) {
  const result = await query(`SELECT c.id, c.code, c.discount_type AS "discountType", c.discount_value AS "discountValue",
      c.starts_at AS "startsAt", c.expires_at AS "expiresAt", c.usage_limit AS "usageLimit",
      c.per_customer_limit AS "perCustomerLimit", c.minimum_subtotal AS "minimumSubtotal", c.is_active AS "isActive",
      count(cr.id) FILTER (WHERE cr.status='redeemed')::int AS "usageCount",
      count(cr.id) FILTER (WHERE cr.status='redeemed' AND cr.customer_id=$2)::int AS "customerUsageCount"
    FROM coupons c LEFT JOIN coupon_redemptions cr ON cr.coupon_id=c.id
    WHERE c.code=$1 GROUP BY c.id`, [code, customerId]);
  return result.rows[0] ?? null;
}
