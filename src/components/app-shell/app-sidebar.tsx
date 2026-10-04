"use client";

// อิง shadcn block sidebar-16 → components/app-sidebar.tsx
// เมนูไม่มีเมนูย่อย จึงใช้ SidebarMenu ตรงๆ ไม่ต้องมี Collapsible แบบ nav-main
// ผู้ใช้อยู่ที่ SidebarFooter ตามตำแหน่งที่ block วาง NavUser ไว้

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes, UserRound } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { navGroups } from "@/lib/nav";
import { useT } from "@/lib/i18n/context";

export function AppSidebar() {
  const pathname = usePathname();
  const t = useT();

  return (
    <Sidebar
      collapsible="icon"
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
    >
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Boxes className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">
                    {t.app.name}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">
                    {t.app.company}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.labelKey}>
            <SidebarGroupLabel>
              {t.nav.groups[group.labelKey]}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.href}
                      tooltip={t.nav.items[item.titleKey]}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span>{t.nav.items[item.titleKey]}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <div className="bg-muted text-muted-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <UserRound className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{t.app.admin}</span>
                <span className="text-muted-foreground truncate text-xs">
                  admin@colorado.jp
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
