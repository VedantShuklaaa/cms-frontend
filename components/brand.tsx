import Link from "next/link";
import { Icon } from "@/components/icons";
import { cn } from "@/lib/utils";

export function BrandMark({
  collapsed = false,
  className,
  asLink = true,
}: {
  collapsed?: boolean;
  className?: string;
  asLink?: boolean;
}) {
  const content = (
    <>
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/30">
        <Icon name="graduation" size={19} />
      </span>
      {collapsed ? null : (
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold leading-tight tracking-tight text-slate-900">
            Campus
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
            Management
          </span>
        </span>
      )}
    </>
  );

  if (!asLink) {
    return <div className={cn("flex items-center gap-2.5", className)}>{content}</div>;
  }

  return (
    <Link
      href="/dashboard"
      className={cn(
        "flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-100",
        className,
      )}
    >
      {content}
    </Link>
  );
}
