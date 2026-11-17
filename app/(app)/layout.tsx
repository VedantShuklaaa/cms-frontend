"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Spinner } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth";
import { SIDEBAR_STORAGE_KEY } from "@/lib/constants";
import { canAccessRoute } from "@/lib/navigation";
import { cn } from "@/lib/utils";

function ShellSplash({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50">
      <BrandMark asLink={false} />
      <div className="flex items-center gap-2.5 text-sm text-slate-500">
        <Spinner className="h-4 w-4" />
        {message}
      </div>
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  const { user, ready } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1");
    } catch {
      // Ignore unavailable storage.
    }
    setPreferencesLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      // Ignore unavailable storage.
    }
  }, [collapsed, preferencesLoaded]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const allowed = user ? canAccessRoute(pathname, user.role) : false;

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!canAccessRoute(pathname, user.role)) {
      router.replace("/dashboard");
    }
  }, [ready, user, pathname, router]);

  if (!ready) {
    return <ShellSplash message="Preparing your workspace…" />;
  }

  if (!user) {
    return <ShellSplash message="Redirecting to sign in…" />;
  }

  if (!allowed) {
    return <ShellSplash message="Checking access…" />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar
        collapsed={collapsed}
        onToggleSidebar={() => setCollapsed((value) => !value)}
        onOpenMobile={() => setMobileOpen(true)}
      />
      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <main
        className={cn(
          "min-h-screen pt-16 transition-[padding] duration-200 ease-out",
          collapsed ? "lg:pl-[72px]" : "lg:pl-[260px]",
        )}
      >
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
