import type {
  CostComponents,
  Product,
  PurchaseOrder,
  StockLevel,
  Supplier,
} from "@/types/product";

/**
 * ข้อมูลสินค้าตั้งต้น — ทุก SKU ขายผ่าน Rakuten Ichiba (เฟส 1)
 * ราคาและต้นทุนทุกตัวเป็นเงินบาท ยกเว้นราคาซื้อที่เก็บตามสกุลเงินของ Supplier
 */
export const SEED_SUPPLIERS: Supplier[] = [
  {
    supplier_id: "SUP-01",
    supplier_name: "Ningbo Tackle Works",
    contact_info: "order@ningbo-tackle.example.cn",
    lead_time: 21,
  },
  {
    supplier_id: "SUP-02",
    supplier_name: "หจก. สมุนไพรไทยเจริญ",
    contact_info: "sales@thaiherb.example.co.th",
    lead_time: 10,
  },
  {
    supplier_id: "SUP-03",
    supplier_name: "Qingdao Outdoor Gear",
    contact_info: "po@qingdao-outdoor.example.cn",
    lead_time: 28,
  },
  {
    supplier_id: "SUP-04",
    supplier_name: "Foshan Homeware Ltd.",
    contact_info: "trade@foshan-home.example.cn",
    lead_time: 18,
  },
];

export const SEED_PRODUCTS: Product[] = [
  {
    sku: "FSH-MLR-240",
    product_name: "เหยื่อปลอมมินโนว์ จมช้า 24 กรัม",
    variation: "สีเงินลายปลาซิว",
    sales_channel: "Rakuten Ichiba",
    channel_sku: "rk-mlr240-sv",
    supplier_id: "SUP-01",
    reorder_threshold: 40,
    reorder_qty: 200,
    selling_price: 1280,
    active: true,
  },
  {
    sku: "YDM-HRB-012",
    product_name: "ยาดมสมุนไพร สูตรเข้มข้น",
    variation: "แพ็ค 3 หลอด",
    sales_channel: "Rakuten Ichiba",
    channel_sku: "rk-ydm012-3",
    supplier_id: "SUP-02",
    reorder_threshold: 60,
    reorder_qty: 300,
    selling_price: 540,
    active: true,
  },
  {
    sku: "OUT-CHR-003",
    product_name: "เก้าอี้พับแคมป์ปิ้ง โครงอะลูมิเนียม",
    variation: "สีเขียวมะกอก",
    sales_channel: "Rakuten Ichiba",
    channel_sku: "rk-chr003-ol",
    supplier_id: "SUP-03",
    reorder_threshold: 15,
    reorder_qty: 60,
    selling_price: 3450,
    active: true,
  },
  {
    // ยังไม่ระบุราคาขาย — 5A "ไม่พบราคาขายของสินค้านี้ กรุณาตรวจสอบ"
    sku: "HOM-STG-045",
    product_name: "กล่องเก็บของพับได้ ฝาใส",
    variation: "ขนาด 28 ลิตร",
    sales_channel: "Rakuten Ichiba",
    channel_sku: "rk-stg045-28",
    supplier_id: "SUP-04",
    reorder_threshold: 25,
    reorder_qty: 120,
    selling_price: null,
    active: true,
  },
  {
    sku: "FSH-RDS-180",
    product_name: "คันเบ็ดสปินนิ่ง 1.8 เมตร",
    variation: "แอ็คชันกลาง",
    sales_channel: "Rakuten Ichiba",
    channel_sku: "rk-rds180-m",
    supplier_id: "SUP-01",
    reorder_threshold: 10,
    reorder_qty: 40,
    selling_price: 2690,
    active: true,
  },
  {
    sku: "OUT-LMP-021",
    product_name: "ตะเกียงแคมป์ปิ้ง ชาร์จ USB",
    variation: "แสงวอร์ม",
    sales_channel: "Rakuten Ichiba",
    channel_sku: "rk-lmp021-w",
    supplier_id: "SUP-03",
    reorder_threshold: 20,
    reorder_qty: 80,
    selling_price: 1150,
    active: false,
  },
  {
    // ยังไม่ตั้ง Supplier และจำนวนสั่งซื้อ — 6A ทางเลือก #1
    // ต้นทุนสูงกว่าราคาขาย — 4S ทางเลือก #2
    sku: "HOM-KIT-108",
    product_name: "ชุดกล่องถนอมอาหาร 5 ชิ้น",
    variation: "ฝาสีเทา",
    sales_channel: "Rakuten Ichiba",
    channel_sku: "rk-kit108-gy",
    supplier_id: "",
    reorder_threshold: 10,
    reorder_qty: 0,
    selling_price: 790,
    active: true,
  },
];

export const SEED_STOCK: StockLevel[] = [
  {
    sku: "FSH-MLR-240",
    in_house_qty: 52,
    rsl_qty: 96,
    updated_at: "2026-10-05T06:00:00+09:00",
  },
  // ข้อมูลจาก RSL ขาดหาย — 3S ทางเลือก #1
  {
    sku: "YDM-HRB-012",
    in_house_qty: 118,
    rsl_qty: null,
    updated_at: "2026-10-05T06:00:00+09:00",
  },
  {
    sku: "OUT-CHR-003",
    in_house_qty: 6,
    rsl_qty: 8,
    updated_at: "2026-10-05T06:00:00+09:00",
  },
  {
    sku: "HOM-STG-045",
    in_house_qty: 1,
    rsl_qty: 0,
    updated_at: "2026-10-05T06:00:00+09:00",
  },
  {
    sku: "FSH-RDS-180",
    in_house_qty: 0,
    rsl_qty: 1,
    updated_at: "2026-10-05T06:00:00+09:00",
  },
  {
    sku: "OUT-LMP-021",
    in_house_qty: 30,
    rsl_qty: 12,
    updated_at: "2026-10-05T06:00:00+09:00",
  },
  {
    sku: "HOM-KIT-108",
    in_house_qty: 2,
    rsl_qty: 3,
    updated_at: "2026-10-05T06:00:00+09:00",
  },
];

const HOUR = 60 * 60 * 1000;

/**
 * ต้นทุนตาม Q5.1 — purchase_price คือราคาซื้อทั้งล็อตตามสูตร Q5.2
 * เวลาอัปเดตอัตราแลกเปลี่ยนคิดจากเวลาที่สร้างข้อมูล เพื่อให้เคส "เก่าเกิน 24 ชั่วโมง" ทดสอบได้ทุกวัน
 */
export function seedCosts(now: number): CostComponents[] {
  const fresh = new Date(now - 2 * HOUR).toISOString();
  const stale = new Date(now - 72 * HOUR).toISOString();
  return [
    {
      sku: "FSH-MLR-240",
      purchase_price: 9100,
      currency: "CNY",
      exchange_rate: 4.92,
      exchange_rate_updated_at: fresh,
      intl_freight: 8600,
      duty_fee: 3150,
      marketplace_fee: 72,
      domestic_shipping: 46,
      rsl_charge: 18,
      order_qty: 200,
    },
    {
      sku: "FSH-RDS-180",
      purchase_price: 16400,
      currency: "CNY",
      exchange_rate: 4.92,
      exchange_rate_updated_at: fresh,
      intl_freight: 5400,
      duty_fee: 2080,
      marketplace_fee: 148,
      domestic_shipping: 92,
      rsl_charge: 18,
      order_qty: 40,
    },
    {
      // อัตราแลกเปลี่ยนเก่าเกิน 24 ชั่วโมง — 4S ทางเลือก #4
      sku: "OUT-CHR-003",
      purchase_price: 32280,
      currency: "CNY",
      exchange_rate: 4.92,
      exchange_rate_updated_at: stale,
      intl_freight: 11200,
      duty_fee: 4360,
      marketplace_fee: 190,
      domestic_shipping: 135,
      rsl_charge: 24,
      order_qty: 60,
    },
    {
      sku: "HOM-STG-045",
      purchase_price: 8400,
      currency: "CNY",
      exchange_rate: 4.92,
      exchange_rate_updated_at: fresh,
      intl_freight: 6800,
      duty_fee: 2100,
      marketplace_fee: 64,
      domestic_shipping: 58,
      rsl_charge: 18,
      order_qty: 120,
    },
    {
      sku: "HOM-KIT-108",
      purchase_price: 3000,
      currency: "CNY",
      exchange_rate: 4.92,
      exchange_rate_updated_at: fresh,
      intl_freight: 3000,
      duty_fee: 900,
      marketplace_fee: 60,
      domestic_shipping: 45,
      rsl_charge: 18,
      order_qty: 20,
    },
    {
      // ยังไม่เคยตั้งค่า RSL Charge — 4S ทางเลือก #1
      sku: "YDM-HRB-012",
      purchase_price: 12000,
      currency: "THB",
      exchange_rate: 1,
      exchange_rate_updated_at: fresh,
      intl_freight: 9000,
      duty_fee: 1800,
      marketplace_fee: 32,
      domestic_shipping: 40,
      rsl_charge: null,
      order_qty: 300,
    },
    {
      // ไม่มีอัตราแลกเปลี่ยนล่าสุด — "ไม่พบอัตราแลกเปลี่ยนล่าสุด กรุณาระบุด้วยตนเอง"
      sku: "OUT-LMP-021",
      purchase_price: 6400,
      currency: "CNY",
      exchange_rate: null,
      exchange_rate_updated_at: null,
      intl_freight: 4800,
      duty_fee: 1500,
      marketplace_fee: 52,
      domestic_shipping: 46,
      rsl_charge: 18,
      order_qty: 80,
    },
  ];
}

/**
 * ราคาซื้อจาก Supplier ทางเลือกสำหรับเปรียบเทียบ (4S ทางเลือก #3)
 * องค์ประกอบอื่นใช้ค่าเดียวกับ Supplier หลัก ต่างกันที่ราคาซื้อ ค่าขนส่ง และสกุลเงิน
 */
export const SEED_SUPPLIER_QUOTES: {
  sku: string;
  supplier_id: string;
  purchase_price: number;
  currency: string;
  exchange_rate: number;
  intl_freight: number;
}[] = [
  {
    sku: "FSH-MLR-240",
    supplier_id: "SUP-03",
    purchase_price: 8600,
    currency: "CNY",
    exchange_rate: 4.92,
    intl_freight: 10400,
  },
  {
    sku: "FSH-RDS-180",
    supplier_id: "SUP-03",
    purchase_price: 15200,
    currency: "CNY",
    exchange_rate: 4.92,
    intl_freight: 7900,
  },
  {
    sku: "OUT-CHR-003",
    supplier_id: "SUP-04",
    purchase_price: 30900,
    currency: "CNY",
    exchange_rate: 4.92,
    intl_freight: 12600,
  },
  {
    sku: "HOM-KIT-108",
    supplier_id: "SUP-04",
    purchase_price: 2200,
    currency: "CNY",
    exchange_rate: 4.92,
    intl_freight: 2600,
  },
];

/** คำสั่งซื้อที่ค้างอยู่กับ Supplier (Q7.2) — ใช้ทดสอบ "มีคำสั่งซื้อ SKU นี้ค้างอยู่แล้ว" */
export const SEED_PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    po_id: "PO-0091",
    sku: "OUT-CHR-003",
    supplier_id: "SUP-03",
    order_qty: 60,
    order_date: "2026-09-24T10:00:00+09:00",
    eta: "2026-10-22",
    status: "สั่งซื้อแล้ว",
  },
];
