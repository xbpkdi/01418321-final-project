# Implementation Plan: จัดลำดับสถานะ Order ให้ตรงตามที่ทีมอนุมัติ

**Branch**: `001-order-status-alignment` (ทำบน `docs/sdd-setup` ยังไม่ได้แยก branch) | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-order-status-alignment/spec.md`

## Summary

7S ตัดสต๊อกแล้วต้องคงสถานะ "แจ้งเลขติดตามแล้ว" และ "จัดส่งสำเร็จ" ต้องมาจากการที่ขนส่งยืนยันส่งถึงลูกค้า (8A) เท่านั้น
แนวทาง: แก้เฉพาะกฎ 7S ใน `runAutomation` ให้ตัดสต๊อกโดยไม่เปลี่ยนสถานะ แล้วเพิ่มกฎ "เลื่อนเป็นจัดส่งสำเร็จ"
ในที่เดียวกัน (เงื่อนไข: สถานะ "แจ้งเลขติดตามแล้ว" + ตัดสต๊อกแล้ว + ขนส่งยืนยัน `delivered`) ซึ่งทำให้กรณีขนส่งยืนยันก่อน 5S/7S เสร็จ
ถูกจัดการเองโดยไม่ต้องมีสถานะพิเศษเพิ่ม `pollCarrier` บันทึก `delivery_status` อยู่แล้ว เพิ่มเพียงกฎกันไม่ให้ `delivered` ย้อนกลับเป็น `in_transit`
(พบจากการวิเคราะห์: เลขติดตามที่ไม่มีใน mock ขนส่งจะถูกตอบเป็น `in_transit` เสมอ จึงเขียนทับ Order ที่ส่งถึงแล้ว)
นอกนั้นแก้หน้าจัดส่ง (ปุ่มส่งซ้ำและการแสดงผล), ข้อมูลตั้งต้นและ mock ขนส่ง ให้เดินครบทุกเส้นทางหลังรีเซ็ต
7A, 10A และ 3S ไม่ต้องแก้โค้ด เพราะอ้างสถานะตามที่ต้องการอยู่แล้ว แต่ต้องมีขั้นตอนตรวจยืนยันใน quickstart

## Technical Context

**Language/Version**: TypeScript 5, React 19.2.8, Next.js 16.3.8 (App Router)

**Primary Dependencies**: ไม่เพิ่ม dependency ใหม่ (ใช้ shadcn/ui, TanStack Table, sonner ที่มีอยู่)

**Storage**: `localStorage` ผ่าน `src/lib/store.tsx` (ยังไม่ต่อฐานข้อมูล)

**Testing**: ไม่บังคับ ตรวจด้วย `npm run lint`, `npx tsc --noEmit`, `npm run build` และเดิน quickstart ด้วยมือตามนโยบายของ constitution

**Target Platform**: เบราว์เซอร์บนเดสก์ท็อป (ระบบหลังบ้านของ Admin)

**Project Type**: web application ฝั่งหน้าบ้านอย่างเดียว (ไม่มี backend)

**Performance Goals**: `runAutomation` วนไม่เกิน 6 รอบ (guard เดิม) ต้องพอสำหรับลำดับ ตัดสต๊อก → เลื่อนสถานะ (2 รอบ)

**Constraints**: ฟังก์ชัน use case ต้องเป็น pure function; สถานะต้องอยู่ใน 22 ค่าของ `src/lib/order-status.ts`; ข้อความทั้งหมดผ่าน i18n dictionary; เฉพาะ Rakuten

**Scale/Scope**: ข้อมูลตั้งต้นประมาณ 30 Order; แก้ไฟล์โค้ด 6 ไฟล์ (ดู Project Structure)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| ข้อกำหนด | ผล | หมายเหตุ |
|---|---|---|
| I. Pure Workflow, Single Store | ผ่าน | กฎใหม่อยู่ใน `runAutomation` เป็น pure function; หน้าจอยังเรียกผ่าน `run()` ไม่มี business rule ในหน้าจอ |
| II. Use Case Identity and Traceability | ผ่าน | ทุกการแก้อ้าง UC 7S, 8A, 5S, 7A, 10A, 3S และทางเลือกที่เกี่ยวข้อง; ไม่เพิ่มหน้าจอหรือปุ่มใหม่ |
| III. UC Document Is Source of Truth | ผ่าน มีข้อยกเว้นที่ทีมอนุมัติ | PDF ฉบับปัจจุบันให้ Q7S.5 ตั้ง "จัดส่งสำเร็จ" ซึ่งขัดกับข้อกำหนด Order status vocabulary ใน constitution ที่ทีมอนุมัติแล้ว ทีมจะแก้เอกสาร จึงยึดข้อกำหนดใน constitution |
| IV. Design System Authority | ผ่าน | ไม่เพิ่มสีใหม่; ข้อความใหม่ทั้งหมดอยู่ใน dictionary (ไทยและอังกฤษ); สถานะแสดงผ่าน `StatusBadge` |
| Rakuten only | ผ่าน | ไม่แตะช่องทางอื่น |
| SQL / Q-number | ไม่เกี่ยวข้อง | ไม่แตะ `src/lib/queries/` และไม่เพิ่ม SQL; คอมเมนต์ `// Q7S.5` ในโค้ดยังเป็นของชั่วคราว |
| Order status vocabulary | ผ่าน | ไม่เพิ่ม/เปลี่ยนค่าสถานะ |
| Testing policy | ผ่าน | ใช้ lint, type check, build และ quickstart |
| Spec-kit artifacts เป็นภาษาไทย | ผ่าน | |
| Next.js docs first | ผ่าน | ไม่มีโค้ดเฉพาะของ Next.js (แก้ TypeScript ล้วนและ cell ของตาราง) |
| Alternative-flow coverage | ผ่าน | ไม่เพิ่ม fault key; เพิ่มข้อมูลตั้งต้นให้ครบเส้นทาง "ส่งถึง" |
| การเปลี่ยนรูปร่าง `AppState` | ไม่เข้าเงื่อนไข | รูปร่างไม่เปลี่ยน แต่ตัดสินใจ bump `version` และ storage key เพื่อล้างข้อมูลเก่าที่ขัดกับกฎใหม่ (ดู research.md ข้อ 5) |

**หลังออกแบบ Phase 1**: ตรวจซ้ำแล้ว ผลเหมือนเดิม ไม่มีข้อที่ต้องบันทึกใน Complexity Tracking

## Project Structure

### Documentation (this feature)

```text
specs/001-order-status-alignment/
├── plan.md              # ไฟล์นี้
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/
│   └── order-status-flow.md   # Phase 1
├── checklists/
│   └── requirements.md
└── tasks.md             # Phase 2 (/speckit-tasks)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── workflow.ts            # แก้: กฎ 7S + กฎเลื่อนเป็น "จัดส่งสำเร็จ" ใน runAutomation, กัน delivered ถอยกลับใน pollCarrier, ปรับหมายเหตุหัวไฟล์, เพิ่ม version
│   ├── store.tsx              # แก้: storage key v2 และเช็ค version 2
│   └── i18n/dict.ts           # แก้: ข้อความ "ตัดสต๊อกแล้ว" (ไทย+อังกฤษ) สำหรับหน้าจัดส่ง
├── mock/
│   ├── orders.ts              # แก้: ORD-24172 เป็น "แจ้งเลขติดตามแล้ว"; เพิ่ม ORD-24166 และ ORD-24165; ปรับหมายเหตุหัวไฟล์
│   └── delivery.ts            # แก้: เพิ่มเลขติดตามที่ขนส่งตอบ "delivered" (ของ ORD-24165, ORD-24166 และของ Order ที่ปิดแล้ว ORD-23012, ORD-24168)
└── app/(app)/shipping/
    └── columns.tsx            # แก้: ปุ่มส่งเลขติดตามซ้ำเมื่อ "แจ้งเลขติดตามแล้ว"; แสดง "ตัดสต๊อกแล้ว"
```

ไม่แก้: `src/lib/order-status.ts` (22 ค่าเดิม), `src/app/(app)/orders/cancel/*` (7A), `src/app/(app)/system/cleanup/*` (10A),
`src/app/(app)/dev/page.tsx` (ไม่ต้องเพิ่ม toggle เพราะเส้นทางส่งถึงครอบคลุมด้วยข้อมูลตั้งต้นและปุ่มรีเซ็ตเดิม)

**Structure Decision**: โปรเจกต์ Next.js ชุดเดียว แก้ตามชั้นที่มีอยู่ (workflow → store → mock → หน้าจอ) ไม่สร้างโฟลเดอร์ใหม่ใน `src/`

## Complexity Tracking

ไม่มีข้อที่ละเมิด constitution จึงไม่ต้องบันทึก
