import "server-only";
import { Pool } from "pg";
import type { PoolClient, QueryResult, QueryResultRow } from "pg";

/** PostgreSQL pool for server-side use cases and session validation. */
let pool: Pool | undefined;

export type QueryExecutor = {
  query<R extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: readonly unknown[],
  ): Promise<QueryResult<R>>;
};

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const result = await getPool().query(sql, params);
  return result.rows as T[];
}

export async function closePool(): Promise<void> {
  if (!pool) return;
  const activePool = pool;
  pool = undefined;
  await activePool.end();
}

/** Use one PostgreSQL connection for the complete transaction. */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  let discardClient = false;

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      discardClient = true;
    }
    throw error;
  } finally {
    client.release(discardClient);
  }
}
