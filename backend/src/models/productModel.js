import { query, withTransaction } from '../config/database.js';
import { salesWindowCte, availableStockSql, lowStockThresholdSql, replenishmentPredicateSql, stockStatusSql } from './stockPolicy.js';

function productSelect({ includeInactiveRelations = false } = {}) { return `
  WITH ${salesWindowCte}
  SELECT p.id, p.sku, p.slug, p.name, p.description, p.image_url AS "imageUrl", p.status AS estado,
         p.price AS precio, p.currency AS moneda, p.created_at AS "createdAt",
         p.updated_at AS "updatedAt", p.published_at AS "publishedAt",
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', c.id, 'parentId', c.parent_id, 'slug', c.slug, 'name', c.name
             ${includeInactiveRelations ? ", 'isActive', c.is_active" : ''}
           ) ORDER BY c.name)
           FROM product_categories pc JOIN categories c ON c.id = pc.category_id
           WHERE pc.product_id = p.id ${includeInactiveRelations ? '' : `AND c.is_active=true AND NOT EXISTS (
             WITH RECURSIVE ancestors(id, parent_id, is_active) AS (
               SELECT parent.id, parent.parent_id, parent.is_active FROM categories parent WHERE parent.id=c.parent_id
               UNION ALL
               SELECT parent.id, parent.parent_id, parent.is_active FROM categories parent JOIN ancestors child ON parent.id=child.parent_id
             ) SELECT 1 FROM ancestors WHERE is_active=false
           )`}
         ), '[]'::json) AS categorias,
         COALESCE((
           WITH RECURSIVE ancestry(id, parent_id, slug) AS (
             SELECT c.id, c.parent_id, c.slug
             FROM product_categories pc JOIN categories c ON c.id=pc.category_id
             WHERE pc.product_id=p.id ${includeInactiveRelations ? '' : 'AND c.is_active=true'}
             UNION ALL
             SELECT parent.id, parent.parent_id, parent.slug
             FROM categories parent JOIN ancestry child ON parent.id=child.parent_id ${includeInactiveRelations ? '' : 'WHERE parent.is_active=true'}
           )
           SELECT json_agg(DISTINCT slug ORDER BY slug)
           FROM ancestry WHERE slug IN ('judo','bjj')
         ), '[]'::json) AS deportes,
         (
           SELECT json_build_object('id', c.id, 'slug', c.slug, 'name', c.name)
           FROM product_categories pc JOIN categories c ON c.id=pc.category_id
           JOIN categories parent ON parent.id=c.parent_id
           WHERE pc.product_id=p.id AND (parent.slug='uniformes' OR parent.slug IN ('judo','bjj'))
             ${includeInactiveRelations ? '' : 'AND c.is_active=true AND parent.is_active=true'}
           ORDER BY CASE WHEN parent.slug='uniformes' THEN 0 ELSE 1 END, c.name, c.id LIMIT 1
         ) AS "tipoProducto",
         COALESCE((
           SELECT json_agg(json_build_object(
             'id', v.id, 'sku', v.sku, 'size', v.size, 'color', v.color,
             ${includeInactiveRelations ? "'isActive', v.is_active, 'stock', COALESCE(i.on_hand, 0)," : ''}
             'availableStock', ${availableStockSql()},
             'lowStockThreshold', ${lowStockThresholdSql()},
             'stockStatus', ${stockStatusSql(availableStockSql(), lowStockThresholdSql())}
           ) ORDER BY v.id)
           FROM product_variants v LEFT JOIN inventory i ON i.variant_id = v.id
           LEFT JOIN sales_7_days s ON s.variant_id=v.id
           WHERE v.product_id = p.id ${includeInactiveRelations ? '' : 'AND v.is_active=true'}
         ), '[]'::json) AS variantes
  FROM products p`; }

export async function listProducts({ q, categoryId, sportCategoryId, typeCategoryId, status, available, lowStock = false, sort, direction, limit, offset, includeInactiveRelations = false }) {
  const values = [];
  const conditions = [];
  const add = (value) => { values.push(value); return `$${values.length}`; };
  if (status) conditions.push(`p.status = ${add(status)}`);
  else conditions.push("p.status = 'publicado'");
  if (q) {
    const parameter = add(`%${q}%`);
    conditions.push(`(p.name ILIKE ${parameter} OR p.description ILIKE ${parameter} OR p.sku ILIKE ${parameter})`);
  }
  if (categoryId) {
    const parameter = add(categoryId);
    const activeCategoryLineage = includeInactiveRelations ? '' : `AND c.is_active=true
      AND NOT EXISTS (
        WITH RECURSIVE ancestors(id, parent_id, is_active) AS (
          SELECT parent.id, parent.parent_id, parent.is_active FROM categories parent WHERE parent.id=c.parent_id
          UNION ALL
          SELECT parent.id, parent.parent_id, parent.is_active FROM categories parent JOIN ancestors child ON parent.id=child.parent_id
        ) SELECT 1 FROM ancestors WHERE is_active=false
      )`;
    conditions.push(`EXISTS (
      SELECT 1 FROM product_categories pc JOIN categories c ON c.id=pc.category_id
      WHERE pc.product_id=p.id AND c.id=${parameter} ${activeCategoryLineage}
    )`);
  }
  if (sportCategoryId) {
    const parameter = add(sportCategoryId);
    conditions.push(`EXISTS (
      WITH RECURSIVE sport_tree(id) AS (
        SELECT ${parameter}::bigint
        UNION ALL SELECT c.id FROM categories c JOIN sport_tree parent ON c.parent_id=parent.id WHERE c.is_active=true
      )
      SELECT 1 FROM product_categories pc JOIN sport_tree st ON st.id=pc.category_id WHERE pc.product_id=p.id
    )`);
  }
  if (typeCategoryId) {
    const parameter = add(typeCategoryId);
    conditions.push(`EXISTS (
      WITH RECURSIVE type_tree(id) AS (
        SELECT ${parameter}::bigint
        UNION ALL SELECT c.id FROM categories c JOIN type_tree parent ON c.parent_id=parent.id WHERE c.is_active=true
      )
      SELECT 1 FROM product_categories pc JOIN type_tree tt ON tt.id=pc.category_id WHERE pc.product_id=p.id
    )`);
  }
  if (available !== null) {
    conditions.push(available
      ? `EXISTS (SELECT 1 FROM product_variants v LEFT JOIN inventory i ON i.variant_id=v.id WHERE v.product_id=p.id AND v.is_active=true AND ${availableStockSql()}>0)`
      : `NOT EXISTS (SELECT 1 FROM product_variants v LEFT JOIN inventory i ON i.variant_id=v.id WHERE v.product_id=p.id AND v.is_active=true AND ${availableStockSql()}>0)`);
  }
  if (lowStock) conditions.push(`p.status='publicado' AND EXISTS (
    SELECT 1 FROM product_variants v LEFT JOIN inventory i ON i.variant_id=v.id
    LEFT JOIN sales_7_days s ON s.variant_id=v.id
    WHERE v.product_id=p.id AND v.is_active=true
      AND ${replenishmentPredicateSql(availableStockSql(), lowStockThresholdSql())}
  )`);
  const orderBy = { nombre: 'p.name', precio: 'p.price', reciente: 'COALESCE(p.published_at,p.created_at)', name: 'p.name', price: 'p.price', created_at: 'p.created_at' }[sort] ?? 'COALESCE(p.published_at,p.created_at)';
  const limitParam = add(limit);
  const offsetParam = add(offset);
  const sql = `${productSelect({ includeInactiveRelations })} WHERE ${conditions.join(' AND ')} ORDER BY ${orderBy} ${direction === 'asc' ? 'ASC' : 'DESC'}, p.id ASC LIMIT ${limitParam} OFFSET ${offsetParam}`;
  const result = await query(sql, values);
  const countValues = values.slice(0, values.length - 2);
  const countResult = await query(`WITH ${salesWindowCte} SELECT count(*)::int AS total FROM products p WHERE ${conditions.join(' AND ')}`, countValues);
  return { data: result.rows, total: countResult.rows[0].total };
}

export async function listProductTypes() {
  const result = await query(`
    SELECT type.id, type.slug, type.name,
      COUNT(DISTINCT p.id) FILTER (WHERE p.status='publicado')::int AS "productCount"
    FROM categories root JOIN categories type ON type.parent_id=root.id
    LEFT JOIN product_categories pc ON pc.category_id=type.id
    LEFT JOIN products p ON p.id=pc.product_id
    WHERE root.slug='uniformes' AND root.parent_id IS NULL AND root.is_active=true AND type.is_active=true
    GROUP BY type.id,type.slug,type.name
    ORDER BY type.id`);
  return result.rows;
}

export async function getProduct(id, { publicOnly = false, includeInactiveRelations = false } = {}) {
  const result = await query(`${productSelect({ includeInactiveRelations })} WHERE p.id=$1 ${publicOnly ? "AND p.status='publicado'" : ''}`, [id]);
  return result.rows[0] ?? null;
}

async function validateCategoryIds(client, categoryIds) {
  if (!categoryIds.length) return;
  const result = await client.query('SELECT id FROM categories WHERE id = ANY($1::bigint[]) AND is_active=true', [categoryIds]);
  if (result.rowCount !== categoryIds.length) {
    const error = new Error('Una o más categorías no existen o están inactivas.');
    error.status = 400;
    throw error;
  }
}

async function replaceCategories(client, productId, categoryIds) {
  await client.query('DELETE FROM product_categories WHERE product_id=$1', [productId]);
  for (const categoryId of categoryIds) {
    await client.query('INSERT INTO product_categories (product_id, category_id) VALUES ($1,$2)', [productId, categoryId]);
  }
}

async function replaceVariants(client, productId, variants) {
  const existing = await client.query('SELECT id, sku FROM product_variants WHERE product_id=$1 FOR UPDATE', [productId]);
  const byId = new Map(existing.rows.map((row) => [String(row.id), row]));
  const bySku = new Map(existing.rows.map((row) => [row.sku, row]));
  const retained = new Set();

  for (const variant of variants) {
    const current = variant.id ? byId.get(String(variant.id)) : bySku.get(variant.sku);
    if (variant.id && !current) {
      const error = new Error('La variante no pertenece al producto.');
      error.status = 400;
      throw error;
    }
    let variantId;
    if (current) {
      const updated = await client.query(`
        UPDATE product_variants SET sku=$2, size=$3, color=$4, is_active=$5
        WHERE id=$1 RETURNING id`,
      [current.id, variant.sku, variant.size, variant.color, variant.isActive]);
      variantId = updated.rows[0].id;
      retained.add(String(variantId));
      await client.query(`
        INSERT INTO inventory (variant_id,on_hand,reserved) VALUES ($1,$2,0)
        ON CONFLICT (variant_id) DO UPDATE SET on_hand=EXCLUDED.on_hand, updated_at=now()`,
      [variantId, variant.stock]);
    } else {
      const inserted = await client.query(`
        INSERT INTO product_variants (product_id,sku,size,color,is_active) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [productId, variant.sku, variant.size, variant.color, variant.isActive]);
      variantId = inserted.rows[0].id;
      retained.add(String(variantId));
      await client.query('INSERT INTO inventory (variant_id,on_hand,reserved) VALUES ($1,$2,0)', [variantId, variant.stock]);
    }
  }
  for (const variant of existing.rows) {
    if (!retained.has(String(variant.id))) await client.query('DELETE FROM product_variants WHERE id=$1', [variant.id]);
  }
}

export async function insertProduct(product) {
  return withTransaction(async (client) => {
    await validateCategoryIds(client, product.categoryIds);
    const result = await client.query(`
      INSERT INTO products (sku,slug,name,description,image_url,price,currency)
      VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [product.sku, product.slug, product.name, product.description, product.imageUrl, product.price, product.currency]);
    const id = result.rows[0].id;
    await replaceCategories(client, id, product.categoryIds);
    await replaceVariants(client, id, product.variants);
    return id;
  });
}

export async function updateProduct(id, product) {
  return withTransaction(async (client) => {
    const currentResult = await client.query('SELECT id FROM products WHERE id=$1 FOR UPDATE', [id]);
    if (!currentResult.rowCount) return null;
    if (product.categoryIds !== undefined) {
      await validateCategoryIds(client, product.categoryIds);
      await replaceCategories(client, id, product.categoryIds);
    }
    if (product.variants !== undefined) await replaceVariants(client, id, product.variants);
    await client.query(`
      UPDATE products SET sku=$2, slug=$3, name=$4, description=$5, image_url=$6, price=$7, currency=$8, updated_at=now()
      WHERE id=$1`, [id, product.sku, product.slug, product.name, product.description, product.imageUrl, product.price, product.currency]);
    const stateResult = await client.query('SELECT status FROM products WHERE id=$1', [id]);
    if (stateResult.rows[0].status === 'publicado') await assertPublishable(client, id);
    return id;
  });
}

export async function deleteProduct(id) {
  return withTransaction(async (client) => {
    const exists = await client.query('SELECT id FROM products WHERE id=$1 FOR UPDATE', [id]);
    if (!exists.rowCount) return false;
    await client.query('DELETE FROM collection_products WHERE product_id=$1', [id]);
    await client.query('DELETE FROM products WHERE id=$1', [id]);
    return true;
  });
}

async function assertPublishable(client, id) {
  const result = await client.query(`
    SELECT p.price > 0 AND EXISTS (
      SELECT 1 FROM product_variants v JOIN inventory i ON i.variant_id=v.id
      WHERE v.product_id=p.id AND v.is_active=true
    ) AS publishable
    FROM products p WHERE p.id=$1 FOR UPDATE`, [id]);
  if (!result.rows[0]?.publishable) {
    const error = new Error('Para publicar, el producto debe tener precio mayor que cero y al menos una variante activa con inventario registrado.');
    error.status = 409;
    throw error;
  }
}

export async function setProductPublished(id, published) {
  return withTransaction(async (client) => {
    const exists = await client.query('SELECT id, status FROM products WHERE id=$1 FOR UPDATE', [id]);
    if (!exists.rowCount) return null;
    if (published) await assertPublishable(client, id);
    // Repeating the current state must not change the original publication date.
    if (exists.rows[0].status === (published ? 'publicado' : 'borrador')) return id;
    await client.query(`UPDATE products SET status=$2, published_at=$3, updated_at=now() WHERE id=$1`,
      [id, published ? 'publicado' : 'borrador', published ? new Date() : null]);
    return id;
  });
}
