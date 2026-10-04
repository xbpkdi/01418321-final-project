import type { LucideIcon } from "lucide-react";

/** ไม่ใช่แค่บอกว่า "ไม่มีข้อมูล" แต่บอกด้วยว่าทำยังไงถึงจะมี */
export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="bg-muted text-muted-foreground flex size-10 items-center justify-center rounded-full">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="font-medium">{title}</p>
        {hint && (
          <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm">
            {hint}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
