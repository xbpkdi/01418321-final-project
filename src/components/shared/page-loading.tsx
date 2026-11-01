import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading() {
  return (
    <div
      className="grid min-h-[60dvh] content-start gap-6 p-6"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="grid gap-2">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  );
}
