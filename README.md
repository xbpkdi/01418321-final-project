# RSL Fulfillment Hub

ระบบจัดการคำสั่งซื้อและการจัดส่งสำหรับ Colorado Co., Ltd. — ร้านค้าที่ขายสินค้านำเข้าและสินค้า OEM
ผ่านมาร์เก็ตเพลสญี่ปุ่น (Rakuten Ichiba, Yahoo! Auctions, Amazon) โดยใช้ RSL เป็นผู้ให้บริการ fulfillment

เป็นโปรเจกต์ของวิชา 01418321 (System Analysis and Design) — ส่วนที่เป็นเอกสารวิเคราะห์ระบบอยู่ที่ repo `321-sa-proj`

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui (Radix UI) + Lucide icons
- ฟอนต์ Noto Sans Thai
- PostgreSQL ผ่าน `pg` เขียน SQL ดิบ (ไม่ใช้ ORM — ดู `src/lib/queries/README.md`)

## เริ่มใช้งาน

```bash
npm install
npm run dev
```

เปิด http://localhost:3000 (จะ redirect ไปหน้า `/login` ซึ่งเป็น root ของ site map)

## โครงสร้าง

```
src/
├── app/
│   ├── login/              1A LoginScreen (นอก shell)
│   ├── (app)/              หน้าที่มี sidebar + topbar
│   │   ├── dashboard/      ภาพรวมระบบ
│   │   ├── orders/         2A ตรวจสอบคำสั่งซื้อ · 1S จับคู่ RSL · 7A ยกเลิก Order
│   │   ├── products/       3A ข้อมูลสินค้า · 3S สต๊อก · 4S ต้นทุน · 5A+6A สั่งซื้อเพิ่ม
│   │   ├── shipping/       8A จัดส่ง · 9A พิมพ์ใบปะสินค้า
│   │   ├── system/         10A ลบข้อมูลเก่า
│   │   └── sitemap/        ผังโครงสร้างหน้าจอ
│   ├── reports/            ใบปะสินค้า · รายงานต้นทุนต่อหน่วย (print view)
│   └── api/                backend — รอ ER Diagram
├── components/
│   ├── ui/                 shadcn generate
│   ├── app-shell/          Sidebar, Topbar, LanguageToggle
│   └── shared/             StatusBadge ฯลฯ
├── lib/
│   ├── nav.ts              โครงเมนู (ใช้ร่วมกับหน้า sitemap)
│   ├── order-status.ts     ค่าสถานะ Order + การ map สี badge
│   ├── queries/            SQL ตั้งชื่อตาม Q-number ใน use case description
│   └── db.ts               pg pool (ยังไม่ได้ใช้)
├── mock/                   ข้อมูลตัวอย่างระหว่างรอ backend
└── types/
```

## สถานะงาน

ยังอยู่ขั้นวางโครง — หน้าจอทั้ง 12 หน้ายังเป็น placeholder
แผนงานและสเปคอยู่ที่ repo `321-sa-proj`:

- `03-chapter2-use-case-descriptions/ui-design-brief.md` — design system และสเปครายหน้า
- `03-chapter2-use-case-descriptions/frontend-build-plan.md` — รายการงานทั้งหมด
- `03-chapter2-use-case-descriptions/00-use-case-descriptions.md` — **แหล่งความจริงของเนื้อหา** ทุกปุ่ม/ข้อความต้องตรงคำต่อคำ
