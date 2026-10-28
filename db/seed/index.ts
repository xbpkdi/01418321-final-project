import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { Pool, type PoolClient } from "pg";
import { hashPasswordValue } from "../../src/lib/auth/password-core";
import { SEED_ORDERS } from "../../src/mock/orders";
import {
  SEED_PRODUCTS,
  SEED_PURCHASE_ORDERS,
  SEED_STOCK,
  SEED_SUPPLIERS,
  seedCosts,
} from "../../src/mock/products";
import {
  calcUnitCost,
  isCompleteCost,
} from "../../src/types/product";

const migrationsDirectory = fileURLToPath(
  new URL("../migrations/", import.meta.url),
);

const seedPool = new Pool({ connectionString: process.env.DATABASE_URL });

async function withSeedTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await seedPool.connect();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function closeSeedPool(): Promise<void> {
  await seedPool.end();
}

// Feature 002 migration catalog. DDL has no user-provided values.
const CREATE_MIGRATION_CATALOG = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;
const FIND_MIGRATION = `
  SELECT migration_name FROM schema_migrations WHERE migration_name = $1
`;
const RECORD_MIGRATION = `
  INSERT INTO schema_migrations (migration_name) VALUES ($1)
`;

export async function migrateDatabase(): Promise<void> {
  const migrationNames = (await readdir(migrationsDirectory))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  await withSeedTransaction(async (client) => {
    await client.query(CREATE_MIGRATION_CATALOG);

    for (const migrationName of migrationNames) {
      const existing = await client.query(FIND_MIGRATION, [migrationName]);
      if (existing.rowCount) continue;

      const sql = await readFile(
        new URL(`../migrations/${migrationName}`, import.meta.url),
        "utf8",
      );
      await client.query(sql);
      await client.query(RECORD_MIGRATION, [migrationName]);
    }
  });
}

// Explicit reset mode only. Normal setup never removes or overwrites rows.
const RESET_SEED_DATA = `
  TRUNCATE TABLE
    tracking_notification_logs,
    rakuten_stock_sync_states,
    cost_history,
    deletion_history,
    auto_error_logs,
    sessions,
    labels,
    reorders,
    costs,
    order_items,
    orders,
    stock,
    skus,
    suppliers,
    admins
  RESTART IDENTITY CASCADE
`;

// UC 1A / Q1A.7 (provisional): seed the two approved Admin test accounts.
const INSERT_ADMIN = `
  INSERT INTO admins (
    admin_id, user_email, user_password, fail_attempts, created_at
  ) VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (admin_id) DO NOTHING
`;

// UC 6A / Q6A.1 (provisional): Supplier master data used by reorder paths.
const INSERT_SUPPLIER = `
  INSERT INTO suppliers (
    supplier_id, supplier_name, contact_info, lead_time_days, created_at
  ) VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (supplier_id) DO NOTHING
`;

// UC 3A / Q3A.1 (provisional): SKU and matching-rule seed data.
const INSERT_SKU = `
  INSERT INTO skus (
    sku_id, sku, product_name, variation, sales_channel, channel_sku,
    selling_price, reorder_threshold, reorder_qty, sku_status, created_at,
    supplier_id
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
  ON CONFLICT (sku_id) DO NOTHING
`;

// UC 3S / Q3S.1 (provisional): stock path seed data.
const INSERT_STOCK = `
  INSERT INTO stock (
    stock_id, in_house_qty, rsl_qty, updated_at, sku_id
  ) VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (stock_id) DO NOTHING
`;

// UC 4S / Q4S.1 (provisional): cost components, including alternative paths.
const INSERT_COST = `
  INSERT INTO costs (
    cost_id, purchase_price, currency, exchange_rate, intl_freight, duty_fee,
    marketplace_fee, domestic_shipping, rsl_charge, order_qty, unit_cost,
    calculated_at, sku_id, exchange_rate_updated_at
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
  )
  ON CONFLICT (cost_id) DO NOTHING
`;

// UC 4A / Q4A.1 (provisional): imported Rakuten order header.
const INSERT_ORDER = `
  INSERT INTO orders (
    order_id, marketplace_order_id, sales_channel, order_date,
    shipping_address, shipping_method, order_status, rsl_no,
    tracking_number, carrier_name, dispatched_at, tracking_notified,
    tracking_notified_at, cancel_reason, cancelled_at, verified_at,
    created_at, updated_at
  ) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
    $15, $16, $17, $18
  )
  ON CONFLICT (order_id) DO NOTHING
`;

// UC 4A / Q4A.2 (provisional): imported order line.
const INSERT_ORDER_ITEM = `
  INSERT INTO order_items (
    order_item_id, channel_sku, variation, qty, fulfill_source,
    stock_deducted, deducted_at, order_id, sku_id
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT (order_item_id) DO NOTHING
`;

// UC 6S / Q6S.1 (provisional): generated label records used by 9A paths.
const INSERT_LABEL = `
  INSERT INTO labels (
    label_id, label_template, rsl_no, parcel_seq, parcel_total, label_status,
    created_at, printed_at, order_id
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
  ON CONFLICT (label_id) DO NOTHING
`;

// UC 6A / Q6A.2 (provisional): Supplier purchase orders.
const INSERT_REORDER = `
  INSERT INTO reorders (
    reorder_id, order_qty, reorder_status, ordered_at, expected_date,
    created_at, sku_id, supplier_id
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  ON CONFLICT (reorder_id) DO NOTHING
`;

// UC 5S / Q5S.1 (provisional): initial successful notification history.
const INSERT_TRACKING_LOG = `
  INSERT INTO tracking_notification_logs (
    tracking_notification_log_id, order_id, tracking_number, outcome,
    sent_at, admin_id
  ) VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT (tracking_notification_log_id) DO NOTHING
`;

// UC 7S / Q7S.1 (provisional): durable current Rakuten sync state.
const INSERT_STOCK_SYNC_STATE = `
  INSERT INTO rakuten_stock_sync_states (
    stock_id, sync_status, last_synced_qty, last_synced_at
  ) VALUES ($1, $2, $3, $4)
  ON CONFLICT (stock_id) DO NOTHING
`;

function skuId(sku: string): string {
  return `SKU-${sku}`;
}

function stockId(sku: string): string {
  return `STK-${sku}`;
}

function requiredSeedPassword(): string {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw new Error("SEED_ADMIN_PASSWORD is required to seed Admin accounts.");
  }
  return password;
}

async function seedAdmins(client: PoolClient, now: Date): Promise<void> {
  const encodedPassword = await hashPasswordValue(requiredSeedPassword());
  const accounts = [
    ["U001", "admin@colorado.jp", 0],
    ["U002", "locked@colorado.jp", 5],
  ] as const;

  for (const [adminId, email, failedAttempts] of accounts) {
    await client.query(INSERT_ADMIN, [
      adminId,
      email,
      encodedPassword,
      failedAttempts,
      now,
    ]);
  }
}

async function seedReferenceData(client: PoolClient, now: Date): Promise<void> {
  for (const supplier of SEED_SUPPLIERS) {
    await client.query(INSERT_SUPPLIER, [
      supplier.supplier_id,
      supplier.supplier_name,
      supplier.contact_info,
      supplier.lead_time,
      now,
    ]);
  }

  for (const product of SEED_PRODUCTS) {
    await client.query(INSERT_SKU, [
      skuId(product.sku),
      product.sku,
      product.product_name,
      product.variation,
      product.sales_channel,
      product.channel_sku,
      product.selling_price,
      product.reorder_threshold,
      product.reorder_qty,
      product.active ? "active" : "inactive",
      now,
      product.supplier_id || null,
    ]);
  }

  for (const row of SEED_STOCK) {
    await client.query(INSERT_STOCK, [
      stockId(row.sku),
      row.in_house_qty,
      row.rsl_qty,
      row.updated_at,
      skuId(row.sku),
    ]);
  }

  for (const cost of seedCosts(now.getTime())) {
    await client.query(INSERT_COST, [
      `COST-${cost.sku}`,
      cost.purchase_price,
      cost.currency,
      cost.exchange_rate,
      cost.intl_freight,
      cost.duty_fee,
      cost.marketplace_fee,
      cost.domestic_shipping,
      cost.rsl_charge,
      cost.order_qty,
      isCompleteCost(cost) ? calcUnitCost(cost) : null,
      isCompleteCost(cost) ? now : null,
      skuId(cost.sku),
      cost.exchange_rate_updated_at,
    ]);
  }
}

async function seedOrders(client: PoolClient, now: Date): Promise<void> {
  const knownSkus = new Set(SEED_PRODUCTS.map((product) => product.sku));

  for (const order of SEED_ORDERS) {
    await client.query(INSERT_ORDER, [
      order.order_id,
      order.marketplace_order_id,
      order.sales_channel,
      order.order_date,
      order.shipping_address,
      order.shipping_method,
      order.order_status,
      order.rsl_reference_id ?? null,
      order.tracking_number ?? null,
      order.carrier_name ?? null,
      order.dispatched_at ?? null,
      order.tracking_notified ?? false,
      order.tracking_notified_at ?? null,
      order.cancel_reason ?? null,
      order.cancelled_at ?? null,
      order.verified_at ?? null,
      order.order_date,
      now,
    ]);

    await client.query(INSERT_ORDER_ITEM, [
      `${order.order_id}-ITEM-1`,
      order.channel_sku,
      order.variation,
      order.qty,
      order.fulfill_source,
      order.stock_deducted ?? false,
      order.deducted_at ?? null,
      order.order_id,
      knownSkus.has(order.sku) ? skuId(order.sku) : null,
    ]);

    if (order.label_template && order.parcel_total) {
      for (let parcel = 1; parcel <= order.parcel_total; parcel += 1) {
        await client.query(INSERT_LABEL, [
          `${order.order_id}-LABEL-${parcel}`,
          order.label_template,
          order.rsl_reference_id ?? null,
          parcel,
          order.parcel_total,
          order.label_printed_at ? "printed" : "ready",
          order.order_date,
          order.label_printed_at ?? null,
          order.order_id,
        ]);
      }
    }

    if (order.tracking_notified && order.tracking_number) {
      await client.query(INSERT_TRACKING_LOG, [
        `${order.order_id}-NOTIFY-1`,
        order.order_id,
        order.tracking_number,
        "sent",
        order.tracking_notified_at ?? order.dispatched_at ?? now,
        "U001",
      ]);
    }
  }
}

async function seedReorders(client: PoolClient): Promise<void> {
  for (const reorder of SEED_PURCHASE_ORDERS) {
    await client.query(INSERT_REORDER, [
      reorder.po_id,
      reorder.order_qty,
      reorder.status,
      reorder.order_date,
      reorder.eta,
      reorder.order_date,
      skuId(reorder.sku),
      reorder.supplier_id,
    ]);
  }
}

async function seedSyncStates(client: PoolClient, now: Date): Promise<void> {
  for (const row of SEED_STOCK) {
    const related = SEED_ORDERS.filter(
      (order) => order.sku === row.sku && order.stock_deducted,
    );
    const pending = related.some((order) => order.mp_stock_synced === false);
    const available = row.in_house_qty + (row.rsl_qty ?? 0);

    await client.query(INSERT_STOCK_SYNC_STATE, [
      stockId(row.sku),
      pending ? "pending" : "synced",
      pending ? null : available,
      pending ? null : now,
    ]);
  }
}

export async function seedDatabase(options?: {
  reset?: boolean;
}): Promise<void> {
  const now = new Date();

  await withSeedTransaction(async (client) => {
    if (options?.reset) await client.query(RESET_SEED_DATA);

    await seedAdmins(client, now);
    await seedReferenceData(client, now);
    await seedOrders(client, now);
    await seedReorders(client);
    await seedSyncStates(client, now);
  });
}
