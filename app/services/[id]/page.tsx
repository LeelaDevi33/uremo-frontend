"use client";

// PATCH_33: Service Detail Page with TrustBadges
// PATCH_55: Service Detail Decision Engine - Action selector, trust panel, flow timeline, sticky bar

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { applicationHref } from "@/lib/applicationLink";
import { formatPrice } from "@/lib/orderPrice";
import { useToast } from "@/hooks/useToast";
import { withCacheBust } from "@/lib/cacheBust";
import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  useSiteSettings,
} from "@/hooks/useSiteSettings";
import { getCategoryLabel, getSubcategoryLabel } from "@/lib/categoryLabels";

export default function ServiceDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const lastAuthToastAtRef = useRef(0);
  const { data: settings } = useSiteSettings();
  const copy =
    settings?.services?.details ||
    DEFAULT_PUBLIC_SITE_SETTINGS.services.details;
  const [service, setService] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  // PATCH_96: Double-click guard for buy/rent actions
  const [actionSubmitting, setActionSubmitting] = useState(false);
  // PATCH_22: Selected rental plan for rental services
  const [selectedRentalPlan, setSelectedRentalPlan] = useState<number | null>(
    null,
  );
  // PATCH_92: Read intent from URL, country selector for rent
  const searchParams = useSearchParams();
  const urlIntent = searchParams?.get("intent") || "";
  const [rentCountry, setRentCountry] = useState<string>("");
  const [activeMode, setActiveMode] = useState<"buy" | "rent">("buy");
  const rentSectionRef = useRef<HTMLDivElement>(null);

  const normalizeAllowedActions = (value: any) => {
    const a = value && typeof value === "object" ? value : {};
    return {
      buy: Boolean(a.buy),
      apply: Boolean(a.apply),
      rent: Boolean(a.rent),
      deal: Boolean(a.deal),
    };
  };

  const ensureLoggedIn = () => {
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("token") : null;
      if (!token) {
        const next =
          typeof window !== "undefined" && window.location?.pathname
            ? window.location.pathname + window.location.search
            : `/services/${String(id || "")}`;
        if (typeof window !== "undefined") {
          window.location.href = `/login?next=${encodeURIComponent(next)}`;
        } else {
          router.push("/login");
        }
        return false;
      }
    } catch {
      return false;
    }
    return true;
  };

  const template = (value: string, vars: Record<string, string>) => {
    let out = String(value || "");
    for (const [key, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${key}}`, v);
    }
    return out;
  };

  // PATCH_92b: Guard against non-ObjectId params (e.g. "coming-soon")
  const isValidId = typeof id === "string" && /^[a-f\d]{24}$/i.test(id);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError("");

    if (!isValidId) {
      setError("Invalid service ID");
      setLoading(false);
      return;
    }

    apiRequest(`/api/services/${id}`)
      .then((data) => {
        if (!mounted) return;
        // Backend returns { ok: true, service: {...} }
        setService(data.service || data);
      })
      .catch((e: any) => {
        if (!mounted) return;
        setService(null);
        setError(e?.message || copy.notAvailableTitle);
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [id]);

  // PATCH_38: Fetch allowed actions explicitly (works even if older service payloads omit it)
  useEffect(() => {
    if (!id) return;
    if (!service?._id) return;

    let mounted = true;
    apiRequest(`/api/services/${id}/actions`, "GET")
      .then((data: any) => {
        if (!mounted) return;
        const allowed = normalizeAllowedActions(data?.allowedActions);
        setService((prev: any) => {
          if (!prev) return prev;
          return { ...prev, allowedActions: allowed };
        });
      })
      .catch(() => {
        // ignore (service detail already loaded)
      });

    return () => {
      mounted = false;
    };
  }, [id, service?._id]);

  // PATCH_93: ALL hooks MUST be called before any early return to satisfy React Rules of Hooks.
  // Moved from below the loading/error early returns to here.

  const allowed = normalizeAllowedActions(service?.allowedActions);
  const hasAnyAction =
    allowed.buy || allowed.apply || allowed.rent || allowed.deal;

  // PATCH_106: Intent verification — check if service supports the requested intent
  const intentVerification = useMemo(() => {
    if (!urlIntent || !service) return { valid: true, message: "" };
    const intentActionMap: Record<string, keyof typeof allowed> = {
      buy: "buy",
      rent: "rent",
      apply: "apply",
      deal: "deal",
    };
    const actionKey = intentActionMap[urlIntent];
    if (!actionKey) return { valid: true, message: "" };
    if (allowed[actionKey]) return { valid: true, message: "" };

    const messages: Record<string, string> = {
      buy: "Not Available in Buy Mode",
      rent: "Rental Not Available",
      apply: "Application Not Available",
      deal: "Deal Not Available",
    };
    return { valid: false, message: messages[urlIntent] || "Not Available" };
  }, [urlIntent, allowed, service]);

  // PATCH_114: Set active mode based on URL intent and availability
  useEffect(() => {
    if (urlIntent === "rent" && allowed.rent) {
      setActiveMode("rent");
    } else if (urlIntent === "buy" && allowed.buy) {
      setActiveMode("buy");
    } else if (!allowed.buy && allowed.rent) {
      setActiveMode("rent");
    } else if (allowed.buy) {
      setActiveMode("buy");
    }
  }, [urlIntent, allowed.buy, allowed.rent]);

  // Auto-scroll to rent section when intent=rent
  useEffect(() => {
    if (urlIntent === "rent" && allowed.rent && rentSectionRef.current) {
      setTimeout(() => {
        rentSectionRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 300);
    }
  }, [urlIntent, allowed.rent, service?._id]);

  // PATCH_114: Rental pricing info for selected plan (payment is full upfront)
  const selectedPlanInfo = useMemo(() => {
    if (selectedRentalPlan === null) return null;
    const plan = service?.rentalPlans?.[selectedRentalPlan];
    if (!plan) return null;
    return {
      price: plan.price,
      duration: plan.duration,
      unit: plan.unit || "days",
      label: plan.label || `${plan.duration} ${plan.unit || "days"}`,
    };
  }, [selectedRentalPlan, service?.rentalPlans]);

  // PATCH_92/93: Available countries from the service
  const serviceCountries = useMemo(() => {
    const countries = service?.countries;
    if (Array.isArray(countries) && countries.length > 0) return countries;
    return ["Global"];
  }, [service?.countries]);

  // PATCH_109: Check if user already has an active rental for this service
  const [activeRentalInfo, setActiveRentalInfo] = useState<{
    hasActive: boolean;
    endDate: string;
  } | null>(null);

  useEffect(() => {
    if (!service?._id || !allowed.rent) return;
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) return;

    apiRequest("/api/rentals/my", "GET", null, true)
      .then((data: any) => {
        const rentals = Array.isArray(data?.rentals) ? data.rentals : [];
        const active = rentals.find(
          (r: any) => r.service?._id === service._id && r.status === "active",
        );
        if (active) {
          setActiveRentalInfo({
            hasActive: true,
            endDate: active.endDate || "",
          });
        } else {
          setActiveRentalInfo(null);
        }
      })
      .catch(() => {
        // ignore
      });
  }, [service?._id, allowed.rent]);

  const buyService = async (overridePlanIndex?: number | null) => {
    // PATCH_96: Double-click protection
    if (actionSubmitting) return;
    // PATCH_12: Hard redirect if not logged in, with next param.
    // This avoids endless "Authentication required" toasts.
    if (!ensureLoggedIn()) return;
    setActionSubmitting(true);
    try {
      // PATCH_90: Check permissions before making API calls to prevent 403 errors
      const allowed = normalizeAllowedActions(service?.allowedActions);

      // Resolve final plan index: direct param > state > null
      const finalPlanIndex =
        overridePlanIndex !== undefined
          ? overridePlanIndex
          : selectedRentalPlan;

      // PATCH_114: Rental purchase path — if a plan index is provided, create rental
      if (finalPlanIndex !== null) {
        if (!allowed.rent) {
          toast("Rentals are not available for this service.", "error");
          return;
        }
        try {
          const res = await apiRequest(
            "/api/rentals/create",
            "POST",
            {
              serviceId: service._id,
              planIndex: finalPlanIndex,
              // PATCH_92: Include country if selected
              ...(rentCountry ? { country: rentCountry } : {}),
            },
            true,
          );
          const orderId = res?.order?._id || res?.orderId;
          if (!orderId) throw new Error("Failed to create rental order");

          toast("Rental reserved. Complete payment to confirm.", "success");
          router.push(`/payment/${orderId}`);
        } catch (e: any) {
          toast(e?.message || "Failed to create rental order", "error");
        }
        return;
      }

      try {
        const res = await apiRequest(
          "/api/orders",
          "POST",
          { serviceId: service._id },
          true,
        );
        const orderId = res?.orderId;
        if (!orderId) throw new Error("Failed to create order");

        toast("Order reserved. Complete payment to confirm.", "success");
        router.push(`/payment/${orderId}`);
      } catch (e: any) {
        const msg = String(e?.message || "").trim();
        const isAuthError =
          (msg && msg.toLowerCase().includes("authentication required")) ||
          (msg && msg.toLowerCase().includes("unauthorized"));

        if (isAuthError) {
          const now = Date.now();
          if (now - lastAuthToastAtRef.current >= 2000) {
            lastAuthToastAtRef.current = now;
            toast("Please login to continue.", "error");
          }

          const next =
            typeof window !== "undefined" && window.location?.pathname
              ? window.location.pathname + window.location.search
              : `/services/${String(id || "")}`;
          if (typeof window !== "undefined") {
            window.location.href = `/login?next=${encodeURIComponent(next)}`;
          } else {
            router.push("/login");
          }
          return;
        }

        toast(msg || "Login required", "error");
      }
    } finally {
      setActionSubmitting(false);
    }
  };

  const applyToWork = () => {
    if (!ensureLoggedIn()) return;
    const positionId = typeof service.linkedJobId === "string" ? service.linkedJobId : service.linkedJobId?._id;
    router.push(applicationHref(service._id, positionId));
  };

  // PATCH_93: createDealOrder neutralized — deals not yet live.
  // All deal buttons now redirect to /deals coming-soon page.
  const createDealOrder = () => {
    router.push("/deals");
  };

  if (loading) {
    return (
      <div className="u-container max-w-5xl">
        <div className="card">
          <div className="h-6 w-40 rounded bg-white/10 animate-pulse" />
          <div className="mt-3 h-4 w-3/4 rounded bg-white/10 animate-pulse" />
          <div className="mt-2 h-4 w-2/3 rounded bg-white/10 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="u-container max-w-5xl">
        <div className="card">
          <p className="text-xs text-red-400 uppercase tracking-wide">Error</p>
          <p className="text-white font-bold text-xl mt-1">
            Service unavailable
          </p>
          <p className="text-sm text-[#9CA3AF] mt-2">
            We couldn&apos;t load this service. It may have been removed or you
            may not have permission to view it.
          </p>
          <div className="mt-4 flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => router.refresh()}
              className="btn-primary"
            >
              Retry
            </button>
            <Link href="/explore-services" className="btn-secondary">
              Back to services
            </Link>
            <Link href="/" className="btn-secondary">
              Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const deliveryLabel = service?.deliveryType
    ? String(service.deliveryType).replace(/_/g, " ")
    : "manual";
  const requirementsRaw = service?.requirements;
  const requirementsText =
    typeof requirementsRaw === "string" ? requirementsRaw.trim() : "";
  const requirementsLines = requirementsText
    ? requirementsText
        .split(/\r?\n/)
        .map((s: string) => s.trim())
        .filter(Boolean)
    : [];
  const categoryLabel = getCategoryLabel(
    service?.effectiveCategory || service?.category || "",
  );
  const subcategoryLabel = service?.subcategory
    ? getSubcategoryLabel(service.subcategory)
    : "";

  return (
    <div className="u-container max-w-5xl">
      {/* PATCH_114: Compact header */}
      <div className="mb-5">
        <Link
          href="/explore-services"
          className="text-sm text-[#9CA3AF] hover:text-white transition"
        >
          ← {copy.backToServicesText}
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mt-2">{service.title}</h1>
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {categoryLabel && (
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-[#E5E7EB]">
              {categoryLabel}
            </span>
          )}
          {subcategoryLabel && (
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-[#E5E7EB]">
              {subcategoryLabel}
            </span>
          )}
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-[#E5E7EB]">
            {deliveryLabel}
          </span>
          {service?.active === false && (
            <span className="inline-flex items-center rounded-full border border-orange-500/30 bg-orange-500/10 px-2.5 py-0.5 text-xs text-orange-200">
              Unavailable
            </span>
          )}
        </div>
      </div>

      {/* Intent mismatch */}
      {urlIntent && !intentVerification.valid && (
        <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-200">{intentVerification.message}</p>
          <Link
            href="/explore-services"
            className="text-xs text-blue-400 hover:underline whitespace-nowrap"
          >
            Browse services
          </Link>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 items-start">
        {/* Main */}
        <div className="space-y-5">
          {/* Service Image */}
          <div className="overflow-hidden rounded-xl border border-white/10">
            {service.imageUrl ||
            (Array.isArray(service.images) && service.images[0]) ? (
              <img
                src={withCacheBust(
                  service.imageUrl || service.images?.[0],
                  service.updatedAt || service._id,
                )}
                alt={service.title}
                className="h-52 w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-36 w-full flex items-center justify-center bg-gradient-to-br from-blue-500/10 via-white/5 to-emerald-500/8">
                <div className="text-center">
                  <div className="mx-auto w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-xl text-white/60">
                    ✦
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    {copy.premiumPlaceholderTitle}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Overview */}
          <div className="card">
            <p className="text-xs text-[#9CA3AF] uppercase tracking-wide">
              {copy.overviewLabel}
            </p>
            <p className="mt-2 text-sm text-slate-200 leading-relaxed">
              {service.description || "No description provided."}
            </p>
          </div>

          <div className="card">
            <h2 className="text-base font-semibold">{copy.whatYouGetTitle}</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-200">
              {(Array.isArray(copy.whatYouGetBullets)
                ? copy.whatYouGetBullets
                : []
              ).map((line) => (
                <li key={line} className="flex gap-2">
                  <span className="text-emerald-400">✓</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* How It Works */}
          <div className="card">
            <h2 className="text-base font-semibold">How It Works</h2>
            <div className="mt-3 space-y-3">
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500/20 border border-blue-500/40 flex items-center justify-center">
                  <span className="text-xs font-bold text-blue-300">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Place Your Order
                  </p>
                  <p className="text-xs text-slate-400">
                    Select your option and complete secure payment
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <span className="text-xs font-bold text-emerald-300">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Admin Verifies
                  </p>
                  <p className="text-xs text-slate-400">
                    Our team reviews and processes your order
                  </p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                  <span className="text-xs font-bold text-purple-300">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-white">
                    Receive Your Service
                  </p>
                  <p className="text-xs text-slate-400">
                    Get access or credentials delivered to your dashboard
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-base font-semibold">
              {copy.requirementsTitle}
            </h2>
            {requirementsLines.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-slate-200">
                {requirementsLines.map((line: string, idx: number) => (
                  <li key={idx} className="flex gap-2">
                    <span className="text-blue-300">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[#9CA3AF]">
                {copy.requirementsEmptyText}
              </p>
            )}
          </div>

          <div className="card">
            <h2 className="text-base font-semibold">
              {copy.deliveryTimeTitle}
            </h2>
            <p className="mt-2 text-sm text-slate-200">
              {template(copy.deliveryTimeBody, { deliveryLabel })}
            </p>
            <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5">
              <p className="text-xs text-[#9CA3AF]">{copy.safetyNote}</p>
            </div>
          </div>

          {/* Trust signals — compact inline */}
          <div className="card">
            <h2 className="text-base font-semibold mb-3">Why UREMO Is Safe</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Admin Verified", desc: "Every order reviewed" },
                { label: "Proof Delivery", desc: "Verifiable results" },
                { label: "Secure Wallet", desc: "Funds protected" },
                { label: "Human Support", desc: "Real team available" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                >
                  <p className="text-xs font-medium text-white">{s.label}</p>
                  <p className="text-[11px] text-slate-400">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* PATCH_114: Unified Purchase Panel */}
        <aside className="lg:sticky lg:top-24">
          <div className="card">
            {/* Price header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-[#9CA3AF]">{copy.priceLabel}</p>
                <p className="mt-0.5 text-2xl font-bold text-emerald-300">
                  {formatPrice(service.price, service.currency)}
                </p>
              </div>
              <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-slate-300">
                {deliveryLabel}
              </span>
            </div>

            <div className="mt-3 h-px bg-white/10" />

            {/* Buy / Rent mode toggle — only if both are available */}
            {allowed.buy &&
              allowed.rent &&
              service?.isRental &&
              Array.isArray(service.rentalPlans) &&
              service.rentalPlans.length > 0 && (
                <div className="mt-3 flex rounded-lg border border-white/10 p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveMode("buy");
                      setSelectedRentalPlan(null);
                    }}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      activeMode === "buy"
                        ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveMode("rent")}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      activeMode === "rent"
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Rent
                  </button>
                </div>
              )}

            {/* RENT MODE */}
            {((activeMode === "rent" && allowed.rent) ||
              (!allowed.buy && allowed.rent)) &&
            service?.isRental &&
            Array.isArray(service.rentalPlans) &&
            service.rentalPlans.length > 0 ? (
              <div className="mt-3" ref={rentSectionRef}>
                {/* Active rental banner */}
                {activeRentalInfo?.hasActive && (
                  <div className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                    <p className="text-xs font-medium text-emerald-300">
                      Active access
                      {activeRentalInfo.endDate
                        ? ` until ${new Date(activeRentalInfo.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
                        : ""}
                    </p>
                    <Link
                      href="/rentals"
                      className="text-xs text-emerald-400 hover:underline mt-1 inline-block"
                    >
                      View My Rentals →
                    </Link>
                  </div>
                )}

                {/* Country selector */}
                {serviceCountries.length > 1 && (
                  <div className="mb-3">
                    <label className="block text-xs text-[#9CA3AF] mb-1">
                      Country
                    </label>
                    <select
                      value={rentCountry}
                      onChange={(e) => setRentCountry(e.target.value)}
                      className="w-full rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                    >
                      <option value="">Select country…</option>
                      {serviceCountries.map((c: string) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Rental Plan Cards */}
                <div className="space-y-2">
                  {service.rentalPlans.map((plan: any, idx: number) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setSelectedRentalPlan(idx)}
                      className={`w-full text-left px-3 py-2.5 rounded-lg border transition-all ${
                        selectedRentalPlan === idx
                          ? "border-purple-500 bg-purple-500/15"
                          : "border-white/10 bg-white/5 hover:border-purple-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-white font-medium">
                            {plan.label ||
                              `${plan.duration} ${plan.unit || "days"}`}
                          </span>
                          {plan.isPopular && (
                            <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-500/30">
                              Popular
                            </span>
                          )}
                        </div>
                        <span className="text-emerald-300 font-bold text-sm">
                          {formatPrice(plan.price, service.currency)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {plan.duration} {plan.unit || "days"}
                        {plan.duration > 0 &&
                          ` · ${formatPrice(plan.price / plan.duration, service.currency)}/${plan.unit === "months" ? "month" : "day"}`}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Selected plan summary */}
                {selectedPlanInfo && (
                  <div className="mt-2.5 rounded-lg border border-purple-500/15 bg-purple-500/5 px-3 py-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Plan</span>
                      <span className="text-white font-medium">
                        {selectedPlanInfo.label}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-slate-300">Total</span>
                      <span className="text-emerald-300 font-bold">
                        {formatPrice(selectedPlanInfo.price, service.currency)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Full payment at checkout. Access starts after admin
                      verification.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => buyService(selectedRentalPlan)}
                  disabled={
                    service?.active === false ||
                    selectedRentalPlan === null ||
                    (serviceCountries.length > 1 && !rentCountry) ||
                    actionSubmitting
                  }
                  className="w-full mt-3 py-2.5 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-purple-500 to-pink-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {actionSubmitting
                    ? "Processing…"
                    : service?.active === false
                      ? "Unavailable"
                      : selectedRentalPlan !== null
                        ? `Rent for ${formatPrice(service.rentalPlans[selectedRentalPlan]?.price, service.currency)}`
                        : "Select a Plan"}
                </button>
              </div>
            ) : null}

            {/* BUY MODE */}
            {((activeMode === "buy" && allowed.buy) ||
              (!allowed.rent && allowed.buy)) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedRentalPlan(null);
                  buyService(null);
                }}
                disabled={service?.active === false || actionSubmitting}
                className="w-full mt-3 py-2.5 rounded-lg font-semibold text-sm text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {actionSubmitting
                  ? "Processing…"
                  : service?.active === false
                    ? "Unavailable"
                    : `Buy Now · ${formatPrice(service.price, service.currency)}`}
              </button>
            )}

            {/* APPLY */}
            {allowed.apply && (
              <button
                type="button"
                onClick={applyToWork}
                disabled={service?.active === false}
                className="w-full mt-2 py-2.5 rounded-lg font-semibold text-sm text-white border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Apply To Work
              </button>
            )}

            {/* No actions at all */}
            {!hasAnyAction && (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 px-3 py-3">
                <p className="text-sm text-slate-300">No actions available</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">
                  This service is not currently available.
                </p>
              </div>
            )}

            <p className="mt-2.5 text-[11px] text-[#9CA3AF]">
              {copy.reserveHelpText}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
