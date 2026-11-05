import "server-only";
import { randomUUID } from "node:crypto";
import type { SupplierAdapter } from "@/lib/adapters/contracts";
import { getExternalAdapters } from "@/lib/adapters";
import { isFaultEnabled } from "@/lib/adapters/faults";
import { withTransaction } from "@/lib/db";
import { executeWorkflow } from "@/lib/use-cases/execute-workflow";
import {
  adjustStock,
  insertStockAdjustmentHistory,
} from "@/lib/queries/stock";
import {
  completeReorderAttempt,
  findPendingReorder,
  findRetryReorder,
  insertReorderAttempt,
  lockDecisionContext,
  lockPurchaseContext,
  lockReceiveContext,
  markReorderReceived,
  markDecisionMissingPrice,
  markLinkedReorderOrders,
  releaseReceivedOrders,
  saveReorderDecision,
  type PurchaseContextRow,
  type ReorderAttemptRow,
} from "@/lib/queries/reorders";
import type {
  DecideResult,
  PurchaseResult,
  ReceiveResult,
} from "@/lib/workflow";
import type { PurchaseOrder, Supplier } from "@/types/product";

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function date(value: Date | string | null): string {
  return value === null ? "" : iso(value).slice(0, 10);
}

function supplierFrom(row: PurchaseContextRow): Supplier | null {
  if (
    !row.supplier_id ||
    !row.supplier_name ||
    row.lead_time_days === null ||
    Number(row.lead_time_days) <= 0
  ) {
    return null;
  }
  return {
    supplier_id: row.supplier_id,
    supplier_name: row.supplier_name,
    contact_info: "",
    lead_time: Number(row.lead_time_days),
  };
}

export async function decideReorderUseCase(input: {
  orderId: string;
  decision: "คุ้มค่า" | "ไม่คุ้มค่า";
  quantity: number;
}): Promise<DecideResult> {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return "no-cost";
  }
  return withTransaction(async (client) => {
    const row = await lockDecisionContext(client, input.orderId);
    if (!row || row.order_status !== "รอ Admin ตัดสินใจสั่งซื้อ") {
      return "not-pending";
    }
    if (row.selling_price === null) {
      await markDecisionMissingPrice(client, input.orderId);
      return "no-price";
    }
    if (row.unit_cost === null) return "no-cost";
    // Simulated save failure (/dev "db" fault): keep the Order status so the
    // Admin can confirm again (5A, Q5A.3).
    if (isFaultEnabled("db")) return "db";

    await saveReorderDecision(client, {
      orderId: input.orderId,
      decision: input.decision,
      quantity: input.quantity,
      status:
        input.decision === "คุ้มค่า"
          ? "รอสั่งซื้อจาก Supplier"
          : "รอยกเลิก Order",
      manualReason: null,
    });
    return "ok";
  });
}

type PreparedPurchase = {
  context: PurchaseContextRow;
  supplier: Supplier;
  attempt: ReorderAttemptRow;
  po: PurchaseOrder;
};

export async function purchaseReorderUseCase(
  input: {
    sku: string;
    quantity: number;
    confirmDuplicate: boolean;
  },
  supplierAdapter: SupplierAdapter = getExternalAdapters().supplier,
): Promise<PurchaseResult> {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return { kind: "not-configured" };
  }

  const prepared = await withTransaction<
    PreparedPurchase | PurchaseResult
  >(async (client) => {
    const context = await lockPurchaseContext(client, input.sku);
    const supplier = context ? supplierFrom(context) : null;
    if (!context || !supplier) {
      if (context) {
        await markLinkedReorderOrders(
          client,
          context.sku_id,
          "รอดำเนินการด้วยตนเอง",
          "supplier",
        );
      }
      return { kind: "not-configured" };
    }

    const pending = await findPendingReorder(client, context.sku_id);
    if (pending && !input.confirmDuplicate) {
      return { kind: "pending-po", eta: date(pending.expected_date) };
    }

    let attempt = await findRetryReorder(client, context.sku_id);
    if (!attempt) {
      const expectedDate = new Date(
        Date.now() + supplier.lead_time * 24 * 60 * 60 * 1000,
      )
        .toISOString()
        .slice(0, 10);
      const reorderId = `PO-${randomUUID()}`;
      const requestId = `SUPPLIER-${randomUUID()}`;
      await insertReorderAttempt(client, {
        reorderId,
        quantity: input.quantity,
        expectedDate,
        skuId: context.sku_id,
        supplierId: supplier.supplier_id,
        requestId,
      });
      attempt = {
        reorder_id: reorderId,
        order_qty: input.quantity,
        supplier_id: supplier.supplier_id,
        supplier_request_id: requestId,
        expected_date: expectedDate,
        created_at: new Date(),
      };
    }

    await markLinkedReorderOrders(
      client,
      context.sku_id,
      "รอส่งคำสั่งซื้อ",
      null,
      attempt.reorder_id,
    );
    const po: PurchaseOrder = {
      po_id: attempt.reorder_id,
      sku: context.sku,
      supplier_id: attempt.supplier_id,
      order_qty: Number(attempt.order_qty),
      order_date: iso(attempt.created_at),
      eta: date(attempt.expected_date),
      status: "รอส่งคำสั่งซื้อ",
    };
    return { context, supplier, attempt, po };
  });

  if ("kind" in prepared) return prepared;

  const external = await supplierAdapter.sendPurchaseOrder(
    prepared.po,
    prepared.attempt.supplier_request_id,
  );

  if (!external.ok) {
    let failureRecorded = false;
    await withTransaction(async (client) => {
      const recorded = await completeReorderAttempt(client, {
        reorderId: prepared.attempt.reorder_id,
        requestId: prepared.attempt.supplier_request_id,
        accepted: false,
        supplierReference: null,
        errorCode: external.error.code,
      });
      failureRecorded = recorded;
      if (recorded) {
        await markLinkedReorderOrders(
          client,
          prepared.context.sku_id,
          "รอส่งคำสั่งซื้อ",
          null,
        );
      }
    });
    if (!failureRecorded) {
      return {
        kind: "ok",
        po: { ...prepared.po, status: "สั่งซื้อแล้ว" },
        supplier: prepared.supplier,
      };
    }
    return { kind: "send-failed" };
  }

  await withTransaction(async (client) => {
    await completeReorderAttempt(client, {
      reorderId: prepared.attempt.reorder_id,
      requestId: prepared.attempt.supplier_request_id,
      accepted: true,
      supplierReference: external.data.supplierReference,
      errorCode: null,
    });
    await markLinkedReorderOrders(
      client,
      prepared.context.sku_id,
      "สั่งซื้อแล้ว",
      null,
      prepared.attempt.reorder_id,
    );
  });

  return {
    kind: "ok",
    po: { ...prepared.po, status: "สั่งซื้อแล้ว" },
    supplier: prepared.supplier,
  };
}

/**
 * UC 6A receive step: the Admin records goods from the Supplier. One
 * executeWorkflow transaction closes the reorder once, adds the quantity to
 * in-house stock (Rakuten sync pending + adjustment history), and sends every
 * Order covered by the reorder back to 3S, which runs before commit.
 */
export async function receiveReorderUseCase(input: {
  reorderId: string;
  quantity: number;
  adminId: string;
}): Promise<ReceiveResult> {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return { kind: "invalid-qty" };
  }
  return executeWorkflow<ReceiveResult>(
    async (client) => {
      const row = await lockReceiveContext(client, input.reorderId);
      if (!row) return { kind: "not-found" };
      if (row.reorder_status === "ได้รับสินค้าแล้ว") return { kind: "already" };
      if (row.reorder_status !== "สั่งซื้อแล้ว") return { kind: "not-ordered" };
      if (!(await markReorderReceived(client, input.reorderId, input.quantity))) {
        return { kind: "already" };
      }

      const previousInHouse = Number(row.in_house_qty);
      const rsl = row.rsl_qty === null ? null : Number(row.rsl_qty);
      // Supplier goods arrive at the company warehouse, not at RSL.
      await adjustStock(
        client,
        row.stock_id,
        previousInHouse + input.quantity,
        rsl,
      );
      await insertStockAdjustmentHistory(client, {
        historyId: `STOCK-HISTORY-${randomUUID()}`,
        stockId: row.stock_id,
        previousInHouseQuantity: previousInHouse,
        inHouseQuantity: previousInHouse + input.quantity,
        previousRslQuantity: rsl,
        rslQuantity: rsl,
        reason: `รับสินค้าจาก Supplier ตามคำสั่งซื้อ ${input.reorderId}`,
        adminId: input.adminId,
      });
      const orderIds = await releaseReceivedOrders(client, input.reorderId);
      return { kind: "ok", sku: row.sku, qty: input.quantity, orderIds };
    },
    { orderIds: (result) => (result.kind === "ok" ? result.orderIds : []) },
  );
}
