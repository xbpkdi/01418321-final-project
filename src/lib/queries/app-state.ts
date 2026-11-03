import "server-only";
import type { AppState } from "@/lib/workflow";
import { getFaultSnapshot } from "@/lib/adapters/faults";
import { getDashboardData } from "@/lib/queries/dashboard";
import { listOrders } from "@/lib/queries/orders";
import { listSkus, listSuppliers } from "@/lib/queries/skus";
import { listStock } from "@/lib/queries/stock";
import { listCosts } from "@/lib/queries/costs";
import { listCostHistory } from "@/lib/queries/cost-history";
import { listReorders } from "@/lib/queries/reorders";
import { listLabels } from "@/lib/queries/shipping";
import { listDeletionHistory } from "@/lib/queries/cleanup";

export async function loadAppState(session: {
  adminId: string;
  userEmail: string;
}): Promise<AppState> {
  const [
    dashboard,
    orders,
    products,
    suppliers,
    stock,
    costData,
    costHistory,
    purchaseOrders,
    labels,
    deletionLog,
  ] = await Promise.all([
    getDashboardData(),
    listOrders(),
    listSkus(),
    listSuppliers(),
    listStock(),
    listCosts(),
    listCostHistory(),
    listReorders(),
    listLabels(),
    listDeletionHistory(),
  ]);

  const labelsByOrder = new Map(labels.map((label) => [label.order_id, label]));
  const hydratedOrders = orders.map((order) => {
    const label = labelsByOrder.get(order.order_id);
    if (!label) return order;
    return {
      ...order,
      label_template: label.label_template,
      parcel_total: Number(label.parcel_total),
      label_printed_at:
        label.printed_at instanceof Date
          ? label.printed_at.toISOString()
          : (label.printed_at ?? undefined),
    };
  });

  const maxOrderSequence = hydratedOrders.reduce((max, order) => {
    const sequence = Number(order.order_id.match(/(\d+)$/)?.[1] ?? 0);
    return Math.max(max, sequence);
  }, 0);
  const maxReorderSequence = purchaseOrders.reduce((max, reorder) => {
    const sequence = Number(reorder.po_id.match(/(\d+)$/)?.[1] ?? 0);
    return Math.max(max, sequence);
  }, 0);
  const skusWithCostHistory = new Set(costHistory.map((entry) => entry.sku));

  return {
    version: 3,
    orders: hydratedOrders,
    products,
    suppliers,
    stock,
    costs: costData.costs,
    costLog: [
      ...costData.costLog.filter(
        (entry) => !skusWithCostHistory.has(entry.sku),
      ),
      ...costHistory,
    ].sort((a, b) => a.calculated_at.localeCompare(b.calculated_at)),
    purchaseOrders,
    dailyVolume: dashboard.dailyVolume,
    rmsInbox: [],
    rmsCancelRequests: [],
    connection: {
      channel: "Rakuten Ichiba",
      connected: true,
      last_sync: dashboard.lastSync,
    },
    session: {
      user_id: session.adminId,
      user_email: session.userEmail,
    },
    faults: getFaultSnapshot(),
    deletionLog,
    errorLog: [],
    nextOrderSeq: maxOrderSequence + 1,
    nextPoSeq: maxReorderSequence + 1,
  };
}
