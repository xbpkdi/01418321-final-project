export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="display text-[clamp(2rem,4vw,3rem)]">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-2 text-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
