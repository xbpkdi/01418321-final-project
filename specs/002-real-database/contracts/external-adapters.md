# สัญญา interface สำหรับระบบภายนอก

สัญญานี้กำหนดเฉพาะสิ่งที่ use case ต้องใช้ โดยไม่ผูกกับ API หรือ SDK ของผู้ให้บริการรายใด Feature 002 ใช้ mock adapter เท่านั้น; การเลือก adapter ทำผ่านค่าตั้งระบบ. ชื่อและผลลัพธ์ด้านล่างอิง use case ID และ fault keys ที่ใช้อยู่ใน `src/lib/workflow.ts`.

## รูปแบบผลลัพธ์ร่วม

ทุก operation คืนผลแบบใดแบบหนึ่ง:

- **สำเร็จ**: ข้อมูลที่ปรับเป็นรูปแบบกลางของแอปแล้ว.
- **ล้มเหลว**: `unavailable`, `rejected` หรือ `invalid_response` พร้อม `retryable` และรหัสอ้างอิงสำหรับ log ที่ปลอดภัย.

Adapter แปลง timeout, network error และรูปแบบตอบกลับจากผู้ให้บริการให้เป็นผลชุดนี้; ห้ามส่ง secret หรือข้อความ exception ภายในให้หน้าจอ. Use case ใช้ผลลัพธ์เพื่อเลือกทางเลือก/ข้อความตามเอกสาร UC. Adapter ไม่อ่านหรือเขียนฐานข้อมูล.

การตั้งค่าใช้ `RAKUTEN_ADAPTER`, `RSL_ADAPTER`, `LABEL_SERVICE_ADAPTER`, `PRINTER_ADAPTER`, `CARRIER_ADAPTER` และ `SUPPLIER_ADAPTER`; ค่าเริ่มต้น/ค่าที่รองรับใน feature นี้คือ `mock` เท่านั้น. หากตั้งค่าเป็นโหมดที่ยังไม่รองรับ ให้หยุดด้วย error ปลอดภัยและห้าม fallback ไปเชื่อมระบบจริง.

## Rakuten RMS adapter

| Operation | Use case | สัญญา |
|---|---|---|
| `fetchOrders()` | 4A; รวมคำขอยกเลิกใหม่ที่เข้ามาพร้อมรอบนำเข้า (4A ทางเลือก #3 → 7A ทางเลือก #3) | คืน Order ใหม่และคำขอยกเลิกในรูปแบบกลาง. เรียกซ้ำได้; use case ข้าม `marketplace_order_id` ที่นำเข้าแล้ว. ความล้มเหลวใช้ผลทางเลือกของ 4A. |
| `fetchOrderState(marketplaceOrderId)` | 2A | คืนข้อมูลล่าสุดที่ต้องใช้ตรวจ Order. เมื่ออ่านไม่ได้ คงข้อมูลเดิมและใช้ทางเลือก 2A. เรียกซ้ำได้. |
| `notifyTracking(orderRef, trackingNumber, attemptId)` | 5S ทางเลือก #1; แจ้งเลขติดตามและบันทึกประวัติการแจ้งซ้ำ | PDF ระบุให้ส่ง “ผ่าน Marketplace” โดยอ่าน `sales_channel` ของ Order; feature นี้รองรับ Rakuten Ichiba เท่านั้น จึงเป็น operation ของ Rakuten RMS adapter (ไม่ใช่ RSL หรือ carrier). คืนผลว่าแจ้งสำเร็จหรือไม่. retry ของความพยายามเดิมใช้ `attemptId` เดิม; การสั่งแจ้งซ้ำโดย Admin เป็นความพยายามใหม่และใช้ id ใหม่ เพื่อให้เก็บประวัติได้โดยไม่ส่งซ้ำจาก retry. ผู้รับ/ปลายทางต้องตรงกับ UC 5S. |
| `syncStock(channelSku, availableQuantity)` | 7S ทางเลือก #1; sync ไม่สำเร็จแล้วลองใหม่ในรอบถัดไป | กำหนดยอดคงเหลือปลายทางเป็นจำนวนสัมบูรณ์ ไม่ส่ง delta เพื่อให้ retry ปลอดภัย. เมื่อสำเร็จ use case บันทึกว่า sync แล้ว; เมื่อล้มเหลวคงการตัด stock ภายในและตั้งสถานะรอ sync. retry ต้องส่งยอดล่าสุดที่ต้องการ ไม่ส่งยอดเก่าทับยอดใหม่. |

ไม่มี operation ทั่วไปอย่าง `updateOrderStatus()` ในขอบเขตปัจจุบัน: 7A บันทึกการยกเลิกในระบบ และข้อมูลการยกเลิกจากลูกค้าถูกดึงเข้ามาพร้อม 4A. เพิ่มการ push สถานะ Order ไป Rakuten ได้เมื่อมีขั้นตอนนั้นในเอกสาร UC.

## RSL adapter

| Operation | Use case | สัญญา |
|---|---|---|
| `matchOrder(order)` | 1S ทางเลือก #4 | คืนผลจับคู่กับรายการ/รหัสอ้างอิง RSL ในรูปแบบกลาง; เมื่อระบบใช้ไม่ได้ ให้ use case แสดงผลทางเลือก 1S โดยไม่บันทึกผลจับคู่บางส่วน. |
| `getStock(sku)` | 3S ทางเลือก #1 และ #3 | คืนยอด RSL; เมื่ออ่านไม่ได้ use case ใช้ทางเลือกตาม UC และไม่แสร้งว่ายอดที่อ่านไม่สำเร็จเป็นศูนย์. อ่านซ้ำได้. |

## Label service

| Operation | Use case | สัญญา |
|---|---|---|
| `generateLabels(order, parcelRules)` | 6S | คืนรายการใบปะ/เลขลำดับพัสดุในรูปแบบกลาง. การสร้างล้มเหลวคืน `unavailable`; System Auto เก็บข้อผิดพลาดและลองใหม่ตามพฤติกรรม 6S. การ retry ของ Order เดิมต้องไม่สร้างใบปะซ้ำ. |

## Printer

| Operation | Use case | สัญญา |
|---|---|---|
| `printLabel(label, printAttemptId)` | 9A ทางเลือก #2; ทางเลือก #3 บันทึกประวัติพิมพ์ซ้ำ | คืนผลพิมพ์; เมื่อเครื่องพิมพ์ไม่พร้อมคง Order ไว้ที่รอพิมพ์. การพิมพ์ซ้ำที่ Admin ยืนยันเป็น attempt ใหม่และเก็บประวัติ ไม่ถูก dedupe ทิ้ง. |

## Carrier adapter

| Operation | Use case | สัญญา |
|---|---|---|
| `getDeliveryStatus(trackingNumber)` | 8A ทางเลือก #4 และการดึงสถานะ | คืนสถานะมาตรฐาน `in_transit`, `delivered`, `failed` หรือ `returned`. เมื่ออ่านไม่ได้คงสถานะล่าสุดและแจ้งผลตาม UC; ผลจาก carrier เป็นข้อมูลที่ use case ใช้ตัดสินใจ ไม่เปลี่ยน Order โดย adapter เอง. |

## Supplier adapter

| Operation | Use case | สัญญา |
|---|---|---|
| `sendPurchaseOrder(reorder, requestId)` | 6A ทางเลือก #3 | คืนผล `accepted` พร้อมข้อมูลอ้างอิง หรือความล้มเหลว. การส่งไม่สำเร็จคงสถานะรอส่งตาม UC; retry ใช้ `requestId` เดิมเพื่อป้องกันสร้างคำสั่งซื้อซ้ำ. |

## กติกาสำหรับ mock และการเปลี่ยน adapter

- Adapter ทุกตัวต้องมี mock ที่ทำตามสัญญาเดียวกัน; `/dev` fault toggle ต้องจำลอง failure ที่ระบุในตาราง (4A, 2A, 1S, 3S, 6S, 9A, 8A, 5S, 7S, 6A).
- Use case เรียก interface เท่านั้น; การสลับ adapter ต้องไม่แก้ use case หรือหน้าจอ (SC-008).
- Adapter คืนข้อมูล/result code เท่านั้น; ข้อความ UI map มาจาก `src/lib/i18n/`.
- Operation ที่ส่งผลภายนอกไม่ใช่ database transaction. Use case เป็นเจ้าของ state transition และบันทึกผลสำเร็จ/รอซ้ำตาม flow; feature นี้ไม่เปิดใช้ adapter จริง.
