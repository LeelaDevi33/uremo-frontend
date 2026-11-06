"use client";

// PATCH_59: Unified Intent-Based Marketplace
// One page with 4 intent tabs: Buy, Earn, Rent, Deal
// Dynamic filters generated from Service collection
// Auto-synced with backend via /api/services/marketplace
// PATCH_54: Enhanced UX with action badges, intent-specific CTAs, friendly category labels

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getApiBaseUrl } from "@/lib/api";
import { formatPrice } from "@/lib/orderPrice";
import { onServicesRefresh } from "@/lib/events";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  useSiteSettings,
} from "@/hooks/useSiteSettings";
import {
  getCategoryLabel,
  getShortCategoryLabel,
  getSubcategoryLabel,
} from "@/lib/categoryLabels";

// Intent Types
type Intent = "buy" | "earn" | "rent" | "deal";

function isIntent(value: string | null): value is Intent {
  return value === "buy" || value === "earn" || value === "rent" || value === "deal";
}

function recentServiceIds(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem("uremo_recent_services") || "[]");
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

// Service Type with unified fields
type Service = {
  _id: string;
  title: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  subcategory?: string;
  countries?: string[];
  platform?: string;
  price: number;
  currency?: string;
  payRate?: number;
  imageUrl?: string;
  images?: string[];
  deliveryType?: "instant" | "manual" | "assisted";
  requirements?: string;
  successRate?: number;
  rating?: number;
  allowedActions?: {
    buy?: boolean;
    apply?: boolean;
    rent?: boolean;
    deal?: boolean;
  };
  linkedJob?: {
    _id: string;
    title: string;
    hasScreening?: boolean;
  };
  rentalPlans?: Array<{
    duration: number;
    unit: string;
    price: number;
    label?: string;
  }>;
  isRental?: boolean;
  effectiveCategory?: string;
};

function listingPrice(service: Service, intent: Intent) {
  if (intent === "earn") {
    return service.payRate && service.payRate > 0
      ? `${formatPrice(service.payRate, service.currency)}/hr`
      : "Rate unlisted";
  }
  if (intent === "rent") {
    if (!service.rentalPlans?.length) return "Plan unavailable";
    const cheapest = service.rentalPlans.reduce((a, b) => a.price <= b.price ? a : b);
    const unit = cheapest.unit === "days" ? "day" : "month";
    return `${formatPrice(cheapest.price, service.currency)} / ${cheapest.duration} ${unit}${cheapest.duration === 1 ? "" : "s"}`;
  }
  return formatPrice(service.price, service.currency);
}

type FiltersState = {
  category: string;
  subcategory: string;
  platform: string;
  country: string;
  verification: "" | "verified" | "standard";
  deliveryType: "" | "instant" | "manual" | "assisted";
  minRating: number;
  search: string;
  minPrice: number;
  maxPrice: number;
  sort: string;
};

type FilterOptions = {
  categories: Array<{ id: string; label: string; subcategories?: string[] }>;
  countries: string[];
  platforms: string[];
  priceRange: { min: number; max: number };
};

type IntentCounts = {
  buy: number;
  earn: number;
  rent: number;
  deal: number;
};

// SVG Icons
function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  );
}

function BriefcaseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

// Intent Tab Configuration - PATCH_54: Enhanced with detailed descriptions
const INTENT_CONFIG = {
  buy: {
    label: "Buy Services",
    icon: ShoppingBagIcon,
    color: "blue",
    gradient: "from-blue-500 to-indigo-600",
    bgGlow: "bg-blue-500/20",
    description: "Purchase verified digital assets and services instantly",
    fullDescription:
      "Browse and purchase verified accounts, digital services, and ready-to-use assets. All sellers are vetted, and purchases include buyer protection.",
    action: "Buy Now",
    emptyHint:
      "No services available for purchase right now. Check out Earn opportunities or Rental options.",
  },
  earn: {
    label: "Earn Money",
    icon: BriefcaseIcon,
    color: "emerald",
    gradient: "from-emerald-500 to-teal-600",
    bgGlow: "bg-emerald-500/20",
    description: "Apply for work and start earning from your skills",
    fullDescription:
      "Find earning opportunities that match your skills. Apply to tasks, complete screening if required, and get paid for your work.",
    action: "Apply Now",
    emptyHint:
      "No earning opportunities at the moment. Try browsing services to Buy or Rent instead.",
  },
  rent: {
    label: "Rent Access",
    icon: KeyIcon,
    color: "purple",
    gradient: "from-purple-500 to-pink-600",
    bgGlow: "bg-purple-500/20",
    description: "Rent premium account access with flexible plans",
    fullDescription:
      "Get temporary access to premium accounts and platforms. Choose your rental duration and start using immediately.",
    action: "Rent Now",
    emptyHint: "No rental services available at this time.",
  },
  deal: {
    label: "Deals",
    icon: ZapIcon,
    color: "orange",
    gradient: "from-orange-500 to-amber-600",
    bgGlow: "bg-orange-500/20",
    description: "Start profit deals and bulk partnership offers",
    fullDescription:
      "Join profit-sharing deals and bulk purchase opportunities. Work with verified sellers on larger transactions with special pricing.",
    action: "Start Deal",
    emptyHint:
      "No active deals right now. Browse Buy options or Earn opportunities while you wait.",
  },
};

const CATEGORY_GUIDE: Array<{
  id: string;
  title: string;
  helper: string;
  icon: string;
  examples: string[];
}> = [
  {
    id: "microjobs",
    title: getCategoryLabel("microjobs"),
    helper:
      "Short remote gigs, data work, and screened tasks to start quickly.",
    icon: "Work",
    examples: ["Data labeling", "Form filling", "Light research"],
  },
  {
    id: "forex_crypto",
    title: getCategoryLabel("forex_crypto"),
    helper: "Trading and exchange account help for compliant setups.",
    icon: "Trade",
    examples: ["Exchange setup", "KYC guidance", "Funding pathways"],
  },
  {
    id: "banks_gateways_wallets",
    title: getCategoryLabel("banks_gateways_wallets"),
    helper:
      "Banking, payment gateway, and wallet assistance with verification.",
    icon: "Bank",
    examples: ["Wallet verification", "Gateway onboarding", "Payout setup"],
  },
  {
    id: "rentals",
    title: getCategoryLabel("rentals"),
    helper: "Temporary access or subscriptions with clear rental plans.",
    icon: "Rent",
    examples: ["Short-term seats", "Trial access", "Managed logins"],
  },
  {
    id: "general",
    title: getCategoryLabel("general"),
    helper: "Everything else, including custom requests and mixed bundles.",
    icon: "✨",
    examples: ["Custom bundles", "White-glove help"],
  },
];

export default function UnifiedMarketplacePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: settings } = useSiteSettings();
  const { isAuthenticated } = useAuth();

  // URL-based intent selection with local preference fallback
  const [activeIntent, setActiveIntent] = useState<Intent>("buy");

  // State
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const currentRequest = useRef<AbortController | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    categories: [],
    countries: [],
    platforms: [],
    priceRange: { min: 0, max: 1000 },
  });
  const [intentCounts, setIntentCounts] = useState<IntentCounts>({
    buy: 0,
    earn: 0,
    rent: 0,
    deal: 0,
  });
  const [filters, updateFilters] = useState<FiltersState>({
    category: "",
    subcategory: "",
    platform: "",
    country: "",
    verification: "",
    deliveryType: "",
    minRating: 0,
    search: "",
    minPrice: 0,
    maxPrice: 0,
    sort: "relevance",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [previewService, setPreviewService] = useState<Service | null>(null);

  function setFilters(next: Parameters<typeof updateFilters>[0]) {
    setPage(1);
    updateFilters(next);
  }

  const servicesCopy =
    settings?.services?.list || DEFAULT_PUBLIC_SITE_SETTINGS.services.list;

  useEffect(() => {
    const urlIntent = searchParams.get("intent");
    let intent: Intent = "buy";
    if (isIntent(urlIntent)) intent = urlIntent;
    else if (urlIntent === null) {
      try {
        const saved = localStorage.getItem("uremo_explore_intent");
        if (isIntent(saved)) intent = saved;
      } catch { /* The catalog also works without saved preferences. */ }
    }
    setActiveIntent(intent);
    setPage(1);
  }, [searchParams]);

  // Handle intent change
  const handleIntentChange = (intent: Intent) => {
    setActiveIntent(intent);
    setPage(1);
    try {
      localStorage.setItem("uremo_explore_intent", intent);
    } catch { /* Browsing still works when storage is unavailable. */ }
    // Update URL without full reload
    const url = new URL(window.location.href);
    url.searchParams.set("intent", intent);
    router.push(url.pathname + url.search, { scroll: false });
  };

  // Fetch marketplace data
  const loadMarketplace = useCallback(async () => {
    currentRequest.current?.abort();
    const request = new AbortController();
    currentRequest.current = request;
    setLoading(true);
    setLoadFailed(false);
    try {
      const base = getApiBaseUrl();
      const params = new URLSearchParams();
      params.set("intent", activeIntent);
      params.set("limit", "24");
      params.set("page", String(page));

      if (filters.category) params.set("category", filters.category);
      if (filters.subcategory) params.set("subcategory", filters.subcategory);
      if (filters.platform) params.set("platform", filters.platform);
      if (filters.country) params.set("country", filters.country);
      if (filters.verification)
        params.set("verification", filters.verification);
      if (filters.deliveryType)
        params.set("deliveryType", filters.deliveryType);
      if (filters.minRating > 0)
        params.set("minRating", String(filters.minRating));
      if (filters.search) params.set("search", filters.search);
      if (filters.minPrice > 0)
        params.set("minPrice", String(filters.minPrice));
      if (filters.maxPrice > 0)
        params.set("maxPrice", String(filters.maxPrice));
      if (filters.sort) params.set("sort", filters.sort);

      const res = await fetch(
        `${base}/api/services/marketplace?${params.toString()}`,
        {
          cache: "no-store",
          credentials: "include",
          signal: request.signal,
        },
      );

      if (!res.ok) throw new Error("Catalog unavailable");
      const data = await res.json();
      if (request.signal.aborted) return;
      if (!data?.ok || !Array.isArray(data.services)) throw new Error("Invalid catalog");
      setServices(data.services);
      if (data.filters) setFilterOptions(data.filters);
      if (data.intentCounts) setIntentCounts(data.intentCounts);
      setTotalPages(data.meta?.pages || 1);
    } catch {
      if (request.signal.aborted) return;
      setServices([]);
      setTotalPages(1);
      setLoadFailed(true);
    } finally {
      if (!request.signal.aborted) setLoading(false);
    }
  }, [activeIntent, filters, page]);

  // Initial load and refresh
  useEffect(() => {
    loadMarketplace();
    const interval = setInterval(loadMarketplace, 30000);
    const cleanup = onServicesRefresh(() => loadMarketplace());
    return () => {
      currentRequest.current?.abort();
      clearInterval(interval);
      cleanup();
    };
  }, [loadMarketplace]);

  // Client-side filters (search + advanced filters)
  // PATCH_107: Rental tab hard filter — only show services with valid rental data
  const displayServices = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    return services.filter((s) => {
      // PATCH_107: Rental tab hard filter
      // If viewing rent tab, ONLY show services with rent=true AND isRental=true AND rentalPlans.length > 0
      if (activeIntent === "rent") {
        if (
          !s.allowedActions?.rent ||
          !s.isRental ||
          !Array.isArray(s.rentalPlans) ||
          s.rentalPlans.length === 0
        ) {
          return false;
        }
      }

      const categoryKey = s.effectiveCategory || s.category || "";
      const hay =
        `${s.title || ""} ${categoryKey} ${s.shortDescription || ""} ${s.description || ""}`.toLowerCase();

      if (q && !hay.includes(q)) return false;
      if (filters.category && categoryKey !== filters.category) return false;
      if (filters.subcategory && s.subcategory !== filters.subcategory)
        return false;
      if (filters.platform && s.platform !== filters.platform) return false;
      if (filters.country && !(s.countries || []).includes(filters.country))
        return false;

      const isVerified = /verified|verification/i.test(
        `${s.title || ""} ${s.category || ""} ${s.subcategory || ""}`,
      );
      if (filters.verification === "verified" && !isVerified) return false;
      if (filters.verification === "standard" && isVerified) return false;

      if (filters.deliveryType && s.deliveryType !== filters.deliveryType)
        return false;

      if (filters.minRating > 0) {
        const rating = typeof s.rating === "number" ? s.rating : 0;
        if (rating < filters.minRating) return false;
      }

      return true;
    });
  }, [services, filters, activeIntent]);

  const derivedPlatforms = useMemo(() => {
    const set = new Set<string>(filterOptions.platforms || []);
    services.forEach((s) => {
      if (s.platform) set.add(s.platform);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [filterOptions.platforms, services]);

  const derivedDeliveryTypes = useMemo(() => {
    const set = new Set<string>();
    services.forEach((s) => {
      if (s.deliveryType) set.add(s.deliveryType);
    });
    return Array.from(set);
  }, [services]);

  const recommendedServices = useMemo(() => {
    const recentIds = recentServiceIds();

    const byRecent = services.filter((s) => recentIds.includes(s._id));
    const byCountry = filters.country
      ? services.filter((s) => (s.countries || []).includes(filters.country))
      : [];
    const popular = services.slice(0, 8);

    const combined = [...byRecent, ...byCountry, ...popular];
    const unique: Service[] = [];
    const seen = new Set<string>();

    for (const item of combined) {
      if (!seen.has(item._id)) {
        seen.add(item._id);
        unique.push(item);
      }
      if (unique.length >= 6) break;
    }

    return unique;
  }, [services, filters.country]);

  const trackRecentService = useCallback((serviceId: string) => {
    if (typeof window === "undefined") return;
    const current = recentServiceIds();
    const next = [serviceId, ...current.filter((id) => id !== serviceId)].slice(
      0,
      10,
    );
    try {
      localStorage.setItem("uremo_recent_services", JSON.stringify(next));
    } catch { /* Viewing a service does not require storage. */ }
  }, []);

  const config = INTENT_CONFIG[activeIntent];
  const IconComponent = config.icon;

  return (
    <div className="u-container py-6 px-4 md:px-6">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-2">
          Explore the marketplace
        </h1>
        <p className="text-slate-400 text-sm md:text-base">
          Browse services, apply for work, compare rental plans, or explore deals.
        </p>
      </header>

      {/* Intent Tabs — Clean Horizontal */}
      <div className="mb-6">
        <div className="flex gap-1 p-1 bg-slate-900/80 rounded-xl border border-white/8">
          {(Object.keys(INTENT_CONFIG) as Intent[]).map((intent) => {
            const cfg = INTENT_CONFIG[intent];
            const IntentIcon = cfg.icon;
            const isActive = activeIntent === intent;
            const count = intentCounts[intent] || 0;

            return (
              <button
                key={intent}
                aria-pressed={isActive}
                onClick={() => handleIntentChange(intent)}
                className={`flex min-w-0 items-center gap-1 px-1 sm:gap-2 sm:px-5 py-3 rounded-lg font-medium transition-all flex-1 text-sm justify-center ${
                  isActive
                    ? `bg-gradient-to-r ${cfg.gradient} text-white`
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <IntentIcon className="hidden sm:inline w-4 h-4" />
                <span className="hidden sm:inline">{cfg.label}</span>
                <span className="sm:hidden">{cfg.label.split(" ")[0]}</span>
                {count > 0 && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-md ${isActive ? "bg-white/20" : "bg-slate-800"}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Brief intent description */}
        <p className="mt-3 text-sm text-slate-400 flex items-center gap-2">
          <span
            className={`inline-flex p-1 rounded-md bg-gradient-to-br ${config.gradient}`}
          >
            <IconComponent className="w-3.5 h-3.5 text-white" />
          </span>
          {config.description}
          <span className="ml-auto text-xs text-slate-500">
            {!loadFailed && !loading && `${intentCounts[activeIntent] || 0} available`}
          </span>
        </p>
      </div>

      {/* Category Quick-Filter Bar */}
      <div className="mt-6 mb-2">
        <div className="flex items-center gap-3 mb-3">
          <p className="text-xs text-slate-400 uppercase tracking-wider font-medium">
            Categories
          </p>
          {filters.category && (
            <button
              onClick={() => {
                setFilters((f) => ({ ...f, category: "", subcategory: "" }));
              }}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORY_GUIDE.map((cat) => {
            const isActive = filters.category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setFilters((f) => ({
                    ...f,
                    category: isActive ? "" : cat.id,
                    subcategory: "",
                  }));
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-blue-500/15 text-blue-200 border border-blue-500/40"
                    : "bg-slate-800/60 text-slate-300 border border-white/8 hover:border-white/20 hover:text-white"
                }`}
              >
                <span className="text-base" aria-hidden>
                  {cat.icon}
                </span>
                {cat.title}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
        {/* Sticky Filter Panel - Enhanced */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <div className="flex items-center gap-2">
              <FilterIcon className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-semibold text-slate-300">
                Filters
              </span>
            </div>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/10 bg-slate-900/60 text-slate-300 hover:text-white hover:border-blue-500/30 transition-all"
            >
              <span>{showFilters ? "Hide Filters" : "Show Filters"}</span>
            </button>
          </div>

          <div
            className={`rounded-xl border border-white/8 bg-slate-900/80 p-5 space-y-5 ${
              showFilters ? "block" : "hidden"
            } lg:block`}
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-white uppercase tracking-wider">
                  Category
                </label>
                {filters.category && (
                  <button
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        category: "",
                        subcategory: "",
                      }))
                    }
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Clear
                  </button>
                )}
              </div>
              <select
                value={filters.category}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    category: e.target.value,
                    subcategory: "",
                  }))
                }
                className="w-full px-3 py-2.5 rounded-lg bg-slate-950/60 border border-white/10 text-white text-sm focus:border-blue-500/40 focus:outline-none transition-all"
              >
                <option value="">All Categories</option>
                {filterOptions.categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label || getCategoryLabel(cat.id)}
                  </option>
                ))}
              </select>
            </div>

            {filters.category && (
              <div>
                <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wide">
                  Subcategory
                </label>
                <select
                  value={filters.subcategory}
                  onChange={(e) =>
                    setFilters((f) => ({ ...f, subcategory: e.target.value }))
                  }
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-950/60 border border-white/10 text-white"
                >
                  <option value="">All</option>
                  {filterOptions.categories
                    .find((c) => c.id === filters.category)
                    ?.subcategories?.map((sub) => (
                      <option key={sub} value={sub}>
                        {getSubcategoryLabel(sub)}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wide">
                Platform
              </label>
              <select
                value={filters.platform}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, platform: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-lg bg-slate-950/60 border border-white/10 text-white"
              >
                <option value="">All Platforms</option>
                {derivedPlatforms.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wide">
                Country
              </label>
              <select
                value={filters.country}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, country: e.target.value }))
                }
                className="w-full px-3 py-2.5 rounded-lg bg-slate-950/60 border border-white/10 text-white"
              >
                <option value="">All Countries</option>
                {filterOptions.countries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wide">
                Verification
              </label>
              <select
                value={filters.verification}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    verification: e.target
                      .value as FiltersState["verification"],
                  }))
                }
                className="w-full px-3 py-2.5 rounded-lg bg-slate-950/60 border border-white/10 text-white"
              >
                <option value="">All</option>
                <option value="verified">Verified</option>
                <option value="standard">Standard</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wide">
                Delivery type
              </label>
              <select
                value={filters.deliveryType}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    deliveryType: e.target
                      .value as FiltersState["deliveryType"],
                  }))
                }
                className="w-full px-3 py-2.5 rounded-lg bg-slate-950/60 border border-white/10 text-white"
              >
                <option value="">All</option>
                {derivedDeliveryTypes.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wide">
                Rating
              </label>
              <select
                value={filters.minRating}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    minRating: Number(e.target.value) || 0,
                  }))
                }
                className="w-full px-3 py-2.5 rounded-lg bg-slate-950/60 border border-white/10 text-white"
              >
                <option value={0}>All</option>
                <option value={4.5}>4.5+ stars</option>
                <option value={4.0}>4.0+ stars</option>
                <option value={3.5}>3.5+ stars</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wide">
                Price range
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={filters.minPrice || ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      minPrice: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-1/2 px-3 py-2.5 rounded-lg bg-slate-950/60 border border-white/10 text-white"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={filters.maxPrice || ""}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      maxPrice: Number(e.target.value) || 0,
                    }))
                  }
                  className="w-1/2 px-3 py-2.5 rounded-lg bg-slate-950/60 border border-white/10 text-white"
                />
              </div>
            </div>

            <button
              onClick={() =>
                setFilters({
                  category: "",
                  subcategory: "",
                  platform: "",
                  country: "",
                  verification: "",
                  deliveryType: "",
                  minRating: 0,
                  search: "",
                  minPrice: 0,
                  maxPrice: 0,
                  sort: "relevance",
                })
              }
              className="w-full text-sm text-slate-300 hover:text-white border border-white/10 rounded-lg py-2 transition"
            >
              Clear Filters
            </button>
          </div>
        </aside>

        <div className="min-w-0 space-y-6 pb-24">
          {/* Search + Sort */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                aria-label="Search services"
                value={filters.search}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, search: e.target.value }))
                }
                placeholder="Search services, platforms, categories..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none transition"
              />
            </div>

            <select
              aria-label="Sort services"
              value={filters.sort}
              onChange={(e) =>
                setFilters((f) => ({ ...f, sort: e.target.value }))
              }
              className="px-4 py-3 rounded-xl bg-slate-800/50 border border-white/10 text-white focus:border-blue-500/50 focus:outline-none transition appearance-none cursor-pointer"
            >
              <option value="relevance">Most Relevant</option>
              <option value="newest">Newest First</option>
              <option value="price_low">Price: Low to High</option>
              <option value="price_high">Price: High to Low</option>
              <option value="popular">Most Popular</option>
            </select>
          </div>

          {/* Recommended Row */}
          {!loading && recommendedServices.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span className="text-lg">⭐</span>
                  Recommended For You
                </h2>
                <span className="text-xs text-slate-500">
                  {recommendedServices.length} picks
                </span>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recommendedServices.map((service) => (
                  <ServiceCard
                    key={`rec-${service._id}`}
                    service={service}
                    intent={activeIntent}
                    config={config}
                    onPreview={() => {
                      trackRecentService(service._id);
                      setPreviewService(service);
                    }}
                    onPrimaryAction={() => trackRecentService(service._id)}
                  />
                ))}
              </div>
              <div className="mt-4 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={`sk-${idx}`}
                  className="rounded-2xl border border-white/10 bg-slate-800/30 p-4 animate-pulse"
                >
                  <div className="h-40 bg-slate-700/50 rounded-xl mb-4" />
                  <div className="h-4 bg-slate-700/50 rounded mb-2" />
                  <div className="h-4 bg-slate-700/30 rounded w-2/3 mb-4" />
                  <div className="h-10 bg-slate-700/40 rounded" />
                </div>
              ))}
            </div>
          )}

          {/* Empty State - PATCH_54: Enhanced with intent-specific guidance */}
          {loadFailed && (
            <div role="alert" className="card p-6 text-center">
              <h2 className="text-xl font-semibold">The catalog could not load</h2>
              <button className="btn-secondary mt-4" onClick={loadMarketplace}>Try again</button>
            </div>
          )}
          {!loading && !loadFailed && displayServices.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/60 to-slate-950/60 backdrop-blur-sm p-12 text-center relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                    backgroundSize: "32px 32px",
                  }}
                />
              </div>

              <div className="relative">
                <div
                  className={`mx-auto w-24 h-24 rounded-3xl bg-gradient-to-br ${config.gradient} flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(59,130,246,0.3)]`}
                >
                  <IconComponent className="w-12 h-12 text-white" />
                </div>

                <h3 className="text-2xl font-bold text-white mb-3">
                  No {config.label} Found
                </h3>
                <p className="text-slate-300 max-w-md mx-auto mb-4 leading-relaxed">
                  {config.emptyHint ||
                    "We couldn't find any services matching your current filters."}
                </p>
                <p className="text-slate-400 text-sm max-w-md mx-auto mb-8">
                  Try switching to another tab or adjusting your filters below.
                </p>

                <div className="flex flex-wrap justify-center gap-3 mb-6">
                  {(Object.keys(INTENT_CONFIG) as Intent[]).map((intent) => {
                    const cfg = INTENT_CONFIG[intent];
                    const IntentIcon = cfg.icon;
                    const count = intentCounts[intent] || 0;
                    return (
                      <button
                        key={`empty-${intent}`}
                        onClick={() => handleIntentChange(intent)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all ${
                          intent === activeIntent
                            ? `bg-gradient-to-r ${cfg.gradient} border-transparent text-white shadow-lg`
                            : "border-white/20 text-slate-300 hover:text-white hover:border-white/40 hover:bg-white/5"
                        }`}
                      >
                        <IntentIcon className="w-4 h-4" />
                        <span className="font-medium">{cfg.label}</span>
                        {count > 0 && intent !== activeIntent && (
                          <span className="ml-1 px-2 py-0.5 text-xs bg-white/10 rounded-full">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() =>
                    setFilters({
                      category: "",
                      subcategory: "",
                      platform: "",
                      country: "",
                      verification: "",
                      deliveryType: "",
                      minRating: 0,
                      search: "",
                      minPrice: 0,
                      maxPrice: 0,
                      sort: "relevance",
                    })
                  }
                  className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white hover:bg-white/15 transition-all font-medium"
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}

          {/* Service Grid - Enhanced */}
          {!loading && displayServices.length > 0 && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div className="text-sm text-slate-400">
                  Showing{" "}
                  <span className="text-white font-semibold">
                    {displayServices.length}
                  </span>{" "}
                  services
                </div>
                <div className="text-xs text-slate-500">
                  Page {page} of {totalPages}
                </div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {displayServices.map((service, index) => (
                  <div
                    key={service._id}
                    className="animate-fadeIn"
                    style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
                  >
                    <ServiceCard
                      service={service}
                      intent={activeIntent}
                      config={config}
                      onPreview={() => {
                        trackRecentService(service._id);
                        setPreviewService(service);
                      }}
                      onPrimaryAction={() => trackRecentService(service._id)}
                    />
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Pagination - Enhanced */}
          {!loading && totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-5 py-3 rounded-xl bg-slate-800/60 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Previous
              </button>

              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 rounded-xl font-semibold transition-all ${
                        page === pageNum
                          ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg scale-110`
                          : "bg-slate-800/60 border border-white/10 text-slate-400 hover:text-white hover:border-blue-500/30"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-5 py-3 rounded-xl bg-slate-800/60 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 hover:border-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all font-medium flex items-center gap-2"
              >
                Next
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Preview Modal - Enhanced Premium Design */}
      {previewService && (
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setPreviewService(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Service preview"
            className="flex flex-col w-full max-w-3xl max-h-[calc(100dvh-2rem)] rounded-3xl border border-white/20 bg-gradient-to-br from-slate-900/95 to-slate-950/95 backdrop-blur-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Image */}
            <div className="relative h-40 sm:h-64 shrink-0 bg-slate-950">
              {previewService.imageUrl || previewService.images?.[0] ? (
                <>
                  <img
                    src={previewService.imageUrl || previewService.images?.[0]}
                    alt={previewService.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-950">
                  <div
                    className={`p-6 rounded-2xl ${config.bgGlow} border border-white/10`}
                  >
                    {config.icon({ className: "w-12 h-12 text-slate-400" })}
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                aria-label="Close service preview"
                onClick={() => setPreviewService(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition-colors"
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

              {/* Title Overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-start gap-3 mb-2">
                  {/verified|verification/i.test(
                    `${previewService.title} ${previewService.category}`,
                  ) && (
                    <span className="px-3 py-1 rounded-lg bg-emerald-500/20 backdrop-blur-md text-emerald-300 border border-emerald-400/40 text-xs font-semibold flex items-center gap-1.5">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      Verified
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-lg bg-black/50 backdrop-blur-md text-white border border-white/30 text-xs font-semibold">
                    {previewService.platform || "Global"}
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">
                  {previewService.title}
                </h3>
                <p className="text-sm text-slate-300">
                  {getCategoryLabel(
                    previewService.effectiveCategory || previewService.category,
                  )}
                  {previewService.subcategory
                    ? ` • ${getSubcategoryLabel(previewService.subcategory)}`
                    : ""}
                  {` • ${config.label}`}
                </p>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6 custom-scrollbar">
              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-slate-800/60 border border-white/10 px-4 py-3 text-center">
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                    Success Rate
                  </div>
                  <div className="text-white font-bold text-lg">
                    {previewService.successRate
                      ? `${previewService.successRate}%`
                      : "—"}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-800/60 border border-white/10 px-4 py-3 text-center">
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                    Rating
                  </div>
                  <div className="text-white font-bold text-lg">
                    {previewService.rating
                      ? `${previewService.rating.toFixed(1)}★`
                      : "New"}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-800/60 border border-white/10 px-4 py-3 text-center">
                  <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                    Delivery
                  </div>
                  <div className="text-white font-bold text-sm">
                    {previewService.deliveryType?.charAt(0).toUpperCase() +
                      (previewService.deliveryType?.slice(1) || "") ||
                      "Standard"}
                  </div>
                </div>
              </div>

              {/* Description Section */}
              <div className="rounded-2xl bg-slate-800/40 border border-white/10 p-5">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-blue-500 rounded-full" />
                  Full Description
                </h4>
                <p className="text-slate-200 text-sm leading-relaxed">
                  {previewService.description ||
                    previewService.shortDescription ||
                    "Comprehensive service details will be provided after order confirmation. Our team ensures quality delivery with full support throughout the process."}
                </p>
              </div>

              {/* What You Get */}
              <div className="rounded-2xl bg-slate-800/40 border border-white/10 p-5">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                  What You Get
                </h4>
                <ul className="space-y-2 text-slate-200 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>
                      Professional service delivery with status tracking
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>24/7 customer support via order chat</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>Quality guarantee and refund protection</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span>
                      {previewService.shortDescription ||
                        "Detailed documentation and guidance"}
                    </span>
                  </li>
                </ul>
              </div>

              {/* Requirements */}
              <div className="rounded-2xl bg-slate-800/40 border border-white/10 p-5">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-amber-500 rounded-full" />
                  Requirements
                </h4>
                <p className="text-slate-200 text-sm leading-relaxed">
                  {previewService.requirements ||
                    "No special requirements needed. You will be guided through any necessary steps during the order process. Our team will reach out if additional information is required."}
                </p>
              </div>

              {/* Refund Policy */}
              <div className="rounded-2xl bg-slate-800/40 border border-white/10 p-5">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                  <div className="w-1 h-4 bg-purple-500 rounded-full" />
                  Refund & Replacement Policy
                </h4>
                <p className="text-slate-200 text-sm leading-relaxed">
                  If service delivery fails or doesn't meet specifications, you
                  may be eligible for a refund or replacement. Contact our
                  support team with your order details within 7 days of
                  delivery. We prioritize customer satisfaction and work to
                  resolve all issues promptly.
                </p>
              </div>
            </div>

            {/* Footer CTA */}
            <div className="p-6 border-t border-white/10 bg-slate-900/60 flex items-center justify-between gap-4">
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                  {activeIntent === "earn"
                    ? "Earn Up To"
                    : activeIntent === "rent"
                      ? "Starting From"
                      : "Total Price"}
                </div>
                <div className="text-white font-bold text-3xl">
                  {listingPrice(previewService, activeIntent)}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setPreviewService(null)}
                  className="px-5 py-3 rounded-xl border border-white/20 text-slate-300 hover:text-white hover:border-white/40 font-medium transition-all"
                >
                  Close
                </button>
                <Link
                  href={
                    activeIntent === "earn"
                      ? `/apply-to-work?serviceId=${previewService._id}`
                      : activeIntent === "deal"
                        ? "/deals"
                        : activeIntent === "rent"
                          ? `/services/${previewService._id}?intent=${activeIntent}`
                          : `/services/${previewService._id}`
                  }
                  className={`px-6 py-3 rounded-xl text-white font-bold bg-gradient-to-r ${config.gradient} shadow-[0_0_24px_rgba(59,130,246,0.5)] hover:shadow-[0_0_32px_rgba(59,130,246,0.7)] transition-all hover:scale-105`}
                  onClick={() => {
                    trackRecentService(previewService._id);
                    setPreviewService(null);
                  }}
                >
                  {config.action}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Service Card Component — Clean Premium Design
function ServiceCard({
  service,
  intent,
  config,
  onPreview,
  onPrimaryAction,
}: {
  service: Service;
  intent: Intent;
  config: typeof INTENT_CONFIG.buy;
  onPreview?: () => void;
  onPrimaryAction?: () => void;
}) {
  const hasLinkedJob = Boolean(service.linkedJob);
  const hasScreening = service.linkedJob?.hasScreening;
  const categoryKey = service.effectiveCategory || service.category || "";

  const isVerified = /verified|verification/i.test(
    `${service.title || ""} ${service.category || ""} ${service.subcategory || ""}`,
  );
  const successRate =
    typeof service.successRate === "number" ? service.successRate : null;
  const rating = typeof service.rating === "number" ? service.rating : null;

  // PATCH_76: All service cards route to /services/:id regardless of intent
  // PATCH_90: Only append rent/deal intent if the service actually supports it
  const getActionLink = () => {
    if (intent === "earn") {
      return service.linkedJob?._id
        ? `/apply-to-work?jobId=${service.linkedJob._id}`
        : `/apply-to-work?serviceId=${service._id}`;
    }
    // PATCH_92: Deal cards redirect to deals page
    if (intent === "deal") {
      return "/deals";
    }
    const canDoIntent = intent === "rent" && service.allowedActions?.rent;
    const intentSuffix = canDoIntent ? `?intent=${intent}` : "";
    return `/services/${service._id}${intentSuffix}`;
  };

  // CTA label
  const ctaLabel =
    intent === "buy"
      ? "Buy Now"
      : intent === "earn"
        ? "Apply Now"
        : intent === "rent"
          ? "Rent Now"
          : intent === "deal"
            ? "Start Deal"
            : "Buy Now";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onPreview?.()}
      onKeyDown={(e) => {
        if (e.key === "Enter") onPreview?.();
      }}
      className="group relative flex flex-col bg-[#0c1120] border border-white/8 rounded-2xl overflow-hidden transition-all duration-300 hover:border-white/20 hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.6)] cursor-pointer"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] bg-slate-950 overflow-hidden">
        {service.imageUrl || service.images?.[0] ? (
          <>
            <img
              src={service.imageUrl || service.images?.[0]}
              alt={service.title}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1120] via-transparent to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800/40 to-slate-900/80 flex items-center justify-center">
            <div className="text-center">
              <div
                className={`inline-flex p-4 rounded-2xl bg-gradient-to-br ${config.gradient} mb-2 opacity-80`}
              >
                {config.icon({ className: "w-7 h-7 text-white" })}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {getShortCategoryLabel(categoryKey)}
              </p>
            </div>
          </div>
        )}

        {/* Top-left: Platform */}
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-black/50 backdrop-blur-sm text-white/90 border border-white/10">
            {service.platform || "Global"}
          </span>
        </div>

        {/* Top-right: Verified only */}
        {isVerified && (
          <div className="absolute top-3 right-3">
            <span className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-500/20 backdrop-blur-sm text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircleIcon className="w-3 h-3" />
              Verified
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col p-4">
        {/* Title */}
        <h3 className="font-semibold text-white text-[15px] leading-snug line-clamp-2 mb-2 group-hover:text-blue-200 transition-colors">
          {service.title}
        </h3>

        {/* Meta row: category · country · delivery */}
        <div className="text-xs text-slate-500 mb-3 flex items-center gap-1.5 flex-wrap">
          <span>{getShortCategoryLabel(categoryKey)}</span>
          {service.countries?.[0] && (
            <>
              <span className="text-slate-600">·</span>
              <span>{service.countries[0]}</span>
            </>
          )}
          {service.deliveryType === "instant" && (
            <>
              <span className="text-slate-600">·</span>
              <span className="text-amber-400">⚡ Instant</span>
            </>
          )}
        </div>

        {/* Inline stats */}
        <div className="flex items-center gap-3 mb-3 text-xs">
          {successRate !== null && (
            <span className="text-slate-400">
              <span className="text-white font-medium">{successRate}%</span>{" "}
              success
            </span>
          )}
          {rating !== null && (
            <span className="text-slate-400">
              <span className="text-amber-300 font-medium">
                {rating.toFixed(1)}★
              </span>
            </span>
          )}
          {intent === "earn" && hasLinkedJob && (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <CheckCircleIcon className="w-3 h-3" />
              {hasScreening ? "Screening" : "Open"}
            </span>
          )}
        </div>

        {service.shortDescription && (
          <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed flex-1">
            {service.shortDescription}
          </p>
        )}

        {/* Price + CTA */}
        <div className="mt-auto pt-3 border-t border-white/6 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">
              {intent === "earn"
                ? "Earn"
                : intent === "rent"
                  ? "From"
                  : "Price"}
            </div>
            <span className="text-xl font-bold text-white">
              {listingPrice(service, intent)}
            </span>
          </div>
          <Link
            href={getActionLink()}
            onClick={(e) => {
              e.stopPropagation();
              onPrimaryAction?.();
            }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r ${config.gradient} hover:opacity-90 transition-all active:scale-95 whitespace-nowrap`}
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
