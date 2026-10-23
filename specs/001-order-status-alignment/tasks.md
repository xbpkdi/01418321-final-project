---

description: "รายการงาน: จัดลำดับสถานะ Order ให้ตรงตามที่ทีมอนุมัติ"
---

# Tasks: จัดลำดับสถานะ Order ให้ตรงตามที่ทีมอนุมัติ

**Input**: Design documents from `/specs/001-order-status-alignment/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/order-status-flow.md, quickstart.md

**Tests**: ไม่มี task เขียน automated test เพราะ constitution ไม่บังคับ และ spec ไม่ได้ขอ ใช้ขั้นตอนตรวจด้วยมือจาก [quickstart.md](./quickstart.md) แทน (เลขสถานการณ์ในวงเล็บคือ # ในตารางของ quickstart)

**Organization**: จัดกลุ่มตาม user story ตามลำดับ priority ใน spec.md; เลข Phase ใช้ตั้งชื่อ branch `feature/phase-<n>` ตาม constitution (Phase 0 คืองานพื้นฐานก่อนทุก story, Phase 1 ถึง 5 คือ US1 ถึง US5, Phase 6 คืองานปิดท้าย)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: ทำพร้อมกันได้ (คนละไฟล์ ไม่ขึ้นกับงานที่ยังไม่เสร็จ)
- **[Story]**: US1 ถึง US5 ตาม spec.md
- ทุก task ระบุ path จากราก repository

## Path Conventions

โปรเจกต์ Next.js ชุดเดียว: `src/lib/`, `src/mock/`, `src/app/(app)/shipping/` ตาม plan.md

## Phase 0: Setup and Foundational (Blocking Prerequisites)

**Branch**: `feature/phase-0` (constitution v1.4.0: หนึ่ง phase ต่อหนึ่ง branch) **Purpose**: จดสถานะก่อนแก้ และ bump เวอร์ชันข้อมูลที่เก็บในเบราว์เซอร์ตามที่ทีมอนุมัติ (research.md ข้อ 5) ต้องเสร็จก่อนทุก story

### Setup

- [X] T001 รัน `npm run lint` และ `npx tsc --noEmit` ที่ราก repository ก่อนแก้โค้ด จดข้อผิดพลาดที่มีอยู่เดิม (ถ้ามี) ไว้เทียบหลังแก้ (ผลตอน 2026-10-12: ผ่านทั้งคู่ ไม่มีข้อผิดพลาดเดิม)

### Foundational

**⚠️ CRITICAL**: ทำสองงานนี้ต่อกันและ commit พร้อมกัน เพราะแก้แยกกันจะทำให้ type ไม่ตรง

- [X] T002 ใน `src/lib/workflow.ts` เปลี่ยน `version: 1` เป็น `version: 2` ทั้งใน type `AppState` (บรรทัดประมาณ 72) และใน `createSeed()` (บรรทัดประมาณ 100)
- [X] T003 ใน `src/lib/store.tsx` เปลี่ยน `STORAGE_KEY` เป็น `"rsl-hub-state-v2"` และเปลี่ยนเงื่อนไขใน `load()` จาก `parsed.version === 1` เป็น `parsed.version === 2` (ต้องทำหลัง T002)

**Checkpoint**: `npx tsc --noEmit` ผ่าน และเปิดแอปครั้งแรกแล้วโหลดข้อมูลตั้งต้นชุดใหม่

---

## Phase 1: User Story 1 - ตัดสต๊อกแล้ว Order ยังไม่ถือว่าส่งสำเร็จ (Priority: P1) 🎯 MVP

**Goal**: 7S หักสต๊อกหนึ่งครั้งและคงสถานะ "แจ้งเลขติดตามแล้ว"

**Independent Test**: quickstart (2), (3), (10): แจ้งเลขติดตามให้ `ORD-24174` แล้ว Order หยุดที่ "แจ้งเลขติดตามแล้ว" มี "ตัดสต๊อกแล้ว" สต๊อกลดครั้งเดียว

### Implementation for User Story 1

- [X] T004 [US1] ใน `src/lib/workflow.ts` ฟังก์ชัน `runAutomation` ส่วน "7S ตัดสต๊อก" (บล็อก `if (o.order_status === "แจ้งเลขติดตามแล้ว")`): เมื่อ `stock_deducted` ยังไม่จริง ให้ตรวจยอดแหล่งจัดส่งเหมือนเดิม (ไม่พอหรือไม่มีแถวสต๊อก → `toManual(..., "stock-deduct")` และ event `stock-insufficient`); ถ้าพอให้เรียก `adjustStock(..., -o.qty)` แล้ว `patchOrder` ตั้ง `stock_deducted: true` และ `mp_stock_synced: !s.faults.mpStockSync` **โดยไม่เรียก `setStatus`** (สถานะต้องคง "แจ้งเลขติดตามแล้ว") และ push event `stock-deducted` หรือ `stock-sync` เหมือนเดิม ลบการ `setStatus(..., "จัดส่งสำเร็จ")` ออกจากบล็อกนี้ทั้งสองจุด (สาขาตัดแล้วและสาขาตัดใหม่)
- [X] T005 [US1] ใน `src/lib/workflow.ts` บล็อกเดียวกับ T004: เมื่อ Order ตัดสต๊อกแล้ว (`stock_deducted` เป็นจริง) ต้องไม่ตัดซ้ำและต้องไม่ `continue` ทิ้ง เพื่อให้กฎ "7S ทางเลือก #1 ลองซิงค์ Marketplace ใหม่" (`mp_stock_synced === false` และไม่มี fault `mpStockSync`) ทำงานกับ Order ที่ยังอยู่ "แจ้งเลขติดตามแล้ว" ได้ ใช้ Order ล่าสุดจาก `findOrder(s, o.order_id)` ไม่ใช้ตัวแปร `o` จากรอบ `for` เดิมหลัง state เปลี่ยน (ทำหลัง T004)
- [X] T006 [P] [US1] ใน `src/lib/i18n/dict.ts` เพิ่ม key `shipping.stockDeducted` ทั้งชุดไทย (`"ตัดสต๊อกแล้ว"`) และอังกฤษ (`"Stock deducted"`) ในกลุ่ม `shipping` ให้ตรงรูปแบบ key เดิม
- [X] T007 [US1] ใน `src/app/(app)/shipping/columns.tsx` คอลัมน์ `order_status` ของตาราง "ส่งมอบแล้ว": เมื่อ `stock_deducted` เป็นจริง แสดงข้อความ `t.shipping.stockDeducted` เป็นตัวอักษรสีเทาขนาดเล็ก (`text-muted-foreground text-xs`) ใต้ `StatusBadge` ไม่ใช้สีสถานะ คงป้าย "รอซิงค์" เดิมไว้ (ทำหลัง T006)
- [X] T008 [US1] ใน `src/lib/workflow.ts` แก้คอมเมนต์หัวไฟล์ (แผนภาพลำดับงาน) ให้ระบุว่า 7S ตัดสต๊อกโดยไม่เปลี่ยนสถานะ และ "จัดส่งสำเร็จ" มาจากขนส่งยืนยัน (8A) อ้างอิงข้อกำหนด Order status vocabulary ใน constitution
- [X] T009 [US1] ตรวจด้วยมือตาม quickstart (2), (3) และ (10) หลังรีเซ็ตที่ `/dev`; รัน `npm run lint` และ `npx tsc --noEmit` (ผลตอน 2026-10-14: lint และ tsc ผ่าน; (2), (3), (10) ตรวจด้วยสคริปต์จำลอง `runAutomation` ไม่ใช่ในเบราว์เซอร์: ตัดสต๊อก 96→93 ครั้งเดียว สถานะคง "แจ้งเลขติดตามแล้ว" ซิงค์ใหม่เองเมื่อปิด fault; ยังไม่ได้ดูป้าย "ตัดสต๊อกแล้ว" บนหน้า `/shipping`)

**Checkpoint**: US1 ทำงานได้ แต่ Order ที่ตัดสต๊อกแล้วจะค้างที่ "แจ้งเลขติดตามแล้ว" จนกว่าจะทำ US2 จึงต้องส่งมอบ US1 และ US2 พร้อมกัน

---

## Phase 2: User Story 2 - "จัดส่งสำเร็จ" เมื่อขนส่งยืนยันว่าถึงลูกค้า (Priority: P1)

**Goal**: ขนส่งยืนยัน `delivered` เป็นทางเดียวที่ทำให้ Order เป็น "จัดส่งสำเร็จ" รวมกรณียืนยันก่อน 5S/7S เสร็จ และ `delivered` ไม่ถูกเขียนทับ

**Independent Test**: quickstart (1) และ (4): เปิด `/shipping` แล้ว `ORD-24166` เป็น "จัดส่งสำเร็จ"; `ORD-24165` รอ จนกดส่งเลขติดตามแล้วจึงเป็น "จัดส่งสำเร็จ"; Order ที่ปิดแล้วยังแสดงสถานะขนส่งส่งถึง

### Implementation for User Story 2

- [X] T010 [US2] ใน `src/lib/workflow.ts` `runAutomation` (บล็อก 7S เดียวกับ T004 และ T005): เพิ่มกฎเลื่อนสถานะ เมื่อ Order ล่าสุดมีสถานะ "แจ้งเลขติดตามแล้ว" และ `stock_deducted` เป็นจริง และ `delivery_status === "delivered"` ให้ `setStatus(s, o.order_id, "จัดส่งสำเร็จ")` กฎนี้ต้องเป็นที่เดียวใน use case ทั้งหมดที่ตั้ง "จัดส่งสำเร็จ" ไม่เพิ่ม event หรือ toast ใหม่ (research.md ข้อ 8) (ทำหลัง T005)
- [X] T011 [US2] ใน `src/lib/workflow.ts` ฟังก์ชัน `pollCarrier` (FR-015, research.md ข้อ 9): ในลูปของ Order ที่เฝ้าดู หลังได้ `delivery_status` จาก `trackCarrier` ให้ข้าม Order นั้น (`continue`) เมื่อค่าที่เก็บไว้ใน Order เป็น `"delivered"` และขนส่งตอบ `"in_transit"` ยังต้องยอมรับ `returned` และ `failed` ตามเดิม (ทำหลัง T010 เพราะแก้ไฟล์เดียวกัน)
- [X] T012 [P] [US2] ใน `src/mock/delivery.ts` เพิ่มใน `MOCK_CARRIER_TRACKING` สี่รายการที่ `delivery_status: "delivered"` พร้อม `last_location` และคอมเมนต์ระบุการใช้งาน: `"4418-2290-1105"` (ใช้กับ `ORD-24166`), `"4418-2290-1106"` (ใช้กับ `ORD-24165`), `"4418-1001-0012"` (Order ที่ปิดแล้ว `ORD-23012`) และ `"4418-2290-0168"` (Order ที่ปิดแล้ว `ORD-24168`)
- [X] T013 [US2] ใน `src/mock/orders.ts` เพิ่ม `ORD-24166` ในกลุ่ม 8A ต่อจาก `ORD-24172`: `order_status: "แจ้งเลขติดตามแล้ว"`, `tracking_number: "4418-2290-1105"`, `carrier_name: "Yamato Transport"`, `delivery_status: "in_transit"`, `tracking_notified: true`, `stock_deducted: true`, `mp_stock_synced: true`, ฟิลด์ที่เหลือ (RSL, ใบปะ, ที่อยู่, `marketplace_order_id` รูปแบบ `377841-YYYYMMDD-0000166`) ให้ครบเหมือน Order ใกล้เคียง ใช้ SKU ที่มีอยู่ใน `SEED_PRODUCTS` และมีแถวใน `SEED_STOCK` ที่ยอดไม่เป็น `null` เช่น `OUT-LMP-021` หรือ `FSH-MLR-240` (ห้ามใช้ `YDM-HRB-012` เพราะ `rsl_qty` เป็น `null` ซึ่งเป็นข้อมูลทดสอบ 3S ทางเลือก #1) และคอมเมนต์ว่าทดสอบ "ส่งถึงหลัง 7S" (ทำหลัง T012)
- [X] T014 [US2] ใน `src/mock/orders.ts` เพิ่ม `ORD-24165` ต่อจาก `ORD-24166`: `order_status: "อยู่ระหว่างจัดส่ง"`, `tracking_number: "4418-2290-1106"`, `delivery_status: "in_transit"`, `tracking_notified: false`, ไม่มี `stock_deducted`; ก่อนเลือก SKU ให้ตรวจ `SEED_STOCK` ใน `src/mock/products.ts` ว่ายอดของแหล่งจัดส่ง (`fulfill_source` เริ่มต้นคือ `rsl` จึงดู `rsl_qty`) มากกว่าหรือเท่า `qty` และไม่เป็น `null` ถ้าไม่พอให้เลือก SKU อื่น (เช่น `OUT-LMP-021` ที่ `rsl_qty` เป็น 12); คอมเมนต์ว่าทดสอบ "ส่งถึงก่อน 5S/7S เสร็จ" (ทำหลัง T013)
- [X] T015 [US2] ตรวจด้วยมือตาม quickstart (1) และ (4) หลังรีเซ็ตที่ `/dev`; ยืนยันว่า `ORD-24165` ไม่เปลี่ยนเป็น "จัดส่งสำเร็จ" ก่อนกดส่งเลขติดตาม และเปลี่ยนทันทีหลังกด; ยืนยันว่า `ORD-23012` และ `ORD-24168` ยังแสดงสถานะขนส่ง "ส่งถึงลูกค้าแล้ว" หลังเปิด `/shipping`; รัน `npm run lint` และ `npx tsc --noEmit` (ผลตอน 2026-10-14: lint และ tsc ผ่าน; (1), (4), (10), (13) ตรวจด้วยสคริปต์จำลอง `pollCarrier` + `runAutomation` ไม่ใช่ในเบราว์เซอร์: `ORD-24166` เป็น "จัดส่งสำเร็จ" ทันที, `ORD-24165` รอจนส่งเลขติดตามแล้วเป็น "จัดส่งสำเร็จ", ติดฟอลต์ `mpStockSync` ได้ synced=false แล้วหายเมื่อปิดฟอลต์, `ORD-23012` และ `ORD-24168` ยัง delivered)

**Checkpoint**: US1 และ US2 ทำงานร่วมกัน เป็น MVP ที่ส่งมอบได้

---

## Phase 3: User Story 3 - ยกเลิก ลบข้อมูลเก่า และแจ้งเลขติดตามซ้ำ ยังทำงานถูกต้อง (Priority: P2)

**Goal**: 5S ส่งซ้ำ, 7A และ 10A ถูกต้องกับ Order ที่รออยู่ที่ "แจ้งเลขติดตามแล้ว"

**Independent Test**: quickstart (5), (7), (8), (9)

### Implementation for User Story 3

- [X] T016 [US3] ใน `src/app/(app)/shipping/columns.tsx` คอลัมน์ `notify`: เพิ่ม `"แจ้งเลขติดตามแล้ว"` ในรายการสถานะที่แสดงปุ่ม `t.shipping.notify` (ตัวแปร `canNotify`) เพื่อให้ส่งเลขติดตามซ้ำได้ตาม 5S ทางเลือก #3 (ทำหลัง T007 เพราะแก้ไฟล์เดียวกัน)
- [X] T017 [P] [US3] อ่านทบทวน (ไม่คาดว่าต้องแก้) ใน `src/lib/workflow.ts`: `HANDED_OVER`, `checkCancel`, `cancelOrder` ต้องให้ "แจ้งเลขติดตามแล้ว" ได้ผล `in-transit` → "รอดำเนินการพิเศษ" ไม่คืนสต๊อก และ "จัดส่งสำเร็จ"/"ยกเลิกแล้ว" ได้ `closed`/`already`; `CLOSED_STATUSES`, `planRangeCleanup`, `planClosedCleanup` ต้องนับเฉพาะ "จัดส่งสำเร็จ" และ "ยกเลิกแล้ว" ถ้าพบต่างจากนี้ให้แก้และจดใน plan.md
- [ ] T018 [US3] ตรวจด้วยมือตาม quickstart (5), (7), (8), (9)

**Checkpoint**: US3 ผ่านโดยไม่กระทบ US1 และ US2

---

## Phase 4: User Story 4 - 3S แยกเส้นทางตามสต๊อกและใช้สถานะครบ 22 ค่า (Priority: P2)

**Goal**: ล็อกพฤติกรรม 3S ที่ถูกอยู่แล้ว และยืนยันว่าไม่มีสถานะนอกรายการ

**Independent Test**: quickstart (11), (12)

### Implementation for User Story 4

- [X] T019 [US4] ค้นด้วย Grep ทั้ง `src/` หา `"จัดส่งสำเร็จ"` ที่ถูกส่งเข้า `setStatus` หรือ `order_status:` ในโค้ด (ไม่นับ `src/mock/` และ `dict.ts`) ยืนยันว่ามีเฉพาะกฎเลื่อนสถานะจาก T010; ถ้าพบที่อื่นให้แก้ใน `src/lib/workflow.ts` หรือไฟล์ที่พบ
- [X] T020 [US4] ตรวจด้วยมือตาม quickstart (11) และ (12); รัน `npx tsc --noEmit` (type `OrderStatus` ใน `src/lib/order-status.ts` จะจับค่าสถานะนอก 22 ค่า)

**Checkpoint**: US4 ผ่าน

---

## Phase 5: User Story 5 - ข้อมูลตั้งต้นและปุ่มรีเซ็ตให้ทดสอบทุกเส้นทางได้ (Priority: P3)

**Goal**: ข้อมูลตั้งต้นไม่ขัดกฎใหม่ และเดินครบทุกเส้นทางหลังรีเซ็ต

**Independent Test**: quickstart (6), (13)

### Implementation for User Story 5

- [ ] T021 [US5] ใน `src/mock/orders.ts` แก้ `ORD-24172`: เปลี่ยน `order_status` จาก `"จัดส่งสำเร็จ"` เป็น `"แจ้งเลขติดตามแล้ว"` (คง `stock_deducted: true`, `delivery_status: "in_transit"`, เลขติดตาม `4418-2290-1104`) และแก้คอมเมนต์ให้บอกว่าขนส่งตอบ returned แล้วระบบจะคืนสต๊อก (ทำหลัง T014 เพราะแก้ไฟล์เดียวกัน)
- [ ] T022 [US5] ใน `src/mock/orders.ts` แก้คอมเมนต์หัวไฟล์ (บรรทัดที่ 5 ถึง 10) ที่บอกว่าสถานะ "แจ้งเลขติดตามแล้ว" ไม่อยู่ในข้อมูลตั้งต้น ให้ตรงกับความจริง: สถานะนี้เป็นสถานะรอขนส่งยืนยันและมีในข้อมูลตั้งต้นได้ (ทำหลัง T021)
- [ ] T023 [US5] ตรวจด้วยมือตาม quickstart (6) และ (13) บนเบราว์เซอร์ที่เคยใช้แอปมาก่อน: ยืนยันว่าแอปโหลดข้อมูลชุดใหม่อัตโนมัติ (มี `ORD-24165`, `ORD-24166`) และกดรีเซ็ตที่ `/dev` ได้ผลเหมือนเดิม

**Checkpoint**: ทุก story ผ่าน

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T024 [P] ใน `CLAUDE.md` แก้สองจุด: (1) หัวข้อ Architecture เปลี่ยน storage key `rsl-hub-state-v1` เป็น `rsl-hub-state-v2`; (2) หัวข้อ "Content source of truth" ลบประโยค "`workflow.ts` still does this, and needs changing."
- [ ] T025 [P] ใน `specs/001-order-status-alignment/spec.md` เปลี่ยน `**Status**: Draft` เป็น `**Status**: Implemented` เมื่อ T026 ผ่าน
- [ ] T026 เดิน quickstart ครบ (1) ถึง (13) โดยสถานการณ์ (1) ถึง (9) ต้องเสร็จภายใน 10 นาที (SC-004) แล้วรัน `npm run lint`, `npx tsc --noEmit`, `npm run build` ที่ราก repository ผลต้องไม่เลวกว่า T001

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Setup และ Foundational)**: เริ่มได้ทันที และต้องเสร็จก่อนทุก story
- **US1 → US2**: ต่อเนื่องกันเพราะแก้บล็อก 7S ใน `runAutomation` เดียวกัน และต้องส่งมอบพร้อมกัน (US1 อย่างเดียวทำให้ Order ค้างที่ "แจ้งเลขติดตามแล้ว")
- **US3**: ต้องหลัง US1 (ใช้ `columns.tsx` ร่วมกัน และต้องมี Order ที่ค้างที่ "แจ้งเลขติดตามแล้ว")
- **US4**: ต้องหลัง US2 (ตรวจว่ากฎเลื่อนสถานะเป็นที่เดียวที่ตั้ง "จัดส่งสำเร็จ")
- **US5**: ต้องหลัง US2 (ใช้ `src/mock/orders.ts` ร่วมกัน)
- **Polish**: หลังทุก story

### Within Each User Story

- งานที่แก้ไฟล์เดียวกัน (`workflow.ts`, `columns.tsx`, `orders.ts`) ทำตามลำดับเลข task
- งานตรวจด้วยมืออยู่ท้ายแต่ละ story

### Parallel Opportunities

- T006 (`dict.ts`) ทำพร้อม T004 และ T005 (`workflow.ts`) ได้
- T012 (`delivery.ts`) ทำพร้อม T010 และ T011 (`workflow.ts`) ได้
- T017 (อ่านทบทวน `workflow.ts`) ทำพร้อม T016 (`columns.tsx`) ได้
- T024 และ T025 ทำพร้อมกันได้

### Parallel Example: User Story 1 และ 2

```text
พร้อมกัน:  T004 → T005 (workflow.ts)           |  T006 (dict.ts)
พร้อมกัน:  T010 → T011 (workflow.ts)           |  T012 (delivery.ts)
```

---

## Implementation Strategy

### MVP First

1. Phase 0
2. US1 และ US2 ต่อกัน แล้วหยุดตรวจตาม quickstart (1) ถึง (4) และ (10) นี่คือ MVP
3. ส่งมอบหรือสาธิตได้ทันที

### Incremental Delivery

1. MVP (US1 + US2)
2. US3 เพื่อให้ส่งซ้ำ ยกเลิก และลบข้อมูลถูกต้อง
3. US4 เพื่อล็อกและตรวจ
4. US5 เพื่อเก็บข้อมูลตั้งต้นให้ครบ แล้ว Polish

## Notes

- ไม่แตะ `src/lib/order-status.ts`, `src/app/(app)/orders/cancel/*`, `src/app/(app)/system/cleanup/*`, `src/app/(app)/dev/page.tsx`
- คอมเมนต์ `// Q…` ในโค้ดยังเป็นของชั่วคราว ห้ามเปลี่ยนเลขในงานนี้
- Commit ทีละ story หรือทีละกลุ่ม task ที่ตรวจผ่านแล้ว
