"use client";

import { usePathname } from "next/navigation";
import { UserRound } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { LanguageToggle } from "./language-toggle";
import { navGroups } from "@/lib/nav";

export function Topbar() {
  const pathname = usePathname();
  const current = navGroups
    .flatMap((group) => group.items)
    .find((item) => item.href === pathname);

  return (
    <header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="mr-1 h-5" />
      <span className="font-semibold">{current?.title ?? "RSL Fulfillment Hub"}</span>

      <div className="ml-auto flex items-center gap-2">
        <LanguageToggle />
        <Separator orientation="vertical" className="h-5" />
        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
          <UserRound className="size-4" />
          Admin
        </span>
      </div>
    </header>
  );
}
