"use client";

// อิง shadcn block sidebar-16 → components/app-sidebar.tsx
// เมนูไม่มีเมนูย่อย จึงใช้ SidebarMenu ตรงๆ ไม่ต้องมี Collapsible แบบ nav-main
// ผู้ใช้อยู่ที่ SidebarFooter ตามตำแหน่งที่ block วาง NavUser ไว้

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDown, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  const router = useRouter();
  const t = useT();

  // UC 1A: ล้าง session แล้ว redirect กลับหน้า Login (ไม่แตะฐานข้อมูล)
  function logout() {
    toast.success(t.app.logoutDone);
    router.push("/login");
  }

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
                {/* โลโก้ตัวอักษร: R แบบเดียวกับหัวข้อใหญ่ + จุดส้มแบบ "HUB." */}
                <div
                  aria-hidden
                  className="bg-navy-deep flex aspect-square size-8 shrink-0 items-end justify-center rounded-lg pb-1 text-white"
                >
                  <span className="font-display text-xl leading-none">R</span>
                  <span className="bg-coral mb-0.5 ml-px size-1 rounded-[1px]" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="display truncate text-lg">
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
                      className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:hover:bg-primary data-[active=true]:hover:text-primary-foreground data-[active=true]:shadow-[0_8px_20px_-10px] data-[active=true]:shadow-primary/70"
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
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
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="start"
                className="w-(--radix-dropdown-menu-trigger-width)"
              >
                {/* UC 1A ขั้นตอนที่ 4 — ยกเลิก session แล้วกลับไปหน้า Login */}
                <DropdownMenuItem onClick={logout}>
                  <LogOut />
                  {t.app.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
