"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand";
import { Spinner } from "@/components/ui/feedback";
import { useAuth } from "@/lib/auth";

export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    router.replace(user ? "/dashboard" : "/login");
  }, [ready, user, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-slate-50">
      <BrandMark asLink={false} />
      <Spinner />
    </div>
  );
}
