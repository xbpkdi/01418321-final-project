import "server-only";
import { randomUUID } from "node:crypto";
import type { LabelRule, LabelServiceAdapter } from "@/lib/adapters/contracts";
import { getExternalAdapters } from "@/lib/adapters";
import { withTransaction } from "@/lib/db";
import {
  listPendingLabelOrders,
  markLabelManual,
  recordLabelServiceError,
  saveGeneratedLabels,
  toLabelOrder,
} from "@/lib/queries/shipping";
import { SHIPPING_RULES } from "@/mock/delivery";

export type FormatLabelEvent =
  | { code: "label-created"; orderId: string; count: number }
  | { code: "label-no-address"; orderId: string }
  | { code: "label-no-template"; orderId: string }
  | { code: "label-service"; orderId: string };

const labelRules: LabelRule[] = SHIPPING_RULES.map((rule) => ({
  ...rule,
  sales_channel: "Rakuten Ichiba",
}));

function validGeneratedLabels(
  labels: readonly {
    label_template: string;
    parcel_seq: number;
    parcel_total: number;
  }[],
): boolean {
  if (labels.length === 0) return false;
  const sequences = new Set(labels.map((label) => label.parcel_seq));
  return labels.every(
    (label) =>
      label.label_template.trim().length > 0 &&
      Number.isInteger(label.parcel_seq) &&
      label.parcel_seq > 0 &&
      Number.isInteger(label.parcel_total) &&
      label.parcel_total === labels.length,
  ) && sequences.size === labels.length;
}

/** UC 6S: generate and persist each pending Order's labels idempotently. */
export async function formatLabelsUseCase(
  orderIds?: readonly string[],
  adapter: LabelServiceAdapter = getExternalAdapters().labelService,
): Promise<FormatLabelEvent[]> {
  const wanted = orderIds ? new Set(orderIds) : null;
  const rows = (await listPendingLabelOrders()).filter(
    (row) => !wanted || wanted.has(row.order_id),
  );
  const events: FormatLabelEvent[] = [];

  for (const row of rows) {
    if (!row.shipping_address.trim() || !row.shipping_method.trim()) {
      await withTransaction((client) =>
        markLabelManual(client, row.order_id, "address"),
      );
      events.push({ code: "label-no-address", orderId: row.order_id });
      continue;
    }
    const rule = labelRules.find(
      (candidate) =>
        candidate.shipping_method === row.shipping_method &&
        candidate.sales_channel === row.sales_channel,
    );
    if (!rule) {
      await withTransaction((client) =>
        markLabelManual(client, row.order_id, "template"),
      );
      events.push({ code: "label-no-template", orderId: row.order_id });
      continue;
    }

    const generated = await adapter.generateLabels(
      toLabelOrder(row),
      labelRules,
    );
    if (!generated.ok || !validGeneratedLabels(generated.data)) {
      await withTransaction((client) =>
        recordLabelServiceError(client, {
          logId: randomUUID(),
          orderId: row.order_id,
          errorCode: generated.ok ? "invalid_response" : generated.error.code,
        }),
      );
      events.push({ code: "label-service", orderId: row.order_id });
      continue;
    }

    const saved = await withTransaction((client) =>
      saveGeneratedLabels(client, row.order_id, generated.data),
    );
    if (saved) {
      events.push({
        code: "label-created",
        orderId: row.order_id,
        count: generated.data.length,
      });
    }
  }
  return events;
}

export const formatLabels = formatLabelsUseCase;
