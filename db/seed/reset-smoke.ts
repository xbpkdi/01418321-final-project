import { randomUUID } from "node:crypto";
import { Pool } from "pg";

const RESET_TABLES = [
  "admins",
  "suppliers",
  "skus",
  "stock",
  "orders",
  "order_items",
  "costs",
  "reorders",
  "labels",
  "sessions",
  "auto_error_logs",
  "deletion_history",
  "cost_history",
  "tracking_notification_logs",
  "rakuten_stock_sync_states",
  "stock_adjustment_history",
  "label_print_history",
] as const;

function quoteIdentifier(identifier: string): string {
  if (!/^[a-z][a-z0-9_]*$/.test(identifier)) {
    throw new Error("Unsafe temporary schema name.");
  }
  return `"${identifier}"`;
}

function isolatedConnectionString(source: string, schema: string): string {
  const url = new URL(source);
  const currentOptions = url.searchParams.get("options");
  url.searchParams.set(
    "options",
    [currentOptions, `-csearch_path=${schema}`].filter(Boolean).join(" "),
  );
  return url.toString();
}

async function tableCounts(pool: Pool): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of RESET_TABLES) {
    const result = await pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ${table}`,
    );
    counts[table] = Number(result.rows[0]?.count ?? 0);
  }
  return counts;
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`);
  }
}

async function main(): Promise<void> {
  const sourceUrl = process.env.DATABASE_URL;
  if (!sourceUrl) throw new Error("DATABASE_URL is required.");

  const schema = `phase8_reset_${randomUUID().replaceAll("-", "")}`;
  const quotedSchema = quoteIdentifier(schema);
  const controlPool = new Pool({ connectionString: sourceUrl });
  let isolatedPool: Pool | undefined;
  let closeSeedPool: (() => Promise<void>) | undefined;

  try {
    await controlPool.query(`CREATE SCHEMA ${quotedSchema}`);

    const isolatedUrl = isolatedConnectionString(sourceUrl, schema);
    process.env.DATABASE_URL = isolatedUrl;

    const seed = await import("./index");
    closeSeedPool = seed.closeSeedPool;
    await seed.migrateDatabase();
    await seed.seedDatabase();

    isolatedPool = new Pool({ connectionString: isolatedUrl });
    const searchPath = await isolatedPool.query<{ current_schema: string }>(
      "SELECT current_schema() AS current_schema",
    );
    assertEqual(
      searchPath.rows[0]?.current_schema,
      schema,
      "Temporary database connection did not use the isolated schema",
    );

    const baseline = await tableCounts(isolatedPool);
    await isolatedPool.query(
      `UPDATE admins
       SET fail_attempts = 4, locked_until = CURRENT_TIMESTAMP + INTERVAL '1 hour'
       WHERE admin_id = $1`,
      ["U001"],
    );
    await isolatedPool.query(
      `INSERT INTO suppliers (
        supplier_id, supplier_name, contact_info, lead_time_days
      ) VALUES ($1, $2, $3, $4)`,
      ["SMOKE-SUPPLIER", "Reset smoke test", "temporary", 1],
    );
    await isolatedPool.query(
      `INSERT INTO sessions (
        session_id, admin_id, token_hash, created_at, expires_at
      ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '1 hour')`,
      ["SMOKE-SESSION", "U001", "smoke-token-hash"],
    );

    await seed.seedDatabase({ reset: true });

    const afterReset = await tableCounts(isolatedPool);
    for (const table of RESET_TABLES) {
      assertEqual(
        afterReset[table],
        baseline[table],
        `Reset count mismatch for ${table}`,
      );
    }

    const admin = await isolatedPool.query<{
      fail_attempts: number;
      locked_until: Date | null;
    }>("SELECT fail_attempts, locked_until FROM admins WHERE admin_id = $1", [
      "U001",
    ]);
    assertEqual(admin.rows[0]?.fail_attempts, 0, "Seeded Admin was not restored");
    assertEqual(
      admin.rows[0]?.locked_until ?? null,
      null,
      "Seeded Admin lock was not cleared",
    );

    const smokeSupplier = await isolatedPool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM suppliers WHERE supplier_id = $1",
      ["SMOKE-SUPPLIER"],
    );
    assertEqual(
      Number(smokeSupplier.rows[0]?.count ?? 0),
      0,
      "Temporary Supplier survived reset",
    );

    console.info(
      `Phase 8 reset smoke test passed in isolated schema (${RESET_TABLES.length} tables verified).`,
    );
  } finally {
    try {
      await closeSeedPool?.();
    } finally {
      try {
        await isolatedPool?.end();
      } finally {
        process.env.DATABASE_URL = sourceUrl;
        try {
          await controlPool.query(
            `DROP SCHEMA IF EXISTS ${quotedSchema} CASCADE`,
          );
        } finally {
          await controlPool.end();
        }
      }
    }
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown failure";
  console.error(`Phase 8 reset smoke test failed: ${message}`);
  process.exitCode = 1;
});
