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
| `rakuten_stock_sync_states` | `stock_id` (PK/FK), `sync_status`, `last_synced_qty`, `last_attempt_at`, `last_synced_at`, `last_error_code` | สถานะคงค้างสำหรับ retry 7S ต่อรายการ stock ของ Rakuten; เมื่อ stock เปลี่ยนให้เป็น pending และ retry คำนวณยอดล่าสุดจาก `in_house_qty + rsl_qty`; บันทึกยอดล่าสุดที่ sync สำเร็จเพื่อไม่ให้คำขอเก่าทับยอดใหม่. เป็น schema extension ที่ต้องส่งทีมปรับ ER. |

### Schema extension ที่ใช้จริงใน `002_runtime_records.sql`

- `sessions`: `session_id`, `admin_id`, `token_hash`, `created_at`, `expires_at`, `revoked_at`; เก็บเฉพาะ hash ของ opaque token และผูก FK กับ `admins`.
- `auto_error_logs`: `auto_error_log_id`, `use_case_id`, `context_key`, `error_code`, `safe_message`, `occurred_at` สำหรับ 2S/3S/6S/7S.
- `deletion_history`: `deletion_history_id`, `order_reference`, `order_snapshot`, `admin_id`, `deleted_at` สำหรับ 10A.
- `cost_history`: `cost_history_id`, `sku_id`, `cost_id`, `previous_value`, `new_value`, `admin_id`, `changed_at` สำหรับ 4S และเพิ่ม `costs.exchange_rate_updated_at` ซึ่งจำเป็นต่อทางเลือกอัตราแลกเปลี่ยนเกิน 24 ชั่วโมง แต่ไม่มีใน ER ปัจจุบัน.
- `tracking_notification_logs`: `tracking_notification_log_id`, `order_id`, `tracking_number`, `outcome`, `sent_at`, `admin_id` สำหรับ 5S และการส่งซ้ำ.
- `rakuten_stock_sync_states`: ใช้คอลัมน์ตามตารางด้านบนและ FK ไป `stock`; เป็นสถานะคงค้างของ 7S ทางเลือก #1.
- `schema_migrations`: `migration_name`, `applied_at`; เป็น catalog เชิงเทคนิคเพื่อให้ setup รันซ้ำได้ ไม่ใช่ business entity.

รายการนี้คือ ER change list ที่ต้องส่งทีมเอกสาร. Migration ที่ merge แล้วห้ามแก้; การปรับตาม ER ฉบับถัดไปต้องสร้าง migration ใหม่เสมอ.

## กฎความสอดคล้อง

- ทุก FK อ้างอิง primary key จริงตาม ER; ลบ Order ตาม UC 10A ต้องเก็บ deletion history ก่อน/ใน transaction เดียวกัน.
- `orders.order_status` รับเฉพาะค่าใน `order-status.ts`; status ของใบปะและ reorder ใช้คอลัมน์สถานะของตนเอง.
- การตัด/คืน stock และการเปลี่ยน `stock_deducted` เกิดใน transaction เดียวและทำซ้ำแล้วไม่เพิ่ม/ลดซ้ำ.
- การสร้าง session ต้องผูกกับ Admin ที่มีอยู่; session หมดอายุหรือถูก revoke ใช้ไม่ได้ทันที.
- การซิงค์ stock ของ Rakuten ใน 7S ใช้แถว `rakuten_stock_sync_states` เป็น durable state; retry ส่งยอด absolute ล่าสุดที่คำนวณจาก stock ปัจจุบัน. อย่าล้าง pending หาก stock เปลี่ยนระหว่างเรียก adapter; เมื่อสำเร็จให้บันทึกยอดที่ส่งและล้าง pending เฉพาะเมื่อยอดปัจจุบันยังตรงกัน.
- Query ใช้ parameterized SQL และมี UC id + Q-number; ต้องตรวจ mapping Q-number กับ use case document ฉบับใหม่ก่อนเริ่มเขียน SQL.
