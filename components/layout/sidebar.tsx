"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { NAVIGATION, isActiveRoute } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export function Sidebar({
  collapsed,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const { user } = useAuth();
  const pathname = usePathname();

  if (!user) return null;
  const sections = NAVIGATION[user.role];

  return (
    <>
      {mobileOpen ? (
        <div
          className="fixed inset-0 z-30 bg-slate-950/40 backdrop-blur-[2px] lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          "fixed bottom-0 left-0 top-16 z-40 flex w-[260px] flex-col border-r border-slate-200 bg-white transition-transform duration-200 ease-out",
          collapsed ? "lg:w-[72px]" : "lg:w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
        aria-label="Main navigation"
      >
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          {sections.map((section, sectionIndex) => (
            <div key={section.label ?? "primary"} className={cn(sectionIndex > 0 && "mt-5")}>
              {section.label ? (
                collapsed ? (
                  <div className="mx-2 mb-2.5 hidden border-t border-slate-100 lg:block" />
                ) : (
                  <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {section.label}
                  </p>
                )
              ) : null}

              <ul className="space-y-1">
                {section.items.map((item) => {
                  const active = isActiveRoute(pathname, item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onCloseMobile}
                        title={collapsed ? item.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                          active
                            ? "bg-indigo-50 text-indigo-700"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                          collapsed && "lg:justify-center lg:px-0",
                        )}
                      >
                        <Icon
                          name={item.icon}
                          size={18}
                          className={cn(
                            "shrink-0 transition-colors",
                            active
                              ? "text-indigo-600"
                              : "text-slate-400 group-hover:text-slate-600",
                          )}
                        />
                        <span
                          className={cn(
                            "truncate",
                            collapsed && "lg:hidden",
                          )}
                        >
                          {item.label}
                        </span>
                        {active && !collapsed ? (
                          <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5",
              collapsed && "lg:justify-center lg:px-0",
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200">
              <Icon name="shield" size={14} />
            </span>
            <div className={cn("min-w-0", collapsed && "lg:hidden")}>
              <p className="text-[11px] font-semibold text-slate-700">
                Secure workspace
              </p>
              <p className="text-[10px] text-slate-400">
                Role-based access enabled
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
