# สัญญา interface สำหรับระบบภายนอก

ทุก interface ถูกเรียกจาก use case ฝั่ง server เท่านั้น Use case ไม่เลือกหรือเรียก client จริงโดยตรง; ส่วนประกอบระบบเลือก mock adapter ผ่านค่าตั้ง Feature 002 ไม่มีการเชื่อมต่อ network ไปยังระบบจริง

## แหล่ง Order ของ Rakuten

- `fetchOrders(cursor?)` คืน Order ใหม่ พร้อมเลขอ้างอิงจากช่องทางขาย วันที่ ที่อยู่/วิธีจัดส่ง และรายการสินค้า SKU/variation/quantity.
- การนำเข้าซ้ำด้วย `marketplace_order_id` ข้ามเฉพาะรายการซ้ำ; ความผิดพลาดคืน result code ตาม use case และไม่บันทึกข้อมูลบางส่วน.
- จำลองความผิดพลาดด้วย toggle ใน `/dev`; ห้ามบันทึก secret หรือข้อมูลเกินจำเป็นใน log.

## RSL fulfillment

- `matchOrder(order)` คืนผลจับคู่ต่อรายการและ RSL number ตามทางเลือกของ use case.
- `getStock(skus)` คืนยอดคงเหลือ RSL สำหรับ use case ที่อ่าน stock.

## ขนส่ง

- `createLabel(order, parcel)` คืนข้อมูลใบปะตาม template ปัจจุบัน.
- `notifyTracking(order, tracking)` คืนผลการแจ้ง; use case และ tracking notification log เป็นผู้ควบคุมการแจ้งซ้ำ.
- `getDeliveryStatus(tracking)` คืนสถานะจากขนส่ง; เฉพาะ UC 8A ที่ยืนยันการส่งถึงเท่านั้นจึงเปลี่ยน Order เป็น `จัดส่งสำเร็จ`.

## การส่งคำสั่งซื้อให้ Supplier

- `sendPurchaseOrder(reorder, supplier)` คืนผลส่งและเลขอ้างอิง; ความผิดพลาดแปลงเป็นทางเลือกที่กำหนดใน use case โดยไม่ทำให้ transaction ฐานข้อมูลค้างครึ่งทาง.
- การปฏิเสธหรือ timeout ต้องคืนผล UC ที่กำหนด; การลองซ้ำต้องไม่สร้างคำสั่งซื้อซ้ำ.

## กติกาทั่วไป

- ผล adapter เป็นข้อมูลหรือ result code ที่ผ่านการปรับรูปแบบแล้ว; ไม่มี DB handle และ adapter ไม่เขียนฐานข้อมูล.
- แต่ละ adapter มีการตั้งค่า fault แยกกัน; toggle `/dev` ต้องส่งผลกับ mock adapter ที่เกี่ยวข้อง.
- ข้อความที่ผู้ใช้เห็นมาจาก result code ของ use case และพจนานุกรมใน `src/lib/i18n/`; adapter ไม่กำหนดข้อความ UI.
