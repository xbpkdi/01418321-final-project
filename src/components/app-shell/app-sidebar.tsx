"use client";

// อิง shadcn block sidebar-16 → components/app-sidebar.tsx
// เมนูไม่มีเมนูย่อย จึงใช้ SidebarMenu ตรงๆ ไม่ต้องมี Collapsible แบบ nav-main
// ผู้ใช้อยู่ที่ SidebarFooter ตามตำแหน่งที่ block วาง NavUser ไว้

import * as React from "react";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { navGroups } from "@/lib/nav";
import { useT } from "@/lib/i18n/context";
import { useStore } from "@/lib/store";
import { logout as endSession } from "@/lib/workflow";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useT();
  const { state, run, isDirty } = useStore();
  const [confirming, setConfirming] = React.useState(false);

  // UC 1A ขั้นตอนที่ 4: ล้าง session แล้ว redirect กลับหน้า Login (ไม่แตะข้อมูลอื่น)
  function logout() {
    run((s) => ({ state: endSession(s) }));
    toast.success(t.app.logoutDone);
    router.push("/login");
  }

  // มีงานที่ยังไม่ได้บันทึก ต้องถามยืนยันก่อน
  function requestLogout() {
    if (isDirty()) setConfirming(true);
    else logout();
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
                  className="bg-cobalt flex aspect-square size-8 shrink-0 items-end justify-center rounded-lg pb-1 text-white"
                >
                  <span className="font-display text-xl leading-none">R</span>
                  <span className="bg-coral mb-0.5 ml-px size-1 rounded-[1px]" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="display truncate text-lg">{t.app.name}</span>
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
                      className="data-[active=true]:bg-sidebar-selected data-[active=true]:text-sidebar-selected-foreground data-[active=true]:hover:bg-sidebar-selected data-[active=true]:hover:text-sidebar-selected-foreground"
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
                      {state.session?.user_email}
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
                <DropdownMenuItem onClick={requestLogout}>
                  <LogOut />
                  {t.app.logout}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.app.logoutConfirm}</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirming(false)}>
              {t.common.cancel}
            </Button>
            <Button onClick={logout}>{t.app.logout}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
