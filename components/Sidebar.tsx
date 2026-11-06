"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/hooks/useSidebar";
import { maskEmail } from "@/lib/maskEmail";
import { apiRequest } from "@/lib/api";
import {
  EmojiMarketplace,
  EmojiWorkspace,
  EmojiOrders,
  EmojiWallet,
  EmojiAffiliate,
  EmojiRentals,
  EmojiNotifications,
  EmojiSupport,
  EmojiDashboard,
} from "@/components/ui/Emoji";

function SidebarUserMenu(props: { onNavigate?: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const email = String(user?.email || "").trim();
  const avatarLetter = useMemo(() => {
    const v = email || user?.name || "U";
    return String(v).trim().charAt(0).toUpperCase() || "U";
  }, [email, user?.name]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!open) return;
      const el = wrapperRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const onNavigate = () => {
    setOpen(false);
    props.onNavigate?.();
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition px-3 py-3"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/10 border border-white/10 text-white font-semibold shrink-0">
            {avatarLetter}
          </span>
          <div className="min-w-0">
            <p className="text-sm text-white font-medium leading-tight">
              Account
            </p>
            <p className="text-xs text-slate-400 truncate leading-tight">
              {maskEmail(email) || "—"}
            </p>
          </div>
        </div>
        <span className="text-slate-400">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Sidebar account menu"
          className="absolute left-0 right-0 mt-2 rounded-2xl border border-white/10 bg-[#020617]/95 backdrop-blur shadow-[0_18px_60px_rgba(0,0,0,0.45)] overflow-hidden z-[9999]"
        >
          <div className="p-2">
            <Link
              role="menuitem"
              href="/profile"
              onClick={onNavigate}
              className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              My Profile
            </Link>

            <Link
              role="menuitem"
              href="/orders"
              onClick={onNavigate}
              className="block rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
            >
              My Orders
            </Link>

            <div className="my-2 h-px bg-white/10" />

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onNavigate();
                logout();
              }}
              className="w-full text-left rounded-xl px-3 py-2 text-sm text-red-200 hover:bg-red-500/10"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar() {
  const { isAuthenticated, user } = useAuth();
  const { isSidebarOpen, closeSidebar } = useSidebar();
  const pathname = usePathname();

  // PATCH_53: Notification unread count for sidebar badge
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await apiRequest<any>(
        "/api/notifications/unread-count",
        "GET",
        null,
        true,
      );
      if (typeof res.unreadCount === "number") {
        setUnreadCount(res.unreadCount);
      }
    } catch {
      // Silently fail
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  if (!isAuthenticated) return null;

  // PATCH_52 + PATCH_53: Simplified user navigation with badge support
  const links = [
    {
      name: "Open roles",
      href: "/open-roles",
      badge: 0,
      emoji: <EmojiMarketplace />,
    },
    {
      name: "Workspace",
      href: "/workspace",
      badge: 0,
      emoji: <EmojiWorkspace />,
    },
    { name: "Rent projects", href: "/projects/rent", badge: 0, emoji: <EmojiRentals /> },
    { name: "Full Access projects", href: "/projects/full-access", badge: 0, emoji: <EmojiMarketplace /> },
    { name: "My project access", href: "/opportunities/access", badge: 0, emoji: <EmojiRentals /> },
    { name: "Orders", href: "/orders", badge: 0, emoji: <EmojiOrders /> },
    { name: "Wallet", href: "/wallet", badge: 0, emoji: <EmojiWallet /> },
    {
      name: "Affiliate",
      href: "/affiliate",
      badge: 0,
      emoji: <EmojiAffiliate />,
    },
    { name: "Past rentals", href: "/rentals", badge: 0, emoji: <EmojiRentals /> },
    {
      name: "Notifications",
      href: "/notifications",
      badge: unreadCount,
      emoji: <EmojiNotifications />,
    },
    { name: "Support", href: "/support", badge: 0, emoji: <EmojiSupport /> },
  ];

  // PATCH_52: Cleaned up admin navigation - PATCH_53: Collapsed to single Admin link
  const adminLinks = [
    { name: "Admin", href: "/admin", emoji: <EmojiDashboard /> },
  ];

  const linkClass = (href: string) => {
    const active = pathname === href || pathname?.startsWith(`${href}/`);
    return `group flex items-center justify-between rounded-xl px-3 py-2 text-sm transition border ${
      active
        ? "bg-white/5 border-white/15 text-white"
        : "border-transparent text-zinc-300 hover:text-white hover:bg-white/5"
    }`;
  };

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 lg:hidden z-40 pointer-events-auto"
          onClick={closeSidebar}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        aria-hidden={!isSidebarOpen}
        className={`fixed top-0 left-0 h-full w-[80vw] max-w-[280px] bg-[#020617]/95 border-r border-white/10 p-5 lg:hidden z-50 transform transition-transform duration-200 backdrop-blur ${
          isSidebarOpen
            ? "translate-x-0 pointer-events-auto"
            : "-translate-x-full pointer-events-none"
        }`}
      >
        <nav className="space-y-3">
          <SidebarUserMenu onNavigate={closeSidebar} />

          <p className="text-[11px] tracking-widest text-[#9CA3AF]">USER</p>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClass(link.href)}
              onClick={closeSidebar}
            >
              <span className="flex items-center gap-2">
                {link.emoji} {link.name}
                {link.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white min-w-[18px] text-center">
                    {link.badge > 99 ? "99+" : link.badge}
                  </span>
                )}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition text-[#9CA3AF]">
                →
              </span>
            </Link>
          ))}

          {user?.role === "admin" && (
            <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
              <p className="text-[11px] tracking-widest text-[#9CA3AF]">
                ADMIN
              </p>
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={linkClass(link.href)}
                  onClick={closeSidebar}
                >
                  <span className="flex items-center gap-2">
                    {link.emoji} {link.name}
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition text-[#9CA3AF]">
                    →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </nav>
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:block fixed left-0 top-14 w-[260px] h-[calc(100vh-56px)] border-r border-white/10 bg-black/10 backdrop-blur z-30">
        <nav className="space-y-3 p-5 overflow-y-auto h-full">
          <div className="sticky top-0 z-10 -mx-5 px-5 pb-3 pt-2 bg-[#020617]/70 backdrop-blur border-b border-white/10">
            <SidebarUserMenu />
          </div>

          <p className="text-[11px] tracking-widest text-[#9CA3AF]">USER</p>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={linkClass(link.href)}
            >
              <span className="flex items-center gap-2">
                {link.emoji} {link.name}
                {link.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-red-500 text-white min-w-[18px] text-center">
                    {link.badge > 99 ? "99+" : link.badge}
                  </span>
                )}
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition text-[#9CA3AF]">
                →
              </span>
            </Link>
          ))}

          {user?.role === "admin" && (
            <div className="pt-4 mt-4 border-t border-white/10 space-y-3">
              <p className="text-[11px] tracking-widest text-[#9CA3AF]">
                ADMIN
              </p>
              {adminLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={linkClass(link.href)}
                >
                  <span className="flex items-center gap-2">
                    {link.emoji} {link.name}
                  </span>
                  <span className="opacity-0 group-hover:opacity-100 transition text-[#9CA3AF]">
                    →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
