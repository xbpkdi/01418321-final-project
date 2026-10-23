import { Pool } from "pg";

/**
 * ยังไม่ได้ใช้งานจริง — โครงสร้างตารางอยู่ที่ 04-chapter2-diagrams-database/sql/schema.sql ใน repo 321-sa-proj
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
