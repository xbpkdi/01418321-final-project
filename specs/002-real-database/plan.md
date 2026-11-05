# Implementation Plan: ย้ายข้อมูลจาก mock ไปฐานข้อมูลจริง

**Branch**: `002-real-database` (แผนจัดทำบน `docs/002-spec`) | **Date**: 2026-10-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-real-database/spec.md`

## Summary

ย้ายการเก็บข้อมูลและการทำงานของ use case จาก browser store ไปยัง PostgreSQL ฝั่งเซิร์ฟเวอร์ โดยคงหน้าจอและพฤติกรรมตาม use case เดิม กฎธุรกิจยังเป็น pure function ใน `src/lib/workflow.ts`; use case ฝั่งเซิร์ฟเวอร์โหลด state ที่เกี่ยวข้อง เรียกกฎ แล้วบันทึกผลและ automation ใน transaction เดียว ใช้ SQL ดิบผ่าน `pg` และ mock adapter สำหรับระบบภายนอก

## Technical Context

**Language/Version**: TypeScript 5, React 19.2.8, Next.js 16.3.8 (App Router)

**Primary Dependencies**: `pg` ที่มีอยู่แล้ว; Node.js `scrypt` สำหรับรหัสผ่าน; ไม่เพิ่ม ORM

**Storage**: PostgreSQL; แทนข้อมูลธุรกิจใน `src/lib/store.tsx` และ `localStorage`

**Testing**: ไม่มี automated test บังคับ; ใช้ `npm run lint`, `npx tsc --noEmit`, `npm run build` และเดิน use case ด้วยมือ

**Target Platform**: เว็บหลังบ้าน Admin บนเดสก์ท็อป พร้อม PostgreSQL สำหรับพัฒนา

**Project Type**: เว็บแอป Next.js แบบ full-stack ใน repository เดียว

**Performance Goals**: เป้าหมายตาม SC-001 ถึง SC-010; เน้นข้อมูลคงอยู่, transaction ปลอดภัยเมื่อทำพร้อมกัน, และการตั้งค่าฐานข้อมูลใหม่ภายใน 10 นาที

**Constraints**: SQL แบบ parameterized เท่านั้น; ชื่อตาราง/คอลัมน์ตาม ER; ทุกคำสั่งมี UC และ Q-number; session ตรวจบน server ทุกหน้าใน `src/app/(app)/`; ห้ามเชื่อมระบบภายนอกจริง; อ่านคู่มือ Next.js รุ่นที่ติดตั้งก่อนแก้โค้ด Next.js

**Scale/Scope**: Admin บทบาทเดียว, Rakuten Ichiba เท่านั้น, หน้าจอเดิมและ use case 1A–10A / 1S–7S; ไม่เพิ่ม use case หรือ marketplace ใหม่

## Constitution Check

- **ผ่าน** — กฎ use case ยังคงเป็น pure function ใน `src/lib/workflow.ts`; การเขียนทั้งหมดจะผ่าน use case ฝั่ง server และ transaction รวม automation
- **ผ่าน** — ทุกงานและ query จะระบุ UC/alternative flow; Q-number ปัจจุบันยัง provisional ต้องตรวจเอกสาร use case ฉบับแก้ไขก่อนเริ่มเขียน SQL
- **ผ่าน** — ER เป็นแหล่งจริงของชื่อตารางและคอลัมน์; ส่วนที่เพิ่มตาม FR-017 และ session จะถูกระบุในแบบข้อมูลและส่งให้ทีมเอกสารปรับ ER
- **ผ่าน** — ระบบภายนอกใช้ interface และ mock adapter เท่านั้น; UI ใช้ `DESIGN.md` และ i18n เดิม
- **ผ่าน** — schema เปลี่ยนด้วย migration ใหม่; ไม่มีการแก้ migration ที่ merge แล้ว

**ตรวจซ้ำหลังออกแบบ**: ไม่มีการฝ่าฝืน constitution เพิ่มเติม. ตาราง session และตารางประวัติที่เพิ่มถูกทำเครื่องหมายเป็น schema extension; ชื่อ/คอลัมน์ต้องบันทึกไว้ให้ทีมเอกสารปรับ ER. การกำหนด Q-number จริงยังเป็น gate ก่อนเริ่ม SQL.

## Project Structure

### Documentation (this feature)

```text
specs/002-real-database/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
└── contracts/external-adapters.md
```

### Source Code (repository root)

```text
src/
├── app/                         # หน้าจอเดิม; server actions/handlers ตาม use case
├── components/app-shell/         # guard ฝั่ง UI ค่อยถอดเมื่อ server auth ครบ
├── lib/
│   ├── workflow.ts               # pure business rules ที่คงไว้
│   ├── db.ts                     # pool และ transaction helper
│   ├── queries/                  # SQL ที่มี UC/Q-number
│   ├── use-cases/                # โหลด state, ใช้ workflow, persist ใน transaction
│   ├── auth/                     # scrypt, session cookie และ server guard
│   └── adapters/                 # interface และ mock adapters
├── mock/                         # seed และข้อมูลจำลอง; ไม่เป็นแหล่ง runtime หลังย้ายครบ
└── types/

db/
├── migrations/                  # migration เพิ่มใหม่ตามลำดับ
└── seed/                        # seed ทำซ้ำได้และรองรับ reset แบบชัดเจน
```

**Structure Decision**: ใช้แอป Next.js เดียว โดยวาง use case ฝั่ง server ใน `src/lib/use-cases/`; ไม่สร้าง backend แยก ชื่อโฟลเดอร์เป็นข้อเสนอ ให้ยืนยันใน tasks ตามโครงสร้าง repo และคู่มือ Next.js รุ่นปัจจุบัน.

## Complexity Tracking

ไม่มีข้อยกเว้น constitution ที่ต้องให้เหตุผล การเพิ่ม schema นอก ER ทำได้ตาม FR-017; ตาราง session จำเป็นสำหรับ entity Session และการตรวจ login ฝั่ง server.

