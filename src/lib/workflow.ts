/**
 * ลำดับงานของระบบตาม use case description + BizFlow To-Be
 *
 *   4A นำเข้า → 2A ตรวจสอบ → 2S จับคู่กฎ SKU → 3S ตรวจสต๊อก
 *     ├─ สต๊อกพอ  → 1S จับคู่ RSL → 6S จัดรูปแบบใบปะ → 9A พิมพ์ → 8A ส่งมอบ → 5S แจ้งเลขติดตาม → 7S ตัดสต๊อก
 *     └─ สต๊อกไม่พอ → 4S ต้นทุน → 5A ตัดสินใจ ─┬─ คุ้มค่า   → 6A สั่งซื้อจาก Supplier
 *                                            └─ ไม่คุ้มค่า → 7A ยกเลิก
 *
 * ทุกฟังก์ชันเป็น pure function: รับ state เดิม คืน state ใหม่ + ผลลัพธ์
 * หน้าจอเป็นคนแปลผลลัพธ์เป็นข้อความตาม UC (ดู src/lib/i18n/dict.ts)
 * ขั้นตอนของ System (Auto) — 2S, 3S, 6S, 7S — รันใน runAutomation หลังทุก action
 * เหมือน scheduler ที่ทำงานต่อทันทีเมื่อ Order เข้าสถานะที่รออยู่
 */

import type { OrderStatus } from "@/lib/order-status";
import type { ChannelConnection, ManualReason, Order } from "@/types/order";
import {
  calcUnitCost,
  isCompleteCost,
  type CostComponents,
  type CostKey,
  type CostLog,
  type Product,
  type PurchaseOrder,
  type StockLevel,
  type Supplier,
} from "@/types/product";
import { MOCK_USERS, type MockUser } from "@/mock/users";
import {
  SEED_CONNECTION,
  SEED_ORDERS,
  SEED_RMS_CANCEL_REQUESTS,
  SEED_RMS_INBOX,
} from "@/mock/orders";
import {
  SEED_PRODUCTS,
  SEED_PURCHASE_ORDERS,
  SEED_STOCK,
  SEED_SUPPLIERS,
  seedCosts,
} from "@/mock/products";
import { findRslMatches, type RslShipment } from "@/mock/rsl";
import { findShippingRule, findTracking, trackCarrier } from "@/mock/delivery";

/**
 * จุดที่ระบบภายนอกล้มเหลวได้ตาม "ทางเลือก" ของแต่ละ UC
 * ปกติปิดหมด เปิดได้จากหน้า /dev เพื่อทดสอบและ capture รูปลงรายงาน (rubric ข้อ 33)
 */
export const FAULT_KEYS = [
  "rms", // 4A ทางเลือก #1
  "marketplaceVerify", // 2A ดึงข้อมูลล่าสุดจาก Marketplace ไม่ได้
  "skuRuleDb", // 2S ฐานข้อมูลกฎ SKU เข้าถึงไม่ได้
  "rsl", // 1S ทางเลือก #4, 3S ทางเลือก #3
  "labelService", // 6S สร้างไฟล์ใบปะไม่สำเร็จ
  "printer", // 9A ทางเลือก #2
  "carrier", // 8A ทางเลือก #4
  "trackingNotify", // 5S ทางเลือก #1
  "mpStockSync", // 7S ทางเลือก #1
  "supplierSend", // 6A ทางเลือก #3
  "db", // 5A บันทึกไม่สำเร็จ, 10A rollback
] as const;
export type FaultKey = (typeof FAULT_KEYS)[number];

export type DeletionLog = {
  data_type: "order" | "cost" | "label" | "reorder";
  record_id: string;
  deleted_at: string;
  deleted_by: string;
};

export type AppState = {
  version: 1;
  orders: Order[];
  products: Product[];
  suppliers: Supplier[];
  stock: StockLevel[];
  costs: CostComponents[];
  costLog: CostLog[];
  purchaseOrders: PurchaseOrder[];
  rmsInbox: Omit<Order, "order_id" | "order_status">[];
  rmsCancelRequests: string[];
  connection: ChannelConnection;
  users: MockUser[];
  session: { user_id: string; user_email: string } | null;
  faults: Record<FaultKey, boolean>;
  deletionLog: DeletionLog[];
  /** Log ข้อผิดพลาดของงานอัตโนมัติ (4A ทางเลือก #1 ฯลฯ) */
  errorLog: { at: string; message: string }[];
  nextOrderSeq: number;
  nextPoSeq: number;
};

const DAY = 24 * 60 * 60 * 1000;

export function createSeed(now = Date.now()): AppState {
  const costs = seedCosts(now);
  const iso = (offsetDays: number) =>
    new Date(now - offsetDays * DAY).toISOString();
  return {
    version: 1,
    orders: structuredClone(SEED_ORDERS),
    products: structuredClone(SEED_PRODUCTS),
    suppliers: structuredClone(SEED_SUPPLIERS),
    stock: structuredClone(SEED_STOCK),
    costs,
    // ประวัติการคำนวณ (Q5.3) — มีรายการเก่ากว่า 12 เดือนไว้ทดสอบ 10A
    costLog: [
      costLogFrom(costs[0], "2025-04-10T10:00:00+09:00"),
      costLogFrom(costs[2], "2025-05-22T15:30:00+09:00"),
      costLogFrom(costs[1], iso(3)),
    ].filter((x): x is CostLog => x !== null),
    purchaseOrders: [
      ...structuredClone(SEED_PURCHASE_ORDERS),
      {
        po_id: "PO-0042",
        sku: "FSH-MLR-240",
        supplier_id: "SUP-01",
        order_qty: 200,
        order_date: "2025-05-02T10:00:00+09:00",
        eta: "2025-05-23",
        status: "สั่งซื้อแล้ว",
      },
    ],
    rmsInbox: structuredClone(SEED_RMS_INBOX),
    rmsCancelRequests: [...SEED_RMS_CANCEL_REQUESTS],
    connection: { ...SEED_CONNECTION },
    users: structuredClone(MOCK_USERS),
    session: null,
    faults: Object.fromEntries(FAULT_KEYS.map((k) => [k, false])) as Record<
      FaultKey,
      boolean
    >,
    deletionLog: [],
    errorLog: [],
    nextOrderSeq: 24191,
    nextPoSeq: 92,
  };
}

function costLogFrom(c: CostComponents, at: string): CostLog | null {
  if (!isCompleteCost(c)) return null;
  return {
    sku: c.sku,
    unit_cost: calcUnitCost(c),
    components: pickCost(c),
    calculated_at: at,
    calculated_by: "U001",
  };
}

function pickCost(c: CostComponents & Record<CostKey, number>) {
  return {
    purchase_price: c.purchase_price,
    exchange_rate: c.exchange_rate,
    intl_freight: c.intl_freight,
    duty_fee: c.duty_fee,
    order_qty: c.order_qty,
    marketplace_fee: c.marketplace_fee,
    domestic_shipping: c.domestic_shipping,
    rsl_charge: c.rsl_charge,
    currency: c.currency,
  };
}

const nowIso = () => new Date().toISOString();

function patchOrder(
  s: AppState,
  orderId: string,
  patch: Partial<Order>,
): AppState {
  return {
    ...s,
    orders: s.orders.map((o) =>
      o.order_id === orderId ? { ...o, ...patch } : o,
    ),
  };
}

function setStatus(
  s: AppState,
  orderId: string,
  status: OrderStatus,
  extra: Partial<Order> = {},
): AppState {
  // ออกจาก "รอดำเนินการด้วยตนเอง" แล้วต้องล้างสาเหตุทิ้ง ไม่งั้นหน้าอื่นจะเข้าใจผิด
  const manual_reason =
    status === "รอดำเนินการด้วยตนเอง" ? extra.manual_reason : undefined;
  return patchOrder(s, orderId, {
    ...extra,
    order_status: status,
    manual_reason,
    auto_error: undefined,
  });
}

function toManual(
  s: AppState,
  orderId: string,
  reason: ManualReason,
): AppState {
  return setStatus(s, orderId, "รอดำเนินการด้วยตนเอง", {
    manual_reason: reason,
  });
}

export function findOrder(s: AppState, orderId: string) {
  return s.orders.find((o) => o.order_id === orderId);
}

export function findProduct(s: AppState, sku: string) {
  return s.products.find((p) => p.sku === sku);
}

export function findSupplier(s: AppState, supplierId: string) {
  return s.suppliers.find((x) => x.supplier_id === supplierId);
}

export function userId(s: AppState) {
  return s.session?.user_id ?? "U001";
}

/** ยอดรวมสต๊อกตาม 3S: in_house + rsl (ถ้า RSL ขาดหายหรือเชื่อมต่อไม่ได้ ใช้เฉพาะคลังบริษัท) */
export function stockTotal(s: AppState, sku: string) {
  const row = s.stock.find((x) => x.sku === sku);
  if (!row) return null;
  const rslAvailable = row.rsl_qty !== null && !s.faults.rsl;
  return {
    row,
    total: row.in_house_qty + (rslAvailable ? (row.rsl_qty ?? 0) : 0),
    partial: !rslAvailable,
  };
}

/** สถานะที่ถือว่า Order ปิดแล้ว (7A Pre-Condition, 10A) */
export const CLOSED_STATUSES: OrderStatus[] = ["จัดส่งสำเร็จ", "ยกเลิกแล้ว"];

// 1A เข้าสู่ระบบ

export const EMAIL_PATTERN = /^[A-Za-z0-9]+@[A-Za-z0-9]+\.[A-Za-z0-9]+$/;

export type LoginResult =
  "incomplete" | "email-format" | "locked" | "wrong" | "ok";

export function login(
  s: AppState,
  email: string,
  password: string,
): { state: AppState; result: LoginResult } {
  if (!email.trim() || !password.trim())
    return { state: s, result: "incomplete" };
  if (!EMAIL_PATTERN.test(email.trim()))
    return { state: s, result: "email-format" };

  // Q1.1
  const user = s.users.find((u) => u.user_email === email.trim());
  if (user && user.fail_attempts >= 5) return { state: s, result: "locked" };
  if (!user) return { state: s, result: "wrong" };
  if (user.user_password !== password) {
    // รหัสผ่านผิด: +1 ให้ fail_attempts
    return {
      state: {
        ...s,
        users: s.users.map((u) =>
          u.user_id === user.user_id
            ? { ...u, fail_attempts: u.fail_attempts + 1 }
            : u,
        ),
      },
      result: "wrong",
    };
  }
  // สำเร็จ: fail_attempts = 0, last_login = ตอนนี้
  return {
    state: {
      ...s,
      users: s.users.map((u) =>
        u.user_id === user.user_id
          ? { ...u, fail_attempts: 0, last_login: nowIso() }
          : u,
      ),
      session: { user_id: user.user_id, user_email: user.user_email },
    },
    result: "ok",
  };
}

export function logout(s: AppState): AppState {
  // ยกเลิก session อย่างเดียว ไม่แตะข้อมูลอื่น
  return { ...s, session: null };
}

// 4A ดึง Order เข้าระบบ

export type ImportResult =
  | { ok: false }
  | {
      ok: true;
      imported: number;
      duplicates: number;
      incomplete: number;
      unregistered: number;
      /** Order ที่ลูกค้ายกเลิกที่ Rakuten ระหว่างที่ระบบกำลังดำเนินการอยู่ (ทางเลือก #3) */
      cancelRequested: string[];
    };

export function importOrders(s: AppState): {
  state: AppState;
  result: ImportResult;
} {
  // ทางเลือก #1: เชื่อมต่อ Rakuten RMS ไม่ได้ → บันทึก Log ไว้ลองใหม่รอบถัดไป
  if (s.faults.rms) {
    return {
      state: {
        ...s,
        connection: { ...s.connection, connected: false },
        errorLog: [
          ...s.errorLog,
          { at: nowIso(), message: "4A: RMS connection failed" },
        ],
      },
      result: { ok: false },
    };
  }

  let next: AppState = {
    ...s,
    connection: { ...s.connection, connected: true, last_sync: nowIso() },
  };
  let imported = 0;
  let duplicates = 0;
  let incomplete = 0;
  let unregistered = 0;
  const remaining: AppState["rmsInbox"] = [];

  for (const item of s.rmsInbox) {
    // ข้อมูลไม่ครบ → ไม่นำเข้า แจ้งเตือน (คงไว้ใน RMS ให้ตรวจสอบ)
    if (
      !item.marketplace_order_id ||
      !item.sku ||
      !item.qty ||
      !item.shipping_address
    ) {
      incomplete++;
      remaining.push(item);
      continue;
    }
    // marketplace_order_id ซ้ำ → ข้ามรายการ
    if (
      next.orders.some(
        (o) => o.marketplace_order_id === item.marketplace_order_id,
      )
    ) {
      duplicates++;
      continue;
    }
    // Q11.1
    const order: Order = {
      ...item,
      order_id: `ORD-${next.nextOrderSeq}`,
      order_status: "รอตรวจสอบคำสั่งซื้อ",
    };
    next = {
      ...next,
      orders: [order, ...next.orders],
      nextOrderSeq: next.nextOrderSeq + 1,
    };
    imported++;
    // ทางเลือก #2: SKU ยังไม่ได้ลงทะเบียน
    if (!findProduct(next, item.sku)) {
      next = toManual(next, order.order_id, "sku-unregistered");
      unregistered++;
    }
  }

  // ทางเลือก #3: Order ถูกยกเลิกจากฝั่ง Rakuten หลังนำเข้าแล้ว
  const cancelRequested: string[] = [];
  for (const mpId of s.rmsCancelRequests) {
    const o = next.orders.find((x) => x.marketplace_order_id === mpId);
    if (!o || CLOSED_STATUSES.includes(o.order_status)) continue;
    next = patchOrder(next, o.order_id, { customer_cancel_request: true });
    if (o.order_status !== "รอตรวจสอบคำสั่งซื้อ")
      cancelRequested.push(o.order_id);
  }

  return {
    state: { ...next, rmsInbox: remaining, rmsCancelRequests: [] },
    result: {
      ok: true,
      imported,
      duplicates,
      incomplete,
      unregistered,
      cancelRequested,
    },
  };
}

// 2A ตรวจสอบคำสั่งซื้อ

/** ฟิลด์ที่ 2A อนุญาตให้แก้ก่อนยืนยัน */
export const VERIFY_EDITABLE = ["shipping_method"] as const;

export type VerifyResult =
  | "incomplete"
  | "qty"
  | "already"
  | "customer-cancelled"
  | "marketplace"
  | "ok";

export function verifyOrder(
  s: AppState,
  orderId: string,
  edits: { shipping_method: string },
): { state: AppState; result: VerifyResult } {
  const o = findOrder(s, orderId);
  if (!o) return { state: s, result: "already" };

  // 3. สถานะต้องเป็น "รอตรวจสอบคำสั่งซื้อ" — เช็คก่อน กันกดซ้ำแล้วไปแตะ Order ที่ไหลต่อไปแล้ว
  if (o.order_status !== "รอตรวจสอบคำสั่งซื้อ")
    return { state: s, result: "already" };

  // 2. ความครบถ้วนของข้อมูล
  if (
    !o.sku.trim() ||
    o.qty === null ||
    o.qty === undefined ||
    !o.shipping_address.trim()
  ) {
    return { state: toManual(s, orderId, "incomplete"), result: "incomplete" };
  }
  if (!Number.isInteger(o.qty) || o.qty <= 0)
    return { state: s, result: "qty" };

  // ลูกค้ายกเลิกที่ Rakuten ก่อน Admin กดยืนยัน
  if (o.customer_cancel_request) {
    return {
      state: setStatus(s, orderId, "ยกเลิกแล้ว", {
        cancel_reason: "ลูกค้ายกเลิกผ่าน Rakuten",
        cancelled_at: nowIso(),
      }),
      result: "customer-cancelled",
    };
  }

  // ดึงข้อมูลล่าสุดจาก Rakuten มาเทียบไม่ได้ → คงสถานะเดิม
  if (s.faults.marketplaceVerify) return { state: s, result: "marketplace" };

  // แก้ไขฟิลด์ที่อนุญาต + เก็บ Log ว่าใครแก้เมื่อไร
  let next = s;
  if (edits.shipping_method !== o.shipping_method) {
    next = patchOrder(next, orderId, {
      shipping_method: edits.shipping_method,
      edit_log: [
        ...(o.edit_log ?? []),
        { field: "shipping_method", by: userId(s), at: nowIso() },
      ],
    });
  }

  // Q2A.2
  return {
    state: setStatus(next, orderId, "รอจับคู่กฎ SKU", {
      verified_at: nowIso(),
    }),
    result: "ok",
  };
}

// 3A ตั้งกฎ SKU

export type ProductResult =
  "incomplete" | "duplicate" | "invalid-number" | "ok";

/** สถานะที่ถือว่ายังมีรายการค้างอยู่กับสินค้า (3A ทางเลือก #1) */
function hasOpenOrders(s: AppState, sku: string) {
  return (
    s.orders.some(
      (o) => o.sku === sku && !CLOSED_STATUSES.includes(o.order_status),
    ) ||
    s.purchaseOrders.some((p) => p.sku === sku && p.status !== "ยกเลิกแล้ว")
  );
}

export function validateProduct(
  s: AppState,
  draft: Product,
  originalSku: string | null,
): ProductResult {
  if (!draft.product_name.trim() || !draft.sku.trim()) return "incomplete";
  if (
    s.products.some((p) => p.sku === draft.sku.trim() && p.sku !== originalSku)
  )
    return "duplicate";
  const positiveInt = (n: number) => Number.isInteger(n) && n > 0;
  if (!positiveInt(draft.reorder_threshold) || !positiveInt(draft.reorder_qty))
    return "invalid-number";
  return "ok";
}

/**
 * Q13.1 บันทึกสินค้า แล้วนำ Order ที่ค้างเพราะสินค้านี้กลับเข้ากระบวนการเอง
 * - กฎ SKU ใหม่/แก้แล้ว → Order "รอดำเนินการด้วยตนเอง" จาก 2S กลับไปจับคู่กฎ SKU (2S ขั้นตอนที่ 3)
 * - ลงทะเบียน SKU แล้ว → Order จาก 4A ทางเลือก #2 กลับไปรอตรวจสอบ
 * - ระบุราคาขายแล้ว → Order จาก 5A กลับไปรอ Admin ตัดสินใจ
 */
export function saveProduct(
  s: AppState,
  draft: Product,
  originalSku: string | null,
): { state: AppState; result: ProductResult; requeued: number } {
  const result = validateProduct(s, draft, originalSku);
  if (result !== "ok") return { state: s, result, requeued: 0 };

  const clean = {
    ...draft,
    sku: draft.sku.trim(),
    product_name: draft.product_name.trim(),
  };
  let next: AppState = {
    ...s,
    products: originalSku
      ? s.products.map((p) => (p.sku === originalSku ? clean : p))
      : [...s.products, clean],
    // สินค้าใหม่ต้องมีแถวในตาราง stock ด้วย ไม่งั้น 3S หาไม่เจอ
    stock: s.stock.some((x) => x.sku === clean.sku)
      ? s.stock
      : [
          ...s.stock,
          { sku: clean.sku, in_house_qty: 0, rsl_qty: 0, updated_at: nowIso() },
        ],
  };

  let requeued = 0;
  for (const o of next.orders) {
    if (o.order_status !== "รอดำเนินการด้วยตนเอง") continue;
    if (o.manual_reason === "sku-rule" && o.channel_sku === clean.channel_sku) {
      next = setStatus(next, o.order_id, "รอจับคู่กฎ SKU");
      requeued++;
    } else if (o.manual_reason === "sku-unregistered" && o.sku === clean.sku) {
      next = setStatus(next, o.order_id, "รอตรวจสอบคำสั่งซื้อ");
      requeued++;
    } else if (
      o.manual_reason === "price" &&
      o.sku === clean.sku &&
      clean.selling_price !== null
    ) {
      next = setStatus(next, o.order_id, "รอ Admin ตัดสินใจสั่งซื้อ");
      requeued++;
    }
  }
  return { state: next, result: "ok", requeued };
}

export function setProductActive(
  s: AppState,
  sku: string,
  active: boolean,
): AppState {
  return {
    ...s,
    products: s.products.map((p) => (p.sku === sku ? { ...p, active } : p)),
  };
}

/** ทางเลือก #1: ลบไม่ได้ถ้ายังมีรายการที่เกี่ยวข้อง */
export function deleteProduct(
  s: AppState,
  sku: string,
): { state: AppState; result: "has-related" | "ok" } {
  if (hasOpenOrders(s, sku)) return { state: s, result: "has-related" };
  return {
    state: {
      ...s,
      products: s.products.filter((p) => p.sku !== sku),
      costs: s.costs.filter((c) => c.sku !== sku),
    },
    result: "ok",
  };
}

export type CsvRowResult = { row: number; sku: string; result: ProductResult };

/**
 * ทางเลือก #2: นำเข้าสินค้าจาก CSV ตรวจทีละแถว
 * หัวตาราง: sku,product_name,variation,channel_sku,supplier_id,reorder_threshold,reorder_qty,selling_price
 */
export function importProductsCsv(
  s: AppState,
  csv: string,
): { state: AppState; rows: CsvRowResult[] } {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim());
  const [header, ...body] = lines;
  const cols = (header ?? "").split(",").map((h) => h.trim());
  let next = s;
  const rows: CsvRowResult[] = [];
  body.forEach((line, i) => {
    const cells = line.split(",").map((c) => c.trim());
    const get = (name: string) => cells[cols.indexOf(name)] ?? "";
    const price = get("selling_price");
    const draft: Product = {
      sku: get("sku"),
      product_name: get("product_name"),
      variation: get("variation"),
      sales_channel: "Rakuten Ichiba",
      channel_sku: get("channel_sku"),
      supplier_id: get("supplier_id"),
      reorder_threshold: Number(get("reorder_threshold")),
      reorder_qty: Number(get("reorder_qty")),
      selling_price: price === "" ? null : Number(price),
      active: true,
    };
    const existing = findProduct(next, draft.sku) ? draft.sku : null;
    const saved = saveProduct(next, draft, existing);
    next = saved.state;
    rows.push({ row: i + 2, sku: draft.sku, result: saved.result });
  });
  return { state: next, rows };
}

// 3S ตรวจสอบสต๊อก

export type StockCheck =
  | { found: false }
  | {
      found: true;
      sku: string;
      in_house_qty: number;
      rsl_qty: number | null;
      total: number;
      threshold: number;
      low: boolean;
      /** ข้อมูล RSL ขาดหาย (ทางเลือก #1) */
      incomplete: boolean;
      /** เชื่อมต่อ RSL ไม่ได้ แสดงเฉพาะคลังบริษัท (ทางเลือก #3) */
      partial: boolean;
    };

export function checkStock(s: AppState, sku: string): StockCheck {
  const product = findProduct(s, sku);
  const st = stockTotal(s, sku);
  if (!product || !st) return { found: false };
  return {
    found: true,
    sku,
    in_house_qty: st.row.in_house_qty,
    rsl_qty: s.faults.rsl ? null : st.row.rsl_qty,
    total: st.total,
    threshold: product.reorder_threshold,
    low: st.total <= product.reorder_threshold,
    incomplete: st.row.rsl_qty === null,
    partial: s.faults.rsl,
  };
}

// 4S คำนวณต้นทุน

export type CostForm = Record<CostKey, string> & { currency: string };

export type CostCalcResult =
  | { ok: false; reason: "invalid" | "no-rate" }
  | {
      ok: true;
      unit_cost: number;
      components: Record<CostKey, number>;
      overPrice: boolean;
    };

export function costToForm(
  c: CostComponents | undefined,
  sku: string,
): CostForm {
  const v = (n: number | null | undefined) =>
    n === null || n === undefined ? "" : String(n);
  return {
    purchase_price: v(c?.purchase_price),
    exchange_rate: v(c?.exchange_rate),
    intl_freight: v(c?.intl_freight),
    duty_fee: v(c?.duty_fee),
    order_qty: v(c?.order_qty),
    marketplace_fee: v(c?.marketplace_fee),
    domestic_shipping: v(c?.domestic_shipping),
    rsl_charge: v(c?.rsl_charge),
    currency: c?.currency ?? (sku ? "CNY" : ""),
  };
}

/** อัตราแลกเปลี่ยนเก่าเกิน 24 ชั่วโมง (ทางเลือก #4) */
export function isRateStale(c: CostComponents | undefined, now = Date.now()) {
  if (!c?.exchange_rate_updated_at) return false;
  return now - new Date(c.exchange_rate_updated_at).getTime() > DAY;
}

/**
 * Q5.2 + Q5.3
 * remember = true: บันทึกค่าที่กรอกเองไว้ใช้ครั้งถัดไป (ทางเลือก #1)
 */
export function calculateCost(
  s: AppState,
  sku: string,
  form: CostForm,
  remember: boolean,
): { state: AppState; result: CostCalcResult } {
  if (form.exchange_rate.trim() === "")
    return { state: s, result: { ok: false, reason: "no-rate" } };
  const values = {} as Record<CostKey, number>;
  for (const key of Object.keys(form) as (keyof CostForm)[]) {
    if (key === "currency") continue;
    const raw = form[key].trim();
    const n = Number(raw);
    if (raw === "" || Number.isNaN(n) || n < 0)
      return { state: s, result: { ok: false, reason: "invalid" } };
    values[key] = n;
  }
  if (values.order_qty <= 0 || values.exchange_rate <= 0) {
    return { state: s, result: { ok: false, reason: "invalid" } };
  }

  const unit_cost = calcUnitCost(values);
  const product = findProduct(s, sku);
  const log: CostLog = {
    sku,
    unit_cost,
    components: { ...values, currency: form.currency },
    calculated_at: nowIso(),
    calculated_by: userId(s),
  };

  let next: AppState = { ...s, costLog: [...s.costLog, log] };
  if (remember) {
    const old = s.costs.find((c) => c.sku === sku);
    const rateChanged = old?.exchange_rate !== values.exchange_rate;
    const saved: CostComponents = {
      sku,
      ...values,
      currency: form.currency,
      exchange_rate_updated_at:
        rateChanged || !old?.exchange_rate_updated_at
          ? nowIso()
          : old.exchange_rate_updated_at,
    };
    next = {
      ...next,
      costs: old
        ? next.costs.map((c) => (c.sku === sku ? saved : c))
        : [...next.costs, saved],
    };
  }

  return {
    state: next,
    result: {
      ok: true,
      unit_cost,
      components: values,
      overPrice:
        product?.selling_price !== null &&
        product?.selling_price !== undefined &&
        unit_cost > product.selling_price,
    },
  };
}

/** ต้นทุนต่อหน่วยที่ 5A ใช้: คำนวณจากองค์ประกอบล่าสุด ถ้าไม่ครบใช้ผลคำนวณครั้งล่าสุดใน log */
export function unitCostOf(
  s: AppState,
  sku: string,
  qty?: number,
): number | null {
  const c = s.costs.find((x) => x.sku === sku);
  if (c && isCompleteCost(c)) return unitCostForQty(c, qty ?? c.order_qty);
  const logs = s.costLog.filter((l) => l.sku === sku);
  if (logs.length === 0) return null;
  const last = logs[logs.length - 1];
  return qty ? unitCostForQty(last.components, qty) : last.unit_cost;
}

/**
 * 5A: แก้จำนวนสั่งซื้อแล้วคำนวณ unit_cost ใหม่
 * ราคาซื้อคิดตามจำนวน ส่วนค่าขนส่งระหว่างประเทศและภาษีเป็นค่าต่อเที่ยว
 */
export function unitCostForQty(c: Record<CostKey, number>, qty: number) {
  const perPiece = c.purchase_price / c.order_qty;
  return calcUnitCost({ ...c, purchase_price: perPiece * qty, order_qty: qty });
}

// 5A ตัดสินใจสั่งซื้อ

export type DecideResult = "not-pending" | "no-price" | "no-cost" | "db" | "ok";

export function decide(
  s: AppState,
  orderId: string,
  decision: "คุ้มค่า" | "ไม่คุ้มค่า",
  qty: number,
): { state: AppState; result: DecideResult } {
  const o = findOrder(s, orderId);
  if (!o || o.order_status !== "รอ Admin ตัดสินใจสั่งซื้อ")
    return { state: s, result: "not-pending" };
  const product = findProduct(s, o.sku);
  if (!product || product.selling_price === null) {
    return { state: toManual(s, orderId, "price"), result: "no-price" };
  }
  if (unitCostOf(s, o.sku) === null) return { state: s, result: "no-cost" };
  if (s.faults.db) return { state: s, result: "db" };
  // Q5A.3 / Q5A.4
  return {
    state: setStatus(
      s,
      orderId,
      decision === "คุ้มค่า" ? "รอสั่งซื้อจาก Supplier" : "รอยกเลิก Order",
      {
        decision,
        decided_qty: decision === "คุ้มค่า" ? qty : undefined,
      },
    ),
    result: "ok",
  };
}

/** มีคำสั่งซื้อ SKU นี้ค้างอยู่กับ Supplier หรือไม่ (5A, 6A ทางเลือก #4) */
export function pendingPo(s: AppState, sku: string) {
  return s.purchaseOrders.find(
    (p) =>
      p.sku === sku &&
      p.status === "สั่งซื้อแล้ว" &&
      new Date(p.eta).getTime() > Date.now() - DAY,
  );
}

// 6A สั่งซื้อจาก Supplier

export type PurchaseRow = {
  sku: string;
  product_name: string;
  variation: string;
  total: number | null;
  threshold: number;
  reorder_qty: number;
  /** จำนวนที่ Admin กำหนดไว้ตอนตัดสินใจใน 5A (ถ้ามี) */
  decided_qty: number | null;
  supplier: Supplier | undefined;
  /** Order ที่รอสั่งซื้อจาก Supplier ด้วย SKU นี้ */
  orderIds: string[];
  low: boolean;
  /** ส่งไม่สำเร็จครั้งก่อน */
  retry: boolean;
};

/**
 * หน้า "รอสั่งซื้อเติมสต๊อก" (6A ขั้นตอนที่ 2)
 * รวม SKU ที่สต๊อกรวม ≤ Reorder Threshold กับ SKU ของ Order ที่ Admin ตัดสินใจ "คุ้มค่า" ใน 5A
 */
export function purchaseQueue(s: AppState): PurchaseRow[] {
  const rows = new Map<string, PurchaseRow>();
  const ensure = (sku: string) => {
    const product = findProduct(s, sku);
    if (!product) return null;
    if (!rows.has(sku)) {
      const st = stockTotal(s, sku);
      rows.set(sku, {
        sku,
        product_name: product.product_name,
        variation: product.variation,
        total: st?.total ?? null,
        threshold: product.reorder_threshold,
        reorder_qty: product.reorder_qty,
        decided_qty: null,
        supplier: findSupplier(s, product.supplier_id),
        orderIds: [],
        low: st ? st.total <= product.reorder_threshold : false,
        retry: s.purchaseOrders.some(
          (p) => p.sku === sku && p.status === "รอส่งคำสั่งซื้อ",
        ),
      });
    }
    return rows.get(sku)!;
  };

  for (const p of s.products) {
    if (!p.active) continue;
    const st = stockTotal(s, p.sku);
    if (st && st.total <= p.reorder_threshold && !pendingPo(s, p.sku))
      ensure(p.sku);
  }
  for (const o of s.orders) {
    if (
      o.order_status !== "รอสั่งซื้อจาก Supplier" &&
      o.order_status !== "รอส่งคำสั่งซื้อ"
    )
      continue;
    const row = ensure(o.sku);
    if (!row) continue;
    row.orderIds.push(o.order_id);
    if (o.decided_qty)
      row.decided_qty = Math.max(row.decided_qty ?? 0, o.decided_qty);
    if (o.order_status === "รอส่งคำสั่งซื้อ") row.retry = true;
  }
  for (const p of s.purchaseOrders)
    if (p.status === "รอส่งคำสั่งซื้อ") ensure(p.sku);
  return [...rows.values()];
}

export type PurchaseResult =
  | { kind: "not-configured" }
  | { kind: "pending-po"; eta: string }
  | { kind: "send-failed" }
  | { kind: "ok"; po: PurchaseOrder; supplier: Supplier };

export function purchase(
  s: AppState,
  sku: string,
  qty: number,
  confirmDuplicate: boolean,
): { state: AppState; result: PurchaseResult } {
  const product = findProduct(s, sku);
  const supplier = product ? findSupplier(s, product.supplier_id) : undefined;
  const orderIds = s.orders
    .filter(
      (o) =>
        o.sku === sku &&
        (o.order_status === "รอสั่งซื้อจาก Supplier" ||
          o.order_status === "รอส่งคำสั่งซื้อ"),
    )
    .map((o) => o.order_id);

  // ทางเลือก #1: ไม่มี Supplier / จำนวนสั่งซื้อ / Lead Time
  if (!product || !supplier || !qty || qty <= 0 || !supplier.lead_time) {
    let next = s;
    for (const id of orderIds) next = toManual(next, id, "supplier");
    return { state: next, result: { kind: "not-configured" } };
  }

  // ทางเลือก #4: มีคำสั่งซื้อค้างอยู่แล้ว ต้องให้ Admin ยืนยันก่อน
  const pending = pendingPo(s, sku);
  if (pending && !confirmDuplicate)
    return { state: s, result: { kind: "pending-po", eta: pending.eta } };

  // ทางเลือก #3: ส่งไม่สำเร็จ → คงสถานะเป็น "รอส่งคำสั่งซื้อ"
  if (s.faults.supplierSend) {
    let next = s;
    for (const id of orderIds)
      next = setStatus(next, id, "รอส่งคำสั่งซื้อ", {});
    if (
      !s.purchaseOrders.some(
        (p) => p.sku === sku && p.status === "รอส่งคำสั่งซื้อ",
      )
    ) {
      next = {
        ...next,
        purchaseOrders: [
          ...next.purchaseOrders,
          {
            po_id: `PO-${String(next.nextPoSeq).padStart(4, "0")}`,
            sku,
            supplier_id: supplier.supplier_id,
            order_qty: qty,
            order_date: nowIso(),
            eta: "",
            status: "รอส่งคำสั่งซื้อ",
          },
        ],
        nextPoSeq: next.nextPoSeq + 1,
      };
    }
    return { state: next, result: { kind: "send-failed" } };
  }

  // Q7.1 + Q7.2 แล้วอัปเดตเป็น "สั่งซื้อแล้ว" พร้อมวันที่คาดว่าจะได้รับ
  const eta = new Date(Date.now() + supplier.lead_time * DAY)
    .toISOString()
    .slice(0, 10);
  const retrying = s.purchaseOrders.find(
    (p) => p.sku === sku && p.status === "รอส่งคำสั่งซื้อ",
  );
  const po: PurchaseOrder = {
    po_id: retrying?.po_id ?? `PO-${String(s.nextPoSeq).padStart(4, "0")}`,
    sku,
    supplier_id: supplier.supplier_id,
    order_qty: qty,
    order_date: nowIso(),
    eta,
    status: "สั่งซื้อแล้ว",
  };
  let next: AppState = {
    ...s,
    purchaseOrders: retrying
      ? s.purchaseOrders.map((p) => (p.po_id === retrying.po_id ? po : p))
      : [...s.purchaseOrders, po],
    nextPoSeq: retrying ? s.nextPoSeq : s.nextPoSeq + 1,
  };
  for (const id of orderIds)
    next = setStatus(next, id, "สั่งซื้อแล้ว", { po_id: po.po_id });
  return { state: next, result: { kind: "ok", po, supplier } };
}

// 1S จับคู่ RSL

/** Order ที่รอจับคู่ RSL — รวม Order ที่ตกไปทำมือเพราะหา SKU ใน RSL ไม่เจอ */
export function rslQueue(s: AppState) {
  return s.orders.filter(
    (o) =>
      o.order_status === "ยังไม่ได้จับคู่" ||
      (o.order_status === "รอดำเนินการด้วยตนเอง" && o.manual_reason === "rsl"),
  );
}

export type MatchResult =
  | { kind: "not-found" }
  | { kind: "multiple"; options: RslShipment[] }
  | { kind: "connection" }
  | { kind: "ok"; reference: string };

export function matchRsl(
  s: AppState,
  orderId: string,
  chosen?: string,
): { state: AppState; result: MatchResult } {
  const o = findOrder(s, orderId);
  if (!o) return { state: s, result: { kind: "not-found" } };
  // ทางเลือก #4: คงไว้ที่ "ยังไม่ได้จับคู่" ให้ลองใหม่รอบถัดไป
  if (s.faults.rsl) return { state: s, result: { kind: "connection" } };

  // Q4.1
  const found = findRslMatches(o.sku, o.variation);
  const pick = chosen
    ? found.find((f) => f.rsl_order_id === chosen)
    : found.length === 1
      ? found[0]
      : undefined;
  if (found.length === 0)
    return {
      state: toManual(s, orderId, "rsl"),
      result: { kind: "not-found" },
    };
  if (!pick) return { state: s, result: { kind: "multiple", options: found } };

  // Q4.2 แล้วส่งต่อ 6S
  return {
    state: setStatus(s, orderId, "รอจัดรูปแบบใบปะสินค้า", {
      rsl_reference_id: pick.rsl_order_id,
    }),
    result: { kind: "ok", reference: pick.rsl_order_id },
  };
}

export function matchAllRsl(s: AppState) {
  let next = s;
  const summary = { matched: 0, multiple: 0, notFound: 0, connection: false };
  for (const o of rslQueue(s)) {
    if (o.order_status !== "ยังไม่ได้จับคู่") continue;
    const r = matchRsl(next, o.order_id);
    next = r.state;
    if (r.result.kind === "ok") summary.matched++;
    else if (r.result.kind === "multiple") summary.multiple++;
    else if (r.result.kind === "not-found") summary.notFound++;
    else {
      summary.connection = true;
      break;
    }
  }
  return { state: next, summary };
}

/** ทางเลือก #3: ยกเลิกการจับคู่ — ล้าง rsl_reference_id และใบปะที่สร้างจากเลขเดิม */
export function unmatchRsl(s: AppState, orderId: string) {
  const o = findOrder(s, orderId);
  if (!o) return { state: s, result: "not-allowed" as const };
  const allowed: OrderStatus[] = ["รอจัดรูปแบบใบปะสินค้า", "รอพิมพ์ใบปะสินค้า"];
  if (
    !allowed.includes(o.order_status) &&
    !(o.order_status === "รอดำเนินการด้วยตนเอง" && o.rsl_reference_id)
  ) {
    return { state: s, result: "not-allowed" as const };
  }
  return {
    state: setStatus(s, orderId, "ยังไม่ได้จับคู่", {
      rsl_reference_id: undefined,
      label_template: undefined,
      parcel_total: undefined,
    }),
    result: "ok" as const,
  };
}

/** Order ที่จับคู่ RSL แล้วแต่ยังไม่ได้พิมพ์ใบปะ — ยกเลิกการจับคู่ได้ */
export function rslMatched(s: AppState) {
  return s.orders.filter(
    (o) =>
      o.rsl_reference_id &&
      (o.order_status === "รอจัดรูปแบบใบปะสินค้า" ||
        o.order_status === "รอพิมพ์ใบปะสินค้า" ||
        (o.order_status === "รอดำเนินการด้วยตนเอง" &&
          (o.manual_reason === "template" || o.manual_reason === "address"))),
  );
}

// 9A พิมพ์ใบปะสินค้า

export function labelQueue(s: AppState) {
  return s.orders.filter(
    (o) =>
      o.order_status === "รอพิมพ์ใบปะสินค้า" ||
      (o.order_status === "รอดำเนินการด้วยตนเอง" &&
        (o.manual_reason === "template" || o.manual_reason === "address")),
  );
}

export type PrintResult =
  "no-address" | "no-template" | "already" | "printer" | "ok";

export function printLabel(
  s: AppState,
  orderId: string,
  reprint = false,
): { state: AppState; result: PrintResult; template?: string } {
  const o = findOrder(s, orderId);
  if (!o) return { state: s, result: "no-address" };
  if (!o.shipping_address.trim() || !o.shipping_method.trim()) {
    return { state: toManual(s, orderId, "address"), result: "no-address" };
  }
  if (o.order_status === "พิมพ์ใบปะสินค้าแล้ว" && !reprint)
    return { state: s, result: "already" };

  // Q6.1
  const rule = findShippingRule(o.shipping_method, o.sales_channel);
  if (!rule)
    return { state: toManual(s, orderId, "template"), result: "no-template" };

  // ทางเลือก #2: เครื่องพิมพ์ไม่พร้อม → คงไว้ที่ "รอพิมพ์ใบปะสินค้า"
  if (s.faults.printer) return { state: s, result: "printer" };

  if (reprint) {
    // ทางเลือก #3: บันทึก Log การพิมพ์ซ้ำ
    return {
      state: patchOrder(s, orderId, {
        reprint_log: [
          ...(o.reprint_log ?? []),
          { by: userId(s), at: nowIso() },
        ],
      }),
      result: "ok",
      template: rule.label_template,
    };
  }

  // Q6.2
  return {
    state: setStatus(s, orderId, "พิมพ์ใบปะสินค้าแล้ว", {
      label_template: rule.label_template,
      label_printed_at: nowIso(),
    }),
    result: "ok",
    template: rule.label_template,
  };
}

// 8A จัดส่ง

export function shipmentQueue(s: AppState) {
  return s.orders.filter(
    (o) =>
      o.order_status === "พิมพ์ใบปะสินค้าแล้ว" || o.order_status === "รอส่งมอบ",
  );
}

export function shippedOrders(s: AppState) {
  const shown: OrderStatus[] = [
    "อยู่ระหว่างจัดส่ง",
    "รอแจ้งเลขติดตาม",
    "แจ้งเลขติดตามแล้ว",
    "จัดส่งสำเร็จ",
    "จัดส่งไม่สำเร็จ",
    "ตีกลับ/คืนสินค้า",
  ];
  return s.orders.filter(
    (o) => o.tracking_number && shown.includes(o.order_status),
  );
}

export type DispatchResult = {
  orderId: string;
  result: "not-printed" | "no-tracking" | "ok";
  tracking?: string;
  carrier?: string;
};

export function dispatch(
  s: AppState,
  orderIds: string[],
): { state: AppState; results: DispatchResult[] } {
  let next = s;
  const results: DispatchResult[] = [];
  for (const id of orderIds) {
    const o = findOrder(next, id);
    if (
      !o ||
      (o.order_status !== "พิมพ์ใบปะสินค้าแล้ว" &&
        o.order_status !== "รอส่งมอบ")
    ) {
      results.push({ orderId: id, result: "not-printed" });
      continue;
    }
    // Q8.1
    const info = findTracking(id);
    if (!info) {
      next = setStatus(next, id, "รอส่งมอบ");
      results.push({ orderId: id, result: "no-tracking" });
      continue;
    }
    // Q8.2
    next = setStatus(next, id, "อยู่ระหว่างจัดส่ง", {
      tracking_number: info.tracking_number,
      carrier_name: info.carrier_name,
      dispatched_at: nowIso(),
      delivery_status: "in_transit",
      tracking_notified: false,
    });
    results.push({
      orderId: id,
      result: "ok",
      tracking: info.tracking_number,
      carrier: info.carrier_name,
    });
  }
  return { state: next, results };
}

export type CarrierEvent =
  | { kind: "connection" }
  | { kind: "failed"; orderId: string }
  | { kind: "returned"; orderId: string; restocked: number };

/**
 * Q8.3 ดึงสถานะจากผู้ให้บริการขนส่ง
 * - ส่งไม่สำเร็จ → "จัดส่งไม่สำเร็จ" (ทางเลือก #2)
 * - ตีกลับ → "ตีกลับ/คืนสินค้า" และถ้าตัดสต๊อกไปแล้วให้คืนสต๊อก (ทางเลือก #3, 7S ทางเลือก #2)
 */
export function pollCarrier(s: AppState): {
  state: AppState;
  events: CarrierEvent[];
} {
  if (s.faults.carrier) return { state: s, events: [{ kind: "connection" }] };
  let next = s;
  const events: CarrierEvent[] = [];
  // รวม "รอดำเนินการพิเศษ" ด้วย เพราะเป็นคำขอยกเลิกที่รอพัสดุตีกลับ (7A ทางเลือก #1)
  const watched: OrderStatus[] = [
    "อยู่ระหว่างจัดส่ง",
    "รอแจ้งเลขติดตาม",
    "แจ้งเลขติดตามแล้ว",
    "จัดส่งสำเร็จ",
    "รอดำเนินการพิเศษ",
  ];
  for (const o of s.orders) {
    if (!o.tracking_number || !watched.includes(o.order_status)) continue;
    const { delivery_status } = trackCarrier(o.tracking_number);
    if (delivery_status === o.delivery_status) continue;
    if (delivery_status === "failed") {
      next = setStatus(next, o.order_id, "จัดส่งไม่สำเร็จ", {
        delivery_status,
      });
      events.push({ kind: "failed", orderId: o.order_id });
    } else if (delivery_status === "returned") {
      let restocked = 0;
      if (o.stock_deducted) {
        next = adjustStock(next, o.sku, o.fulfill_source, o.qty);
        restocked = o.qty;
      }
      next = setStatus(next, o.order_id, "ตีกลับ/คืนสินค้า", {
        delivery_status,
        stock_deducted: false,
      });
      events.push({ kind: "returned", orderId: o.order_id, restocked });
    } else {
      next = patchOrder(next, o.order_id, { delivery_status });
    }
  }
  return { state: next, events };
}

function adjustStock(
  s: AppState,
  sku: string,
  source: Order["fulfill_source"],
  delta: number,
): AppState {
  return {
    ...s,
    stock: s.stock.map((x) => {
      if (x.sku !== sku) return x;
      if (source === "rsl" && x.rsl_qty !== null)
        return { ...x, rsl_qty: x.rsl_qty + delta, updated_at: nowIso() };
      return {
        ...x,
        in_house_qty: x.in_house_qty + delta,
        updated_at: nowIso(),
      };
    }),
  };
}

// 5S แจ้งเลขติดตาม

export type NotifyResult = "incomplete" | "already" | "failed" | "ok";

export function notifyTracking(
  s: AppState,
  orderId: string,
  confirmResend: boolean,
): { state: AppState; result: NotifyResult } {
  const o = findOrder(s, orderId);
  if (!o || !o.tracking_number || !o.carrier_name)
    return { state: s, result: "incomplete" };
  // ทางเลือก #2: ส่งซ้ำต้องยืนยันก่อน
  if (o.tracking_notified && !confirmResend)
    return { state: s, result: "already" };
  // ทางเลือก #1: ส่งไม่สำเร็จ → "รอแจ้งเลขติดตาม" ให้ระบบลองใหม่
  if (s.faults.trackingNotify) {
    return {
      state: o.tracking_notified ? s : setStatus(s, orderId, "รอแจ้งเลขติดตาม"),
      result: "failed",
    };
  }
  // Q9.1 + Q9.2
  const resend = o.tracking_notified;
  const next = patchOrder(s, orderId, {
    tracking_notified: true,
    tracking_notified_at: nowIso(),
    notify_log: resend
      ? [...(o.notify_log ?? []), { by: userId(s), at: nowIso() }]
      : o.notify_log,
  });
  // ส่งครั้งแรกเท่านั้นที่ส่งต่อไป 7S
  return {
    state: resend ? next : setStatus(next, orderId, "แจ้งเลขติดตามแล้ว"),
    result: "ok",
  };
}

// 7A ยกเลิก Order

export type CancelCheck =
  | { kind: "closed" }
  | { kind: "already"; at: string }
  | { kind: "in-transit" }
  | { kind: "ok"; labelPrinted: boolean; linkedPo: PurchaseOrder | undefined };

/** พัสดุอยู่กับผู้ให้บริการขนส่งแล้ว — ยกเลิกในระบบทันทีไม่ได้ (ทางเลือก #1) */
const HANDED_OVER: OrderStatus[] = [
  "อยู่ระหว่างจัดส่ง",
  "รอแจ้งเลขติดตาม",
  "แจ้งเลขติดตามแล้ว",
  "จัดส่งไม่สำเร็จ",
  "รอดำเนินการพิเศษ",
];

/** ขั้นตอนที่ 2: ตรวจสอบสถานะก่อนเปิดฟอร์ม */
export function checkCancel(s: AppState, orderId: string): CancelCheck {
  const o = findOrder(s, orderId);
  if (!o) return { kind: "closed" };
  if (o.order_status === "ยกเลิกแล้ว")
    return { kind: "already", at: o.cancelled_at ?? "" };
  if (o.order_status === "จัดส่งสำเร็จ") return { kind: "closed" };
  if (HANDED_OVER.includes(o.order_status)) return { kind: "in-transit" };
  return {
    kind: "ok",
    labelPrinted:
      o.order_status === "พิมพ์ใบปะสินค้าแล้ว" || o.order_status === "รอส่งมอบ",
    linkedPo: o.po_id
      ? s.purchaseOrders.find(
          (p) => p.po_id === o.po_id && p.status !== "ยกเลิกแล้ว",
        )
      : undefined,
  };
}

export type CancelResult =
  | { kind: "no-reason" }
  | { kind: "in-transit" }
  | { kind: "closed" }
  | { kind: "already"; at: string }
  | {
      kind: "ok";
      labelPrinted: boolean;
      restocked: number;
      poCancelled: boolean;
    };

export function cancelOrder(
  s: AppState,
  orderId: string,
  reason: string,
  alsoCancelPo: boolean,
): { state: AppState; result: CancelResult } {
  const check = checkCancel(s, orderId);
  if (!reason.trim()) return { state: s, result: { kind: "no-reason" } };
  if (check.kind === "closed" || check.kind === "already")
    return { state: s, result: check };

  // ทางเลือก #1: ส่งมอบให้ Delivery แล้ว → บันทึกคำขอเป็น "รอดำเนินการพิเศษ"
  if (check.kind === "in-transit") {
    return {
      state: setStatus(s, orderId, "รอดำเนินการพิเศษ", {
        cancel_reason: reason.trim(),
      }),
      result: { kind: "in-transit" },
    };
  }

  const o = findOrder(s, orderId)!;
  let next = s;
  // Q10.2 คืนสต๊อก — เฉพาะ Order ที่ถูกตัดสต๊อกไปแล้ว (stock_deducted)
  let restocked = 0;
  if (o.stock_deducted) {
    next = adjustStock(next, o.sku, "in_house", o.qty);
    restocked = o.qty;
  }
  // ทางเลือก #2: ยกเลิกคำสั่งซื้อเติมสต๊อกที่ผูกกับ Order นี้ด้วย ถ้า Admin เลือก
  let poCancelled = false;
  if (alsoCancelPo && check.linkedPo) {
    next = {
      ...next,
      purchaseOrders: next.purchaseOrders.map((p) =>
        p.po_id === check.linkedPo!.po_id ? { ...p, status: "ยกเลิกแล้ว" } : p,
      ),
    };
    poCancelled = true;
  }
  // Q10.1
  next = setStatus(next, orderId, "ยกเลิกแล้ว", {
    cancel_reason: reason.trim(),
    cancelled_at: nowIso(),
    stock_deducted: false,
  });
  return {
    state: next,
    result: {
      kind: "ok",
      labelPrinted: check.labelPrinted,
      restocked,
      poCancelled,
    },
  };
}

// 10A ลบข้อมูลเก่า

export type CleanupType = DeletionLog["data_type"];

export type CleanupPlan = {
  items: { data_type: CleanupType; record_id: string; detail: string }[];
  blocked: { data_type: CleanupType; record_id: string }[];
};

/** Q10A.1 / Q10A.2: ข้อมูลที่ลบได้ตามประเภทและวันที่ */
export function planRangeCleanup(
  s: AppState,
  types: CleanupType[],
  cutoff: string,
): CleanupPlan {
  const before = (d: string) =>
    new Date(d).getTime() < new Date(cutoff).getTime();
  const plan: CleanupPlan = { items: [], blocked: [] };
  const openSkus = new Set(
    s.orders
      .filter((o) => !CLOSED_STATUSES.includes(o.order_status))
      .map((o) => o.sku),
  );

  if (types.includes("order")) {
    for (const o of s.orders) {
      if (CLOSED_STATUSES.includes(o.order_status) && before(o.order_date)) {
        plan.items.push({
          data_type: "order",
          record_id: o.order_id,
          detail: o.order_status,
        });
      }
    }
  }
  if (types.includes("label")) {
    for (const o of s.orders) {
      if (
        o.label_template &&
        CLOSED_STATUSES.includes(o.order_status) &&
        before(o.order_date)
      ) {
        plan.items.push({
          data_type: "label",
          record_id: o.order_id,
          detail: `${o.parcel_total ?? 1}`,
        });
      }
    }
  }
  if (types.includes("cost")) {
    s.costLog.forEach((l) => {
      if (!before(l.calculated_at)) return;
      const id = `${l.sku}@${l.calculated_at}`;
      // ผลคำนวณล่าสุดของ SKU ที่ยังมี Order ไม่เสร็จสิ้น ถูกใช้เป็นต้นทุนอยู่ (5A) → ข้าม
      const latest = s.costLog.filter((x) => x.sku === l.sku).at(-1) === l;
      if (openSkus.has(l.sku) && latest) {
        plan.blocked.push({ data_type: "cost", record_id: id });
      } else {
        plan.items.push({ data_type: "cost", record_id: id, detail: l.sku });
      }
    });
  }
  if (types.includes("reorder")) {
    for (const p of s.purchaseOrders) {
      if (!before(p.order_date)) continue;
      const finished =
        p.status === "ยกเลิกแล้ว" ||
        (p.status === "สั่งซื้อแล้ว" && new Date(p.eta).getTime() < Date.now());
      const linked = s.orders.some(
        (o) => o.po_id === p.po_id && !CLOSED_STATUSES.includes(o.order_status),
      );
      if (!finished || linked)
        plan.blocked.push({ data_type: "reorder", record_id: p.po_id });
      else
        plan.items.push({
          data_type: "reorder",
          record_id: p.po_id,
          detail: p.sku,
        });
    }
  }
  return plan;
}

/** Q10A.8 / Q10A.9: Order ที่ปิดแล้วทั้งหมด พร้อมใบปะสินค้าที่เกี่ยวข้อง */
export function planClosedCleanup(s: AppState): CleanupPlan {
  const plan: CleanupPlan = { items: [], blocked: [] };
  for (const o of s.orders) {
    if (!CLOSED_STATUSES.includes(o.order_status)) continue;
    plan.items.push({
      data_type: "order",
      record_id: o.order_id,
      detail: o.order_status,
    });
    if (o.label_template)
      plan.items.push({
        data_type: "label",
        record_id: o.order_id,
        detail: `${o.parcel_total ?? 1}`,
      });
  }
  return plan;
}

/** Q10A.3–7 / Q10A.10–12: บันทึก Log แล้วลบ ถ้าฐานข้อมูลขัดข้องยกเลิกทั้งชุด */
export function commitCleanup(
  s: AppState,
  plan: CleanupPlan,
): { state: AppState; ok: boolean } {
  if (s.faults.db) return { state: s, ok: false };
  const at = nowIso();
  const by = userId(s);
  const ids = (t: CleanupType) =>
    new Set(
      plan.items.filter((i) => i.data_type === t).map((i) => i.record_id),
    );
  const orderIds = ids("order");
  const labelIds = ids("label");
  const costIds = ids("cost");
  const poIds = ids("reorder");
  return {
    state: {
      ...s,
      orders: s.orders
        .filter((o) => !orderIds.has(o.order_id))
        .map((o) =>
          labelIds.has(o.order_id)
            ? { ...o, label_template: undefined, parcel_total: undefined }
            : o,
        ),
      costLog: s.costLog.filter(
        (l) => !costIds.has(`${l.sku}@${l.calculated_at}`),
      ),
      purchaseOrders: s.purchaseOrders.filter((p) => !poIds.has(p.po_id)),
      deletionLog: [
        ...s.deletionLog,
        ...plan.items.map((i) => ({
          data_type: i.data_type,
          record_id: i.record_id,
          deleted_at: at,
          deleted_by: by,
        })),
      ],
    },
    ok: true,
  };
}

/** ไฟล์สำรอง (CSV) ของรายการที่จะลบ */
export function cleanupCsv(s: AppState, plan: CleanupPlan) {
  const header = "data_type,record_id,detail";
  const rows = plan.items.map(
    (i) => `${i.data_type},${i.record_id},${i.detail}`,
  );
  const orders = s.orders
    .filter((o) =>
      plan.items.some(
        (i) => i.data_type === "order" && i.record_id === o.order_id,
      ),
    )
    .map((o) => JSON.stringify(o));
  return [header, ...rows, "", "# orders (JSON)", ...orders].join("\n");
}

// System (Auto): 2S, 3S, 6S, 7S

export type AutoEvent =
  | { code: "sku-matched"; count: number }
  | { code: "sku-missing"; orderId: string }
  | { code: "sku-multiple"; orderId: string }
  | { code: "sku-db"; orderId: string }
  | { code: "stock-enough"; orderId: string }
  | { code: "stock-low"; orderId: string }
  | { code: "label-created"; count: number }
  | { code: "label-no-address"; orderId: string }
  | { code: "label-no-template"; orderId: string }
  | { code: "label-service"; orderId: string }
  | { code: "stock-deducted"; orderId: string }
  | { code: "stock-insufficient"; orderId: string }
  | { code: "stock-sync"; orderId: string };

/**
 * ทำงานเหมือน scheduler: ประมวลผล Order ที่อยู่ในสถานะที่ระบบรับผิดชอบ จนไม่มีอะไรเปลี่ยน
 * Order ที่ล้มเหลวเพราะระบบภายนอก (auto_error) จะลองใหม่ทุกรอบ แต่แจ้งเตือนแค่ครั้งแรก
 */
export function runAutomation(input: AppState): {
  state: AppState;
  events: AutoEvent[];
} {
  let s = input;
  const events: AutoEvent[] = [];
  let skuMatched = 0;
  let labels = 0;

  for (let guard = 0; guard < 6; guard++) {
    const before = s;

    for (const o of s.orders) {
      // 2S จับคู่กฎ SKU
      if (o.order_status === "รอจับคู่กฎ SKU") {
        if (s.faults.skuRuleDb) {
          if (o.auto_error !== "sku-db")
            events.push({ code: "sku-db", orderId: o.order_id });
          s = patchOrder(s, o.order_id, { auto_error: "sku-db" });
          continue;
        }
        // Q2S.1
        const rules = s.products.filter(
          (p) =>
            p.channel_sku === o.channel_sku &&
            p.sales_channel === o.sales_channel,
        );
        if (rules.length === 0) {
          s = toManual(s, o.order_id, "sku-rule");
          events.push({ code: "sku-missing", orderId: o.order_id });
        } else if (rules.length > 1) {
          s = toManual(s, o.order_id, "sku-rule");
          events.push({ code: "sku-multiple", orderId: o.order_id });
        } else {
          // Q2S.2
          const rule = rules[0];
          s = setStatus(s, o.order_id, "รอตรวจสอบสต๊อก", {
            sku_rule_id: `RULE-${rule.sku}`,
            sku: rule.sku,
            variation: rule.variation,
            product_name: rule.product_name,
          });
          skuMatched++;
        }
        continue;
      }

      // 3S ตรวจสต๊อก → แยกเส้นทางตาม BizFlow "มีสินค้าเพียงพอไหม"
      if (o.order_status === "รอตรวจสอบสต๊อก") {
        const st = stockTotal(s, o.sku);
        if (st && st.total >= o.qty) {
          s = setStatus(s, o.order_id, "ยังไม่ได้จับคู่");
          events.push({ code: "stock-enough", orderId: o.order_id });
        } else {
          // ไม่พอ → 4S คำนวณต้นทุน แล้วรอ Admin ตัดสินใจ (5A)
          s = setStatus(s, o.order_id, "รอ Admin ตัดสินใจสั่งซื้อ");
          events.push({ code: "stock-low", orderId: o.order_id });
        }
        continue;
      }

      // 6S จัดรูปแบบใบปะสินค้า
      if (o.order_status === "รอจัดรูปแบบใบปะสินค้า") {
        if (!o.shipping_address.trim() || !o.shipping_method.trim()) {
          s = toManual(s, o.order_id, "address");
          events.push({ code: "label-no-address", orderId: o.order_id });
          continue;
        }
        // Q6S.1
        const rule = findShippingRule(o.shipping_method, o.sales_channel);
        if (!rule) {
          s = toManual(s, o.order_id, "template");
          events.push({ code: "label-no-template", orderId: o.order_id });
          continue;
        }
        if (s.faults.labelService) {
          if (o.auto_error !== "label-service")
            events.push({ code: "label-service", orderId: o.order_id });
          s = patchOrder(s, o.order_id, { auto_error: "label-service" });
          continue;
        }
        // Q6S.2 + Q6S.3 — แยกพัสดุตามจำนวนที่ใส่ได้ต่อกล่อง
        const parcels = Math.max(
          1,
          Math.ceil(o.qty / rule.max_items_per_parcel),
        );
        s = setStatus(s, o.order_id, "รอพิมพ์ใบปะสินค้า", {
          label_template: rule.label_template,
          parcel_total: parcels,
        });
        labels += parcels;
        continue;
      }

      // 7S ตัดสต๊อก
      if (o.order_status === "แจ้งเลขติดตามแล้ว") {
        // Q7S.1 — ตัดไปแล้ว ข้ามเพื่อกันตัดซ้ำ
        if (o.stock_deducted) {
          s = setStatus(s, o.order_id, "จัดส่งสำเร็จ");
          continue;
        }
        const row = s.stock.find((x) => x.sku === o.sku);
        const available =
          row === undefined
            ? -1
            : o.fulfill_source === "rsl"
              ? (row.rsl_qty ?? -1)
              : row.in_house_qty;
        if (available < o.qty) {
          s = toManual(s, o.order_id, "stock-deduct");
          events.push({ code: "stock-insufficient", orderId: o.order_id });
          continue;
        }
        // Q7S.2 / Q7S.3
        s = adjustStock(s, o.sku, o.fulfill_source, -o.qty);
        // Q7S.4 + Q7S.5 — ซิงค์ไม่ได้ก็ตัดสต๊อกในระบบไว้ก่อน แล้วรอซิงค์
        const synced = !s.faults.mpStockSync;
        s = setStatus(s, o.order_id, "จัดส่งสำเร็จ", {
          stock_deducted: true,
          mp_stock_synced: synced,
        });
        events.push({
          code: synced ? "stock-deducted" : "stock-sync",
          orderId: o.order_id,
        });
        continue;
      }

      // 7S ทางเลือก #1: ลองซิงค์ยอดคงเหลือใหม่
      if (
        o.stock_deducted &&
        o.mp_stock_synced === false &&
        !s.faults.mpStockSync
      ) {
        s = patchOrder(s, o.order_id, { mp_stock_synced: true });
      }
    }

    if (s === before) break;
  }

  if (skuMatched > 0)
    events.unshift({ code: "sku-matched", count: skuMatched });
  if (labels > 0) events.push({ code: "label-created", count: labels });
  return { state: s, events };
}
