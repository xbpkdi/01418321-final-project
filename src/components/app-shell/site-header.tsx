"use client";

// อิง shadcn block sidebar-16 → components/site-header.tsx
// ส่วนท้ายแถบใช้วางปุ่มสลับภาษา (ตำแหน่งเดียวกับที่ block วาง SearchForm)

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftIcon } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { LanguageToggle } from "./language-toggle";
import { navGroups } from "@/lib/nav";
import { useT } from "@/lib/i18n/context";

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const t = useT();
  const group = navGroups.find((g) =>
    g.items.some((item) => item.href === pathname),
  );
  const current = group?.items.find((item) => item.href === pathname);

  return (
    <header
      data-slot="site-header"
      className="sticky top-0 z-50 flex w-full items-center"
    >
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <PanelLeftIcon />
          <span className="sr-only">{t.app.toggleMenu}</span>
        </Button>
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {/* ชั้นแรกกดกลับหน้าภาพรวมได้ เพราะคนคุ้นกับการกด breadcrumb เพื่อย้อนกลับ */}
            {pathname !== "/dashboard" && (
              <>
                <BreadcrumbItem className="hidden sm:block">
                  <BreadcrumbLink asChild>
                    <Link href="/dashboard">{t.nav.items.dashboard}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
              </>
            )}
            {group && pathname !== "/dashboard" && (
              <>
                <BreadcrumbItem className="hidden sm:block">
                  {t.nav.groups[group.labelKey]}
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>
                {current ? t.nav.items[current.titleKey] : t.app.name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <div className="ml-auto">
          <LanguageToggle />
        </div>
      </div>
    </header>
  );
}
