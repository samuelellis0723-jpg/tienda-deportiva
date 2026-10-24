import { query } from '../config/database.js';

const fields = `id, name, province, shipping_cost AS "shippingCost", is_active AS "isActive"`;

export async function listCities({ includeInactive = false } = {}) {
  const result = await query(`SELECT ${fields} FROM cities ${includeInactive ? '' : 'WHERE is_active=true'} ORDER BY province, name`);
  return result.rows;
}

export async function getCity(id) {
  const result = await query(`SELECT ${fields} FROM cities WHERE id=$1`, [id]);
  return result.rows[0] ?? null;
}

export async function insertCity(city) {
  const result = await query(`INSERT INTO cities (name,province,shipping_cost,is_active)
    VALUES ($1,$2,$3,$4) RETURNING ${fields}`,
  [city.name, city.province, city.shippingCost, city.isActive]);
  return result.rows[0];
}

export async function updateCity(id, city) {
  const result = await query(`UPDATE cities SET name=$2,province=$3,shipping_cost=$4,is_active=$5
    WHERE id=$1 RETURNING ${fields}`,
  [id, city.name, city.province, city.shippingCost, city.isActive]);
  return result.rows[0] ?? null;
}

export async function deleteCity(id) {
  const result = await query('DELETE FROM cities WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}

export async function getFreeShippingThreshold() {
  const result = await query(`SELECT setting_value->>'amount' AS amount
    FROM app_settings WHERE setting_key='free_shipping_threshold_crc'`);
  if (!result.rows[0]) throw Object.assign(new Error('No está configurado el umbral de envío gratis.'), { status: 503 });
  return Number(result.rows[0].amount);
}
