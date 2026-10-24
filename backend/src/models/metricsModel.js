import { query } from '../config/database.js';

const saleStatuses = "('paid','processing','shipped','delivered')";

export async function getSummary() {
  const [categories, products, average, orders, productCounts] = await Promise.all([
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
  ]);
  return {
    salesByCategory: categories.rows,
    topProducts: products.rows,
    averageOrderValue: average.rows[0]?.average_order_value ?? '0.00',
    orderCounts: orders.rows,
    productCounts: productCounts.rows[0] ?? { published: 0, draft: 0 },
    currency: 'CRC',
  };
}

export async function getReplenishmentAlerts() {
  const result = await query(`WITH sales_7_days AS (
      SELECT oi.variant_id,SUM(oi.quantity)::int AS units_sold
      FROM order_items oi JOIN orders o ON o.id=oi.order_id
      WHERE o.status IN ${saleStatuses} AND o.placed_at >= now() - interval '7 days'
      GROUP BY oi.variant_id
    ), stock AS (
      SELECT v.id AS variant_id,v.sku,v.size,v.color,p.id AS product_id,p.name AS product_name,
        COALESCE(i.on_hand-i.reserved,0)::int AS available_stock,
        COALESCE(s.units_sold,0)::int AS units_sold_7_days
      FROM product_variants v JOIN products p ON p.id=v.product_id
      LEFT JOIN inventory i ON i.variant_id=v.id
      LEFT JOIN sales_7_days s ON s.variant_id=v.id
      WHERE p.status='publicado' AND v.is_active=true
    )
    SELECT variant_id AS "variantId",sku,size,color,product_id AS "productId",product_name AS "productName",
      available_stock AS "availableStock",units_sold_7_days AS "unitsSoldLast7Days",
      ROUND(units_sold_7_days::numeric/7,2) AS "averageDailySales",
      ROUND(available_stock::numeric/NULLIF(units_sold_7_days::numeric/7,0),2) AS "daysOfStockRemaining"
    FROM stock
    WHERE available_stock=0 OR (units_sold_7_days>0 AND available_stock<=units_sold_7_days)
    ORDER BY available_stock ASC,units_sold_7_days DESC,product_name,sku`);
  return { data: result.rows, meta: { periodDays: 7, policy: 'aviso si no hay existencia o si la existencia no cubre las ventas de los últimos siete días' } };
}
