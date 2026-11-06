"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { maskEmail } from "@/lib/maskEmail";

export default function ProfileMenu() {
  const { user, logout, isAdmin } = useAuth();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const email = String(user?.email || "").trim();
  const avatarLetter = useMemo(() => {
    const v = email || user?.name || "U";
    return String(v).trim().charAt(0).toUpperCase() || "U";
  }, [email, user?.name]);

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on outside click
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

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 transition-all shadow-lg shadow-indigo-500/20"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
      >
        <span className="text-white font-semibold text-sm">{avatarLetter}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Profile menu"
          className="absolute right-0 mt-2 w-[280px] rounded-2xl border border-white/10 bg-slate-900/98 backdrop-blur-xl shadow-2xl overflow-hidden z-[9999]"
        >
          <div className="p-4 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                {avatarLetter}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user?.name || "User"}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {maskEmail(email) || "—"}
                </p>
              </div>
            </div>
          </div>

          <div className="p-2">
            <Link
              role="menuitem"
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition-colors"
            >
              <span className="text-base">Me</span>
              Profile
            </Link>

            <Link
              role="menuitem"
              href="/orders"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition-colors"
            >
              <span className="text-base">Ord</span>
              My Orders
            </Link>

            <Link
              role="menuitem"
              href="/profile#project-access"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition-colors"
            >
              <span className="text-base">Work</span>
              My project access
            </Link>

            <Link
              role="menuitem"
              href="/support"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-200 hover:bg-white/5 transition-colors"
            >
              <span className="text-base">Help</span>
              Support
            </Link>

            {isAdmin && (
              <>
                <div className="my-2 h-px bg-white/10" />
                <Link
                  role="menuitem"
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-amber-300 hover:bg-amber-500/10 transition-colors"
                >
                  <span className="text-base">Admin</span>
                  Admin Panel
                </Link>
              </>
            )}

            <div className="my-2 h-px bg-white/10" />

            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <span className="text-base">Exit</span>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
