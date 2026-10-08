// กล่องข้อความแจ้งเตือนในหน้า ตามแบบ Section message ของ Atlassian:
// ไอคอนบอกประเภท + พื้นสีตามประเภท ไม่มีเส้นขอบ ตัวอักษรเป็นสีหลัก
// error ใช้เมื่อ "something destructive or critical has happened" หรือมีปัญหาการเชื่อมต่อ
// warning ใช้เพื่อช่วยให้ผู้ใช้เลี่ยงความผิดพลาด

import { CircleAlert, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";

const APPEARANCE = {
  error: { box: "bg-status-cancelled-bg", icon: "text-[#c9372c]", Icon: CircleAlert }, // color.icon.danger
  warning: { box: "bg-status-attention-bg", icon: "text-[#e06c00]", Icon: TriangleAlert }, // color.icon.warning
} as const;

export function SectionMessage({
  appearance,
  className,
  children,
}: {
  appearance: keyof typeof APPEARANCE;
  className?: string;
  children: React.ReactNode;
}) {
  const { box, icon, Icon } = APPEARANCE[appearance];
  return (
    <div
      role="alert"
      className={cn("text-foreground flex gap-3 rounded-md px-4 py-3 text-sm", box, className)}
    >
      <Icon aria-hidden className={cn("mt-0.5 size-4 shrink-0", icon)} />
      <div>{children}</div>
    </div>
  );
}
