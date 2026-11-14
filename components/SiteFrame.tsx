"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { isPrivateMemberPath } from "@/lib/authReturnPath";
import Navbar from "./Navbar";

function MemberSession({ children, pathname }: { children: ReactNode; pathname: string }) {
  const router = useRouter();
  const { ready, isAuthenticated } = useAuth();
  useEffect(() => {
    if (ready && !isAuthenticated) {
      const next = pathname + window.location.search + window.location.hash;
      router.replace("/login?next=" + encodeURIComponent(next));
    }
  }, [ready, isAuthenticated, pathname, router]);
  if (!ready || !isAuthenticated) return <p role="status" className="u-container py-8">Checking sign-in…</p>;
  return children;
}

export default function SiteFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return children;
  return <><Navbar /><main className="pt-14">
    {isPrivateMemberPath(pathname) ? <MemberSession pathname={pathname}>{children}</MemberSession> : children}
  </main></>;
}
