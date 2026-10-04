"use client";

// อิง shadcn block sidebar-16 → components/site-header.tsx
// ส่วนท้ายแถบใช้วางปุ่มสลับภาษา (ตำแหน่งเดียวกับที่ block วาง SearchForm)

import { usePathname } from "next/navigation";
import { PanelLeftIcon } from "lucide-react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useSidebar } from "@/components/ui/sidebar";
import { LanguageToggle } from "./language-toggle";
import { navGroups } from "@/lib/nav";

export function SiteHeader() {
  const { toggleSidebar } = useSidebar();
  const pathname = usePathname();
  const group = navGroups.find((g) =>
    g.items.some((item) => item.href === pathname),
  );
  const current = group?.items.find((item) => item.href === pathname);

  return (
    <header className="bg-background sticky top-0 z-50 flex w-full items-center border-b">
      <div className="flex h-(--header-height) w-full items-center gap-2 px-4">
        <Button
          className="h-8 w-8"
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
        >
          <PanelLeftIcon />
          <span className="sr-only">สลับการแสดงเมนู</span>
        </Button>
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb>
          <BreadcrumbList>
            {group && (
              <>
                <BreadcrumbItem className="hidden sm:block">
                  {group.label}
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden sm:block" />
              </>
            )}
            <BreadcrumbItem>
              <BreadcrumbPage>
                {current?.title ?? "RSL Fulfillment Hub"}
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
