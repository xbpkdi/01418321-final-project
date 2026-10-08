import type { OrderStatus } from "@/lib/order-status";

export type Lang = "th" | "en";

/**
 * ค่าฝั่ง th ทุกตัวลอกมาจาก 00-use-case-descriptions.md ตรงตัวอักษรต่อตัวอักษร
 * ห้ามเรียบเรียงใหม่ ถ้าต้องเปลี่ยนให้ไปแก้ที่ use case description ก่อน
 *
 * ค่าสถานะใน statusLabel ใช้ค่าภาษาไทยเป็น key เพราะใน order-status.ts
 * ค่านั้นเป็นข้อมูลจริงที่ใช้เทียบเงื่อนไข ไม่ใช่แค่ข้อความแสดงผล
 */
const th = {
  app: {
    name: "RSL Fulfillment Hub",
    company: "Colorado Co., Ltd.",
    toggleMenu: "สลับการแสดงเมนู",
    switchLanguage: "สลับภาษา",
    langLabel: "ไทย",
    admin: "Admin",
    logout: "ออกจากระบบ",
    logoutConfirm: "ต้องการออกจากระบบหรือไม่",
    logoutDone: "ออกจากระบบแล้ว",
  },

  nav: {
    groups: {
      main: "หน้าหลัก",
      orders: "คำสั่งซื้อ",
      products: "สินค้าและสต๊อก",
      shipping: "จัดส่ง",
      system: "ระบบ",
    },
    items: {
      dashboard: "ภาพรวมระบบ",
      verify: "ตรวจสอบคำสั่งซื้อ",
      rslMatch: "จับคู่ Order กับ RSL",
      cancel: "ยกเลิก Order",
      products: "ตั้งกฎ SKU / ข้อมูลสินค้า",
      stock: "ตรวจสอบสต๊อก",
      cost: "คำนวณต้นทุน",
      reorder: "ตัดสินใจสั่งซื้อเพิ่ม",
      shipping: "จัดส่งสินค้าให้ลูกค้า",
      label: "พิมพ์ใบปะสินค้า",
      cleanup: "ลบข้อมูลเก่า",
      sitemap: "ผังโครงสร้างหน้าจอ",
    },
  },

  common: {
    cancel: "ยกเลิก",
    save: "บันทึก",
    confirm: "ยืนยัน",
    status: "สถานะ",
    product: "สินค้า",
    qty: "จำนวน",
    salesChannel: "ช่องทางขาย",
    shippingMethod: "วิธีจัดส่ง",
    shippingAddress: "ที่อยู่จัดส่ง",
    supplier: "ซัพพลายเออร์",
    sellingPrice: "ราคาขาย",
    reorderThreshold: "เกณฑ์เติม",
    reorderQty: "จำนวนที่สั่ง",
    unitPieces: "ชิ้น",
    items: "รายการ",
    notFound: "ไม่พบข้อมูล",
  },

  table: {
    columns: "คอลัมน์",
    rowsPerPage: "แถวต่อหน้า",
    totalRows: (n: number) => `ทั้งหมด ${n} รายการ`,
    pageOf: (current: number, total: number) => `หน้า ${current} จาก ${total}`,
    firstPage: "ไปหน้าแรก",
    prevPage: "หน้าก่อนหน้า",
    nextPage: "หน้าถัดไป",
    lastPage: "ไปหน้าสุดท้าย",
  },

  statusLabel: {
    รอตรวจสอบคำสั่งซื้อ: "รอตรวจสอบคำสั่งซื้อ",
    "รอจับคู่กฎ SKU": "รอจับคู่กฎ SKU",
    รอตรวจสอบสต๊อก: "รอตรวจสอบสต๊อก",
    "รอ Admin ตัดสินใจสั่งซื้อ": "รอ Admin ตัดสินใจสั่งซื้อ",
    "รอสั่งซื้อจาก Supplier": "รอสั่งซื้อจาก Supplier",
    สั่งซื้อแล้ว: "สั่งซื้อแล้ว",
    รอจัดรูปแบบใบปะสินค้า: "รอจัดรูปแบบใบปะสินค้า",
    รอพิมพ์ใบปะสินค้า: "รอพิมพ์ใบปะสินค้า",
    พิมพ์ใบปะสินค้าแล้ว: "พิมพ์ใบปะสินค้าแล้ว",
    รอส่งคำสั่งซื้อ: "รอส่งคำสั่งซื้อ",
    รอส่งมอบ: "รอส่งมอบ",
    อยู่ระหว่างจัดส่ง: "อยู่ระหว่างจัดส่ง",
    จัดส่งสำเร็จ: "จัดส่งสำเร็จ",
    "รอยกเลิก Order": "รอยกเลิก Order",
    ยกเลิกแล้ว: "ยกเลิกแล้ว",
    รอดำเนินการด้วยตนเอง: "รอดำเนินการด้วยตนเอง",
    รอดำเนินการพิเศษ: "รอดำเนินการพิเศษ",
  } as Record<OrderStatus, string>,

  login: {
    title: "เข้าสู่ระบบ",
    description: "ใช้บัญชีผู้ดูแลที่ลงทะเบียนไว้กับระบบ",
    email: "อีเมล",
    password: "รหัสผ่าน",
    submit: "เข้าสู่ระบบ",
    footer: "Colorado Co., Ltd. · ระบบภายในสำหรับผู้ดูแลเท่านั้น",
    errIncomplete: "ข้อมูลที่กรอกมาไม่ครบ",
    errEmailFormat: "รูปแบบของอีเมลที่กรอกมาไม่ถูกต้อง",
    errTooManyAttempts:
      "คุณพยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่ก่อนลองใหม่อีกครั้ง",
    errWrongCredentials: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
    okLogin: "เข้าสู่ระบบสำเร็จ",
  },

  dashboard: {
    title: "ภาพรวมระบบ",
    description: "สรุปงานที่ค้างอยู่และสถานะการเชื่อมต่อช่องทางขาย",
    importOrders: "นำเข้า Order",
    connectionFailed: (channels: string) =>
      `ไม่สามารถเชื่อมต่อกับ ${channels} ได้ กรุณาตรวจสอบการตั้งค่า`,
    viewList: "ดูรายการ",
    recentOrders: "Order ล่าสุด",
    recentOrdersHint: "รายการที่เพิ่งเข้าระบบและสถานะปัจจุบัน",
    viewAll: "ดูทั้งหมด",
    connections: "การเชื่อมต่อช่องทางขาย",
    lastSync: (time: string) => `ซิงก์ล่าสุด ${time}`,
    connected: "เชื่อมต่อแล้ว",
    disconnected: "เชื่อมต่อไม่ได้",
    lowStock: "สต๊อกต่ำกว่าเกณฑ์",
    lowStockHint: "SKU ที่ยอดรวมคลังบริษัทกับ RSL ถึงเกณฑ์เติมแล้ว",
    noLowStock: "ไม่มี SKU ที่ต่ำกว่าเกณฑ์",
    viewAllStock: "ดูสต๊อกทั้งหมด",
    weeklyVolume: "Order ที่นำเข้า 7 วันล่าสุด",
    chartSeries: "จำนวน Order",
  },

  verify: {
    title: "ตรวจสอบคำสั่งซื้อ",
    description: "ตรวจทานรายละเอียด Order ก่อนส่งเข้าสู่ขั้นตอนจับคู่กฎ SKU",
    searchLabel: "ค้นหา Order",
    searchPlaceholder: "ค้นหาด้วย Order ID, SKU หรือช่องทางขาย",
    emptySearchTitle: "ไม่พบ Order ที่ตรงกับคำค้นหา",
    emptySearchHint: "ลองค้นด้วย Order ID, SKU หรือชื่อช่องทางขายอีกครั้ง",
    emptyTitle: "ไม่มี Order ที่รอตรวจสอบ",
    emptyHint:
      "Order ใหม่จะเข้ามาที่นี่หลังกดนำเข้า Order จากหน้าภาพรวมระบบ",
    detailTitle: "รายละเอียดคำสั่งซื้อ",
    noSelectionTitle: "ยังไม่ได้เลือก Order",
    noSelectionHint:
      "เลือกรายการจากตารางด้านซ้ายเพื่อตรวจทานรายละเอียดก่อนยืนยัน",
    marketplaceOrderId: "เลขคำสั่งซื้อจากช่องทางขาย",
    editNote: "ระบบบันทึกผู้แก้ไขและเวลาที่แก้ไขไว้ทุกครั้ง",
    submit: "ยืนยันคำสั่งซื้อ",
    errIncomplete: "ข้อมูลคำสั่งซื้อไม่ครบถ้วน กรุณาตรวจสอบ",
    errQty: "จำนวนสินค้าต้องมากกว่า 0",
    errAlreadyVerified: "Order นี้ผ่านการตรวจสอบไปแล้ว",
    okVerified: "ยืนยันคำสั่งซื้อสำเร็จ",
  },

  rslMatch: {
    searchLabel: "ค้นหา Order",
    searchPlaceholder: "ค้นหาด้วย Order ID หรือ SKU",
    emptySearchTitle: "ไม่พบ Order ที่ตรงกับคำค้นหา",
    emptySearchHint: "ลองค้นด้วย Order ID หรือ SKU อีกครั้ง",
    title: "จับคู่ Order กับ RSL",
    description:
      "เทียบ SKU และ Variation ของ Order กับข้อมูลในคลัง RSL ก่อนจัดรูปแบบใบปะสินค้า",
    matchAll: "จับคู่อัตโนมัติทั้งหมด",
    match: "จับคู่กับ RSL",
    unmatch: "ยกเลิกการจับคู่",
    rslReference: "หมายเลขอ้างอิง RSL",
    queueTitle: "รอจับคู่",
    matchedTitle: "จับคู่แล้ว",
    emptyTitle: "จับคู่ครบทุก Order แล้ว",
    emptyHint:
      "Order ที่ผ่านการตรวจสอบและจับคู่กฎ SKU แล้วจะเข้ามารอที่นี่",
    chooseFor: (orderId: string, sku: string) =>
      `เลือกรายการ RSL สำหรับ ${orderId} · ${sku}`,
    stockLeft: "คงเหลือในคลัง RSL",
    chooseThis: "เลือกรายการนี้",
    errNotFound: "ไม่พบสินค้านี้ในระบบ RSL",
    errMultiple:
      "พบข้อมูล RSL ที่ตรงกันมากกว่า 1 รายการ กรุณาเลือกด้วยตนเอง",
    okMatched: "จับคู่ Order กับ RSL สำเร็จ",
    okUnmatched: "ยกเลิกการจับคู่แล้ว",
  },

  cancel: {
    searchLabel: "ค้นหา Order",
    searchPlaceholder: "ค้นหาด้วย Order ID, SKU หรือชื่อสินค้า",
    emptySearchTitle: "ไม่พบ Order ที่ตรงกับคำค้นหา",
    emptySearchHint: "ลองค้นด้วย Order ID, SKU หรือชื่อสินค้าอีกครั้ง",
    title: "ยกเลิก Order",
    description:
      "ยกเลิก Order ที่มีปัญหาหรือลูกค้าขอยกเลิก พร้อมคืนสต๊อกกลับเข้าคลังอัตโนมัติ",
    action: "ยกเลิก Order",
    emptyTitle: "ไม่มี Order ที่ยกเลิกได้",
    emptyHint: "Order ที่จัดส่งสำเร็จหรือยกเลิกไปแล้วจะไม่แสดงที่นี่",
    dialogTitle: (orderId: string) => `ยกเลิก ${orderId}`,
    alreadyPrinted: " · Order นี้พิมพ์ใบปะสินค้าไปแล้ว",
    reasonLabel: "เหตุผลการยกเลิก",
    submit: "ยืนยันการยกเลิก",
    errClosed:
      "ไม่สามารถยกเลิก Order นี้ได้ เนื่องจากจัดส่งสำเร็จแล้ว/ถูกยกเลิกไปแล้ว",
    errNoReason: "กรุณาระบุเหตุผลการยกเลิก",
    errInTransit:
      "Order นี้อยู่ระหว่างการจัดส่งแล้ว ไม่สามารถยกเลิกในระบบได้ทันที กรุณาประสานงานกับผู้ให้บริการขนส่งเพื่อเรียกพัสดุคืน",
    okCancelled: "ยกเลิก Order สำเร็จ",
    restockedWithLabel: (qty: number) =>
      `คืนสต๊อก ${qty} ชิ้นแล้ว · Order นี้พิมพ์ใบปะสินค้าไปแล้ว กรุณายกเลิกใบปะสินค้ากับผู้ให้บริการขนส่งด้วย`,
    restocked: (qty: number) => `คืนสต๊อก ${qty} ชิ้นกลับเข้าคลังแล้ว`,
  },

  products: {
    searchLabel: "ค้นหาสินค้า",
    searchPlaceholder: "ค้นหาด้วย SKU, ชื่อสินค้า หรือซัพพลายเออร์",
    emptySearchTitle: "ไม่พบสินค้าที่ตรงกับคำค้นหา",
    emptySearchHint: "ลองค้นด้วย SKU, ชื่อสินค้า หรือชื่อซัพพลายเออร์อีกครั้ง",
    title: "ตั้งกฎ SKU และข้อมูลสินค้า",
    description:
      "ข้อมูลที่นี่ใช้จับคู่ Order สต๊อก และการคำนวณต้นทุน ต้องตรงกันทุกระบบ",
    create: "เพิ่มสินค้าใหม่",
    edit: "แก้ไข",
    editTitle: "แก้ไขข้อมูลสินค้า",
    dialogHint: "SKU ที่กรอกจะถูกใช้จับคู่กับ Order สต๊อก และต้นทุนทั้งระบบ",
    emptyTitle: "ยังไม่มีสินค้าในระบบ",
    emptyHint:
      "เพิ่มสินค้าและกำหนด SKU ก่อน เพื่อให้ Order ที่ดึงเข้ามาจับคู่ได้",
    productName: "ชื่อสินค้า",
    reorderThresholdField: "เกณฑ์เติมสต๊อก",
    reorderQty: "จำนวนที่สั่งเติม",
    active: "เปิดขาย",
    inactive: "ปิดการขาย",
    errIncomplete: "กรุณากรอกข้อมูลให้ครบถ้วน",
    errDuplicateSku: "SKU นี้มีอยู่ในระบบแล้ว",
    errHasRelated:
      "ไม่สามารถลบสินค้านี้ได้ เนื่องจากยังมีรายการที่เกี่ยวข้องอยู่",
    errHasRelatedHint: "เปลี่ยนเป็นสถานะ ปิดการขาย แทน",
    okSaved: "บันทึกข้อมูลสินค้าสำเร็จ",
  },

  stock: {
    searchLabel: "ค้นหาสินค้า",
    searchPlaceholder: "ค้นหาด้วย SKU หรือชื่อสินค้า",
    emptySearchTitle: "ไม่พบสินค้าที่ตรงกับคำค้นหา",
    emptySearchHint: "ลองค้นด้วย SKU หรือชื่อสินค้าอีกครั้ง",
    title: "ตรวจสอบสต๊อก",
    description:
      "ยอดรวมคิดจากคลังบริษัทบวกกับคลัง RSL แล้วเทียบกับเกณฑ์เติมสต๊อกของแต่ละ SKU",
    inHouse: "คลังบริษัท",
    rsl: "คลัง RSL",
    total: "รวม",
    low: "สต๊อกต่ำกว่าเกณฑ์",
    normal: "สต๊อกปกติ",
    incomplete: "ข้อมูลไม่สมบูรณ์",
    errIncomplete: "ข้อมูลสต๊อกไม่ครบถ้วน กรุณาตรวจสอบแหล่งข้อมูล",
  },

  cost: {
    title: "คำนวณต้นทุนต่อหน่วย",
    description:
      "รวมราคาซื้อ อัตราแลกเปลี่ยน ค่าขนส่ง ภาษี และค่าธรรมเนียมทุกตัวเป็นต้นทุนจริงต่อชิ้น",
    selectProduct: "เลือกสินค้า",
    selectPlaceholder: "เลือก SKU ที่ต้องการคำนวณ",
    noProductTitle: "ยังไม่ได้เลือกสินค้า",
    noProductHint:
      "เลือก SKU ด้านบน ระบบจะดึงองค์ประกอบต้นทุนที่เคยบันทึกไว้มาให้แก้ไข",
    resultTitle: "ผลการคำนวณ",
    noResultTitle: "ยังไม่มีผลการคำนวณ",
    noResultHint: "กรอกองค์ประกอบต้นทุนให้ครบแล้วกดคำนวณ",
    calculate: "คำนวณ",
    unitCost: "ต้นทุนต่อหน่วย",
    currentPrice: "ราคาขายปัจจุบัน",
    marginPerUnit: "กำไรต่อหน่วย",
    viewReport: "ดูรายงานต้นทุนต่อหน่วย",
    purchasePrice: "ราคาซื้อต่อหน่วย",
    exchangeRate: "อัตราแลกเปลี่ยน",
    intlFreight: "ค่าขนส่งระหว่างประเทศ",
    dutyFee: "ภาษีนำเข้า",
    orderQty: "จำนวนที่สั่งต่อล็อต",
    marketplaceFee: "ค่าธรรมเนียมมาร์เก็ตเพลส",
    domesticShipping: "ค่าส่งในประเทศ",
    rslCharge: "ค่าธรรมเนียม RSL",
    perLot: "ทั้งล็อต",
    perPiece: "ต่อชิ้น",
    purchaseInBaht: "ราคาซื้อคิดเป็นเงินบาท",
    dividedBy: (qty: number) => `หารด้วยจำนวนต่อล็อต (${qty})`,
    okCalculated: "คำนวณต้นทุนต่อหน่วยแล้ว",
    errInvalid: "กรุณากรอกข้อมูลต้นทุนให้ครบถ้วนและถูกต้อง",
    errOverPrice:
      "ต้นทุนต่อหน่วยสูงกว่าราคาขาย กรุณาตรวจสอบราคาขายหรือองค์ประกอบต้นทุน",
  },

  reorder: {
    searchLabel: "ค้นหาสินค้า",
    searchPlaceholder: "ค้นหาด้วย SKU หรือชื่อสินค้า",
    emptySearchTitle: "ไม่พบสินค้าที่ตรงกับคำค้นหา",
    emptySearchHint: "ลองค้นด้วย SKU หรือชื่อสินค้าอีกครั้ง",
    title: "ตัดสินใจสั่งซื้อสินค้าเพิ่ม",
    description:
      "ดูต้นทุนจริงเทียบราคาขายก่อนตัดสินใจ แล้วส่งคำสั่งซื้อไปยังซัพพลายเออร์",
    tabDecide: (n: number) => `รอตัดสินใจ (${n})`,
    tabPurchase: (n: number) => `รอสั่งซื้อเติมสต๊อก (${n})`,
    emptyDecideTitle: "ไม่มีรายการรอตัดสินใจ",
    emptyDecideHint:
      "Order ที่ระบบคำนวณต้นทุนเสร็จแล้วจะเข้ามารอการตัดสินใจที่นี่",
    emptyPurchaseTitle: "ไม่มี SKU ที่ต่ำกว่าเกณฑ์",
    emptyPurchaseHint:
      "ระบบจะดึง SKU ที่สต๊อกรวมต่ำกว่าเกณฑ์เติมขึ้นมาที่นี่ตามรอบเวลาที่ตั้งไว้",
    leadTime: "รอของ",
    days: "วัน",
    unitCost: "ต้นทุนต่อหน่วย",
    currentPrice: "ราคาขายปัจจุบัน",
    expectedMargin: "กำไรต่อหน่วยที่คาดการณ์",
    noPrice: "ไม่พบราคาขาย",
    cannotCompute: "คำนวณไม่ได้",
    pendingPo: (eta: string) =>
      `มีคำสั่งซื้อ SKU นี้ค้างอยู่แล้ว ต้องการสั่งซื้อเพิ่มหรือไม่ · ล็อตเดิมคาดว่าได้รับ ${eta}`,
    approve: "คุ้มค่า - สั่งซื้อเพิ่ม",
    reject: "ไม่คุ้มค่า - ยกเลิก",
    stockVsThreshold: "คงเหลือ / เกณฑ์",
    qtyToOrder: "จำนวนที่จะสั่ง",
    notConfigured: "ยังไม่ได้ตั้งค่า",
    purchase: "สั่งซื้อ",
    confirmTitle: (decision: string) => `ยืนยันผลการตัดสินใจ: ${decision}`,
    confirmApprove: "Order จะถูกส่งเข้าสู่การสั่งซื้อจาก Supplier",
    confirmReject: "Order จะถูกส่งเข้าสู่การยกเลิก Order",
    orderQtyLabel: "จำนวนที่จะสั่งซื้อ",
    orderQtyHint:
      "ค่าที่แก้ที่นี่ใช้เฉพาะครั้งนี้ ไม่กระทบจำนวนสั่งเติมที่ตั้งไว้ในกฎ SKU",
    errNoPrice: "ไม่พบราคาขายของสินค้านี้ กรุณาตรวจสอบ",
    errNoPriceHint:
      "ระบบตั้งสถานะเป็น รอดำเนินการด้วยตนเอง จนกว่าจะระบุราคาขาย",
    errNotConfigured:
      "ไม่พบข้อมูล Supplier หรือจำนวนสั่งซื้อ กรุณาตั้งค่าก่อนสั่งซื้อ",
    okDecided: "บันทึกผลการตัดสินใจสำเร็จ",
    okDecidedApprove: "ส่ง Order เข้าสู่การสั่งซื้อจาก Supplier",
    okDecidedReject: "ส่ง Order เข้าสู่การยกเลิก Order",
    okPurchased: (sku: string, supplier: string) =>
      `ส่งคำสั่งซื้อ ${sku} ไปยัง ${supplier} แล้ว`,
    okPurchasedHint:
      "สถานะเปลี่ยนเป็น สั่งซื้อแล้ว พร้อมวันที่คาดว่าจะได้รับสินค้า",
    decisionApprove: "คุ้มค่า",
    decisionReject: "ไม่คุ้มค่า",
  },

  shipping: {
    searchLabel: "ค้นหา Order",
    searchPlaceholder: "ค้นหาด้วย Order ID หรือชื่อสินค้า",
    emptySearchTitle: "ไม่พบ Order ที่ตรงกับคำค้นหา",
    emptySearchHint: "ลองค้นด้วย Order ID หรือชื่อสินค้าอีกครั้ง",
    title: "จัดส่งสินค้าให้ลูกค้า",
    description:
      "ส่งมอบพัสดุที่พิมพ์ใบปะสินค้าแล้วให้ผู้ให้บริการขนส่ง และติดตามสถานะจนถึงมือลูกค้า",
    waitingTitle: "รอส่งมอบ",
    shippedTitle: "ส่งมอบแล้ว",
    dispatch: "ส่งมอบให้ Delivery",
    trackingNumber: "หมายเลขติดตามพัสดุ",
    noTrackingYet: "ยังไม่มีหมายเลข",
    emptyTitle: "ไม่มีพัสดุรอส่งมอบ",
    emptyHint: "Order ที่พิมพ์ใบปะสินค้าแล้วจะเข้ามารอส่งมอบที่นี่",
    errNotPrinted: "Order นี้ยังไม่ได้พิมพ์ใบปะสินค้า ไม่สามารถส่งมอบได้",
    errNoTracking:
      "ไม่พบหมายเลขติดตามพัสดุ กรุณาตรวจสอบกับผู้ให้บริการขนส่ง",
    errNoTrackingHint: "คง Order ไว้ในสถานะ รอส่งมอบ",
    okDispatched: (orderId: string, carrier: string) =>
      `ส่งมอบ ${orderId} ให้ ${carrier} แล้ว`,
    okDispatchedHint: (tracking: string) =>
      `หมายเลขติดตามพัสดุ ${tracking}`,
  },

  label: {
    searchLabel: "ค้นหา Order",
    searchPlaceholder: "ค้นหาด้วย Order ID หรือที่อยู่จัดส่ง",
    emptySearchTitle: "ไม่พบ Order ที่ตรงกับคำค้นหา",
    emptySearchHint: "ลองค้นด้วย Order ID หรือที่อยู่จัดส่งอีกครั้ง",
    title: "พิมพ์ใบปะสินค้า",
    description: "พิมพ์ใบปะหน้าพัสดุสำหรับ Order ที่กำหนดวิธีจัดส่งเรียบร้อยแล้ว",
    printAll: "พิมพ์ใบปะสินค้าทั้งหมด",
    print: "พิมพ์ใบปะสินค้า",
    reprint: "พิมพ์ซ้ำ",
    viewLabel: "ดูใบปะสินค้า",
    queueTitle: "รอพิมพ์",
    printedTitle: "พิมพ์แล้ว",
    emptyTitle: "ไม่มี Order ที่รอพิมพ์",
    emptyHint:
      "Order ที่จับคู่กับ RSL และจัดรูปแบบใบปะสินค้าแล้วจะเข้ามารอที่นี่",
    reprintTitle: "Order นี้พิมพ์ใบปะสินค้าไปแล้ว ต้องการพิมพ์ซ้ำหรือไม่",
    reprintHint: "ระบบจะบันทึก Log การพิมพ์ซ้ำพร้อมเวลาและผู้ดำเนินการ",
    reprintConfirm: "ยืนยันพิมพ์ซ้ำ",
    errNoAddress:
      "ข้อมูลที่อยู่จัดส่งไม่ครบถ้วน ไม่สามารถพิมพ์ใบปะสินค้าได้",
    errNoTemplate:
      "ไม่พบรูปแบบใบปะสินค้าที่เหมาะสม กรุณาตั้งค่า Label Template ก่อน",
    okPrinted: (orderId: string) =>
      `ส่งใบปะสินค้า ${orderId} ไปยังเครื่องพิมพ์แล้ว`,
    okPrintedHint: (template: string) => `ใช้รูปแบบ ${template}`,
    okReprinted: (orderId: string) => `พิมพ์ใบปะสินค้า ${orderId} ซ้ำแล้ว`,
  },

  cleanup: {
    title: "ลบข้อมูลเก่า",
    description:
      "ลบข้อมูลที่สิ้นสุดแล้วออกจากระบบเพื่อลดปริมาณข้อมูลสะสม ระบบบันทึก Log การลบทุกครั้ง",
    tabRange: "ลบตามช่วงวันที่",
    tabClosed: "ลบ Order ที่ปิดแล้ว",
    dataTypes: "ประเภทข้อมูล",
    cutoffLabel: "ลบข้อมูลที่เก่ากว่าวันที่",
    cutoffHint: "ลบได้เฉพาะข้อมูลที่เก่ากว่า 12 เดือนขึ้นไป",
    submit: "ยืนยันการลบข้อมูล",
    backup: "ดาวน์โหลดไฟล์สำรองก่อนลบ",
    closedTitle:
      "ลบ Order ที่จัดส่งสำเร็จหรือยกเลิกแล้วทั้งหมด โดยไม่ต้องกำหนดช่วงวันที่",
    closedCount: "พบ Order ที่ปิดแล้ว",
    closedCountSuffix: "รายการ พร้อมใบปะสินค้าที่เกี่ยวข้อง",
    confirmTitle: "ยืนยันการลบข้อมูล",
    confirmClosed: (n: number) =>
      `ระบบจะลบ Order ที่ปิดแล้ว ${n} รายการ พร้อมใบปะสินค้าที่เกี่ยวข้อง`,
    confirmRange: (types: string, cutoff: string) =>
      `ระบบจะลบข้อมูลประเภท ${types} ที่เก่ากว่า ${cutoff}`,
    irreversible: "การลบนี้ย้อนกลับไม่ได้",
    errNoType: "กรุณาเลือกประเภทข้อมูลที่ต้องการลบ",
    errCutoff: "สามารถลบข้อมูลที่เก่ากว่า 12 เดือนเท่านั้น",
    errNoData: "ไม่พบข้อมูลที่ลบได้ในช่วงเวลาที่เลือก",
    errNoClosed: "ไม่พบ Order ที่ปิดแล้วให้ลบ",
    okDeletedClosed: (n: number) => `ลบ Order ที่ปิดแล้วสำเร็จ ${n} รายการ`,
    okDeleted: (n: number) => `ลบข้อมูลสำเร็จ ${n} ประเภท`,
    okDeletedHint: "ระบบบันทึก Log การลบไว้แล้ว",
  },

  sitemap: {
    title: "ผังโครงสร้างหน้าจอ",
    description:
      "โครงสร้างทั้งระบบของ actor เดียวคือ Admin โดยเริ่มจากหน้าเข้าสู่ระบบ",
    rootHint: "UC 1A เข้าสู่ระบบ · root ของผัง",
    reports: "รายงาน",
    reportLabel: "ใบปะสินค้า",
    reportCost: "รายงานต้นทุนต่อหน่วย",
    openedFrom: (screen: string) => `เปิดจาก ${screen}`,
  },
};

const en: typeof th = {
  app: {
    name: "RSL Fulfillment Hub",
    company: "Colorado Co., Ltd.",
    toggleMenu: "Toggle menu",
    switchLanguage: "Switch language",
    langLabel: "EN",
    admin: "Admin",
    logout: "Log out",
    logoutConfirm: "Do you want to log out?",
    logoutDone: "Logged out",
  },

  nav: {
    groups: {
      main: "Overview",
      orders: "Orders",
      products: "Products & stock",
      shipping: "Shipping",
      system: "System",
    },
    items: {
      dashboard: "Dashboard",
      verify: "Order review",
      rslMatch: "RSL matching",
      cancel: "Cancel order",
      products: "SKU rules & products",
      stock: "Stock levels",
      cost: "Unit cost",
      reorder: "Reorder decisions",
      shipping: "Customer delivery",
      label: "Shipping labels",
      cleanup: "Data cleanup",
      sitemap: "Site map",
    },
  },

  common: {
    cancel: "Cancel",
    save: "Save",
    confirm: "Confirm",
    status: "Status",
    product: "Product",
    qty: "Qty",
    salesChannel: "Sales channel",
    shippingMethod: "Shipping method",
    shippingAddress: "Shipping address",
    supplier: "Supplier",
    sellingPrice: "Selling price",
    reorderThreshold: "Reorder point",
    reorderQty: "Reorder qty",
    unitPieces: "pcs",
    items: "items",
    notFound: "No data found",
  },

  table: {
    columns: "Columns",
    rowsPerPage: "Rows per page",
    totalRows: (n: number) => `${n} rows total`,
    pageOf: (current: number, total: number) => `Page ${current} of ${total}`,
    firstPage: "Go to first page",
    prevPage: "Previous page",
    nextPage: "Next page",
    lastPage: "Go to last page",
  },

  statusLabel: {
    รอตรวจสอบคำสั่งซื้อ: "Awaiting order review",
    "รอจับคู่กฎ SKU": "Awaiting SKU rule match",
    รอตรวจสอบสต๊อก: "Awaiting stock check",
    "รอ Admin ตัดสินใจสั่งซื้อ": "Awaiting purchase decision",
    "รอสั่งซื้อจาก Supplier": "Awaiting supplier order",
    สั่งซื้อแล้ว: "Ordered",
    รอจัดรูปแบบใบปะสินค้า: "Awaiting label formatting",
    รอพิมพ์ใบปะสินค้า: "Awaiting label print",
    พิมพ์ใบปะสินค้าแล้ว: "Label printed",
    รอส่งคำสั่งซื้อ: "Awaiting PO dispatch",
    รอส่งมอบ: "Awaiting handover",
    อยู่ระหว่างจัดส่ง: "In transit",
    จัดส่งสำเร็จ: "Delivered",
    "รอยกเลิก Order": "Awaiting cancellation",
    ยกเลิกแล้ว: "Cancelled",
    รอดำเนินการด้วยตนเอง: "Manual review",
    รอดำเนินการพิเศษ: "Needs special handling",
  } as Record<OrderStatus, string>,

  login: {
    title: "Sign in",
    description: "Use the administrator account registered with the system",
    email: "Email",
    password: "Password",
    submit: "Sign in",
    footer: "Colorado Co., Ltd. · Internal system for administrators only",
    errIncomplete: "Required fields are missing",
    errEmailFormat: "The email format is not valid",
    errTooManyAttempts:
      "Too many sign-in attempts. Please wait a moment before trying again",
    errWrongCredentials: "Incorrect email or password",
    okLogin: "Signed in successfully",
  },

  dashboard: {
    title: "Dashboard",
    description: "Outstanding work and sales channel connection status",
    importOrders: "Import orders",
    connectionFailed: (channels: string) =>
      `Cannot connect to ${channels}. Please check the configuration`,
    viewList: "View list",
    recentOrders: "Recent orders",
    recentOrdersHint: "Latest orders received and their current status",
    viewAll: "View all",
    connections: "Sales channel connections",
    lastSync: (time: string) => `Last synced ${time}`,
    connected: "Connected",
    disconnected: "Connection failed",
    lowStock: "Below reorder point",
    lowStockHint:
      "SKUs where in-house plus RSL stock has reached the reorder point",
    noLowStock: "No SKU is below its reorder point",
    viewAllStock: "View all stock",
    weeklyVolume: "Orders imported in the last 7 days",
    chartSeries: "Order count",
  },

  verify: {
    title: "Order review",
    description: "Review order details before sending them to SKU rule matching",
    searchLabel: "Search orders",
    searchPlaceholder: "Search by order ID, SKU or sales channel",
    emptySearchTitle: "No order matches your search",
    emptySearchHint: "Try searching by order ID, SKU or sales channel again",
    emptyTitle: "No orders awaiting review",
    emptyHint:
      "New orders arrive here after you import orders from the dashboard",
    detailTitle: "Order details",
    noSelectionTitle: "No order selected",
    noSelectionHint:
      "Pick a row from the table on the left to review it before confirming",
    marketplaceOrderId: "Marketplace order number",
    editNote: "The system records who edited each field and when",
    submit: "Confirm order",
    errIncomplete: "Order details are incomplete. Please check",
    errQty: "Quantity must be greater than 0",
    errAlreadyVerified: "This order has already been reviewed",
    okVerified: "Order confirmed",
  },

  rslMatch: {
    searchLabel: "Search orders",
    searchPlaceholder: "Search by order ID or SKU",
    emptySearchTitle: "No order matches your search",
    emptySearchHint: "Try searching by order ID or SKU again",
    title: "RSL matching",
    description:
      "Compare the order SKU and variation against RSL warehouse data before formatting the label",
    matchAll: "Match all automatically",
    match: "Match with RSL",
    unmatch: "Undo match",
    rslReference: "RSL reference",
    queueTitle: "Awaiting match",
    matchedTitle: "Matched",
    emptyTitle: "Every order has been matched",
    emptyHint:
      "Orders that passed review and SKU rule matching arrive here",
    chooseFor: (orderId: string, sku: string) =>
      `Choose an RSL record for ${orderId} · ${sku}`,
    stockLeft: "RSL stock on hand",
    chooseThis: "Choose this record",
    errNotFound: "This product was not found in RSL",
    errMultiple:
      "More than one matching RSL record was found. Please choose one manually",
    okMatched: "Order matched with RSL",
    okUnmatched: "Match removed",
  },

  cancel: {
    searchLabel: "Search orders",
    searchPlaceholder: "Search by order ID, SKU or product name",
    emptySearchTitle: "No order matches your search",
    emptySearchHint: "Try searching by order ID, SKU or product name again",
    title: "Cancel order",
    description:
      "Cancel problem orders or customer cancellations, returning stock to the warehouse automatically",
    action: "Cancel order",
    emptyTitle: "No orders can be cancelled",
    emptyHint: "Delivered or already cancelled orders are not listed here",
    dialogTitle: (orderId: string) => `Cancel ${orderId}`,
    alreadyPrinted: " · A shipping label has already been printed",
    reasonLabel: "Cancellation reason",
    submit: "Confirm cancellation",
    errClosed:
      "This order cannot be cancelled because it has been delivered or already cancelled",
    errNoReason: "Please provide a cancellation reason",
    errInTransit:
      "This order is already in transit and cannot be cancelled in the system right away. Please contact the carrier to recall the parcel",
    okCancelled: "Order cancelled",
    restockedWithLabel: (qty: number) =>
      `${qty} pcs returned to stock · A label was already printed, so please cancel it with the carrier as well`,
    restocked: (qty: number) => `${qty} pcs returned to the warehouse`,
  },

  products: {
    searchLabel: "Search products",
    searchPlaceholder: "Search by SKU, product name or supplier",
    emptySearchTitle: "No product matches your search",
    emptySearchHint: "Try searching by SKU, product name or supplier again",
    title: "SKU rules and product data",
    description:
      "This data links orders, stock and cost calculations, so it must match across every system",
    create: "Add product",
    edit: "Edit",
    editTitle: "Edit product",
    dialogHint:
      "The SKU entered here links orders, stock and cost across the system",
    emptyTitle: "No products yet",
    emptyHint:
      "Add a product and assign its SKU so imported orders can be matched",
    productName: "Product name",
    reorderThresholdField: "Reorder point",
    reorderQty: "Reorder quantity",
    active: "On sale",
    inactive: "Delisted",
    errIncomplete: "Please complete all required fields",
    errDuplicateSku: "This SKU already exists",
    errHasRelated:
      "This product cannot be deleted because related records still exist",
    errHasRelatedHint: "Set it to delisted instead",
    okSaved: "Product saved",
  },

  stock: {
    searchLabel: "Search products",
    searchPlaceholder: "Search by SKU or product name",
    emptySearchTitle: "No product matches your search",
    emptySearchHint: "Try searching by SKU or product name again",
    title: "Stock levels",
    description:
      "Totals combine in-house and RSL stock, then compare against each SKU's reorder point",
    inHouse: "In-house",
    rsl: "RSL",
    total: "Total",
    low: "Below reorder point",
    normal: "Healthy",
    incomplete: "Incomplete data",
    errIncomplete: "Stock data is incomplete. Please check the source system",
  },

  cost: {
    title: "Unit cost calculation",
    description:
      "Combines purchase price, exchange rate, freight, duty and every fee into a true per-piece cost",
    selectProduct: "Select product",
    selectPlaceholder: "Choose the SKU to calculate",
    noProductTitle: "No product selected",
    noProductHint:
      "Choose a SKU above and the saved cost components will load for editing",
    resultTitle: "Result",
    noResultTitle: "No result yet",
    noResultHint: "Fill in every cost component, then press calculate",
    calculate: "Calculate",
    unitCost: "Unit cost",
    currentPrice: "Current selling price",
    marginPerUnit: "Margin per unit",
    viewReport: "View unit cost report",
    purchasePrice: "Purchase price per unit",
    exchangeRate: "Exchange rate",
    intlFreight: "International freight",
    dutyFee: "Import duty",
    orderQty: "Quantity per lot",
    marketplaceFee: "Marketplace fee",
    domesticShipping: "Domestic shipping",
    rslCharge: "RSL fee",
    perLot: "per lot",
    perPiece: "per piece",
    purchaseInBaht: "Purchase price in THB",
    dividedBy: (qty: number) => `Divided by lot quantity (${qty})`,
    okCalculated: "Unit cost calculated",
    errInvalid: "Please enter every cost component correctly",
    errOverPrice:
      "Unit cost is higher than the selling price. Please check the price or the cost components",
  },

  reorder: {
    searchLabel: "Search products",
    searchPlaceholder: "Search by SKU or product name",
    emptySearchTitle: "No product matches your search",
    emptySearchHint: "Try searching by SKU or product name again",
    title: "Reorder decisions",
    description:
      "Compare real cost against the selling price, then send the purchase order to the supplier",
    tabDecide: (n: number) => `Awaiting decision (${n})`,
    tabPurchase: (n: number) => `Awaiting purchase (${n})`,
    emptyDecideTitle: "Nothing awaiting a decision",
    emptyDecideHint:
      "Orders whose cost calculation is complete arrive here for a decision",
    emptyPurchaseTitle: "No SKU below its reorder point",
    emptyPurchaseHint:
      "SKUs whose combined stock falls below the reorder point appear here on schedule",
    leadTime: "Lead time",
    days: "days",
    unitCost: "Unit cost",
    currentPrice: "Current selling price",
    expectedMargin: "Expected margin per unit",
    noPrice: "No selling price",
    cannotCompute: "Cannot compute",
    pendingPo: (eta: string) =>
      `A purchase order for this SKU is already open. Order more anyway? · Previous lot expected ${eta}`,
    approve: "Worth it - order more",
    reject: "Not worth it - cancel",
    stockVsThreshold: "On hand / reorder point",
    qtyToOrder: "Quantity to order",
    notConfigured: "Not configured",
    purchase: "Order",
    confirmTitle: (decision: string) => `Confirm decision: ${decision}`,
    confirmApprove: "The order moves on to purchasing from the supplier",
    confirmReject: "The order moves on to cancellation",
    orderQtyLabel: "Quantity to purchase",
    orderQtyHint:
      "This value applies to this purchase only and does not change the reorder quantity in the SKU rule",
    errNoPrice: "No selling price found for this product. Please check",
    errNoPriceHint:
      "The order is set to manual review until a selling price is provided",
    errNotConfigured:
      "No supplier or order quantity found. Please configure them before ordering",
    okDecided: "Decision saved",
    okDecidedApprove: "Order sent on to supplier purchasing",
    okDecidedReject: "Order sent on to cancellation",
    okPurchased: (sku: string, supplier: string) =>
      `Purchase order for ${sku} sent to ${supplier}`,
    okPurchasedHint:
      "Status changed to ordered, with the expected delivery date",
    decisionApprove: "Worth it",
    decisionReject: "Not worth it",
  },

  shipping: {
    searchLabel: "Search orders",
    searchPlaceholder: "Search by order ID or product name",
    emptySearchTitle: "No order matches your search",
    emptySearchHint: "Try searching by order ID or product name again",
    title: "Customer delivery",
    description:
      "Hand printed parcels to the carrier and track them through to the customer",
    waitingTitle: "Awaiting handover",
    shippedTitle: "Handed over",
    dispatch: "Hand to carrier",
    trackingNumber: "Tracking number",
    noTrackingYet: "No number yet",
    emptyTitle: "No parcels awaiting handover",
    emptyHint: "Orders with a printed label arrive here for handover",
    errNotPrinted:
      "This order has no printed label yet and cannot be handed over",
    errNoTracking: "No tracking number found. Please check with the carrier",
    errNoTrackingHint: "The order stays in awaiting handover",
    okDispatched: (orderId: string, carrier: string) =>
      `${orderId} handed to ${carrier}`,
    okDispatchedHint: (tracking: string) => `Tracking number ${tracking}`,
  },

  label: {
    searchLabel: "Search orders",
    searchPlaceholder: "Search by order ID or shipping address",
    emptySearchTitle: "No order matches your search",
    emptySearchHint: "Try searching by order ID or shipping address again",
    title: "Shipping labels",
    description: "Print parcel labels for orders with a shipping method set",
    printAll: "Print all labels",
    print: "Print label",
    reprint: "Reprint",
    viewLabel: "View label",
    queueTitle: "Awaiting print",
    printedTitle: "Printed",
    emptyTitle: "No orders awaiting print",
    emptyHint:
      "Orders matched with RSL and formatted for labelling arrive here",
    reprintTitle: "This order already has a printed label. Print it again?",
    reprintHint: "The system logs each reprint with the time and operator",
    reprintConfirm: "Confirm reprint",
    errNoAddress:
      "The shipping address is incomplete, so the label cannot be printed",
    errNoTemplate:
      "No suitable label template was found. Please configure a label template first",
    okPrinted: (orderId: string) => `Label for ${orderId} sent to the printer`,
    okPrintedHint: (template: string) => `Using template ${template}`,
    okReprinted: (orderId: string) => `Label for ${orderId} reprinted`,
  },

  cleanup: {
    title: "Data cleanup",
    description:
      "Remove completed records to keep the database small. Every deletion is logged",
    tabRange: "Delete by date range",
    tabClosed: "Delete closed orders",
    dataTypes: "Data types",
    cutoffLabel: "Delete records older than",
    cutoffHint: "Only records older than 12 months can be deleted",
    submit: "Confirm deletion",
    backup: "Download a backup first",
    closedTitle:
      "Delete every delivered or cancelled order without setting a date range",
    closedCount: "Closed orders found:",
    closedCountSuffix: "records, along with their shipping labels",
    confirmTitle: "Confirm deletion",
    confirmClosed: (n: number) =>
      `${n} closed orders will be deleted, along with their shipping labels`,
    confirmRange: (types: string, cutoff: string) =>
      `Records of type ${types} older than ${cutoff} will be deleted`,
    irreversible: "This deletion cannot be undone",
    errNoType: "Please select at least one data type to delete",
    errCutoff: "Only records older than 12 months can be deleted",
    errNoData: "No deletable records were found in the selected period",
    errNoClosed: "No closed orders to delete",
    okDeletedClosed: (n: number) => `${n} closed orders deleted`,
    okDeleted: (n: number) => `${n} data types deleted`,
    okDeletedHint: "The deletion has been logged",
  },

  sitemap: {
    title: "Site map",
    description:
      "The full structure for the single actor, Admin, starting from the sign-in screen",
    rootHint: "UC 1A Sign in · root of the map",
    reports: "Reports",
    reportLabel: "Shipping label",
    reportCost: "Unit cost report",
    openedFrom: (screen: string) => `Opened from ${screen}`,
  },
};

export type Dict = typeof th;

export const dict: Record<Lang, Dict> = { th, en };
