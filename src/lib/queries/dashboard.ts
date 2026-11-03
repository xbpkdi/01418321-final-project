import "server-only";
import type { QueryResultRow } from "pg";
import { getPool, type QueryExecutor } from "@/lib/db";
import type { OrderStatus } from "@/lib/order-status";

interface StatusTotalRow extends QueryResultRow {
  order_status: OrderStatus;
  count: string | number;
}

interface VolumeRow extends QueryResultRow {
  date: string;
  count: string | number;
}

interface RecentOrderRow extends QueryResultRow {
  order_id: string;
  order_date: Date | string;
}

// Dashboard reuses the Order read owner (UC 2A) because it is a projection of
// the same persisted order data, not a separate use case.
export const Q2A_1_DASHBOARD_TOTALS = `
  SELECT order_status, COUNT(*)::integer AS count
  FROM orders
  GROUP BY order_status
  ORDER BY order_status
`;

export const Q2A_1_DASHBOARD_VOLUME = `
  SELECT TO_CHAR(order_date::date, 'YYYY-MM-DD') AS date,
         COUNT(*)::integer AS count
  FROM orders
  WHERE order_date >= (
    SELECT MAX(order_date)::date - INTERVAL '6 days'
    FROM orders
  )
  GROUP BY order_date::date
  ORDER BY order_date::date
`;

export const Q2A_1_DASHBOARD_RECENT = `
  SELECT order_id, order_date
  FROM orders
  ORDER BY order_date DESC, order_id DESC
  LIMIT 6
`;

export type DashboardReadModel = {
  totals: { status: OrderStatus; count: number }[];
  dailyVolume: { date: string; count: number }[];
  recentOrderIds: string[];
  lastSync: string;
};

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export async function getDashboardData(
  executor: QueryExecutor = getPool(),
): Promise<DashboardReadModel> {
  const [totals, volume, recent] = await Promise.all([
    executor.query<StatusTotalRow>(Q2A_1_DASHBOARD_TOTALS),
    executor.query<VolumeRow>(Q2A_1_DASHBOARD_VOLUME),
    executor.query<RecentOrderRow>(Q2A_1_DASHBOARD_RECENT),
  ]);

  const byDate = new Map(
    volume.rows.map((row) => [row.date, Number(row.count)]),
  );
  const anchor = volume.rows.at(-1)?.date ?? new Date();
  const latestDate = new Date(
    (anchor instanceof Date ? anchor.toISOString().slice(0, 10) : anchor) +
      "T00:00:00.000Z",
  );
  const dailyVolume = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(latestDate);
    day.setUTCDate(latestDate.getUTCDate() - (6 - index));
    const date = day.toISOString().slice(0, 10);
    return { date, count: byDate.get(date) ?? 0 };
  });

  return {
    totals: totals.rows.map((row) => ({
      status: row.order_status,
      count: Number(row.count),
    })),
    dailyVolume,
    recentOrderIds: recent.rows.map((row) => row.order_id),
    lastSync: recent.rows[0]
      ? iso(recent.rows[0].order_date)
      : new Date(0).toISOString(),
  };
}
