/**
 * ข้อมูลฝั่ง RSL สำหรับจับคู่ตาม Q4.1:
 *   SELECT rsl_order_id, rsl_sku, rsl_variation, rsl_stock_qty
 *   FROM rsl_shipments WHERE rsl_sku=$1 AND rsl_variation=$2
 */
export type RslShipment = {
  rsl_order_id: string;
  rsl_sku: string;
  rsl_variation: string;
  rsl_stock_qty: number;
};

export const MOCK_RSL_SHIPMENTS: RslShipment[] = [
  {
    rsl_order_id: "RSL-9f21a7",
    rsl_sku: "FSH-MLR-240",
    rsl_variation: "สีเงินลายปลาซิว",
    rsl_stock_qty: 96,
  },
  {
    rsl_order_id: "RSL-9f21b4",
    rsl_sku: "YDM-HRB-012",
    rsl_variation: "แพ็ค 3 หลอด",
    rsl_stock_qty: 0,
  },
  // SKU เดียวกันมีสองรายการ ใช้ทดสอบเคส "พบข้อมูล RSL ที่ตรงกันมากกว่า 1 รายการ"
  {
    rsl_order_id: "RSL-9f21c8",
    rsl_sku: "OUT-CHR-003",
    rsl_variation: "สีเขียวมะกอก",
    rsl_stock_qty: 8,
  },
  {
    rsl_order_id: "RSL-9f21c9",
    rsl_sku: "OUT-CHR-003",
    rsl_variation: "สีเขียวมะกอก",
    rsl_stock_qty: 4,
  },
  {
    rsl_order_id: "RSL-9f2210",
    rsl_sku: "FSH-RDS-180",
    rsl_variation: "แอ็คชันกลาง",
    rsl_stock_qty: 4,
  },
];

/** หา RSL ที่ตรงกับ SKU + Variation ของ Order */
export function findRslMatches(sku: string, variation: string): RslShipment[] {
  return MOCK_RSL_SHIPMENTS.filter(
    (r) => r.rsl_sku === sku && r.rsl_variation === variation,
  );
}
