import type { ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ApiRequestError } from "@/lib/api";

export function Spinner({ className }: { className?: string }) {
  return (
    <Icon
      name="loader"
      size={20}
      className={cn("animate-spin text-indigo-500", className)}
    />
  );
}

export function FullPageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
        <Spinner className="h-5 w-5" />
      </div>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 px-5 py-16 text-sm text-slate-500">
      <Spinner />
      {label}
    </div>
  );
}

export function ErrorState({
  error,
  onRetry,
  title = "Something went wrong",
}: {
  error: ApiRequestError | Error | null;
  onRetry?: () => void;
  title?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
        <Icon name="alert" size={22} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {error?.message || "An unexpected error occurred."}
      </p>
      {onRetry ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry} icon={<Icon name="refresh" size={14} />}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <Icon name="shield" size={22} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">Access denied</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        Your role does not have permission to view this page.
      </p>
    </div>
  );
}

export function EmptyState({
  icon = "info",
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
        <Icon name={icon} size={22} />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/**
 * Skeleton placeholder for a pending table. Rendered as `div`s rather than
 * `<tr>`/`<td>` so it is valid inside a Card without a surrounding <table>.
 */
export function TableLoading({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-3 border-b border-slate-100 px-4 py-3.5 last:border-0"
        >
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
            <div className="h-2.5 w-1/4 animate-pulse rounded bg-slate-50" />
          </div>
          <div className="hidden h-2.5 w-24 animate-pulse rounded bg-slate-50 sm:block" />
          <div className="hidden h-2.5 w-16 animate-pulse rounded bg-slate-50 md:block" />
        </div>
      ))}
    </div>
  );
}

type AlertTone = "info" | "success" | "warning" | "error";

const alertTones: Record<AlertTone, { wrapper: string; icon: IconName }> = {
  info: { wrapper: "border-sky-200 bg-sky-50 text-sky-800", icon: "info" },
  success: {
    wrapper: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: "checkCircle",
  },
  warning: {
    wrapper: "border-amber-200 bg-amber-50 text-amber-800",
    icon: "alert",
  },
  error: { wrapper: "border-rose-200 bg-rose-50 text-rose-800", icon: "alert" },
};

export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: AlertTone;
  children: ReactNode;
  className?: string;
}) {
  const config = alertTones[tone];
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
        config.wrapper,
        className,
      )}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon name={config.icon} size={17} className="mt-0.5 shrink-0" />
      <div className="min-w-0 leading-relaxed">{children}</div>
    </div>
  );
}
