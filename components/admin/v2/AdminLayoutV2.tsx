"use client";

/**
 * PATCH_63: MASTER ADMIN REBUILD
 * New Admin Layout - Operating System Style
 *
 * Structure:
 * - LEFT: Command Rail (operations-based, collapsible)
 * - TOP: Context Bar (current entity + available actions)
 * - CENTER: Master Workspace (dynamic canvas)
 * - RIGHT (optional): Inspector Drawer
 */

import type { ReactNode } from "react";
import { useEffect, useState, useCallback, createContext, useContext, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import CommandRail from "@/components/admin/v2/CommandRail";
import ContextBar from "@/components/admin/v2/ContextBar";
import { ADMIN_DATA_CHANGED_EVENT, apiRequest } from "@/lib/api";

// Admin Context for sharing state across admin pages
interface AdminContextType {
  badges: BadgeCounts;
  summary: OperationsSummary | null;
  summaryError: boolean;
  refreshBadges: () => Promise<void>;
  railCollapsed: boolean;
  setRailCollapsed: (collapsed: boolean) => void;
}

export interface BadgeCounts {
  pendingOrders: number;
  pendingProofs: number;
  openTickets: number;
  pendingTopups: number;
  pendingApplications: number;
  stuckOrders: number;
  invalidScreenings: number;
  walletWithdrawals: number;
  referralWithdrawals: number;
}

interface OperationsSummary {
  marketplace: { published: number; drafts: number; activeRentals: number; sales: number };
  projects: number; datasets: number; approvedSubmissions: number; pendingReviews: number; users: number;
  badges: BadgeCounts;
}
const emptyBadges: BadgeCounts = {
  pendingOrders: 0, pendingProofs: 0, openTickets: 0, pendingTopups: 0,
  pendingApplications: 0, stuckOrders: 0, invalidScreenings: 0, walletWithdrawals: 0, referralWithdrawals: 0,
};

const AdminContext = createContext<AdminContextType | null>(null);

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdminContext must be used within AdminLayoutV2");
  }
  return context;
}

export default function AdminLayoutV2({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, isLoggedIn, isAdmin } = useAuth();

  const [railCollapsed, setRailCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeMobile = () => {
    setMobileOpen(false);
    requestAnimationFrame(() => menuButton.current?.focus());
  };
  useEffect(() => {
    if (!mobileOpen) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onResize = () => { if (desktop.matches) setMobileOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeMobile(); };
    const closeButton = document.querySelector<HTMLButtonElement>('#admin-navigation [aria-label="Close admin navigation"]');
    closeButton?.focus();
    desktop.addEventListener("change", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      desktop.removeEventListener("change", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);
  const [summary, setSummary] = useState<OperationsSummary | null>(null);
  const [summaryError, setSummaryError] = useState(false);
  const latest = useRef(0);
  const badges = summary?.badges ?? emptyBadges;

  // Auth check
  useEffect(() => {
    if (!ready) return;
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/dashboard");
    }
  }, [ready, isLoggedIn, isAdmin, router]);

  const refreshBadges = useCallback(async () => {
    const sequence = ++latest.current;
    try {
      const next = await apiRequest<OperationsSummary>("/api/admin/operations-summary", "GET", null, true);
      if (sequence === latest.current) { setSummary(next); setSummaryError(false); }
    } catch {
      if (sequence === latest.current) setSummaryError(true);
    }
  }, []);

  useEffect(() => {
    if (!ready || !isLoggedIn || !isAdmin) return;
    void refreshBadges();
    const timer = window.setInterval(refreshBadges, 30000);
    let afterWrite: number | undefined;
    const onWrite = () => {
      window.clearTimeout(afterWrite);
      afterWrite = window.setTimeout(refreshBadges, 150);
    };
    window.addEventListener(ADMIN_DATA_CHANGED_EVENT, onWrite);
    window.addEventListener("focus", refreshBadges);
    return () => {
      latest.current++;
      window.clearInterval(timer);
      window.clearTimeout(afterWrite);
      window.removeEventListener(ADMIN_DATA_CHANGED_EVENT, onWrite);
      window.removeEventListener("focus", refreshBadges);
    };
  }, [ready, isLoggedIn, isAdmin, refreshBadges]);

  // Loading state
  if (!ready) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-400">Loading Admin Panel...</span>
        </div>
      </div>
    );
  }

  // Auth redirect
  if (!isLoggedIn || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#050810] flex items-center justify-center">
        <div className="text-slate-400">Redirecting...</div>
      </div>
    );
  }

  const contextValue: AdminContextType = {
    badges, summary, summaryError,
    refreshBadges,
    railCollapsed,
    setRailCollapsed,
  };

  return (
    <AdminContext.Provider value={contextValue}>
      <div className="min-h-screen bg-[#050810] flex">
        {/* Command Rail */}
        <CommandRail
          collapsed={railCollapsed && !mobileOpen}
          onToggle={() => setRailCollapsed(!railCollapsed)}
          mobileOpen={mobileOpen}
          onCloseMobile={closeMobile}
          badges={badges}
        />
        {mobileOpen && (
          <button type="button" aria-label="Dismiss navigation overlay" onClick={closeMobile}
            className="fixed inset-0 z-40 bg-black/60 lg:hidden" />
        )}

        {/* Main Content Area */}
        <div
          inert={mobileOpen}
          className={`min-w-0 flex-1 flex flex-col transition-all duration-300
                     ${railCollapsed ? "lg:ml-16" : "lg:ml-64"}`}
        >
          {/* Context Bar */}
          <ContextBar menuButton={
            <button type="button" ref={menuButton} aria-controls="admin-navigation"
              aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}
              className="rounded border border-white/15 px-3 py-2 text-sm text-white lg:hidden">
              Admin menu
            </button>
          } />

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
