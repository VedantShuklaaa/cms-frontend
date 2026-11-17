import { cn } from "@/lib/utils";

type Tone = "indigo" | "emerald" | "amber" | "rose" | "sky" | "violet";

const fills: Record<Tone, string> = {
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
};

export function ProgressBar({
  value,
  max = 100,
  tone = "indigo",
  className,
  size = "md",
}: {
  value: number;
  max?: number;
  tone?: Tone;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const pct =
    max <= 0 ? 0 : Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-slate-100",
        size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2",
        className,
      )}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn("h-full rounded-full transition-all duration-500", fills[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export interface BarListItem {
  label: string;
  sublabel?: string;
  value: number;
  max: number;
  valueLabel?: string;
  tone?: Tone;
}

export function BarList({
  items,
  className,
}: {
  items: BarListItem[];
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {items.map((item, index) => (
        <div key={`${item.label}-${index}`}>
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">
                {item.label}
              </p>
              {item.sublabel ? (
                <p className="truncate text-xs text-slate-500">
                  {item.sublabel}
                </p>
              ) : null}
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-700">
              {item.valueLabel ?? item.value}
            </span>
          </div>
          <ProgressBar
            value={item.value}
            max={item.max}
            tone={item.tone ?? "indigo"}
            size="md"
          />
        </div>
      ))}
    </div>
  );
}

export function PercentRing({
  value,
  size = 132,
  label = "attendance",
}: {
  value: number;
  size?: number;
  label?: string;
}) {
  const clamped = Math.min(100, Math.max(0, value));
  const color =
    clamped >= 75 ? "#10b981" : clamped >= 50 ? "#f59e0b" : "#f43f5e";

  return (
    <div
      className="relative flex shrink-0 items-center justify-center rounded-full"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${color} ${clamped * 3.6}deg, #eef2f7 0deg)`,
      }}
      role="img"
      aria-label={`${Math.round(clamped)}% ${label}`}
    >
      <div className="absolute inset-[10px] flex flex-col items-center justify-center rounded-full bg-white">
        <span className="text-2xl font-semibold tabular-nums text-slate-900">
          {Math.round(clamped)}%
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
      </div>
    </div>
  );
}
