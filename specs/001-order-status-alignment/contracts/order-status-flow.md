# Contract: การเปลี่ยนสถานะ Order ช่วงส่งมอบถึงส่งถึง

ระบบนี้ไม่มี API ภายนอก สัญญาที่ต้องรักษามี 2 ส่วน: พฤติกรรมของฟังก์ชันใน `src/lib/workflow.ts` ที่หน้าจอเรียก
และสิ่งที่หน้าจัดส่งต้องแสดง ค่าสถานะอ้างอิงจาก `src/lib/order-status.ts` (22 ค่า)

## 1. `runAutomation(state)` กฎ 7S และกฎเลื่อนสถานะ

อินพุต: `AppState` ใดๆ ผลลัพธ์: `{ state, events }` เป็น pure function วนไม่เกิน 6 รอบจนไม่มีอะไรเปลี่ยน

| เงื่อนไขของ Order | ผล |
|---|---|
| สถานะ "แจ้งเลขติดตามแล้ว", `stock_deducted` ไม่จริง, ยอดแหล่งจัดส่งพอ | หักสต๊อกตาม `fulfill_source`; ตั้ง `stock_deducted = true`, `mp_stock_synced = !faults.mpStockSync`; **สถานะไม่เปลี่ยน**; event `stock-deducted` หรือ `stock-sync` |
| สถานะ "แจ้งเลขติดตามแล้ว", `stock_deducted` ไม่จริง, ยอดไม่พอหรือไม่มีแถวสต๊อก | ไม่ตัดสต๊อก; สถานะ "รอดำเนินการด้วยตนเอง" (`manual_reason = stock-deduct`); event `stock-insufficient` |
| สถานะ "แจ้งเลขติดตามแล้ว", `stock_deducted` จริง | ไม่ตัดซ้ำ ไม่มี event |
| สถานะ "แจ้งเลขติดตามแล้ว", `stock_deducted` จริง, `delivery_status = delivered` | เลื่อนเป็น "จัดส่งสำเร็จ" |
| `stock_deducted` จริง, `mp_stock_synced = false`, ไม่มี fault `mpStockSync` | ตั้ง `mp_stock_synced = true` (ทำงานได้ทุกสถานะ รวมถึง "แจ้งเลขติดตามแล้ว") |

ข้อห้าม: ไม่มีกฎอื่นใน `runAutomation` หรือใน use case ใดตั้ง "จัดส่งสำเร็จ"

## 2. `pollCarrier(state)` (8A, Q8.3)

พฤติกรรมไม่เปลี่ยน ยกเว้นข้อมูลที่ตอบกลับ ผลต่อ Order ที่เฝ้าดู (อยู่ระหว่างจัดส่ง, รอแจ้งเลขติดตาม, แจ้งเลขติดตามแล้ว, จัดส่งสำเร็จ, รอดำเนินการพิเศษ):

| ขนส่งตอบ | ผล |
|---|---|
| `in_transit` / `delivered` (ค่าต่างจากที่เก็บ) | อัปเดต `delivery_status` อย่างเดียว ไม่เปลี่ยน `order_status` (การเลื่อนสถานะทำโดย `runAutomation` หลังจากนั้น) |
| `in_transit` ขณะที่ที่เก็บไว้เป็น `delivered` | ไม่เปลี่ยนอะไร (`delivered` ย้อนกลับไม่ได้, FR-015) |
| `failed` | "จัดส่งไม่สำเร็จ" |
| `returned` | "ตีกลับ/คืนสินค้า"; ถ้า `stock_deducted` ให้คืนสต๊อกและตั้ง `stock_deducted = false` |
| เชื่อมต่อไม่ได้ (`faults.carrier`) | ไม่แก้อะไร คืน event `connection` |

การเรียกซ้ำเมื่อขนส่งตอบค่าเดิมต้องไม่เปลี่ยนอะไร (ไม่ตัดหรือคืนสต๊อกซ้ำ)

## 3. `notifyTracking`, `checkCancel`, `cancelOrder`, `planClosedCleanup`

ไม่เปลี่ยนพฤติกรรม สัญญาที่ต้องยังเป็นจริง:

- `notifyTracking` กับ Order "แจ้งเลขติดตามแล้ว" ที่แจ้งแล้ว: ต้องยืนยันก่อนส่งซ้ำ แล้วบันทึก `notify_log` โดยสถานะไม่เปลี่ยน
- `checkCancel` กับ "แจ้งเลขติดตามแล้ว": `in-transit` → `cancelOrder` ตั้ง "รอดำเนินการพิเศษ" ไม่คืนสต๊อก; กับ "จัดส่งสำเร็จ": `closed`; กับ "ยกเลิกแล้ว": `already`
- `planClosedCleanup` / `planRangeCleanup`: นับเฉพาะ "จัดส่งสำเร็จ" และ "ยกเลิกแล้ว"

## 4. หน้าจัดส่ง (`/shipping`) ตาราง "ส่งมอบแล้ว"

- คอลัมน์สถานะ: `StatusBadge` ของ `order_status`; ถ้า `stock_deducted` จริง แสดงข้อความสีเทาขนาดเล็ก "ตัดสต๊อกแล้ว" ใต้ป้าย; ป้าย "รอซิงค์" เดิมคงไว้เมื่อ `stock_deducted` จริงและ `mp_stock_synced = false`
- คอลัมน์สถานะจากขนส่ง: แสดง `delivery_status` เดิม
- ปุ่ม "ส่งเลขติดตามให้ลูกค้า": แสดงเมื่อสถานะเป็น "อยู่ระหว่างจัดส่ง", "รอแจ้งเลขติดตาม", **"แจ้งเลขติดตามแล้ว"** หรือ "จัดส่งสำเร็จ"
- ข้อความใหม่ทั้งไทยและอังกฤษอยู่ใน `src/lib/i18n/dict.ts` เท่านั้น (key ใหม่: `shipping.stockDeducted`)
