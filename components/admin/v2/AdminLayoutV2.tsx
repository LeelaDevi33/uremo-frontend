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
import { useEffect, useState, createContext, useContext, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import CommandRail from "@/components/admin/v2/CommandRail";
import ContextBar from "@/components/admin/v2/ContextBar";
import { apiRequest } from "@/lib/api";

// Admin Context for sharing state across admin pages
interface AdminContextType {
  badges: BadgeCounts;
  refreshBadges: () => Promise<void>;
  railCollapsed: boolean;
  setRailCollapsed: (collapsed: boolean) => void;
}

interface BadgeCounts {
  pendingOrders: number;
  pendingProofs: number;
  openTickets: number;
  pendingPayments: number;
  pendingApplications: number;
  stuckOrders: number;
  invalidScreenings: number;
  pendingWithdrawals: number;
}

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
  const [badges, setBadges] = useState<BadgeCounts>({
    pendingOrders: 0,
    pendingProofs: 0,
    openTickets: 0,
    pendingPayments: 0,
    pendingApplications: 0,
    stuckOrders: 0,
    invalidScreenings: 0,
    pendingWithdrawals: 0,
  });

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

  // Load badge counts
  const refreshBadges = async () => {
    try {
      // Parallel fetch all counts
      const [
        ordersRes,
        ticketsRes,
        proofsRes,
        appsRes,
        screeningsRes,
        affiliateRes,
      ] = await Promise.allSettled([
        apiRequest("/api/admin/orders", "GET", null, true),
        apiRequest("/api/admin/tickets", "GET", null, true),
        apiRequest("/api/admin/proofs", "GET", null, true),
        apiRequest("/api/apply-work/admin", "GET", null, true),
        apiRequest("/api/admin/workspace/screenings", "GET", null, true),
        apiRequest("/api/admin/affiliate/withdrawals", "GET", null, true),
      ]);

      const newBadges: BadgeCounts = {
        pendingOrders: 0,
        pendingProofs: 0,
        openTickets: 0,
        pendingPayments: 0,
        pendingApplications: 0,
        stuckOrders: 0,
        invalidScreenings: 0,
        pendingWithdrawals: 0,
      };

      // Orders
      if (ordersRes.status === "fulfilled") {
        const orders = Array.isArray(ordersRes.value)
          ? ordersRes.value
          : ordersRes.value?.orders || [];
        newBadges.pendingOrders = orders.filter(
          (o: any) => o.status === "pending" || o.status === "payment_pending",
        ).length;
        newBadges.pendingPayments = orders.filter(
          (o: any) => o.status === "payment_pending",
        ).length;
        newBadges.stuckOrders = orders.filter((o: any) => {
          if (o.status !== "in_progress") return false;
          const updated = new Date(o.updatedAt);
          const now = new Date();
          const hoursDiff =
            (now.getTime() - updated.getTime()) / (1000 * 60 * 60);
          return hoursDiff > 48; // Stuck if no update in 48 hours
        }).length;
      }

      // Tickets
      if (ticketsRes.status === "fulfilled") {
        newBadges.openTickets = ticketsRes.value?.stats?.open || 0;
      }

      // Proofs
      if (proofsRes.status === "fulfilled") {
        const proofs = proofsRes.value?.proofs || [];
        newBadges.pendingProofs = proofs.filter(
          (p: any) => p.status === "pending",
        ).length;
      }

      // Applications
      if (appsRes.status === "fulfilled") {
        const apps = Array.isArray(appsRes.value)
          ? appsRes.value
          : appsRes.value?.applications || [];
        newBadges.pendingApplications = apps.filter(
          (a: any) => a.status === "pending",
        ).length;
      }

      // Invalid screenings (0 questions)
      if (screeningsRes.status === "fulfilled") {
        const screenings = Array.isArray(screeningsRes.value)
          ? screeningsRes.value
          : screeningsRes.value?.screenings || [];
        newBadges.invalidScreenings = screenings.filter(
          (s: any) => !s.questions || s.questions.length === 0,
        ).length;
      }

      // Pending withdrawals
      if (affiliateRes.status === "fulfilled") {
        const withdrawals = Array.isArray(affiliateRes.value)
          ? affiliateRes.value
          : affiliateRes.value?.withdrawals || [];
        newBadges.pendingWithdrawals = withdrawals.filter(
          (w: any) => w.status === "pending",
        ).length;
      }

      setBadges(newBadges);
    } catch (err) {
      console.error("Failed to refresh badges:", err);
    }
  };

  useEffect(() => {
    if (ready && isLoggedIn && isAdmin) {
      refreshBadges();
      // Refresh every 30 seconds
      const interval = setInterval(refreshBadges, 30000);
      return () => clearInterval(interval);
    }
  }, [ready, isLoggedIn, isAdmin]);

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
    badges,
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
