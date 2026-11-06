"use client";

/**
 * PATCH_58: Premium Dashboard Redesign
 * Trust-building, high-conversion, personalized command center
 *
 * PATCH_57: User Onboarding & First-Action Guidance
 * Added collapsible guidance section for new users
 *
 * Sections:
 * A) Welcome Header with profile
 * A1) First-Login Nudge Banner (PATCH_57)
 * A2) Guided Actions Section (PATCH_57)
 * B) Trust & Proof Strip
 * C) Quick Actions
 * D) Earnings & Wallet
 * E) Active Work Area
 * F) Personalized Recommendations
 * G) Learning & Help
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import { EmojiSparkles } from "@/components/ui/Emoji";

// ==================== PATCH_57: ICONS ====================
const IconChevronDown = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const IconX = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

const IconShoppingBag = () => (
  <svg
    className="w-7 h-7"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
    />
  </svg>
);

const IconBuildingOffice = () => (
  <svg
    className="w-7 h-7"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21"
    />
  </svg>
);

const IconCurrencyDollar = () => (
  <svg
    className="w-7 h-7"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// ==================== SVG ICONS ====================
const IconBriefcase = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z"
    />
  </svg>
);

const IconSparkles = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
    />
  </svg>
);

const IconWallet = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3"
    />
  </svg>
);

const IconGift = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
    />
  </svg>
);

const IconShield = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

const IconClock = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const IconArrowUp = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18"
    />
  </svg>
);

const IconPackage = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
    />
  </svg>
);

const IconSupport = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
    />
  </svg>
);

const IconCheck = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4.5 12.75l6 6 9-13.5"
    />
  </svg>
);

const IconUsers = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
    />
  </svg>
);

const IconLock = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
    />
  </svg>
);

// ==================== TYPES ====================
interface DashboardStats {
  walletBalance: number;
  totalEarnings: number;
  pendingEarnings: number;
  ordersCount: number;
  activeOrders: number;
  completedOrders: number;
  referralCount: number;
  affiliateBalance: number;
}

interface Order {
  _id: string;
  service?: { title: string };
  status: string;
  createdAt: string;
  amount?: number;
}

interface PlatformStats {
  activeServices: number;
  activeJobRoles: number;
  totalUsers: number;
  completedOrders: number;
}

// ==================== MAIN COMPONENT ====================
export default function Dashboard() {
  const router = useRouter();
  const { user, isAdmin, isAuthenticated, ready } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    walletBalance: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    ordersCount: 0,
    activeOrders: 0,
    completedOrders: 0,
    referralCount: 0,
    affiliateBalance: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  // PATCH_57: Onboarding guidance state
  const [guidanceCollapsed, setGuidanceCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("uremo_guidance_collapsed") === "true";
    }
    return false;
  });
  const [nudgeDismissed, setNudgeDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("uremo_nudge_dismissed") === "true";
    }
    return false;
  });

  // PATCH_57: Check if user is new (created within last 7 days or has low activity)
  const isNewUser =
    stats.ordersCount === 0 &&
    stats.completedOrders === 0 &&
    stats.referralCount === 0;

  const showOnboarding = user && !(user as any).onboardingCompleted;
  const firstName =
    user?.name?.split(" ")[0] || user?.email?.split("@")[0] || "there";

  // Calculate profile completion
  const getProfileCompletion = useCallback(() => {
    let score = 0;
    if (user?.name) score += 25;
    if (user?.email) score += 25;
    if ((user as any)?.onboardingCompleted) score += 25;
    if ((user as any)?.phone) score += 25;
    return score;
  }, [user]);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const [walletRes, ordersRes, affiliateRes] = await Promise.allSettled([
        apiRequest("/api/wallet/balance", "GET"),
        apiRequest("/api/orders/my", "GET"),
        apiRequest("/api/affiliate/stats", "GET"),
      ]);

      const wallet = walletRes.status === "fulfilled" ? walletRes.value : {};
      const orders = ordersRes.status === "fulfilled" ? ordersRes.value : [];
      const affiliate =
        affiliateRes.status === "fulfilled" ? affiliateRes.value : {};

      const orderList = Array.isArray(orders) ? orders : [];

      setStats({
        walletBalance: wallet?.balance || 0,
        totalEarnings: affiliate?.stats?.totalEarned || 0,
        pendingEarnings: affiliate?.stats?.pendingAmount || 0,
        ordersCount: orderList.length,
        activeOrders: orderList.filter(
          (o: Order) => o.status !== "completed" && o.status !== "cancelled",
        ).length,
        completedOrders: orderList.filter(
          (o: Order) => o.status === "completed",
        ).length,
        referralCount: affiliate?.stats?.totalReferrals || 0,
        affiliateBalance: affiliate?.stats?.availableBalance || 0,
      });

      setRecentOrders(orderList.slice(0, 3));
    } catch (error) {
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (ready && isAuthenticated) {
      fetchDashboardData();
    } else if (ready) {
      router.replace("/login");
    }
  }, [ready, isAuthenticated, fetchDashboardData, router]);

  // Fetch platform stats
  useEffect(() => {
    const fetchPlatformStats = async () => {
      try {
        const res = await apiRequest("/api/public/stats", "GET");
        if (res?.ok && res?.stats) {
          setPlatformStats(res.stats);
        }
      } catch {
        // Platform counts are optional when the API is unavailable.
      }
    };
    fetchPlatformStats();
  }, []);

  const profileCompletion = getProfileCompletion();

  // PATCH_57: Toggle guidance section collapse
  const toggleGuidance = () => {
    const newState = !guidanceCollapsed;
    setGuidanceCollapsed(newState);
    localStorage.setItem("uremo_guidance_collapsed", String(newState));
  };

  // PATCH_57: Dismiss nudge banner permanently
  const dismissNudge = () => {
    setNudgeDismissed(true);
    localStorage.setItem("uremo_nudge_dismissed", "true");
  };

  // PATCH_57: Guided action cards for new users
  const guidedActions = [
    {
      href: "/explore-services?intent=buy",
      icon: <IconShoppingBag />,
      title: "Buy a Service",
      description: "Get professional help for your projects",
      gradient: "from-blue-500 to-cyan-400",
      bgGradient: "from-blue-500/20 to-cyan-500/10",
    },
    {
      href: "/apply-to-work",
      icon: <IconBriefcase />,
      title: "Apply to Work",
      description: "Start earning with your skills",
      gradient: "from-emerald-500 to-teal-400",
      bgGradient: "from-emerald-500/20 to-teal-500/10",
    },
    {
      href: "/explore-services?intent=rent",
      icon: <IconBuildingOffice />,
      title: "Rent Access",
      description: "Get temporary access to premium tools",
      gradient: "from-purple-500 to-pink-400",
      bgGradient: "from-purple-500/20 to-pink-500/10",
    },
    {
      href: "/affiliate",
      icon: <IconCurrencyDollar />,
      title: "Earn via Referrals",
      description: "Invite friends & earn 10% commission",
      gradient: "from-amber-500 to-orange-400",
      bgGradient: "from-amber-500/20 to-orange-500/10",
    },
  ];

  // Quick actions config
  const quickActions = [
    {
      href: "/workspace",
      icon: <IconBriefcase />,
      title: "Start Working",
      subtitle: "Complete tasks & earn",
      gradient: "from-blue-500/20 to-blue-600/10",
      borderColor: "hover:border-blue-500/50",
      iconBg: "bg-blue-500/20 text-blue-400",
    },
    {
      href: "/explore-services",
      icon: <IconSparkles />,
      title: "Find Work & Services",
      subtitle: "Buy or earn opportunities",
      gradient: "from-purple-500/20 to-purple-600/10",
      borderColor: "hover:border-purple-500/50",
      iconBg: "bg-purple-500/20 text-purple-400",
    },
    {
      href: "/wallet",
      icon: <IconWallet />,
      title: "Add Balance",
      subtitle: "Fund your wallet",
      gradient: "from-emerald-500/20 to-emerald-600/10",
      borderColor: "hover:border-emerald-500/50",
      iconBg: "bg-emerald-500/20 text-emerald-400",
    },
    {
      href: "/affiliate",
      icon: <IconGift />,
      title: "Refer & Earn",
      subtitle: "10% commission",
      gradient: "from-amber-500/20 to-amber-600/10",
      borderColor: "hover:border-amber-500/50",
      iconBg: "bg-amber-500/20 text-amber-400",
    },
  ];

  if (!ready || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen"
    >
      {/* Onboarding Modal */}
      <AnimatePresence>{showOnboarding && <OnboardingModal />}</AnimatePresence>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* ==================== A) WELCOME HEADER ==================== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Profile Avatar */}
              <div className="relative">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-blue-500/20">
                  {firstName.charAt(0).toUpperCase()}
                </div>
                {/* Verification Badge */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center ring-2 ring-slate-900">
                  <IconCheck />
                </div>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                  <EmojiSparkles /> Welcome back, {firstName}
                </h1>
                <p className="text-slate-400 text-sm sm:text-base mt-0.5">
                  You&apos;re doing great — let&apos;s continue building your
                  success.
                </p>
              </div>
            </div>

            {/* Account Level Badge */}
            <div className="flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 text-sm font-medium text-blue-300">
                ✨ Verified Member
              </span>
              {isAdmin && (
                <Link
                  href="/admin"
                  className="px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-sm font-medium text-amber-300 hover:bg-amber-500/30 transition"
                >
                  Admin Panel →
                </Link>
              )}
            </div>
          </div>

          {/* Profile Completion Bar */}
          {profileCompletion < 100 && (
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300">
                  Profile Completion
                </span>
                <span className="text-sm font-medium text-white">
                  {profileCompletion}%
                </span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${profileCompletion}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                />
              </div>
              <Link
                href="/profile"
                className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-block"
              >
                Complete your profile →
              </Link>
            </div>
          )}
        </motion.section>

        {/* ==================== PATCH_57: A1) FIRST-LOGIN NUDGE BANNER ==================== */}
        <AnimatePresence>
          {isNewUser && !nudgeDismissed && !loading && (
            <motion.section
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <div className="relative p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 border border-blue-500/20 overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 blur-xl" />

                <div className="relative flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 items-center justify-center text-white text-lg">
                      OK
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        Welcome to UREMO! Start your journey today.
                      </p>
                      <p className="text-sm text-slate-400 mt-0.5">
                        Choose an action below to get started — it only takes a
                        minute.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={dismissNudge}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition"
                    aria-label="Dismiss"
                  >
                    <IconX />
                  </button>
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* ==================== PATCH_57: A2) GUIDED ACTIONS SECTION ==================== */}
        {isNewUser && !loading && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="mb-8"
          >
            {/* Section Header with Collapse Toggle */}
            <button
              onClick={toggleGuidance}
              className="w-full flex items-center justify-between mb-4 group"
            >
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">
                  Get Started
                </h2>
                <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                  New User Guide
                </span>
              </div>
              <motion.div
                animate={{ rotate: guidanceCollapsed ? -180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-slate-400 group-hover:text-white transition"
              >
                <IconChevronDown />
              </motion.div>
            </button>

            {/* Collapsible Content */}
            <AnimatePresence>
              {!guidanceCollapsed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {guidedActions.map((action, i) => (
                      <Link key={action.href} href={action.href}>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.1 + i * 0.05 }}
                          whileHover={{ y: -4, scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`relative p-5 rounded-2xl bg-gradient-to-br ${action.bgGradient} border border-white/10 hover:border-white/20 transition-all cursor-pointer group overflow-hidden`}
                        >
                          {/* Gradient overlay on hover */}
                          <div
                            className={`absolute inset-0 bg-gradient-to-br ${action.bgGradient} opacity-0 group-hover:opacity-100 transition-opacity`}
                          />

                          <div className="relative">
                            {/* Icon with gradient */}
                            <div
                              className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg`}
                            >
                              {action.icon}
                            </div>

                            <h3 className="font-semibold text-white text-lg mb-1">
                              {action.title}
                            </h3>
                            <p className="text-sm text-slate-400 group-hover:text-slate-300 transition">
                              {action.description}
                            </p>

                            {/* Arrow indicator */}
                            <div className="absolute top-0 right-0 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all">
                              →
                            </div>
                          </div>
                        </motion.div>
                      </Link>
                    ))}
                  </div>

                  {/* Helper text */}
                  <p className="text-center text-xs text-slate-500 mt-4">
                    Click any card to get started. You can collapse this section
                    using the arrow above.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.section>
        )}

        {platformStats && (
          <section aria-label="Platform activity" className="mb-8 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {[
              ["Active services", platformStats.activeServices],
              ["Job roles", platformStats.activeJobRoles],
              ["Registered users", platformStats.totalUsers],
              ["Completed orders", platformStats.completedOrders],
            ].map(([label, value]) => (
              <div key={label} className="p-4 rounded-xl bg-white/5 border border-white/10 text-center">
                <p className="text-lg sm:text-xl font-bold text-white">{value.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </section>
        )}

        {/* ==================== C) QUICK ACTIONS ==================== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <Link key={action.href} href={action.href}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`p-5 rounded-2xl bg-gradient-to-br ${action.gradient} border border-white/10 ${action.borderColor} transition-all cursor-pointer group`}
                >
                  <div
                    className={`w-12 h-12 rounded-xl ${action.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    {action.icon}
                  </div>
                  <h3 className="font-semibold text-white mb-1">
                    {action.title}
                  </h3>
                  <p className="text-sm text-slate-400">{action.subtitle}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* ==================== D) EARNINGS & WALLET ==================== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <div className="grid md:grid-cols-2 gap-4">
            {/* Wallet Balance Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 via-emerald-600/10 to-teal-600/5 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <IconWallet />
                  </div>
                  <span className="text-slate-300 font-medium">
                    Wallet Balance
                  </span>
                </div>
                <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-full">
                  <IconShield />
                  Secure
                </div>
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-white mb-4">
                ${loading ? "—" : stats.walletBalance.toFixed(2)}
              </div>
              <div className="flex gap-3">
                <Link
                  href="/wallet"
                  className="flex-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-xl text-center transition-colors text-sm"
                >
                  + Add Funds
                </Link>
                <Link
                  href="/wallet"
                  className="flex-1 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white font-medium rounded-xl text-center transition-colors text-sm"
                >
                  Withdraw
                </Link>
              </div>
            </div>

            {/* Earnings Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/20 via-blue-600/10 to-purple-600/5 border border-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                    <IconArrowUp />
                  </div>
                  <span className="text-slate-300 font-medium">
                    Total Earnings
                  </span>
                </div>
                {stats.totalEarnings > 0 && (
                  <div className="flex items-center gap-1 text-xs text-emerald-400">
                    <IconArrowUp />
                    Growing
                  </div>
                )}
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-white mb-2">
                ${loading ? "—" : stats.totalEarnings.toFixed(2)}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Pending: </span>
                  <span className="text-amber-400">
                    ${stats.pendingEarnings.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400">Affiliate: </span>
                  <span className="text-purple-400">
                    ${stats.affiliateBalance.toFixed(2)}
                  </span>
                </div>
              </div>
              <Link
                href="/affiliate"
                className="mt-4 inline-flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition"
              >
                View earnings details →
              </Link>
            </div>
          </div>
        </motion.section>

        {/* ==================== E) ACTIVE WORK AREA ==================== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Your Activity</h2>
            <Link
              href="/orders"
              className="text-sm text-blue-400 hover:text-blue-300 transition"
            >
              View all →
            </Link>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            {[
              {
                label: "Active Orders",
                value: stats.activeOrders,
                icon: <IconClock />,
                color: "text-amber-400",
                bg: "bg-amber-500/10",
              },
              {
                label: "Completed",
                value: stats.completedOrders,
                icon: <IconCheck />,
                color: "text-emerald-400",
                bg: "bg-emerald-500/10",
              },
              {
                label: "Referrals",
                value: stats.referralCount,
                icon: <IconGift />,
                color: "text-purple-400",
                bg: "bg-purple-500/10",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center gap-4"
              >
                <div
                  className={`w-10 h-10 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center`}
                >
                  {stat.icon}
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">
                    {loading ? "—" : stat.value}
                  </div>
                  <div className="text-sm text-slate-400">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Recent Orders */}
          {recentOrders.length > 0 && (
            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h3 className="font-medium text-white">Recent Orders</h3>
              </div>
              <div className="divide-y divide-white/10">
                {recentOrders.map((order) => (
                  <Link
                    key={order._id}
                    href={`/orders/${order._id}`}
                    className="block p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                          <IconPackage />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {order.service?.title || "Service Order"}
                          </p>
                          <p className="text-xs text-slate-400">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          order.status === "completed"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : order.status === "in_progress"
                              ? "bg-blue-500/20 text-blue-400"
                              : order.status === "pending"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-slate-500/20 text-slate-400"
                        }`}
                      >
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {recentOrders.length === 0 && !loading && (
            <div className="p-8 rounded-xl bg-white/5 border border-white/10 text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
                <IconPackage />
              </div>
              <h3 className="font-medium text-white mb-2">No orders yet</h3>
              <p className="text-sm text-slate-400 mb-4">
                Find work or services to place your first order
              </p>
              <Link
                href="/explore-services"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <IconSparkles />
                Find Work & Services
              </Link>
            </div>
          )}
        </motion.section>

        {/* ==================== F) HELP & LEARNING ==================== */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-white mb-4">
            Help & Resources
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              {
                href: "/workspace",
                icon: <IconBriefcase />,
                title: "Workspace",
                desc: "Your work hub",
              },
              {
                href: "/orders",
                icon: <IconPackage />,
                title: "My Orders",
                desc: "Track orders",
              },
              {
                href: "/rentals",
                icon: <IconClock />,
                title: "My Rentals",
                desc: "Active rentals",
              },
              {
                href: "/support",
                icon: <IconSupport />,
                title: "Get Help",
                desc: "Support chat",
              },
            ].map((card) => (
              <Link key={card.href} href={card.href}>
                <motion.div
                  whileHover={{ y: -2 }}
                  className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-slate-300 mb-3">
                    {card.icon}
                  </div>
                  <h3 className="font-medium text-white text-sm">
                    {card.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">{card.desc}</p>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.section>

        {/* ==================== FOOTER TRUST ==================== */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center py-6 border-t border-white/10"
        >
          <div className="flex items-center justify-center gap-6 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <IconShield />
              <span>Secure Platform</span>
            </div>
            <div className="flex items-center gap-2">
              <IconLock />
              <span>Encrypted Payments</span>
            </div>
            <div className="flex items-center gap-2">
              <IconUsers />
              <span>Human Support</span>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
