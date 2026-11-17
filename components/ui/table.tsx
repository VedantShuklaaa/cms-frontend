import type { ReactNode, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Table({
  children,
  minWidth = 720,
  className,
}: {
  children: ReactNode;
  minWidth?: number;
  className?: string;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full border-collapse text-left text-sm", className)}
        style={{ minWidth }}
      >
        {children}
      </table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50/80">{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

export function TR({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <tr
      className={cn(
        "border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/70",
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  className,
  colSpan,
}: {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn("px-4 py-3.5 align-middle text-slate-600", className)}
    >
      {children}
    </td>
  );
}

export function PrimaryCell({
  title,
  subtitle,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="truncate font-medium text-slate-900">{title}</div>
      {subtitle ? (
        <div className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</div>
      ) : null}
    </div>
  );
}
