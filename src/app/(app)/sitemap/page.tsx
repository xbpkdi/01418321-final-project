// SiteMapScreen — rubric ข้อ 29: โครงสร้างหน้าจอแบบ tree โดย root คือหน้า Login
// ดึงโครงเมนูจาก src/lib/nav.ts ที่ sidebar ใช้ร่วมกัน จึงไม่มีทางหลุดจากกัน

import { LogIn } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { navGroups } from "@/lib/nav";

const REPORTS = [
  { title: "ใบปะสินค้า", uc: "6S/9A", from: "LabelPrintScreen" },
  { title: "รายงานต้นทุนต่อหน่วย", uc: "4S", from: "CostCalculatorScreen" },
];

export default function SiteMapScreen() {
  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title="ผังโครงสร้างหน้าจอ"
        description="โครงสร้างทั้งระบบของ actor เดียวคือ Admin โดยเริ่มจากหน้าเข้าสู่ระบบ"
      />

      <section className="rounded-lg border p-6">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <LogIn className="size-4" />
          </div>
          <div>
            <p className="font-semibold">LoginScreen</p>
            <p className="text-muted-foreground text-xs">
              UC 1A เข้าสู่ระบบ · root ของผัง
            </p>
          </div>
        </div>

        <ul className="border-border mt-2 ml-4 border-l pl-6">
          {navGroups.map((group) => (
            <li key={group.label} className="pt-5">
              <p className="text-muted-foreground relative text-xs font-medium">
                <span className="bg-border absolute top-1/2 -left-6 h-px w-4" />
                {group.label}
              </p>
              <ul className="border-border mt-2 ml-1 border-l pl-6">
                {group.items.map((item) => (
                  <li key={item.href} className="relative pt-3">
                    <span className="bg-border absolute top-[1.4rem] -left-6 h-px w-4" />
                    <p className="text-sm font-medium">{item.screen}</p>
                    <p className="text-muted-foreground text-xs">
                      {item.title}
                      {item.uc !== "—" && ` · UC ${item.uc}`}
                    </p>
                  </li>
                ))}
              </ul>
            </li>
          ))}

          <li className="pt-5">
            <p className="text-muted-foreground relative text-xs font-medium">
              <span className="bg-border absolute top-1/2 -left-6 h-px w-4" />
              รายงาน
            </p>
            <ul className="border-border mt-2 ml-1 border-l pl-6">
              {REPORTS.map((r) => (
                <li key={r.title} className="relative pt-3">
                  <span className="bg-border absolute top-[1.4rem] -left-6 h-px w-4" />
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-muted-foreground text-xs">
                    UC {r.uc} · เปิดจาก {r.from}
                  </p>
                </li>
              ))}
            </ul>
          </li>
        </ul>
      </section>
    </div>
  );
}
