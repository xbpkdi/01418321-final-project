import "server-only";
import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { withTransaction } from "@/lib/db";
import { lockSku } from "@/lib/queries/skus";
import { getSkuSellingPrice, lockCost, saveCost } from "@/lib/queries/costs";
import {
  insertCostHistory,
  type CostHistoryValue,
} from "@/lib/queries/cost-history";
import {
  calcUnitCost,
  COST_KEYS,
  type CostComponents,
  type CostKey,
} from "@/types/product";
import type { CostForm } from "@/lib/workflow";

export type SaveCostResult =
  | { ok: false; reason: "invalid" | "no-rate" | "not-found" }
  | {
      ok: true;
      unit_cost: number;
      components: Record<CostKey, number>;
      overPrice: boolean;
    };

type ParsedCost = {
  cost: CostComponents;
  complete: boolean;
  values: Record<CostKey, number> | null;
};

function parseCostForm(
  sku: string,
  form: CostForm,
  allowIncomplete: boolean,
): ParsedCost | "invalid" | "no-rate" {
  if (!allowIncomplete && form.exchange_rate.trim() === "") return "no-rate";

  const parsed = {} as Record<CostKey, number | null>;
  for (const key of COST_KEYS) {
    const raw = form[key].trim();
    if (raw === "" && allowIncomplete) {
      parsed[key] = null;
      continue;
    }
    const value = Number(raw);
    if (raw === "" || !Number.isFinite(value) || value < 0) return "invalid";
    parsed[key] = value;
  }

  const complete = COST_KEYS.every((key) => parsed[key] !== null);
  if (
    complete &&
    ((parsed.order_qty ?? 0) <= 0 || (parsed.exchange_rate ?? 0) <= 0)
  ) {
    return "invalid";
  }

  const values = complete ? (parsed as Record<CostKey, number>) : null;
  return {
    complete,
    values,
    cost: {
      sku,
      currency: form.currency.trim().toUpperCase() || "CNY",
      purchase_price: parsed.purchase_price,
      exchange_rate: parsed.exchange_rate,
      exchange_rate_updated_at: null,
      intl_freight: parsed.intl_freight,
      duty_fee: parsed.duty_fee,
      marketplace_fee: parsed.marketplace_fee,
      domestic_shipping: parsed.domestic_shipping,
      rsl_charge: parsed.rsl_charge,
      order_qty: parsed.order_qty,
    },
  };
}

function historyValue(
  cost: CostComponents,
  unitCost: number | null,
): CostHistoryValue {
  return {
    purchase_price: cost.purchase_price,
    exchange_rate: cost.exchange_rate,
    intl_freight: cost.intl_freight,
    duty_fee: cost.duty_fee,
    order_qty: cost.order_qty,
    marketplace_fee: cost.marketplace_fee,
    domestic_shipping: cost.domestic_shipping,
    rsl_charge: cost.rsl_charge,
    currency: cost.currency,
    unit_cost: unitCost,
  };
}

/** Save cost components and history using an existing transaction. */
export async function saveCostDraft(
  client: PoolClient,
  input: {
    sku: string;
    form: CostForm;
    adminId: string;
    allowIncomplete: boolean;
    remember: boolean;
  },
): Promise<SaveCostResult> {
  const sku = await lockSku(client, input.sku);
  if (!sku) return { ok: false, reason: "not-found" };

  const parsed = parseCostForm(input.sku, input.form, input.allowIncomplete);
  if (parsed === "invalid" || parsed === "no-rate") {
    return { ok: false, reason: parsed };
  }

  const current = await lockCost(client, sku.sku_id);
  const rateUnchanged =
    current !== null &&
    Number(current.exchange_rate) === parsed.cost.exchange_rate &&
    current.exchange_rate_updated_at !== null;
  parsed.cost.exchange_rate_updated_at =
    parsed.cost.exchange_rate === null
      ? null
      : rateUnchanged
        ? current.exchange_rate_updated_at instanceof Date
          ? current.exchange_rate_updated_at.toISOString()
          : current.exchange_rate_updated_at
        : new Date().toISOString();

  const unitCost = parsed.values ? calcUnitCost(parsed.values) : null;
  let costId = current?.cost_id ?? null;
  if (input.remember) {
    costId = await saveCost(client, {
      costId: costId ?? `COST-${randomUUID()}`,
      skuId: sku.sku_id,
      cost: parsed.cost,
      unitCost,
    });
  }

  await insertCostHistory(client, {
    historyId: `COST-HISTORY-${randomUUID()}`,
    skuId: sku.sku_id,
    costId,
    previousValue: current?.snapshot ?? null,
    newValue: historyValue(parsed.cost, unitCost),
    adminId: input.adminId,
  });

  if (!parsed.values || unitCost === null) {
    return { ok: false, reason: "invalid" };
  }
  const price = await getSkuSellingPrice(client, sku.sku_id);
  return {
    ok: true,
    unit_cost: unitCost,
    components: parsed.values,
    overPrice: price !== null && unitCost > price,
  };
}

export async function calculateCostUseCase(input: {
  sku: string;
  form: CostForm;
  remember: boolean;
  adminId: string;
}): Promise<SaveCostResult> {
  return withTransaction((client) =>
    saveCostDraft(client, {
      ...input,
      allowIncomplete: false,
    }),
  );
}
