"use client";

// SiteMapScreen — rubric ข้อ 29: โครงสร้างหน้าจอแบบ tree โดย root คือหน้า Login
// ดึงโครงเมนูจาก src/lib/nav.ts ที่ sidebar ใช้ร่วมกัน จึงไม่มีทางหลุดจากกัน

import { LogIn } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { navGroups } from "@/lib/nav";
import { useT } from "@/lib/i18n/context";

export default function SiteMapScreen() {
  const t = useT();

  const reports = [
    { title: t.sitemap.reportLabel, uc: "6S/9A", from: "LabelPrintScreen" },
    { title: t.sitemap.reportCost, uc: "4S", from: "CostCalculatorScreen" },
  ];

  return (
    <div className="grid gap-6 p-6">
      <PageHeader
        title={t.sitemap.title}
        description={t.sitemap.description}
      />

      <section className="rounded-lg border p-6">
        <div className="flex items-center gap-2.5">
          <div className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
            <LogIn className="size-4" />
          </div>
          <div>
            <p className="font-semibold">LoginScreen</p>
            <p className="text-muted-foreground text-xs">
              {t.sitemap.rootHint}
            </p>
          </div>
        </div>

        <ul className="border-border mt-2 ml-4 border-l pl-6">
          {navGroups.map((group) => (
            <li key={group.labelKey} className="pt-5">
              <p className="text-muted-foreground relative text-xs font-medium">
                <span className="bg-border absolute top-1/2 -left-6 h-px w-4" />
                {t.nav.groups[group.labelKey]}
              </p>
              <ul className="border-border mt-2 ml-1 border-l pl-6">
                {group.items.map((item) => (
                  <li key={item.href} className="relative pt-3">
                    <span className="bg-border absolute top-[1.4rem] -left-6 h-px w-4" />
                    <p className="text-sm font-medium">{item.screen}</p>
                    <p className="text-muted-foreground text-xs">
                      {t.nav.items[item.titleKey]}
                      {item.uc !== "—" && ` · UC ${item.uc}`}
                      {item.hostsUc && ` · ${t.sitemap.alsoHere(item.hostsUc)}`}
                    </p>
                  </li>
                ))}
              </ul>
            </li>
          ))}

          <li className="pt-5">
            <p className="text-muted-foreground relative text-xs font-medium">
              <span className="bg-border absolute top-1/2 -left-6 h-px w-4" />
              {t.sitemap.reports}
            </p>
            <ul className="border-border mt-2 ml-1 border-l pl-6">
              {reports.map((r) => (
                <li key={r.title} className="relative pt-3">
                  <span className="bg-border absolute top-[1.4rem] -left-6 h-px w-4" />
                  <p className="text-sm font-medium">{r.title}</p>
                  <p className="text-muted-foreground text-xs">
                    UC {r.uc} · {t.sitemap.openedFrom(r.from)}
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
