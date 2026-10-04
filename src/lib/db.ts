import { Pool } from "pg";

/**
 * ยังไม่ได้ใช้งานจริง — รอ ER Diagram (todo/04-chapter2-diagrams-database.md) เสร็จก่อน
 * ระหว่างนี้ทุกหน้าดึงข้อมูลจาก src/mock/ ที่มีรูปร่างเดียวกับผลลัพธ์ของ query
 */
let pool: Pool | undefined;

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
