// One policy for catalog availability and administrative replenishment alerts.
export const REPLENISHMENT_PERIOD_DAYS = 7;
export const saleStatuses = "('paid','processing','shipped','delivered')";

export const salesWindowCte = `sales_7_days AS (
  SELECT oi.variant_id,SUM(oi.quantity)::int AS units_sold
  FROM order_items oi JOIN orders o ON o.id=oi.order_id
  WHERE o.status IN ${saleStatuses}
    AND o.placed_at >= now() - interval '${REPLENISHMENT_PERIOD_DAYS} days'
  GROUP BY oi.variant_id
)`;

export const availableStockSql = (inventory = 'i') => `GREATEST(COALESCE(${inventory}.on_hand,0) - COALESCE(${inventory}.reserved,0),0)`;
export const lowStockThresholdSql = (sales = 's') => `COALESCE(${sales}.units_sold,0)::int`;
export const replenishmentPredicateSql = (available, threshold) => `(${available}=0 OR (${threshold}>0 AND ${available}<=${threshold}))`;
export const stockStatusSql = (available, threshold) => `CASE WHEN ${available}=0 THEN 'out_of_stock' WHEN ${threshold}>0 AND ${available}<=${threshold} THEN 'low' ELSE 'available' END`;
