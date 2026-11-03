import "server-only";
import { randomUUID } from "node:crypto";
import type { PrinterAdapter } from "@/lib/adapters/contracts";
import { getExternalAdapters } from "@/lib/adapters";
import { getPool, withTransaction } from "@/lib/db";
import {
  completeLabelPrint,
  listPrintableLabels,
  recordPrintAttempt,
} from "@/lib/queries/shipping";
import type { PrintResult } from "@/lib/workflow";

export type PrintLabelOutcome = {
  orderId: string;
  result: PrintResult;
  template?: string;
};

export async function printLabelUseCase(
  input: { orderId: string; reprint: boolean; adminId: string },
  printer: PrinterAdapter = getExternalAdapters().printer,
): Promise<PrintLabelOutcome> {
  const labels = await listPrintableLabels(getPool(), input.orderId);
  const first = labels[0];
  if (!labels.length) return { orderId: input.orderId, result: "no-template" };
  if (!first.shipping_address.trim() || !first.shipping_method.trim()) {
    return { orderId: input.orderId, result: "no-address" };
  }
  if (first.order_status === "พิมพ์ใบปะสินค้าแล้ว" && !input.reprint) {
    return { orderId: input.orderId, result: "already" };
  }
  if (
    (!input.reprint && first.order_status !== "รอพิมพ์ใบปะสินค้า") ||
    (input.reprint && first.order_status !== "พิมพ์ใบปะสินค้าแล้ว")
  ) {
    return { orderId: input.orderId, result: "no-template" };
  }

  const attemptId = `PRINT-${randomUUID()}`;
  let failureCode: string | null = null;
  const outcomes: { labelId: string; printed: boolean; errorCode: string | null }[] = [];
  for (const label of labels) {
    const result = await printer.printLabel(
      {
        label_template: label.label_template,
        rsl_no: label.rsl_no,
        parcel_seq: Number(label.parcel_seq),
        parcel_total: Number(label.parcel_total),
      },
      attemptId,
    );
    const errorCode = result.ok ? null : result.error.code;
    outcomes.push({ labelId: label.label_id, printed: result.ok, errorCode });
    if (!result.ok) {
      failureCode = result.error.code;
      break;
    }
  }

  await withTransaction(async (client) => {
    for (const outcome of outcomes) {
      await recordPrintAttempt(client, {
        historyId: randomUUID(),
        attemptId,
        labelId: outcome.labelId,
        adminId: input.adminId,
        reprint: input.reprint,
        outcome: outcome.printed ? "printed" : "failed",
        errorCode: outcome.errorCode,
      });
    }
    if (!failureCode && outcomes.length === labels.length && !input.reprint) {
      await completeLabelPrint(client, input.orderId);
    }
  });

  return failureCode
    ? { orderId: input.orderId, result: "printer" }
    : {
        orderId: input.orderId,
        result: "ok",
        template: first.label_template,
      };
}

export async function printLabelsUseCase(
  input: { orderIds: readonly string[]; reprint: boolean; adminId: string },
  printer: PrinterAdapter = getExternalAdapters().printer,
): Promise<PrintLabelOutcome[]> {
  const results: PrintLabelOutcome[] = [];
  for (const orderId of input.orderIds) {
    results.push(
      await printLabelUseCase(
        { orderId, reprint: input.reprint, adminId: input.adminId },
        printer,
      ),
    );
  }
  return results;
}

export const printLabel = printLabelUseCase;
