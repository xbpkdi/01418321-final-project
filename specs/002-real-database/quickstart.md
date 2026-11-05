# Quickstart: ตรวจสอบ feature 002-real-database

คู่มือนี้ใช้ตรวจการย้ายจาก browser mock ไป PostgreSQL ด้วยมือ ตามนโยบายใน constitution (ไม่มี test suite บังคับ) และเชื่อมสถานการณ์เดิมจาก [quickstart feature 001](../001-order-status-alignment/quickstart.md).

## เตรียมการ

1. ตั้ง PostgreSQL ในเครื่องและคัดลอก `.env.local.example` เป็น `.env.local`; กำหนด `DATABASE_URL` โดยห้าม commit secret.
2. ติดตั้งแพ็กเกจและสร้าง/เติมข้อมูลด้วยคำสั่ง seed/migration ที่ tasks จะระบุ. ตรวจโหมด default ไม่ลบข้อมูล; ใช้ reset เฉพาะเมื่อสั่งชัดเจน.
3. รัน `npm run lint`, `npx tsc --noEmit`, `npm run build`, จากนั้น `npm run dev`.
4. เข้าด้วย `admin@colorado.jp` / `demo1234`; ตรวจบัญชี `locked@colorado.jp` ถูกปฏิเสธ; ตรวจว่าค่าฐานข้อมูลเป็น hash.

## สถานการณ์ตรวจรับ

| # | การตรวจ | ผลที่คาดหวัง | Spec |
|---|---|---|---|
| 1 | สร้างฐานข้อมูลว่างและ seed; รันซ้ำ 3 ครั้ง | schema และข้อมูลตัวอย่างครบ; จำนวนแถวไม่เพิ่มจากการรันซ้ำ | US1, SC-003 |
| 2 | Login ถูก/ผิด/บัญชี lock; restart server และ logout | fail count และ last login ถูกต้อง; session cookie ใช้ได้/หมดอายุ/ยกเลิกได้; plaintext password ไม่ปรากฏใน DB, logs หรือ browser | FR-006–008, SC-010 |
| 3 | เปิด URL ภายในก่อน login ทั้งหน้า app และ report | server redirect ไป login โดยไม่มีข้อมูลรั่ว | FR-009, SC-009 |
| 4 | แก้ข้อมูลผ่าน browser A แล้วเปิด browser B/โหลดซ้ำ | เห็นค่าเดียวกันจากฐานข้อมูลหลัง refresh/restart | US1–2, SC-002 |
| 5 | เปิด dashboard, orders, products, stock, cost, reorder, shipping, labels และ reports | ทุกหน้าแสดงข้อมูลจาก DB; เปลี่ยนค่า DB แล้ว refresh เห็นค่าปัจจุบัน | US2, SC-006 |
| 6 | เดิน quickstart 13 สถานการณ์ของ feature 001 | ผล use case และ order status เหมือนเดิมบนฐานข้อมูล | SC-001 |
| 7 | ยิงการแจ้ง tracking ของ Order เดียวกันพร้อมกัน 2 แท็บ 20 รอบ | stock ลดครั้งเดียวต่อ Order ทุกครั้ง | US6, SC-004 |
| 8 | บังคับให้ DB/action/automation ล้มเหลวกลาง transaction | ไม่มีการเปลี่ยนข้อมูลบางส่วน; ผู้ใช้เห็น error ปลอดภัย ไม่มี fallback เป็นข้อมูล mock | FR-018, SC-005 |
| 9 | เปิด `/dev`, สลับ fault ของระบบภายนอก และ reset seed | mock adapter สะท้อน alternative flow; reset กลับเป็นข้อมูลตัวอย่างเริ่มต้น | FR-015 |
| 10 | ตรวจ catalog ของ SQL | ทุก statement มี UC และ Q-number ที่ตรวจย้อนกลับได้ | SC-007 |
| 11 | ตรวจ browser storage หลังครบทุกหน้าที่ migrate | ไม่มีข้อมูลธุรกิจใน localStorage; คงได้เฉพาะ preference UI | FR-016, SC-006 |

## ผลตรวจ Phase 7 (2026-11-04)

- `npm run db:setup` ผ่านกับ PostgreSQL ในเครื่องโดยไม่ reset ข้อมูล.
- Integration check สร้าง Order ชั่วคราวแล้วเรียก 5S พร้อมกัน 20 ครั้ง: สำเร็จ 1 ครั้ง, อีก 19 ครั้งได้ผล `already`, notification log 1 แถว และ stock ลด 1 หน่วยเพียงครั้งเดียว; ลบ Order ทดสอบและคืน snapshot ของ stock/sync state หลังตรวจ.
- Integration check บังคับ exception ใน Rakuten sync หลัง 5S และ stock deduction: transaction ย้อนกลับ notification log, `tracking_notified`, stock และ `stock_deducted` ทั้งหมด; บันทึก safe `auto_error_logs` 1 แถวหลัง rollback แล้วลบข้อมูลทดสอบ.
- `npm run lint` และ `npx tsc --noEmit` ผ่าน. `npm run build` แบบ Turbopack ติดข้อจำกัด runner ที่ห้าม PostCSS bind พอร์ต (`Operation not permitted`) แม้รันนอก sandbox; production build ทางเลือกที่ Next.js 16 รองรับด้วย `npx next build --webpack` compile, typecheck และ generate 18 static pages ผ่าน.

## ผลตรวจ Phase 9 (2026-11-05)

**T048 — Browser storage:** `src/lib/store.tsx` เหลือเพียง snapshot จาก DB (read-only) และ dirty-flag ในหน่วยความจำ; ลบ `run`/`reset`/`runAutomation` ฝั่ง client และ `localStorage` key `rsl-hub-state-v3`; ลบ `src/components/app-shell/auth-guard.tsx`. `localStorage` ที่เหลือมีเฉพาะ `rsl-hub-lang` (ภาษา UI, `src/lib/i18n/context.tsx`) และ cookie ของ sidebar (`src/components/ui/sidebar.tsx`) ซึ่งเป็น UI preference.

**T049 — Coverage ของ alternative flow:** ตรวจ comment ทุกแถวใน `src/mock/*.ts` (แหล่งของ seed) เทียบกับ `use-case-description.pdf`.

| กลุ่ม | Alternative flow | วิธีครอบคลุม |
|---|---|---|
| แถว seed | 3S #1; 4A #2, #3; 4S #1–#4; 6A #1; 7A #2–#4 (และ #1 ผ่าน UI); 7S #2; 8A #1–#3 | comment ในแถว `src/mock/orders.ts`, `products.ts`, `delivery.ts` |
| Fault toggle `/dev` | 4A #1 (`rms`); 2A (`marketplaceVerify`); 2S (`skuRuleDb`); 1S #4, 3S #3 (`rsl`); 6S (`labelService`); 9A #2 (`printer`); 8A #4 (`carrier`); 5S #1 (`trackingNotify`); 7S #1 (`mpStockSync`); 6A #3 (`supplierSend`); 5A, 10A rollback (`db`) | `FAULT_KEYS` ใน `src/lib/workflow.ts` |
| ทำผ่าน UI บนแถว seed (ไม่ต้องมีแถวพิเศษ) | 3A #1–#3; 5A #1–#2; 6A #2; 9A #1, #3, #4; 1S #1–#3; 3S #2; 5S #2–#4; 10A #1–#2 | ต้องเดินด้วยมือ; ยังไม่ได้เดินใน Phase 9 |

**Query catalog:** ตรวจ constant `Q…` ทั้ง 88 ตัวใน `src/lib/**/*.ts` เทียบ `src/lib/queries/README.md` — ทุกตัวอยู่ในช่วง Q-number ที่ระบุไว้ ยกเว้น `Q1A_2`–`Q1A_6` ที่ README ระบุเป็น provisional อยู่แล้ว (PDF มีเพียง `Q1A.1`). SQL ใน `db/seed/index.ts` ใช้ Q-number แบบ `(provisional)` ตามเดิม เพราะ seed ไม่ใช่ statement ของ use case.

**T050 — การตรวจ:**
- `npm run lint`, `npx tsc --noEmit`, `npm run build` (Turbopack) ผ่าน.
- `npm run db:setup` ผ่านโดยไม่ reset ข้อมูล.
- `next start` โดยไม่มี session: `/dashboard` และ `/reports/label/X` ส่ง `NEXT_REDIRECT` ไป `/login` ไม่มีข้อมูล Order ใน HTML (สถานการณ์ 3).
- **ยังไม่ได้ทำ:** การเดินสถานการณ์ 4, 6, 7 (หลาย browser/หลายแท็บ), 9 และ 11 ในเบราว์เซอร์จริง และ alternative flow ผ่าน UI ในตารางด้านบน. สถานการณ์ 7–8 ผ่านแล้วใน integration check ของ Phase 7. ต้องมีคนเดินด้วยมือก่อน merge.

**เสร็จเมื่อ** ทุกสถานการณ์ข้างต้นผ่าน, lint/typecheck/build ผ่าน, และเดิน use case ที่ได้รับผลกระทบด้วยมือ; ไม่มีระบบภายนอกจริงถูกเรียก.
