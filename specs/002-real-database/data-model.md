# แบบจำลองข้อมูล: ฐานข้อมูลจริง

## ตารางจาก ER diagram

ชื่อคอลัมน์ต้องตรง `docs/source/er-diagram.drawio.xml`; ER ไม่ได้กำหนดชนิด SQL จึงเลือกชนิดที่ตรงความหมายขณะทำ migration โดยไม่เปลี่ยนชื่อ:

| ตาราง | คีย์และข้อมูลหลัก | ความสัมพันธ์/ข้อกำหนด |
|---|---|---|
| `admins` | `admin_id`, `user_email`, `user_password`, `fail_attempts`, `last_login`, `created_at` | อีเมลไม่ซ้ำ; `user_password` เก็บ scrypt hash |
| `orders` | `order_id`, `marketplace_order_id`, `sales_channel`, `order_date`, ที่อยู่/วิธีส่ง, `order_status`, RSL/tracking/cancel/verify timestamps | `marketplace_order_id` ป้องกันนำเข้าซ้ำ; status ใช้ 22 ค่าใน `src/lib/order-status.ts` |
| `order_items` | `order_item_id`, `channel_sku`, `variation`, `qty`, `fulfill_source`, `stock_deducted`, `deducted_at` | รายการย่อยของ Order; guard การตัด stock ต้อง idempotent |
| `skus` | `sku_id`, `sku`, `product_name`, `variation`, channel mapping, `selling_price`, reorder settings, `sku_status` | รหัสสินค้าใช้จับคู่ Order กับ SKU |
| `stock` | `stock_id`, `in_house_qty`, `rsl_qty`, `updated_at` | ยอดต่อ SKU; ห้ามยอดคงเหลือติดลบ |
| `costs` | `cost_id`, ราคาซื้อ/สกุลเงิน/อัตราแลกเปลี่ยน/ค่าขนส่ง/ค่าธรรมเนียม, `order_qty`, `unit_cost`, `calculated_at` | เก็บส่วนประกอบและผลคำนวณต้นทุน |
| `suppliers` | `supplier_id`, `supplier_name`, `contact_info`, `lead_time_days`, `created_at` | ผู้จัดหาสินค้าที่ใช้กับการเติม stock |
| `reorders` | `reorder_id`, `order_qty`, `decision`, `decided_at`, `reorder_status`, วันสั่ง/คาดรับ/เลข tracking/วันรับ | รายการสั่งเติมและ lifecycle |
| `labels` | `label_id`, `label_template`, `rsl_no`, `parcel_seq`, `parcel_total`, `label_status`, `created_at`, `printed_at` | ใบปะและสถานะใบปะแยกจาก Order status |

## ตารางเพิ่มเติมที่แผนเสนอ

| ตาราง | ข้อมูลหลัก | เหตุผล/ข้อจำกัด |
|---|---|---|
| `sessions` | session id, `admin_id`, token hash, created/expiry/revoked timestamps | รองรับ logout, อายุ 8 ชั่วโมง และตรวจ session ฝั่ง server; ห้ามเก็บ raw token |
| `auto_error_logs` | UC, context key, error code/message ที่ปลอดภัย, occurred_at | ประวัติข้อผิดพลาด automation ตาม FR-017; ไม่บันทึกรหัสผ่าน/secret |
| `deletion_history` | UC 10A, order reference snapshot, actor, deleted_at | ร่องรอยการลบเมื่อ Order ที่เข้าเงื่อนไขถูกลบ |
| `cost_history` | SKU/cost reference, ค่าเดิม/ใหม่ที่จำเป็น, actor, changed_at | ประวัติการเปลี่ยนต้นทุน UC 4S |
| `tracking_notification_logs` | order reference, tracking reference, outcome, sent_at | ป้องกัน/บันทึกการแจ้งเลขติดตามซ้ำ UC 5S; ข้อความไม่เก็บข้อมูลส่วนเกิน |

ชื่อตารางเพิ่มเติมเป็นชื่อเสนอสำหรับ plan; ต้องบันทึกลง ER change list และยืนยันชื่อ/คอลัมน์ใน tasks ก่อนเขียน migration. เพิ่ม migration ใหม่เสมอ.

## กฎความสอดคล้อง

- ทุก FK อ้างอิง primary key จริงตาม ER; ลบ Order ตาม UC 10A ต้องเก็บ deletion history ก่อน/ใน transaction เดียวกัน.
- `orders.order_status` รับเฉพาะค่าใน `order-status.ts`; status ของใบปะและ reorder ใช้คอลัมน์สถานะของตนเอง.
- การตัด/คืน stock และการเปลี่ยน `stock_deducted` เกิดใน transaction เดียวและทำซ้ำแล้วไม่เพิ่ม/ลดซ้ำ.
- การสร้าง session ต้องผูกกับ Admin ที่มีอยู่; session หมดอายุหรือถูก revoke ใช้ไม่ได้ทันที.
- Query ใช้ parameterized SQL และมี UC id + Q-number; ต้องตรวจ mapping Q-number กับ use case document ฉบับใหม่ก่อนเริ่มเขียน SQL.

