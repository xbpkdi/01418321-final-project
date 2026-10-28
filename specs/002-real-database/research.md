# ผลการวิจัย: ฐานข้อมูลจริงและ backend

## ขอบเขตและหลักฐาน

แผนนี้อิง `spec.md`, constitution v1.5.0, ER diagram ใน `docs/source/er-diagram.drawio.xml`, โค้ดปัจจุบันใน `src/lib/` และ quickstart ของ feature 001. ER กำหนด entity หลัก `admins`, `orders`, `order_items`, `skus`, `stock`, `costs`, `suppliers`, `reorders`, `labels` และชื่อ attributes; ชื่อจาก ER เป็นข้อบังคับ.

### ตรวจเอกสารอ้างอิง (Phase 0, 2026-10-28)

- `docs/source/use-case-description.pdf`, `bizflow-to-be.drawio.xml` และ `er-diagram.drawio.xml` เป็นชุดล่าสุดที่มีใน `docs/source/`; Git เพิ่มชุดนี้ใน `24e4b17` (2026-10-12). PDF มี 76 หน้า แต่ metadata ไม่ระบุ revision/date; BizFlow ตั้งชื่อ diagram ว่า `To-Be-v2`; ER ไม่มีเลข revision ในไฟล์ จึงยืนยันได้เพียง baseline ที่เก็บใน repo ไม่ใช่วันที่แก้ไขต้นฉบับของทีม.
- Flow ที่เกี่ยวกับ feature 002: 4A นำเข้า Order, 2A ตรวจ Order, 1S จับคู่ RSL, 3S ตรวจ stock, 4S คำนวณ cost, 5S แจ้ง tracking ผ่านช่องทางขาย, 6A ส่งคำสั่งซื้อ supplier และ 7S ตัด stock/ซิงค์ยอด; 8A รับผล carrier, 9A พิมพ์ label และ 10A ลบข้อมูลเก่าเป็นเส้นทางอ่าน/เก็บประวัติที่ต้องคงไว้. ทางเลือกสำคัญครอบคลุมข้อมูล/ระบบภายนอกใช้ไม่ได้, Order หรือ SKU ซ้ำ/ไม่ตรง, stock ไม่พอ, ส่ง tracking/คำสั่งซื้อ/พิมพ์ไม่สำเร็จ, stock sync ล้มเหลวและ retry, รวมถึง Order ถูกยกเลิกหรือตีกลับ.
- **Q-number ยังไม่สอดคล้อง**: PDF ใช้เลขที่ไม่ระบุ actor/category หรือไม่ตรง UC เช่น 3A `Q13.1`, 4A `Q11.1`, 5S `Q9.1`–`Q9.2`, 7S `Q7S.1`–`Q7S.5`. ให้ทำ mapping ใน T005 และถือเลขที่มีอยู่เป็น provisional ตาม constitution; ห้ามเริ่ม SQL ของแอปก่อน gate นี้ผ่าน.
- **7S ขัดกับ constitution v1.5.0**: PDF อธิบายการซิงค์ไปทุก Marketplace และ `Q7S.5` ตั้ง `order_status='จัดส่งสำเร็จ'`; constitution กำหนด Rakuten เท่านั้น และห้าม 7S ตั้งสถานะส่งสำเร็จ (ทำได้เฉพาะเมื่อ carrier ยืนยันใน 8A). ยึด constitution/spec ปัจจุบัน: 7S เก็บ `stock_deducted`, คงสถานะ “แจ้งเลขติดตามแล้ว” และการซิงค์ภายนอกเป็น adapter ของ Rakuten; บันทึกความต่างนี้ไว้ให้ทีมปรับเอกสารต้นทาง.
- **Schema extension ยังต้องแจ้งทีม**: ER ปัจจุบันไม่มี session และประวัติที่ FR-017 ต้องเก็บ (automatic error, cleanup 10A, cost 4S, tracking notification attempts 5S); บันทึกเป็นส่วนขยายที่ต้องส่งให้ทีมปรับ ER และสร้างผ่าน migration ใหม่ตามแผน. 5S ระบุปลายทางเป็น Marketplace โดยดึง `sales_channel`; contract ใช้ Rakuten RMS สำหรับ scope ปัจจุบัน จึงไม่ใช่ข้อขัดแย้งเมื่อจำกัดระบบไว้ที่ Rakuten.

### ผล Phase 1: ข้อกำหนดพื้นฐาน

- **5S integration owner (T003)**: PDF หน้า 63 ระบุ “ผ่าน Marketplace”, อ่าน `sales_channel`/`marketplace_order_id` (Q9.1) แล้วส่ง tracking ผ่านช่องทางขาย (Q9.2); ไม่ได้ระบุชื่อ vendor/API. จาก scope Rakuten-only ใน constitution จึงกำหนด `notifyTracking` เป็น operation ของ Rakuten RMS marketplace adapter; ไม่ส่งผ่าน RSL หรือ carrier. นี่เป็นการเลือก owner ของ interface ตาม scope โครงการ ไม่ใช่การอ้างว่า PDF ระบุคำว่า RMS.
- **สถานะ retry ของ 7S (T004)**: PDF หน้า 72 มี `mp_stock_synced` ใน Order และระบุให้ลอง sync ใหม่เมื่อไม่สำเร็จ แต่ ER ไม่มีสถานะ/ประวัติ retry ที่พอระบุยอดล่าสุดต่อ SKU. เพิ่ม `rakuten_stock_sync_states` เป็น schema extension ที่เสนอ: หนึ่งแถวต่อ `stock_id`, เก็บ `sync_status`, ยอดที่ sync สำเร็จล่าสุด, เวลา attempt/success และ safe error code. ทำ pending พร้อมการเปลี่ยน stock; retry คำนวณยอด absolute ล่าสุดจาก `in_house_qty + rsl_qty` และห้าม mark synced ถ้ายอดเปลี่ยนระหว่างคำขอ. รายการนี้เพิ่มใน FR-017 และ `data-model.md` เพื่อส่งทีมแก้ ER. คงข้อยกเว้นสถานะตาม constitution: 7S ไม่ตั้ง “จัดส่งสำเร็จ”.
- **Q-number gate (T005)**: บันทึก mapping ที่อ่านได้จาก PDF ใน `src/lib/queries/README.md`. เลขที่ไม่มี actor/category หรือไม่ตรง UC (เช่น `Q13.1`, `Q11.1`, `Q9.1`, `Q7S.1`) ยังคง provisional; ไม่มี query SQL ใหม่ใน Phase 1. ห้ามเริ่ม SQL ของแอปจนทีมยืนยัน mapping ฉบับแก้ไขตาม constitution.
- **คู่มือ Next.js 16 ที่อ่านแล้ว (T006)**: `node_modules/next/dist/docs/01-app/02-guides/authentication.md`, `data-security.md`, `server-actions.md`, `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/cookies.md` และ `03-api-reference/01-directives/use-server.md`. `cookies()` เป็น async request-time API; อ่าน session ใน server code และตั้ง/ลบ cookie ได้จาก Server Function หรือ Route Handler. ให้ตรวจ session ใกล้ขอบเขตอ่าน/เขียนข้อมูล: Server Actions และ Route Handlers เป็นจุดเข้าใช้งานที่ต้องตรวจ auth/validate input เอง; auth ใน layout อย่างเดียวไม่ครอบคลุม client navigation หรือ action endpoint. DAL ควรรวม auth/access logic และส่งเฉพาะข้อมูลที่จำเป็น; โมดูล DB/session ควร import `server-only`; Proxy เป็นเพียง optimistic check ไม่ใช่ตัวป้องกันหลัก. ใช้ข้อกำหนดเหล่านี้ก่อนทำ T017–T018.

## การตัดสินใจ

### การบันทึกข้อมูล

- **เลือก**: ใช้ PostgreSQL ผ่าน raw parameterized SQL จาก `pg`; server use case โหลดข้อมูลที่จำเป็น เรียก pure rule ใน `workflow.ts` แล้วบันทึกผลกับ `runAutomation` ใน transaction เดียว.
- **เหตุผล**: คงกฎเดิมและป้องกันการเปลี่ยนข้อมูลไม่ครบเมื่อมีคำขอพร้อมกัน; ตรงตาม constitution I และ FR-004–005.
- **ทางเลือกที่ไม่เลือก**: ใช้ ORM หรือให้หน้าจอเขียน SQL โดยตรง; ขัดข้อกำหนดโครงการและทำให้ transaction/traceability กระจาย.

### การย้ายหน้าจอ

- **เลือก**: ย้ายเป็นกลุ่ม use case; หน้าที่เสร็จแล้วอ่านและเขียนผ่าน server เท่านั้น. คง browser store ไว้ชั่วคราวสำหรับหน้าที่ยังไม่ย้าย และลบ store กับ key `rsl-hub-state-v2` ใน phase สุดท้าย.
- **เหตุผล**: ย้ายทีละส่วนโดยยังรักษาเส้นทางทำงานของแอป.
- **ทางเลือกที่ไม่เลือก**: คงข้อมูลธุรกิจใน `localStorage`; ไม่ผ่าน SC-006 และข้อมูลไม่ตรงกันข้าม browser.

### การเข้าสู่ระบบและ session

- **เลือก**: เก็บรหัสผ่านด้วย `scrypt`; เก็บ session ฝั่งฐานข้อมูลและส่ง opaque token ใน cookie อายุ 8 ชั่วโมง; ตรวจ session ฝั่ง server ก่อนให้บริการหน้าและ use case.
- **เหตุผล**: รองรับ logout, หมดอายุ และการเข้าหน้าโดยตรง โดยไม่พึ่ง `AuthGuard` ฝั่ง client.
- **ทางเลือกที่ไม่เลือก**: เก็บ session ใน React หรือ `localStorage`; ไม่ป้องกันการเรียก server โดยตรง.

### Schema เพิ่มและ seed

- **เลือก**: เพิ่มตาราง session และตารางประวัติที่ FR-017 ระบุ (ข้อผิดพลาดอัตโนมัติ, การลบ 10A, ประวัติต้นทุน 4S, การแจ้ง tracking ซ้ำ 5S). ทำ migration ใหม่และบันทึก schema extension เพื่อให้ทีมเอกสารปรับ ER.
- **เหตุผล**: ประวัติที่หน้าจอใช้อยู่ต้องคงอยู่หลังย้าย; FR-017 อนุญาตเพิ่ม schema.
- **ทางเลือกที่ไม่เลือก**: ทิ้งประวัติหรือเก็บต่อใน browser; ทำให้ข้อมูลสูญหายและไม่ผ่านเกณฑ์ความคงอยู่.
- **Seed**: โหมดปกติสร้างเฉพาะส่วนที่ขาดและไม่แตะข้อมูลเดิม; โหมด reset ต้องสั่งชัดเจน; รหัสผ่านตัวอย่างถูก hash ก่อนบันทึก.

### ระบบภายนอก

- **เลือก**: Rakuten, RSL, carrier และ supplier ใช้ interface กับ mock adapter ที่เลือกผ่านค่าตั้ง; fault toggles `/dev` ควบคุม mock.
- **เหตุผล**: คงทางเลือกของ use case และไม่เชื่อมต่อระบบจริงใน feature นี้.

## ข้อจำกัดก่อนเริ่ม SQL

Q-number ใน use case document ปัจจุบันยังไม่ตรงรูปแบบ `Q<UC>.<n>` ตาม constitution. ให้ตรวจเอกสารฉบับแก้ไขและ mapping ก่อนเพิ่มหรือเปลี่ยน SQL. หากเอกสารยังไม่มา ให้ใช้หมายเลขชั่วคราวที่ตรวจสอบย้อนกลับได้และทำเครื่องหมายว่า provisional; ห้ามระบุว่าเป็นหมายเลขสุดท้าย.

## ความเสี่ยงที่ต้องจัดการใน tasks

- Schema ที่เพิ่มต้อง sync กับทีมเอกสาร; ทุกการเปลี่ยนหลังจากนี้ใช้ migration ใหม่.
- Transaction ต้องป้องกันการตัด stock ซ้ำและยอดติดลบเมื่อมี request พร้อมกัน.
- DB failure ต้องแสดงข้อความปลอดภัย และห้ามแสดงข้อมูล mock เก่าแทน.
- ทุก route ภายใน `src/app/(app)/` และหน้า report ต้องมีการตรวจ session ฝั่ง server.
