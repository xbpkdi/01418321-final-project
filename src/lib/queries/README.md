# SQL Queries

เก็บ SQL ทุกคำสั่งไว้ที่นี่ โดย **ตั้งชื่อตาม Query number ใน `docs/source/use-case-description.pdf`** เช่น

```ts
// src/lib/queries/orders.ts
export const Q2A_2 = `UPDATE orders SET order_status='รอจับคู่กฎ SKU' WHERE order_id=$1`;
```

## ทำไมต้องเขียน SQL ดิบ ไม่ใช้ ORM

รูบริกข้อ 32 บังคับให้แสดงตาราง SQL statement ทั้งหมดในระบบ (Query number, UC id, SQL command)
ถ้าใช้ ORM จะต้องเขียน SQL ซ้ำอีกชุดเพื่อทำรายงาน และมีโอกาสหลุดจากของจริงที่รันในระบบ
เขียนดิบแล้วตั้งชื่อตาม Q-number ทำให้ดึงไปทำรายงานได้ตรงจากโค้ด

## กฎ

- รูปแบบ Q-number = `Q<UC id>.<ลำดับ>` (เช่น UC 4S → `Q4S.1`, `Q4S.2`) use case description ฉบับปัจจุบัน (`docs/source/use-case-description.pdf`, ฉบับแก้ไขที่ทีมยืนยันแล้วเมื่อ 2026-11-02) เป็นไปตามรูปแบบนี้ทุกเลข
- ชื่อค่าคงที่ = Q-number แทน `.` ด้วย `_` (เช่น `Q4S.1` → `Q4S_1`)
- SQL ต้องตรงกับที่เขียนไว้ใน use case description ถ้าต่างต้องแก้ที่ use case description ก่อน
- ใช้ parameterized query (`$1`, `$2`) เสมอ ห้ามต่อ string เอง

## Mapping UC → Q-number จากเอกสารใน repo

ตารางนี้ถอดจาก `docs/source/use-case-description.pdf` ฉบับแก้ไข (ทีมยืนยันเป็นฉบับสุดท้าย 2026-11-02; ไฟล์ไม่มี revision date) และตรวจแล้วว่าทุกเลขอยู่ในหน้าของ UC ที่เป็นเจ้าของ. **Q-number ในตารางนี้ไม่ provisional แล้ว** จึงเพิ่ม SQL ของแอปได้ตามเลขเหล่านี้ (Q-number gate ใน constitution ผ่านแล้ว). เลข `Qxx.n` ที่ซ้ำในหลายขั้นตอน (เช่น `Q2S.2`–`Q2S.3` ที่ปรากฏทั้งใน flow หลักและ alternative flow) ถือเป็น query เดียวกันที่ถูกใช้ซ้ำ.

| UC | Q-number ใน PDF |
|---|---|
| 1A | `Q1A.1` |
| 2A | `Q2A.1`–`Q2A.2` |
| 3A | `Q3A.1` |
| 4A | `Q4A.1` |
| 5A | `Q5A.1`–`Q5A.4` |
| 6A | `Q6A.1`–`Q6A.2` |
| 7A | `Q7A.1`–`Q7A.2` |
| 8A | `Q8A.1` |
| 9A | `Q9A.1`–`Q9A.2` |
| 10A | `Q10A.1`–`Q10A.6` |
| 1S | `Q1S.1` |
| 2S | `Q2S.1`–`Q2S.3` |
| 3S | `Q3S.1` |
| 4S | `Q4S.1`–`Q4S.2` |
| 5S | `Q5S.1`–`Q5S.2` |
| 6S | `Q6S.1`–`Q6S.2` |
| 7S | `Q7S.1`–`Q7S.5` |

## SQL ในโค้ดที่ยังไม่มีใน use case description

`src/lib/queries/admin.ts` และ `sessions.ts` ใช้ `Q1A_2`–`Q1A_6` (นับ fail attempts, บันทึก login สำเร็จ, สร้าง/ตรวจ/ยกเลิก session) แต่ PDF มีเพียง `Q1A.1` สำหรับ UC 1A. ตามกฎ "ถ้า SQL ต่างจาก use case description ให้แก้ description ก่อน" เลขเหล่านี้จึงยัง **provisional** จนกว่าทีมจะเพิ่มลงเอกสาร (หรือยืนยันว่านอกขอบเขตเอกสาร เช่น session ซึ่งเป็น schema extension ตาม `research.md`).

## Phase 3 read model

หน้าธุรกิจอ่านข้อมูลผ่าน `src/lib/queries/app-state.ts` ที่ประกอบ DTO จาก query ตามเจ้าของ use case เดิม โดยไม่สร้าง use case ใหม่:

| ไฟล์ | Q-number / เจ้าของข้อมูล |
|---|---|
| `dashboard.ts` | `Q2A.1` projection สำหรับ totals, 7-day volume และ recent orders |
| `orders.ts` | `Q2A.1`–`Q2A.2` |
| `skus.ts` | `Q3A.1`, `Q6A.2` |
| `stock.ts` | `Q3S.1` |
| `costs.ts` | `Q4S.1`–`Q4S.2` |
| `reorders.ts` | `Q5A.1`, `Q6A.1` |
| `shipping.ts` | `Q9A.1` |
| `cleanup.ts` | `Q10A.6` |

ชื่อ constant ที่มี suffix เช่น `Q2A_1_DASHBOARD_TOTALS` คือ projection หลายชุดของ query เจ้าของเดียวกัน ไม่ใช่ Q-number ใหม่.

## เปลี่ยนจากฉบับก่อน (2026-10-28)

เลขที่เปลี่ยน: 1S `Q4.1`–`Q4.2` → `Q1S.1`; 3A `Q13.1` → `Q3A.1`; 4A `Q11.1` → `Q4A.1`; 6A `Q7.1`–`Q7.2` → `Q6A.1`–`Q6A.2`; 7A `Q10.1`–`Q10.2` → `Q7A.1`–`Q7A.2`; 8A `Q8.1`–`Q8.3` → `Q8A.1`; 9A `Q6.1`–`Q6.2` → `Q9A.1`–`Q9A.2`; 10A `Q10A.1`–`Q10A.12` → `Q10A.1`–`Q10A.6`; 2S เพิ่ม `Q2S.3`; 3S `Q3.1` → `Q3S.1`; 4S `Q5.1`–`Q5.3` → `Q4S.1`–`Q4S.2`; 5S `Q9.1`–`Q9.2` → `Q5S.1`–`Q5S.2`; 6S `Q6S.1`–`Q6S.3` → `Q6S.1`–`Q6S.2`. ที่เหลือไม่เปลี่ยน.
