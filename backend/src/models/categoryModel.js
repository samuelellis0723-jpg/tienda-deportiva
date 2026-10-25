import { query } from '../config/database.js';

export async function listCategories({ includeInactive = false } = {}) {
  const result = await query(`
    SELECT c.id, c.parent_id AS "parentId", c.slug, c.name, c.description,
           c.is_active AS "isActive", c.created_at AS "createdAt"
    FROM categories c
    WHERE ($1::boolean OR (c.is_active = true AND NOT EXISTS (
      WITH RECURSIVE ancestors(id, parent_id, is_active) AS (
        SELECT parent.id, parent.parent_id, parent.is_active
        FROM categories parent WHERE parent.id=c.parent_id
        UNION ALL
        SELECT parent.id, parent.parent_id, parent.is_active
        FROM categories parent JOIN ancestors child ON parent.id=child.parent_id
      )
      SELECT 1 FROM ancestors WHERE is_active=false
    )))
    ORDER BY c.name ASC, c.id ASC`, [includeInactive]);
  return result.rows;
}

export async function getCategory(id, { includeInactive = true } = {}) {
  const result = await query(`
    SELECT c.id, c.parent_id AS "parentId", c.slug, c.name, c.description,
           c.is_active AS "isActive", c.created_at AS "createdAt"
    FROM categories c WHERE c.id = $1 AND ($2::boolean OR (c.is_active = true AND NOT EXISTS (
      WITH RECURSIVE ancestors(id, parent_id, is_active) AS (
        SELECT parent.id, parent.parent_id, parent.is_active
        FROM categories parent WHERE parent.id=c.parent_id
        UNION ALL
        SELECT parent.id, parent.parent_id, parent.is_active
        FROM categories parent JOIN ancestors child ON parent.id=child.parent_id
      )
      SELECT 1 FROM ancestors WHERE is_active=false
    )))`, [id, includeInactive]);
  return result.rows[0] ?? null;
}

export async function insertCategory(category) {
  const result = await query(`
    INSERT INTO categories (parent_id, slug, name, description, is_active)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, parent_id AS "parentId", slug, name, description,
              is_active AS "isActive", created_at AS "createdAt"`,
  [category.parentId, category.slug, category.name, category.description, category.isActive]);
  return result.rows[0];
}

export async function updateCategory(id, category) {
  const result = await query(`
    UPDATE categories SET parent_id=$2, slug=$3, name=$4, description=$5, is_active=$6
    WHERE id=$1
    RETURNING id, parent_id AS "parentId", slug, name, description,
              is_active AS "isActive", created_at AS "createdAt"`,
  [id, category.parentId, category.slug, category.name, category.description, category.isActive]);
  return result.rows[0] ?? null;
}

export async function deleteCategory(id) {
  const result = await query('DELETE FROM categories WHERE id=$1 RETURNING id', [id]);
  return result.rowCount > 0;
}
export async function parentWouldCreateCycle(categoryId, parentId) {
  const result = await query(`
    WITH RECURSIVE ancestry(id, parent_id) AS (
      SELECT id, parent_id FROM categories WHERE id=$1
      UNION ALL
      SELECT c.id, c.parent_id FROM categories c JOIN ancestry a ON c.id=a.parent_id
    )
    SELECT EXISTS (SELECT 1 FROM ancestry WHERE id=$2) AS cycle`, [parentId, categoryId]);
  return result.rows[0].cycle;
}
