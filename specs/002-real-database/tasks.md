# Tasks: ย้ายข้อมูลระบบจาก mock ในเบราว์เซอร์ไปฐานข้อมูลจริง

**Input**: เอกสารออกแบบใน `/specs/002-real-database/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `quickstart.md`, `contracts/external-adapters.md`

**Testing**: Constitution ไม่บังคับ automated tests; ใช้เกณฑ์ตรวจรับอิสระของแต่ละ Story, `npm run lint`, `npx tsc --noEmit`, `npm run build` และ walkthrough ด้วยมือ

**Organization**: แบ่งงานตาม user story. หมายเลข Phase เริ่มที่ 0 ตาม constitution; แต่ละ Phase เป็นหน่วย branch แยกได้ (`feature/002-phase-<n>`).

## Phase 0: Setup

**Purpose**: เตรียมข้อมูลอ้างอิงและการตั้งค่าฐานข้อมูลสำหรับเครื่องพัฒนา โดยยังไม่เปลี่ยนพฤติกรรมแอป

- [x] T001 [P] ตรวจ ER diagram, BizFlow และเอกสาร use case ล่าสุดใน `docs/source/`; สรุปเวอร์ชัน, UC/alternative flow ที่กระทบ feature 002 และข้อขัดแย้งลง `specs/002-real-database/research.md`
- [x] T002 [P] ระบุขั้นตอนตั้ง PostgreSQL และค่าตั้งที่ต้องใช้ โดยไม่ใส่ secret ลง repo ใน `.env.local.example` และ `README.md`

---

## Phase 1: Foundational (ข้อกำหนดที่บล็อกงานฐานข้อมูล)

**Purpose**: ปิดข้อกำหนดที่ยังคลุมเครือและสร้างโครงสร้างร่วมก่อนทำ migration หรือ query

- [ ] T003 ยืนยันจาก `docs/source/use-case-description.pdf` ว่า UC 5S ส่ง tracking notification ผ่านระบบใด แล้วแก้ operation/เจ้าของ interface ใน `specs/002-real-database/contracts/external-adapters.md`
- [ ] T004 ระบุที่เก็บถาวรของสถานะ Rakuten stock sync ที่ 7S ใช้ retry (เช่น field/table ตามข้อกำหนด ER) แล้วปรับ `specs/002-real-database/data-model.md` และ `specs/002-real-database/spec.md` ให้สอดคล้อง; เพิ่ม schema extension ในรายการส่งทีมเอกสารถ้า ER ไม่มี field ที่ต้องใช้
- [ ] T005 ตรวจ Q-number กับเอกสาร use case ฉบับล่าสุดใน `docs/source/use-case-description.pdf`; บันทึก mapping UC → Q-number ใน `src/lib/queries/README.md` และระบุหมายเลขที่ยัง provisional ห้ามเริ่ม SQL ของแอปจน mapping ผ่านเกณฑ์ constitution
- [ ] T006 อ่านคู่มือ Next.js ที่เกี่ยวข้องจาก `node_modules/next/dist/docs/` ก่อนสร้าง server actions, handlers หรือ server guards แล้วบันทึกข้อกำหนดที่เกี่ยวข้องใน `specs/002-real-database/research.md`
- [ ] T007 กำหนดชนิดผลลัพธ์กลางและ factory สำหรับเลือก adapter ตามค่าตั้งใน `src/lib/adapters/contracts.ts` และ `src/lib/adapters/index.ts` โดยยึด `specs/002-real-database/contracts/external-adapters.md`
- [ ] T008 เพิ่ม transaction helper ที่ใช้ connection เดียวและ rollback เมื่อเกิด error ใน `src/lib/db.ts`; ใช้ raw SQL ผ่าน `pg` เท่านั้น
- [ ] T009 เพิ่มการแปลง DB/adapter error เป็น result code ปลอดภัยและข้อความ i18n ใน `src/lib/db/errors.ts` และ `src/lib/i18n/dict.ts`

**Gate**: T003–T005 ต้องเสร็จก่อนทำ SQL/migrations ที่เกี่ยวข้อง; ห้ามเดา UC, Q-number หรือปลายทาง integration ที่ยังไม่ยืนยัน

---

## Phase 2: User Story 1 — เข้าสู่ระบบและเห็นข้อมูลตัวอย่างจากฐานข้อมูล (P1, MVP)

**Goal**: เตรียม PostgreSQL ด้วย schema/seed ที่ทำซ้ำได้ และให้ Admin เข้าระบบด้วย session ฝั่ง server

**Independent Test**: จากฐานข้อมูลว่าง รันคำสั่ง setup/seed, รันซ้ำสามครั้งโดยจำนวนแถวไม่เพิ่ม, login ด้วย `admin@colorado.jp`, ปฏิเสธ `locked@colorado.jp`, restart แล้วยังมีข้อมูล และตรวจว่า password ใน DB เป็น hash

- [ ] T010 [US1] สร้าง migration สำหรับตารางและคอลัมน์ ER ทั้งหมด โดยใช้ชื่อจาก `docs/source/er-diagram.drawio.xml` ใน `db/migrations/001_core_schema.sql`
- [ ] T011 [US1] สร้าง migration ใหม่สำหรับ sessions และ history/sync schema extensions ที่อนุมัติใน `db/migrations/002_runtime_records.sql`; ระบุเหตุผลและตารางที่ทีมเอกสารต้องเพิ่มใน `specs/002-real-database/data-model.md`
- [ ] T012 [US1] เพิ่ม query แบบ parameterized สำหรับ Admin และ session พร้อม UC/Q-number comments ใน `src/lib/queries/admin.ts` และ `src/lib/queries/sessions.ts`
- [ ] T013 [US1] สร้าง seed ที่แปลงข้อมูลจาก `src/mock/` ครอบคลุม use case paths, hash รหัสผ่านด้วย scrypt และรันซ้ำแบบไม่ซ้ำข้อมูลใน `db/seed/index.ts`
- [ ] T014 [US1] เพิ่มคำสั่ง setup/seed แบบปกติและ reset แบบ explicit ใน `package.json` และ `db/seed/cli.ts`
- [ ] T015 [US1] เพิ่ม hash/verify password โดยใช้ Node `scrypt` โดยไม่เพิ่ม dependency ใน `src/lib/auth/password.ts`
- [ ] T016 [US1] เพิ่มการสร้าง, ตรวจ, หมดอายุ และ revoke session โดยเก็บ token hash ใน `src/lib/auth/sessions.ts`
- [ ] T017 [US1] เพิ่ม login/logout server actions ที่ใช้ UC 1A, บันทึก `fail_attempts` และ `last_login` ตาม `src/app/login/actions.ts`
- [ ] T018 [US1] ป้องกันการเข้าถึงหน้า app และ report ฝั่ง server ด้วย session guard ใน `src/lib/auth/require-session.ts`, `src/app/(app)/layout.tsx` และ `src/app/reports/layout.tsx`
- [ ] T019 [US1] อัปเดตคำแนะนำติดตั้งและ login ตัวอย่างหลังเปลี่ยนเป็น DB ใน `README.md` โดยไม่เปิดเผยค่าเชื่อมต่อจริง

---

## Phase 3: User Story 2 — ทุกหน้าที่ดูข้อมูลอ่านจากฐานข้อมูล (P1)

**Goal**: ให้ Dashboard, ตาราง และ reports อ่านข้อมูลปัจจุบันจาก server/DB พร้อมสถานะ error ที่ปลอดภัย

**Independent Test**: เปิดทุกหน้าที่อ่านข้อมูล, เปลี่ยนค่าฐานข้อมูลโดยตรง, refresh แล้วเห็นค่าใหม่; ปิด DB แล้วเห็น error ที่เข้าใจได้โดยไม่มี mock data fallback

- [ ] T020 [US2] เพิ่ม query/read functions แบบมี Q-number สำหรับ dashboard totals, chart และ recent orders ใน `src/lib/queries/dashboard.ts`
- [ ] T021 [US2] เปลี่ยนหน้า Dashboard ให้อ่านจาก server data loader แทน `useStore()` ใน `src/app/(app)/dashboard/page.tsx` และ `src/app/(app)/dashboard/recent-orders-table.tsx`
- [ ] T022 [US2] เพิ่ม query/read functions สำหรับ Order, SKU, stock, cost และ reorder ใน `src/lib/queries/orders.ts`, `src/lib/queries/skus.ts`, `src/lib/queries/stock.ts`, `src/lib/queries/costs.ts` และ `src/lib/queries/reorders.ts`
- [ ] T023 [US2] เปลี่ยนหน้า Orders, Products, Stock, Cost และ Reorder ให้รับข้อมูลจาก server loader ใน `src/app/(app)/orders/`, `src/app/(app)/products/` และ `src/app/(app)/products/reorder/`
- [ ] T024 [US2] เพิ่ม read queries และย้าย Shipping, Labels, Cleanup และ Reports ให้อ่านจากฐานข้อมูลใน `src/lib/queries/shipping.ts`, `src/app/(app)/shipping/`, `src/app/(app)/system/cleanup/` และ `src/app/reports/`
- [ ] T025 [US2] เพิ่ม loading/empty/DB unavailable states และข้อความไทย/อังกฤษสำหรับหน้าที่ migrate ใน `src/components/shared/` และ `src/lib/i18n/dict.ts`

---

## Phase 4: User Story 3 — ทำงานกับ Order ได้ครบและบันทึกลงฐานข้อมูล (P1)

**Goal**: คง flow นำเข้า ตรวจสอบ จับคู่ RSL และยกเลิก Order พร้อม persist ทุกการเปลี่ยนแปลง

**Independent Test**: เดินสถานการณ์ 7, 8, 11 และ 12 ของ `specs/001-order-status-alignment/quickstart.md`; ตรวจสถานะและข้อมูล Order หลัง refresh/restart รวมกรณีนำเข้าซ้ำพร้อมกัน

- [ ] T026 [US3] เพิ่ม server use case นำเข้า Order 4A พร้อมข้าม `marketplace_order_id` ซ้ำและบันทึกเฉพาะรายการถูกต้องใน `src/lib/use-cases/import-orders.ts`
- [ ] T027 [US3] เพิ่ม server use case ตรวจ Order 2A และดึงข้อมูลล่าสุดผ่าน interface ใน `src/lib/use-cases/verify-order.ts`
- [ ] T028 [US3] ย้ายการเรียก adapter สำหรับ SKU matching 2S, stock check 3S และ RSL matching 1S ไป server use cases; คง pure rules ใน `src/lib/workflow.ts` และเพิ่ม `src/lib/use-cases/match-order.ts` กับ `src/lib/use-cases/check-stock.ts`
- [ ] T029 [US3] เพิ่ม server use case ยกเลิก Order 7A พร้อมคืน stock ตาม flow, คงเงื่อนไข Order ที่ส่งมอบแล้ว และ persist เหตุผล/เวลาใน `src/lib/use-cases/cancel-order.ts`
- [ ] T030 [US3] เชื่อมหน้า import, verify, RSL match และ cancel กับ server actions/use cases แทน `run()` ใน `src/app/(app)/dashboard/`, `src/app/(app)/orders/` และ `src/lib/store.tsx`

---

## Phase 5: User Story 4 — สินค้า สต๊อก ต้นทุน และการสั่งซื้อเพิ่มบันทึกลงฐานข้อมูล (P2)

**Goal**: ย้ายข้อมูลสินค้า/สต๊อก/ต้นทุน และการสั่งซื้อเติมสต๊อกไปยัง server/DB

**Independent Test**: ปรับ SKU/stock/cost และตัดสินใจสั่งซื้อเพิ่ม; reload แล้วข้อมูลและประวัติยังอยู่ครบ; fault ของ Supplier แสดงผลตาม UC และไม่ทำรายการซ้ำ

- [ ] T031 [US4] เพิ่ม server use cases สำหรับเพิ่ม/แก้ไข/นำเข้าสินค้าและกฎ SKU ตาม UC 3A ใน `src/lib/use-cases/products.ts`
- [ ] T032 [US4] เพิ่มการบันทึก stock adjustment และ cost change พร้อมประวัติ UC 4S ใน `src/lib/use-cases/stock.ts`, `src/lib/use-cases/costs.ts` และ `src/lib/queries/cost-history.ts`
- [ ] T033 [US4] เพิ่ม server use cases สำหรับการตัดสินใจ 5A และส่งคำสั่งซื้อ Supplier 6A พร้อมผล accepted/failure ใน `src/lib/use-cases/reorders.ts`
- [ ] T034 [US4] เชื่อมหน้า Products, Stock, Cost และ Reorder กับ server use cases ใน `src/app/(app)/products/` และ `src/app/(app)/products/reorder/`

---

## Phase 6: User Story 5 — จัดส่ง ใบปะ แจ้งเลขติดตาม และลบข้อมูลเก่าบันทึกลงฐานข้อมูล (P2)

**Goal**: ย้ายการจัดรูปแบบ/พิมพ์ใบปะ, ส่งมอบ, แจ้ง tracking, อ่าน carrier status และลบ Order เก่า

**Independent Test**: เดินสถานการณ์ 1–6, 9, 10 และ 13 ใน quickstart feature 001; ตรวจการแจ้ง tracking ซ้ำ, carrier failure, deletion history และไม่ให้ 7S ตั้งสถานะจัดส่งสำเร็จ

- [ ] T035 [US5] เพิ่ม use case สร้างใบปะอัตโนมัติ 6S ผ่าน label service และ persist ใบปะใน `src/lib/use-cases/format-labels.ts`
- [ ] T036 [US5] เพิ่ม use case พิมพ์/พิมพ์ซ้ำ 9A พร้อม printer result และ print history ใน `src/lib/use-cases/print-label.ts`
- [ ] T037 [US5] เพิ่ม use case ส่งมอบ Order 8A และดึง carrier status; ให้เฉพาะ carrier confirmation ทำสถานะ `จัดส่งสำเร็จ` ใน `src/lib/use-cases/dispatch-order.ts` และ `src/lib/use-cases/poll-carrier.ts`
- [ ] T038 [US5] เพิ่ม use case แจ้ง tracking 5S ผ่าน adapter ที่ยืนยันแล้ว; persist tracking notification log และให้ resend ที่ Admin ยืนยันเป็น attempt ใหม่ใน `src/lib/use-cases/notify-tracking.ts`
- [ ] T039 [US5] เพิ่ม use case ลบ Order เก่าตาม 10A และบันทึก deletion history ใน transaction เดียวกันใน `src/lib/use-cases/cleanup-orders.ts`
- [ ] T040 [US5] เชื่อมหน้าจัดส่ง, ใบปะ, รายงานพิมพ์ และ cleanup กับ use cases ใน `src/app/(app)/shipping/`, `src/app/reports/` และ `src/app/(app)/system/cleanup/`

---

## Phase 7: User Story 6 — งานอัตโนมัติทำงานฝั่งเซิร์ฟเวอร์ในธุรกรรมเดียวกับการกระทำ (P2)

**Goal**: ให้ 2S, 3S, 6S, 7S ทำงานฝั่ง server ใน transaction ของ action และป้องกัน double deduction/concurrent oversell

**Independent Test**: แจ้ง tracking ของ Order เดียวกันพร้อมกันจาก 2 tabs 20 ครั้ง; stock ลดครั้งเดียวทุกครั้ง; บังคับ failure กลาง automation แล้วไม่มีข้อมูลเปลี่ยนบางส่วน

- [ ] T041 [US6] เพิ่ม transaction-scoped runner ที่เรียก action และ `runAutomation` ใน transaction เดียว โดยส่งผล adapter ให้ pure rules ใน `src/lib/use-cases/execute-workflow.ts`
- [ ] T042 [US6] เพิ่ม row locking/conditional updates สำหรับ stock และ `stock_deducted` เพื่อป้องกันยอดติดลบและตัดซ้ำใน `src/lib/queries/stock.ts` และ `src/lib/use-cases/deduct-stock.ts`
- [ ] T043 [US6] เพิ่ม Rakuten stock sync 7S ทางเลือก #1 พร้อม durable pending state และ retry ยอดล่าสุดหลัง failure ใน `src/lib/use-cases/sync-rakuten-stock.ts` และ `src/lib/queries/stock-sync.ts`
- [ ] T044 [US6] ทำให้ transaction rollback ครอบคลุม action และ auto steps พร้อม safe error logging ตาม UC ใน `src/lib/db.ts`, `src/lib/use-cases/execute-workflow.ts` และ `src/lib/queries/auto-error-logs.ts`

---

## Phase 8: User Story 7 — ระบบภายนอกเป็น mock ผ่าน interface ที่สลับได้ (P3)

**Goal**: ยืนยันว่าระบบภายนอกทุกตัวใช้ mock adapter ที่เลือกด้วย config และ `/dev` จำลอง failure ของแต่ละทางเลือกได้

**Independent Test**: เปลี่ยน adapter config ระหว่าง mock implementations แล้ว use case และหน้าจอไม่เปลี่ยน; เปิด fault toggle ของแต่ละระบบและตรวจผลทางเลือกตาม UC; ยืนยันว่าไม่มี network call ออกนอกระบบ

- [ ] T045 [US7] เติม mock adapters สำหรับ Rakuten, RSL, label service, printer, carrier และ supplier ให้ตรง contracts ใน `src/lib/adapters/`
- [ ] T046 [US7] เชื่อม `FAULT_KEYS` กับ mock adapter ที่เกี่ยวข้องและเพิ่ม reset/fault controls ใน `/dev` ใน `src/lib/workflow.ts`, `src/lib/adapters/` และ `src/app/(app)/dev/page.tsx`
- [ ] T047 [US7] ยืนยันการเลือก adapter ด้วย config โดยไม่ให้ use case หรือหน้าจอ import concrete adapter ใน `src/lib/adapters/index.ts` และ `src/lib/use-cases/`

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: ลบ browser business store หลังทุกหน้า migrate และตรวจเกณฑ์สำเร็จรวม

- [ ] T048 ลบ business data/session จาก `localStorage` และ client `AuthGuard` หลังย้ายครบทุกหน้าตาม constitution; คงเฉพาะ UI preferences ใน `src/lib/store.tsx`, `src/components/app-shell/auth-guard.tsx` และ `src/lib/i18n/context.tsx`
- [ ] T049 ตรวจ seed row comments ครอบคลุมทุก UC/alternative flow และ query catalog มี UC/Q-number ครบใน `db/seed/`, `src/lib/queries/README.md` และ `specs/002-real-database/quickstart.md`
- [ ] T050 เดิน quickstart ทุก scenario, รัน `npm run lint`, `npx tsc --noEmit`, `npm run build` และบันทึกผล/ข้อยกเว้นใน `specs/002-real-database/quickstart.md`

## Dependencies & Execution Order

### Phase dependencies

- **Phase 0**: เริ่มได้ทันที; ตรวจเอกสารและการตั้งค่าฐานข้อมูล
- **Phase 1**: ต้องยืนยัน 5S destination, durable stock-sync state และ Q-number ก่อนเริ่ม migration/query; คู่มือ Next.js ต้องอ่านก่อนสร้าง code ฝั่ง server
- **Phase 2 (US1)**: ต้องผ่าน Phase 1; วางฐาน schema, seed, login และ server session
- **Phase 3 (US2)**: ต้องมี schema/seed/session จาก US1
- **Phase 4 (US3), Phase 5 (US4), Phase 6 (US5)**: ต้องมีฐานข้อมูลและ read paths จาก US1–US2; ใช้ adapter contracts ที่ยืนยันใน Phase 1
- **Phase 7 (US6)**: ต้องมี write use cases ของ US3–US5
- **Phase 8 (US7)**: ใช้ interfaces จาก Phase 1 และ integrations จาก US3–US6
- **Phase 9**: รอทุก story migrate ก่อนลบ browser business store

### User story order

`US1 → US2 → US3 → US4 → US5 → US6 → US7 → Polish`. US2, US3, US4 และ US5 มี acceptance criteria แยกกัน แต่ควรทำตามลำดับเพราะ share schema, session และ adapter seams.

### Parallel opportunities

- Phase 0: T001 และ T002 แก้คนละเอกสาร/ไฟล์ จึงทำคู่ขนานได้.
- Phase 1 หลัง T003–T005: T006 (อ่าน Next docs), T007 (adapter interface), T008 (transaction helper) และ T009 (error mapping) แตะคนละไฟล์หลักและทำคู่ขนานได้.
- US2 หลัง query/schema พร้อม: loaders ของ dashboard, order/product tables และ reports แยกตามไฟล์ route ได้ หากไม่แก้ query module ร่วมกัน.
- US4: งาน stock/cost history กับ supplier reorder แยก module ได้หลัง schema extensions ผ่าน.

## Parallel Example: Foundation

```text
T006 Next.js docs → research.md
T007 Adapter contracts → src/lib/adapters/
T008 DB transaction helper → src/lib/db.ts
T009 Error mapping → src/lib/db/errors.ts + src/lib/i18n/dict.ts
```

รัน T007–T009 คู่ขนานหลัง T003–T005; T006 เป็นงานอ่าน/บันทึกและทำคู่ขนานได้.

## Implementation Strategy

### MVP first

ทำ Phase 0–2 ให้ได้ schema/seed และ login แบบ server-side; ตรวจอิสระของ US1 ก่อนเริ่มย้ายหน้าจอทั้งระบบ.

### Incremental delivery

ย้าย read paths (US2) ก่อน write paths; จากนั้น Order flows (US3), product/stock/cost/reorder (US4), shipping/labels/cleanup (US5), transactional automation/sync (US6), และยืนยันการสลับ mock adapters (US7). ลบ `localStorage` เฉพาะใน Phase 9.

## หมายเหตุ

- ไม่มี automated-test tasks เพราะ constitution ไม่บังคับและผู้ใช้ไม่ได้ขอให้เพิ่ม tests; เกณฑ์ตรวจรับในแต่ละ story เป็น manual walkthrough.
- ห้ามเชื่อมระบบภายนอกจริงใน feature 002.
- Tasks ที่เขียน SQL ต้องรอ T005 และใช้ Q-number ที่ยืนยันแล้ว.
