# RSL Fulfillment Hub

ระบบจัดการคำสั่งซื้อและการจัดส่งสำหรับ Colorado Co., Ltd. — ร้านค้าที่ขายสินค้านำเข้าและสินค้า OEM
ผ่าน Rakuten Ichiba (เฟส 1 — Yahoo! Auctions / Amazon เลื่อนไปเฟสถัดไป) โดยใช้ RSL เป็นผู้ให้บริการ fulfillment

เป็นโปรเจกต์ของวิชา 01418321 (System Analysis and Design) — ส่วนที่เป็นเอกสารวิเคราะห์ระบบอยู่ที่ repo `321-sa-proj`

## Stack

- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4 + shadcn/ui (Radix UI) + Lucide icons
- ฟอนต์ Noto Sans Thai
- PostgreSQL ผ่าน `pg` เขียน SQL ดิบ (ไม่ใช้ ORM — ดู `src/lib/queries/README.md`)

## เริ่มใช้งาน

```bash
npm install
npm run db:setup
npm run dev
```

เปิด http://localhost:3000 (จะ redirect ไปหน้า `/login` ซึ่งเป็น root ของ site map)

## PostgreSQL สำหรับพัฒนา

ติดตั้ง PostgreSQL ในเครื่องและเริ่ม service ให้ทำงาน จากนั้นเปิด `psql` ด้วยบัญชีผู้ดูแลเพื่อสร้าง role และฐานข้อมูลสำหรับพัฒนา:

```powershell
psql -U postgres
```

ใน prompt ของ `psql`, ใช้รหัสผ่านเฉพาะเครื่องสำหรับ role นี้:

```sql
CREATE ROLE rsl_app LOGIN PASSWORD 'replace-with-local-password';
CREATE DATABASE rsl_fulfillment_hub OWNER rsl_app;
```

ออกจาก `psql`, คัดลอก `.env.local.example` เป็น `.env.local` แล้วใส่ role, รหัสผ่าน และชื่อฐานข้อมูลที่ตั้งไว้ใน `DATABASE_URL`. ห้าม commit `.env.local` หรือรหัสผ่านจริงลง repository. `SEED_ADMIN_PASSWORD` เป็นรหัสผ่านที่สคริปต์ใช้สร้างบัญชีทดสอบ; ในฐานข้อมูลจะเก็บเฉพาะ scrypt hash.

```powershell
Copy-Item .env.local.example .env.local
```

สร้าง schema ตาม ER diagram และเติมข้อมูลตัวอย่างด้วยคำสั่งเดียว:

```bash
npm run db:setup
```

คำสั่งนี้รันซ้ำได้โดยสร้างเฉพาะแถวที่ยังไม่มีและไม่แตะข้อมูลเดิม ใช้ `npm run db:migrate` หรือ `npm run db:seed` แยกขั้นตอนได้ หากต้องการล้างข้อมูลในตารางของแอปและโหลดข้อมูลตัวอย่างใหม่ทั้งหมด ต้องสั่งโหมดทำลายข้อมูลอย่างชัดเจนด้วย `npm run db:reset` เท่านั้น.

บัญชีทดสอบหลัง seed: `admin@colorado.jp` / ค่าจาก `SEED_ADMIN_PASSWORD` (ไฟล์ตัวอย่างใช้ `demo1234`) ส่วน `locked@colorado.jp` ใช้รหัสเดียวกันและมี `fail_attempts = 5` เพื่อทดสอบบัญชีถูกล็อก. Login, logout และการป้องกันหน้า app/report ใช้ session ฝั่ง PostgreSQL อายุเริ่มต้น 8 ชั่วโมง.

หน้า `/dev` (ไม่อยู่ในเมนู) ใช้รีเซ็ตข้อมูลตัวอย่าง และจำลองข้อผิดพลาดจากระบบภายนอกตาม "ทางเลือก" ของแต่ละ UC
เพื่อทดสอบและ capture รูปลงรายงาน

## โครงสร้าง

```
src/
├── app/
│   ├── login/              1A LoginScreen (นอก shell)
│   ├── (app)/              หน้าที่มี sidebar + topbar
│   │   ├── dashboard/      ภาพรวมระบบ + ปุ่มนำเข้า Order (4A)
│   │   ├── orders/         2A ตรวจสอบคำสั่งซื้อ · 1S จับคู่ RSL · 7A ยกเลิก Order
│   │   ├── products/       3A ข้อมูลสินค้า · 3S สต๊อก · 4S ต้นทุน · 5A+6A สั่งซื้อเพิ่ม
│   │   ├── shipping/       8A จัดส่ง (+ ปุ่มแจ้งเลขติดตาม 5S) · 9A พิมพ์ใบปะสินค้า
│   │   ├── system/         10A ลบข้อมูลเก่า
│   │   ├── sitemap/        ผังโครงสร้างหน้าจอ
│   │   └── dev/            เครื่องมือทดสอบ (ไม่ใช่หน้าจอของระบบ)
│   ├── reports/            ใบปะสินค้า · รายงานต้นทุนต่อหน่วย (print view)
│   └── api/                route handlers ที่อาจเพิ่มใน phase ถัดไป
├── components/
│   ├── ui/                 shadcn generate
│   ├── app-shell/          Sidebar, Topbar, LanguageToggle
│   └── shared/             StatusBadge ฯลฯ
├── lib/
│   ├── workflow.ts         ลำดับงานทุก UC เป็น pure function + งานอัตโนมัติ 2S/3S/6S/7S
│   ├── store.tsx           ข้อมูลหน้าที่ยังไม่ migrate (ชั่วคราวจน feature 002 เสร็จ)
│   ├── auth/               scrypt, session cookie และ server-side guard
│   ├── nav.ts              โครงเมนู (ใช้ร่วมกับหน้า sitemap)
│   ├── order-status.ts     ค่าสถานะ Order + การ map สี badge
│   ├── queries/            SQL ตั้งชื่อตาม Q-number ใน use case description
│   └── db.ts               pg pool และ transaction helper
db/
├── migrations/             schema หลักและ runtime records
└── seed/                   setup/seed/reset แบบทำซ้ำได้
├── mock/                   ข้อมูลตั้งต้นที่ครอบคลุมทุกเส้นทางใน UC (คอมเมนต์บอกว่าใช้ทดสอบเคสไหน)
└── types/
```

## สถานะงาน

Login และ session ใช้ PostgreSQL แล้ว ส่วนหน้าธุรกิจจะย้ายจาก localStorage ไปอ่าน/เขียนฐานข้อมูลเป็นลำดับใน phase ถัดไปของ feature 002.

- `report-doc/content/usecases.json` (repo 321-sa-proj) — Use Case Description ทุกข้อ ทุกปุ่ม/ข้อความในหน้าจอต้องตรงคำต่อคำ
- `report-doc/build_report.py` (repo 321-sa-proj) — สร้างเล่มรายงาน (.docx/.pdf)
- `DESIGN.md` — design system
- โครงสร้างฐานข้อมูลอยู่ที่ repo `321-sa-proj` โฟลเดอร์ `04-chapter2-diagrams-database/sql/`
