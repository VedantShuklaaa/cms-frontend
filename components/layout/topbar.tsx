"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { BrandMark } from "@/components/brand";
import { Icon } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ROLE_BADGE_TONES, ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { useClickOutside, useQuery } from "@/lib/hooks";
import { pageTitleFor } from "@/lib/navigation";
import { initials } from "@/lib/utils";
import type { Notice, Paginated } from "@/types/api";

function nameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function Topbar({
  collapsed,
  onToggleSidebar,
  onOpenMobile,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onOpenMobile: () => void;
}) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [noticesOpen, setNoticesOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const noticesRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  const closeNotices = useCallback(() => setNoticesOpen(false), []);
  const closeUser = useCallback(() => setUserOpen(false), []);
  useClickOutside(noticesRef, closeNotices, noticesOpen);
  useClickOutside(userRef, closeUser, userOpen);

  const notices = useQuery(
    () =>
      apiRequest<Paginated<Notice>>("/notices", {
        params: { per_page: 5 },
      }),
    [],
  );

  useEffect(() => {
    setNoticesOpen(false);
    setUserOpen(false);
  }, [pathname]);

  if (!user) return null;

  const displayName = nameFromEmail(user.email);
  const noticeCount = notices.data?.items.length ?? 0;

  async function handleLogout() {
    setSigningOut(true);
    setUserOpen(false);
    await logout();
    toast("Signed out", "info");
    router.replace("/login");
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="flex h-full items-center gap-2 px-3 sm:gap-3 sm:px-4">
        <button
          type="button"
          onClick={onOpenMobile}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 lg:hidden"
          aria-label="Open navigation"
        >
          <Icon name="menu" size={20} />
        </button>

        <BrandMark className="mr-1" />

        <div className="hidden min-w-0 items-center gap-3 md:flex">
          <span className="h-6 w-px bg-slate-200" aria-hidden="true" />
          <span className="truncate text-sm font-medium text-slate-500">
            {pageTitleFor(pathname)}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="hidden h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 lg:flex"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={19} />
          </button>

          <div className="relative" ref={noticesRef}>
            <button
              type="button"
              onClick={() => {
                setNoticesOpen((open) => !open);
                setUserOpen(false);
              }}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200"
              aria-label="Notices"
              aria-expanded={noticesOpen}
              aria-haspopup="menu"
            >
              <Icon name="bell" size={19} />
              {noticeCount > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-600 px-1 text-[9px] font-bold leading-none text-white">
                  {noticeCount}
                </span>
              ) : null}
            </button>

            {noticesOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">Notices</p>
                  <span className="text-[11px] text-slate-400">Latest 5</span>
                </div>
                {notices.loading ? (
                  <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-slate-500">
                    <Spinner className="h-4 w-4" /> Loading notices…
                  </div>
                ) : notices.error ? (
                  <p className="px-4 py-6 text-center text-xs text-slate-500">
                    {notices.error.message}
                  </p>
                ) : noticeCount === 0 ? (
                  <p className="px-4 py-8 text-center text-xs text-slate-500">
                    No notices right now.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {notices.data?.items.map((notice) => (
                      <li key={notice.id}>
                        <Link
                          href="/notices"
                          className="block px-4 py-3 transition-colors hover:bg-slate-50"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                              <Icon name="megaphone" size={14} />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-slate-800">
                                {notice.title}
                              </p>
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {formatDateTime(notice.published_at)}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2.5">
                  <Link
                    href="/notices"
                    className="flex items-center justify-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    View all notices
                    <Icon name="arrowRight" size={13} />
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => {
                setUserOpen((open) => !open);
                setNoticesOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-1.5 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 sm:pr-2.5"
              aria-label="Account menu"
              aria-expanded={userOpen}
              aria-haspopup="menu"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white shadow-sm">
                {initials(displayName)}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block max-w-[130px] truncate text-xs font-semibold text-slate-800">
                  {displayName}
                </span>
                <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  {ROLE_LABELS[user.role]}
                </span>
              </span>
              <Icon
                name="chevronDown"
                size={14}
                className="hidden text-slate-400 sm:block"
              />
            </button>

            {userOpen ? (
              <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {displayName}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {user.email}
                  </p>
                  <div className="mt-2">
                    <Badge tone={ROLE_BADGE_TONES[user.role]}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                  </div>
                </div>
                <div className="p-1.5">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Icon name="user" size={16} className="text-slate-400" />
                    My profile
                  </Link>
                  <Link
                    href="/change-password"
                    className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Icon name="lock" size={16} className="text-slate-400" />
                    Change password
                  </Link>
                </div>
                <div className="border-t border-slate-100 p-1.5">
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={signingOut}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-rose-600 transition-colors hover:bg-rose-50 disabled:opacity-60"
                  >
                    {signingOut ? (
                      <Spinner className="h-4 w-4 text-rose-500" />
                    ) : (
                      <Icon name="logout" size={16} />
                    )}
                    Sign out
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
