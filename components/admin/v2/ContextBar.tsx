"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";
import ProfileMenu from "@/components/ProfileMenu";
import { useAdminSupportUnread } from "@/lib/supportUnread";
import { adminToolForPath } from "./adminNavigation";

export default function ContextBar({ menuButton }: { menuButton: ReactNode }) {
  const pathname = usePathname();
  const tool = adminToolForPath(pathname);
  const { total } = useAdminSupportUnread();
  return <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b border-white/10 bg-[#0d1519] px-3 sm:px-6">
    <div className="flex min-w-0 items-center gap-3">
      {menuButton}
      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-2 text-sm text-slate-300 sm:flex">
        {pathname === "/admin" ? <span aria-current="page">Admin dashboard</span> : <>
          <Link href="/admin" className="hover:text-white">Admin dashboard</Link><span aria-hidden="true">/</span>
          {tool && pathname !== tool.href ? <><Link className="hover:text-white" href={tool.href}>{tool.label}</Link><span aria-hidden="true">/</span><span aria-current="page">Details</span></> : <span aria-current="page">{tool?.label ?? "Admin"}</span>}
        </>}
      </nav>
    </div>
    <div className="flex items-center gap-2">
      <Link href="/admin/messages" className="rounded px-2 py-2 text-sm text-emerald-100 hover:bg-white/5">Inbox{total > 0 && <span className="ml-1 rounded bg-emerald-900 px-1.5 text-xs" aria-label={`${total} unread messages`}>{total}</span>}</Link>
      <NotificationBell /><ProfileMenu />
    </div>
  </header>;
}
