# SQL Queries

เก็บ SQL ทุกคำสั่งไว้ที่นี่ โดย **ตั้งชื่อตาม Query number ใน `report-doc/content/usecases.json` (repo 321-sa-proj)** เช่น

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
