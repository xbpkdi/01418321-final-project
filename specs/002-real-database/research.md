# ผลการวิจัย: ฐานข้อมูลจริงและ backend

## ขอบเขตและหลักฐาน

แผนนี้อิง `spec.md`, constitution v1.5.0, ER diagram ใน `docs/source/er-diagram.drawio.xml`, โค้ดปัจจุบันใน `src/lib/` และ quickstart ของ feature 001. ER กำหนด entity หลัก `admins`, `orders`, `order_items`, `skus`, `stock`, `costs`, `suppliers`, `reorders`, `labels` และชื่อ attributes; ชื่อจาก ER เป็นข้อบังคับ.

### ตรวจเอกสารอ้างอิง (Phase 0, 2026-10-28)

- `docs/source/use-case-description.pdf`, `bizflow-to-be.drawio.xml` และ `er-diagram.drawio.xml` เป็นชุดล่าสุดที่มีใน `docs/source/`; Git เพิ่มชุดนี้ใน `24e4b17` (2026-10-12). PDF มี 76 หน้า แต่ metadata ไม่ระบุ revision/date; BizFlow ตั้งชื่อ diagram ว่า `To-Be-v2`; ER ไม่มีเลข revision ในไฟล์ จึงยืนยันได้เพียง baseline ที่เก็บใน repo ไม่ใช่วันที่แก้ไขต้นฉบับของทีม.
- Flow ที่เกี่ยวกับ feature 002: 4A นำเข้า Order, 2A ตรวจ Order, 1S จับคู่ RSL, 3S ตรวจ stock, 4S คำนวณ cost, 5S แจ้ง tracking ผ่านช่องทางขาย, 6A ส่งคำสั่งซื้อ supplier และ 7S ตัด stock/ซิงค์ยอด; 8A รับผล carrier, 9A พิมพ์ label และ 10A ลบข้อมูลเก่าเป็นเส้นทางอ่าน/เก็บประวัติที่ต้องคงไว้. ทางเลือกสำคัญครอบคลุมข้อมูล/ระบบภายนอกใช้ไม่ได้, Order หรือ SKU ซ้ำ/ไม่ตรง, stock ไม่พอ, ส่ง tracking/คำสั่งซื้อ/พิมพ์ไม่สำเร็จ, stock sync ล้มเหลวและ retry, รวมถึง Order ถูกยกเลิกหรือตีกลับ.
- **Q-number ยังไม่สอดคล้อง**: PDF ใช้เลขที่ไม่ระบุ actor/category หรือไม่ตรง UC เช่น 3A `Q13.1`, 4A `Q11.1`, 5S `Q9.1`–`Q9.2`, 7S `Q7S.1`–`Q7S.5`. ให้ทำ mapping ใน T005 และถือเลขที่มีอยู่เป็น provisional ตาม constitution; ห้ามเริ่ม SQL ของแอปก่อน gate นี้ผ่าน.
- **7S ขัดกับ constitution v1.5.0**: PDF อธิบายการซิงค์ไปทุก Marketplace และ `Q7S.5` ตั้ง `order_status='จัดส่งสำเร็จ'`; constitution กำหนด Rakuten เท่านั้น และห้าม 7S ตั้งสถานะส่งสำเร็จ (ทำได้เฉพาะเมื่อ carrier ยืนยันใน 8A). ยึด constitution/spec ปัจจุบัน: 7S เก็บ `stock_deducted`, คงสถานะ “แจ้งเลขติดตามแล้ว” และการซิงค์ภายนอกเป็น adapter ของ Rakuten; บันทึกความต่างนี้ไว้ให้ทีมปรับเอกสารต้นทาง.
- **Schema extension ยังต้องแจ้งทีม**: ER ปัจจุบันไม่มี session และประวัติที่ FR-017 ต้องเก็บ (automatic error, cleanup 10A, cost 4S, tracking notification attempts 5S); บันทึกเป็นส่วนขยายที่ต้องส่งให้ทีมปรับ ER และสร้างผ่าน migration ใหม่ตามแผน. 5S ระบุปลายทางเป็น Marketplace โดยดึง `sales_channel`; contract ใช้ Rakuten RMS สำหรับ scope ปัจจุบัน จึงไม่ใช่ข้อขัดแย้งเมื่อจำกัดระบบไว้ที่ Rakuten.

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
