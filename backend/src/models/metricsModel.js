import { query } from '../config/database.js';

import { saleStatuses, salesWindowCte, availableStockSql, lowStockThresholdSql, replenishmentPredicateSql, stockStatusSql, REPLENISHMENT_PERIOD_DAYS } from './stockPolicy.js';

export async function getSummary() {
  const [categories, products, average, orders, productCounts, inventoryByType] = await Promise.all([
    query(`SELECT c.id,c.name,COALESCE(SUM(s.sales),0)::numeric(14,2) AS sales,
        COALESCE(SUM(s.units),0)::int AS units
      FROM categories c
      LEFT JOIN product_categories pc ON pc.category_id=c.id
      LEFT JOIN (
        SELECT v.product_id,oi.line_total AS sales,oi.quantity AS units
        FROM product_variants v JOIN order_items oi ON oi.variant_id=v.id
        JOIN orders o ON o.id=oi.order_id AND o.status IN ${saleStatuses}
      ) s ON s.product_id=pc.product_id
      GROUP BY c.id,c.name ORDER BY sales DESC,c.name`),
    query(`SELECT p.id,p.name,COALESCE(SUM(oi.quantity),0)::int AS units_sold,
        COALESCE(SUM(oi.line_total),0)::numeric(14,2) AS sales
      FROM products p JOIN product_variants v ON v.product_id=p.id
      JOIN order_items oi ON oi.variant_id=v.id JOIN orders o ON o.id=oi.order_id
      WHERE o.status IN ${saleStatuses}
      GROUP BY p.id,p.name ORDER BY units_sold DESC,sales DESC,p.id LIMIT 3`),
    query(`SELECT COALESCE(AVG(total) FILTER (WHERE status IN ${saleStatuses}),0)::numeric(14,2) AS average_order_value
      FROM orders`),
    query(`SELECT status,COUNT(*)::int AS count FROM orders GROUP BY status ORDER BY status`),
    query(`SELECT COUNT(*) FILTER (WHERE status='publicado')::int AS published,
        COUNT(*) FILTER (WHERE status='borrador')::int AS draft FROM products`),
    query(`WITH ${salesWindowCte}, types AS (
        SELECT t.id,t.slug,t.name FROM categories root JOIN categories t ON t.parent_id=root.id
        WHERE root.slug='uniformes' AND root.parent_id IS NULL AND root.is_active=true AND t.is_active=true
      ), type_products AS (
        SELECT DISTINCT t.id AS type_id,t.slug,t.name,p.id AS product_id
        FROM types t JOIN product_categories pc ON pc.category_id=t.id JOIN products p ON p.id=pc.product_id
      ), variant_status AS (
        SELECT tp.type_id,tp.slug,tp.name,tp.product_id,v.id AS variant_id,
          ${availableStockSql()}::int AS available_stock,
          ${stockStatusSql(availableStockSql(), lowStockThresholdSql())} AS stock_status
        FROM type_products tp
        LEFT JOIN product_variants v ON v.product_id=tp.product_id AND v.is_active=true
        LEFT JOIN inventory i ON i.variant_id=v.id
        LEFT JOIN sales_7_days s ON s.variant_id=v.id
      ), product_type_stock AS (
        SELECT type_id,slug,name,product_id,SUM(available_stock)::int AS available_units,
          BOOL_OR(stock_status='low') AS has_low_stock,
          BOOL_AND(stock_status='out_of_stock') AS out_of_stock
        FROM variant_status GROUP BY type_id,slug,name,product_id
      ), type_totals AS (
        SELECT type_id,COUNT(*)::int AS product_count,COALESCE(SUM(available_units),0)::int AS available_units,
          COUNT(*) FILTER (WHERE has_low_stock)::int AS low_stock_products,
          COUNT(*) FILTER (WHERE out_of_stock)::int AS out_of_stock_products
        FROM product_type_stock GROUP BY type_id
      )
      SELECT t.id AS "typeId",t.slug,t.name,COALESCE(x.product_count,0)::int AS "productCount",
        COALESCE(x.available_units,0)::int AS "availableUnits",
        COALESCE(x.low_stock_products,0)::int AS "lowStockProducts",
        COALESCE(x.out_of_stock_products,0)::int AS "outOfStockProducts"
      FROM types t LEFT JOIN type_totals x ON x.type_id=t.id ORDER BY t.id`),
  ]);
  return {
    salesByCategory: categories.rows,
    topProducts: products.rows,
    averageOrderValue: average.rows[0]?.average_order_value ?? '0.00',
    orderCounts: orders.rows,
    productCounts: productCounts.rows[0] ?? { published: 0, draft: 0 },
    inventoryByType: inventoryByType.rows,
    currency: 'CRC',
  };
}

export async function getReplenishmentAlerts() {
  const result = await query(`WITH ${salesWindowCte}, stock AS (
      SELECT v.id AS variant_id,v.sku,v.size,v.color,p.id AS product_id,p.name AS product_name,
        ${availableStockSql()}::int AS available_stock,
        ${lowStockThresholdSql()} AS units_sold_7_days
      FROM product_variants v JOIN products p ON p.id=v.product_id
      LEFT JOIN inventory i ON i.variant_id=v.id
      LEFT JOIN sales_7_days s ON s.variant_id=v.id
      WHERE p.status='publicado' AND v.is_active=true
    )
    SELECT variant_id AS "variantId",sku,size,color,product_id AS "productId",product_name AS "productName",
      available_stock AS "availableStock",units_sold_7_days AS "unitsSoldLast7Days",
      ROUND(units_sold_7_days::numeric/${REPLENISHMENT_PERIOD_DAYS},2) AS "averageDailySales",
      ROUND(available_stock::numeric/NULLIF(units_sold_7_days::numeric/${REPLENISHMENT_PERIOD_DAYS},0),2) AS "daysOfStockRemaining"
    FROM stock
    WHERE ${replenishmentPredicateSql('available_stock', 'units_sold_7_days')}
    ORDER BY available_stock ASC,units_sold_7_days DESC,product_name,sku`);
  return { data: result.rows, meta: { periodDays: REPLENISHMENT_PERIOD_DAYS, policy: 'aviso si no hay existencia o si la existencia no cubre las ventas de los últimos siete días' } };
}
