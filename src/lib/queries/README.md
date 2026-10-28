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

- รูปแบบ Q-number ใหม่ = `Q<UC id>.<ลำดับ>` (เช่น UC 4S → `Q4S.1`, `Q4S.2`) ส่วน use case description ฉบับปัจจุบันยังไม่เป็นไปตามนี้ ทีมกำลังแก้ไข ให้เช็กกับฉบับใหม่ก่อนเขียน SQL
- ชื่อค่าคงที่ = Q-number แทน `.` ด้วย `_` (เช่น `Q4S.1` → `Q4S_1`)
- SQL ต้องตรงกับที่เขียนไว้ใน use case description ถ้าต่างต้องแก้ที่ use case description ก่อน
- ใช้ parameterized query (`$1`, `$2`) เสมอ ห้ามต่อ string เอง

## Mapping UC → Q-number จากเอกสารใน repo

ตารางนี้ถอดเลขที่พิมพ์อยู่ใน PDF ปัจจุบัน (ตรวจ 2026-10-28; ไฟล์ไม่มี revision date) เพื่อ trace กลับไปยังต้นฉบับเท่านั้น. เอกสารยังมีเลขที่ไม่ตรงรูปแบบ `Q<UC id>.<n>`; **ทุกเลขในตารางจึงเป็น provisional และยังไม่อนุญาตให้เพิ่ม/เปลี่ยน SQL ของแอป** จนกว่าทีมจะยืนยัน mapping จากเอกสาร use case ฉบับแก้ไข ตาม constitution.

| UC | Q-number ที่พบใน PDF ปัจจุบัน |
|---|---|
| 1A | `Q1.1` |
| 2A | `Q2A.1`–`Q2A.2` |
| 3A | `Q13.1` |
| 4A | `Q11.1` |
| 5A | `Q5A.1`–`Q5A.4` |
| 6A | `Q7.1`–`Q7.2` |
| 7A | `Q10.1`–`Q10.2` |
| 8A | `Q8.1`–`Q8.3` |
| 9A | `Q6.1`–`Q6.2` |
| 10A | `Q10A.1`–`Q10A.12` |
| 1S | `Q4.1`–`Q4.2` |
| 2S | `Q2S.1`–`Q2S.2` |
| 3S | `Q3.1` |
| 4S | `Q5.1`–`Q5.3` |
| 5S | `Q9.1`–`Q9.2` |
| 6S | `Q6S.1`–`Q6S.3` |
| 7S | `Q7S.1`–`Q7S.5` |
