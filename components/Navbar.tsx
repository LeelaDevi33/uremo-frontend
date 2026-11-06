"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import ProfileMenu from "@/components/ProfileMenu";
import NotificationBell from "@/components/NotificationBell";
import { useAdminSupportUnread } from "@/lib/supportUnread";
import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  useSiteSettings,
} from "@/hooks/useSiteSettings";
import {
  EmojiMarketplace,
  EmojiWork,
  EmojiWallet,
  EmojiOrders,
  EmojiAccount,
  EmojiDashboard,
  EmojiServices,
  EmojiWorkforce,
  EmojiAIData,
  EmojiFinance,
  EmojiSupport,
  EmojiSettings,
} from "@/components/ui/Emoji";

export default function Navbar() {
  const { ready, user, isAuthenticated, logout } = useAuth();
  const pathname = usePathname();
  const [logoFailed, setLogoFailed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: settings } = useSiteSettings();
  const { total: adminUnreadTotal } = useAdminSupportUnread();

  const nav = settings?.nav || DEFAULT_PUBLIC_SITE_SETTINGS.nav;
  const site = settings?.site || DEFAULT_PUBLIC_SITE_SETTINGS.site;
  const supportEmail =
    settings?.support?.supportEmail ||
    DEFAULT_PUBLIC_SITE_SETTINGS.support.supportEmail;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  // PATCH_102: Enterprise user navigation — Marketplace, Work, Wallet, Orders, Account
  const userLinks = [
    {
      href: "/open-roles",
      label: "Open roles",
      emoji: <EmojiMarketplace />,
    },
    { href: "/projects/rent", label: "Rent projects", emoji: <EmojiServices /> },
    { href: "/projects/full-access", label: "Full Access", emoji: <EmojiServices /> },
    { href: "/workspace", label: "Work", emoji: <EmojiWork /> },
    { href: "/wallet", label: "Wallet", emoji: <EmojiWallet /> },
    { href: "/profile", label: "Account", emoji: <EmojiAccount /> },
  ];

  // PATCH_102: Simplified admin links for mobile drawer (full nav is in CommandRail)
  const adminLinks = [
    { href: "/admin", label: "Dashboard", emoji: <EmojiDashboard /> },
    { href: "/admin/opportunities", label: "Project offers", emoji: <EmojiServices /> },
    { href: "/admin/orders", label: "Orders", emoji: <EmojiOrders /> },
    {
      href: "/admin/workspace/master",
      label: "Workforce",
      emoji: <EmojiWorkforce />,
    },
    { href: "/admin/datasets", label: "AI Data", emoji: <EmojiAIData /> },
    { href: "/admin/wallet", label: "Finance", emoji: <EmojiFinance /> },
    { href: "/admin/tickets", label: "Support", emoji: <EmojiSupport /> },
    { href: "/admin/settings", label: "Settings", emoji: <EmojiSettings /> },
  ];

  if (!ready) {
    return (
      <div
        className="px-6 py-4 border-b border-white/10 h-14"
        aria-busy="true"
      />
    );
  }

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-[9999] pointer-events-auto h-14 border-b border-white/10 bg-slate-900/95 backdrop-blur-xl">
        <div className="h-14 px-4 lg:px-6 flex items-center max-w-7xl mx-auto">
          <div className="flex items-center w-full">
            {/* Left section - Hamburger on mobile */}
            <div className="flex items-center gap-4">
              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
                  aria-label="Open menu"
                  aria-controls="mobile-menu"
                  aria-expanded={mobileMenuOpen}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  </svg>
                </button>
              )}

              {/* Logo */}
              <Link
                href="/"
                className="inline-flex items-center gap-2 min-w-0"
                aria-label="UREMO Home"
              >
                {!logoFailed ? (
                  <>
                    <Image
                      src="/brand/logo-mark.png"
                      alt={site.brandName || ""}
                      width={32}
                      height={32}
                      priority
                      className="lg:hidden"
                      onError={() => setLogoFailed(true)}
                    />
                    <Image
                      src="/brand/logo-full.png"
                      alt={site.brandName || ""}
                      width={120}
                      height={36}
                      priority
                      className="hidden lg:block"
                      onError={() => setLogoFailed(true)}
                    />
                  </>
                ) : (
                  <span className="text-lg md:text-xl font-bold truncate">
                    {site.brandName ||
                      DEFAULT_PUBLIC_SITE_SETTINGS.site.brandName}
                  </span>
                )}
              </Link>
            </div>

            {/* Center section - Desktop navigation */}
            {isAuthenticated && (
              <div className="hidden lg:flex items-center gap-1 ml-8">
                {userLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                      pathname === link.href
                        ? "bg-white/10 text-white"
                        : "text-slate-300 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {link.emoji} {link.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Right section */}
            <div className="ml-auto flex gap-2 md:gap-3 items-center">
              {!isAuthenticated && pathname === "/" && (
                <>
                  <Link
                    href="/blogs"
                    className="text-sm text-slate-300 hover:text-white transition hidden sm:inline"
                  >
                    Blogs
                  </Link>
                  <Link href="/signup" className="btn-primary">
                    {nav.guestPrimaryCtaText}
                  </Link>
                  <Link
                    href="/open-roles"
                    className="btn-secondary hidden sm:inline-flex"
                  >
                    Open roles
                  </Link>
                </>
              )}

              {!isAuthenticated && pathname !== "/" && (
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <Link
                    href="/blogs"
                    className="hover:text-white transition hidden sm:inline"
                  >
                    Blogs
                  </Link>
                  <Link href="/signup" className="hover:text-white transition">
                    {nav.guestSignupText}
                  </Link>
                  <Link href="/login" className="hover:text-white transition">
                    {nav.guestLoginText}
                  </Link>
                  <Link
                    href="/support"
                    className="hidden sm:inline hover:text-white transition"
                  >
                    {nav.supportLinkText}
                  </Link>
                </div>
              )}

              {isAuthenticated && user?.role === "admin" && (
                <Link
                  href="/admin/messages"
                  className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
                  aria-label="Admin inbox"
                  title="Admin inbox"
                >
                  <svg
                    className="w-5 h-5 text-slate-200"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V4a2 2 0 10-4 0v1.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>

                  {adminUnreadTotal > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-red-600 text-white text-[11px] leading-5 text-center border border-slate-900">
                      {adminUnreadTotal > 99 ? "99+" : adminUnreadTotal}
                    </span>
                  )}
                </Link>
              )}

              {/* Global Notification Bell - for all authenticated users */}
              {isAuthenticated && <NotificationBell />}

              {isAuthenticated && <ProfileMenu />}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      {isAuthenticated && (
        <>
          {/* Overlay */}
          <div
            className={`fixed inset-0 z-[10000] bg-black/60 backdrop-blur-sm transition-opacity lg:hidden ${
              mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div
            id="mobile-menu"
            inert={!mobileMenuOpen}
            aria-hidden={!mobileMenuOpen}
            className={`fixed inset-y-0 left-0 z-[10001] w-80 max-w-[85vw] bg-slate-900 border-r border-white/10 shadow-2xl transform transition-transform duration-300 lg:hidden ${
              mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
            }`}
          >
            {/* Drawer Header */}
            <div className="h-14 px-4 flex items-center justify-between border-b border-white/10">
              <Link
                href="/"
                className="inline-flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {!logoFailed ? (
                  <Image
                    src="/brand/logo-full.png"
                    alt={site.brandName || ""}
                    width={100}
                    height={30}
                    priority
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <span className="text-lg font-bold">
                    {site.brandName ||
                      DEFAULT_PUBLIC_SITE_SETTINGS.site.brandName}
                  </span>
                )}
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
                aria-label="Close menu"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto py-4">
              {/* User Links */}
              <div className="px-3 mb-4">
                <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Menu
                </p>
                <div className="space-y-1">
                  {userLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        pathname === link.href
                          ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-white border border-indigo-500/30"
                          : "text-slate-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {link.emoji} {link.label}
                    </Link>
                  ))}
                  <Link
                    href="/support"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-white/5 transition-all"
                  >
                    {nav.supportLinkText}
                  </Link>
                </div>
              </div>

              {/* Admin Links */}
              {user?.role === "admin" && (
                <div className="px-3 pt-4 border-t border-white/10">
                  <p className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Admin
                  </p>
                  <div className="space-y-1">
                    {adminLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          pathname === link.href ||
                          pathname.startsWith(link.href + "/")
                            ? "bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-white border border-amber-500/30"
                            : "text-slate-300 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {link.emoji} {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer - User Info */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout();
                }}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 border border-red-500/20 transition-all"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
