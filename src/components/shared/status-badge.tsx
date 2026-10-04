import { cn } from "@/lib/utils";
import { toneOf, type OrderStatus, type StatusTone } from "@/lib/order-status";

const TONE_CLASS: Record<StatusTone, string> = {
  waiting: "bg-status-waiting-bg text-status-waiting",
  progress: "bg-status-progress-bg text-status-progress",
  success: "bg-status-success-bg text-status-success",
  attention: "bg-status-attention-bg text-status-attention",
  cancelled: "bg-status-cancelled-bg text-status-cancelled",
};

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        TONE_CLASS[toneOf(status)],
        className,
      )}
    >
      {status}
    </span>
  );
}
