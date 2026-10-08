"use client";

// หน้าทั้งหมดหลัง login ต้องมี session (UC 1A Post-Condition) ไม่มีก็กลับไปหน้า Login

import * as React from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useStore } from "@/lib/store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { state } = useStore();
  const router = useRouter();
  const signedIn = state.session !== null;

  React.useEffect(() => {
    if (!signedIn) router.replace("/login");
  }, [signedIn, router]);

  if (!signedIn) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Spinner className="size-6" />
      </div>
    );
  }
  return <>{children}</>;
}
