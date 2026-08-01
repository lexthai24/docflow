import { cn } from "@/lib/utils";

// Charts แบบ SVG/CSS ล้วน — ไม่พึ่ง lib ภายนอก (bundle เล็ก, self-contained)

export function BarChart({
  data,
  className,
  color = "var(--primary)",
}: {
  data: { label: string; value: number }[];
  className?: string;
  color?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("flex h-48 items-end justify-between gap-2", className)}>
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${(d.value / max) * 100}%`,
                minHeight: d.value > 0 ? "4px" : "0",
                backgroundColor: color,
              }}
              title={`${d.label}: ${d.value}`}
            />
          </div>
          <span className="text-[11px] text-muted-foreground">{d.label}</span>
          <span className="-mt-1 text-xs font-semibold text-foreground">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export function DonutChart({
  data,
  className,
}: {
  data: { label: string; value: number; color: string }[];
  className?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className={cn("flex flex-col items-center gap-4 sm:flex-row sm:gap-6", className)}>
      <div className="relative size-40 shrink-0">
        <svg viewBox="0 0 160 160" className="size-full -rotate-90">
          <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--surface-muted)" strokeWidth="18" />
          {total > 0 &&
            data.map((d, i) => {
              const len = (d.value / total) * circ;
              const seg = (
                <circle
                  key={i}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="none"
                  stroke={d.color}
                  strokeWidth="18"
                  strokeDasharray={`${len} ${circ - len}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return seg;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-foreground">{total}</span>
          <span className="text-xs text-muted-foreground">ทั้งหมด</span>
        </div>
      </div>
      <div className="grid flex-1 gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="size-3 shrink-0 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="flex-1 text-foreground">{d.label}</span>
            <span className="font-semibold text-foreground">{d.value}</span>
            <span className="w-10 text-right text-xs text-muted-foreground">
              {total > 0 ? Math.round((d.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HorizontalBars({
  data,
  className,
}: {
  data: { label: string; value: number; color?: string }[];
  className?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className={cn("space-y-3", className)}>
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-foreground">{d.label}</span>
            <span className="font-semibold text-foreground">{d.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(d.value / max) * 100}%`,
                backgroundColor: d.color ?? "var(--primary)",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
