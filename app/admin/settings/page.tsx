"use client";

import React, { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { useAuth } from "@/hooks/useAuth";
import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  markSiteSettingsUpdated,
  marketplaceDefaults,
  type FaqItem,
  type TitleDesc,
} from "@/hooks/useSiteSettings";

type AdminSettingsDoc = {
  revision?: string;
  marketplace?: Partial<typeof marketplaceDefaults>;
  _id?: string;
  singletonKey?: string;
  // Legacy fallback (older backend stored bannerText at root)
  bannerText?: string;
  site?: { brandName?: string; bannerText?: string };
  support?: { whatsappNumber?: string; supportEmail?: string };
  footer?: { disclaimer?: string; dataSafetyNote?: string };
  landing?: {
    heroTitle?: string;
    heroSubtitle?: string;
    ctaPrimaryText?: string;
    ctaSecondaryText?: string;
    features?: TitleDesc[];
    popularTitle?: string;
    popularSubtitle?: string;
    finalCtaTitle?: string;
    finalCtaSubtitle?: string;
  };
  payment?: {
    beginnerSteps?: TitleDesc[];
    acceptedProofText?: string;
    successRedirectText?: string;
    faq?: FaqItem[];
    ui?: {
      loadingText?: string;
      validationTexts?: {
        copyFailedText?: string;
        paymentDetailsCopiedText?: string;
        selectMethodRequiredText?: string;
        proofRequiredText?: string;
        invalidFileTypeText?: string;
        fileTooLargeText?: string;
        submitFailedText?: string;
      };
    };
  };
  orders?: {
    details?: {
      chat?: {
        inputPlaceholder?: string;
        sendButtonText?: string;
        sendingButtonText?: string;
        hintText?: string;
        emptyStateText?: string;
        emptyTitle?: string;
        emptySubtitle?: string;
      };
    };
  };
  services?: { globalFaq?: FaqItem[]; trustBlockText?: string };
  orderSupport?: {
    quickReplies?: string[];
    supportGuidelines?: string;
    guidelinesText?: string;
  };
  applyWork?: { faq?: FaqItem[]; ui?: { faqTitle?: string } };
  updatedAt?: string;
  updatedBy?: any;
};

const normalizeFaq = (value: any): FaqItem[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => ({ q: String(x?.q || ""), a: String(x?.a || "") }))
    .map((x) => ({ q: x.q.trim(), a: x.a.trim() }))
    .filter((x) => x.q && x.a)
    .slice(0, 25);
};

const normalizeTitleDesc = (value: any): TitleDesc[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => ({
      title: String(x?.title || ""),
      desc: String(x?.desc || ""),
    }))
    .map((x) => ({ title: x.title.trim(), desc: x.desc.trim() }))
    .filter((x) => x.title && x.desc)
    .slice(0, 12);
};

const normalizeStringArray = (value: any): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((x) => String(x || "").trim())
    .filter(Boolean)
    .slice(0, 10);
};

const setAt = <T,>(list: T[], idx: number, patch: Partial<T>): T[] => {
  return list.map((it, i) => (i === idx ? { ...it, ...patch } : it));
};

export default function AdminCmsSettingsPage() {
  const { toast } = useToast();
  const { isAdmin, ready: authReady } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState<string | null>(null);
  const [rawRevision, setRawRevision] = useState<string | null>(null);
  const [marketplace, setMarketplace] = useState(marketplaceDefaults);

  const [tab, setTab] = useState<
    | "global"
    | "marketplace"
    | "landing"
    | "payment"
    | "services"
    | "orderSupport"
    | "applyWork"
    | "footer"
    | "advanced"
  >("global");

  // Global
  const [brandName, setBrandName] = useState("");
  const [bannerText, setBannerText] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [supportEmail, setSupportEmail] = useState("");

  // Landing
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [ctaPrimaryText, setCtaPrimaryText] = useState("");
  const [ctaSecondaryText, setCtaSecondaryText] = useState("");
  const [features, setFeatures] = useState<TitleDesc[]>([]);
  const [popularTitle, setPopularTitle] = useState("");
  const [popularSubtitle, setPopularSubtitle] = useState("");
  const [finalCtaTitle, setFinalCtaTitle] = useState("");
  const [finalCtaSubtitle, setFinalCtaSubtitle] = useState("");

  // Payment
  const [beginnerSteps, setBeginnerSteps] = useState<TitleDesc[]>([]);
  const [acceptedProofText, setAcceptedProofText] = useState("");
  const [successRedirectText, setSuccessRedirectText] = useState("");
  const [paymentFaq, setPaymentFaq] = useState<FaqItem[]>([]);
  const [paymentLoadingText, setPaymentLoadingText] = useState("");
  const [paymentCopyFailedText, setPaymentCopyFailedText] = useState("");
  const [paymentDetailsCopiedText, setPaymentDetailsCopiedText] = useState("");
  const [paymentSelectMethodRequiredText, setPaymentSelectMethodRequiredText] =
    useState("");
  const [paymentProofRequiredText, setPaymentProofRequiredText] = useState("");
  const [paymentInvalidFileTypeText, setPaymentInvalidFileTypeText] =
    useState("");
  const [paymentFileTooLargeText, setPaymentFileTooLargeText] = useState("");
  const [paymentSubmitFailedText, setPaymentSubmitFailedText] = useState("");

  // Services
  const [trustBlockText, setTrustBlockText] = useState("");
  const [globalFaq, setGlobalFaq] = useState<FaqItem[]>([]);

  // Order Support
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [guidelinesText, setGuidelinesText] = useState("");
  const [orderChatInputPlaceholder, setOrderChatInputPlaceholder] =
    useState("");
  const [orderChatSendButtonText, setOrderChatSendButtonText] = useState("");
  const [orderChatSendingButtonText, setOrderChatSendingButtonText] =
    useState("");
  const [orderChatHintText, setOrderChatHintText] = useState("");
  const [orderChatEmptyStateText, setOrderChatEmptyStateText] = useState("");
  const [orderChatEmptyTitle, setOrderChatEmptyTitle] = useState("");
  const [orderChatEmptySubtitle, setOrderChatEmptySubtitle] = useState("");

  // Apply Work
  const [applyWorkFaq, setApplyWorkFaq] = useState<FaqItem[]>([]);
  const [applyWorkFaqTitle, setApplyWorkFaqTitle] = useState("");

  // Footer
  const [disclaimer, setDisclaimer] = useState("");
  const [dataSafetyNote, setDataSafetyNote] = useState("");

  // Advanced (raw JSON)
  const [rawJsonText, setRawJsonText] = useState<string>("");
  const [rawBusy, setRawBusy] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    setRevision(null);
    try {
      const doc = await apiRequest<AdminSettingsDoc>(
        "/api/admin/settings",
        "GET",
        null,
        true
      );

      if (!doc.revision) throw new Error("The settings service has changed. Refresh before editing.");
      setRevision(doc.revision);
      const copy = { ...marketplaceDefaults };
      for (const key of Object.keys(copy) as (keyof typeof copy)[]) {
        const value = doc.marketplace?.[key];
        if (typeof value === "string" && value.trim()) copy[key] = value;
      }
      setMarketplace(copy);
      setBrandName(String(doc?.site?.brandName || ""));
      setBannerText(String(doc?.site?.bannerText || doc?.bannerText || ""));
      setWhatsappNumber(String(doc?.support?.whatsappNumber || ""));
      setSupportEmail(String(doc?.support?.supportEmail || ""));

      setHeroTitle(String(doc?.landing?.heroTitle || ""));
      setHeroSubtitle(String(doc?.landing?.heroSubtitle || ""));
      setCtaPrimaryText(String(doc?.landing?.ctaPrimaryText || ""));
      setCtaSecondaryText(String(doc?.landing?.ctaSecondaryText || ""));
      setFeatures(normalizeTitleDesc(doc?.landing?.features));
      setPopularTitle(String(doc?.landing?.popularTitle || ""));
      setPopularSubtitle(String(doc?.landing?.popularSubtitle || ""));
      setFinalCtaTitle(String(doc?.landing?.finalCtaTitle || ""));
      setFinalCtaSubtitle(String(doc?.landing?.finalCtaSubtitle || ""));

      setBeginnerSteps(normalizeTitleDesc(doc?.payment?.beginnerSteps));
      setAcceptedProofText(String(doc?.payment?.acceptedProofText || ""));
      setSuccessRedirectText(String(doc?.payment?.successRedirectText || ""));
      setPaymentFaq(normalizeFaq(doc?.payment?.faq));

      const paymentUi = doc?.payment?.ui || {};
      const paymentVt = paymentUi?.validationTexts || {};
      setPaymentLoadingText(String(paymentUi?.loadingText || ""));
      setPaymentCopyFailedText(
        String(
          paymentVt?.copyFailedText || (paymentUi as any)?.copyFailedText || ""
        )
      );
      setPaymentDetailsCopiedText(
        String(
          paymentVt?.paymentDetailsCopiedText ||
            (paymentUi as any)?.paymentDetailsCopiedText ||
            ""
        )
      );
      setPaymentSelectMethodRequiredText(
        String(
          paymentVt?.selectMethodRequiredText ||
            (paymentUi as any)?.selectMethodRequiredText ||
            ""
        )
      );
      setPaymentProofRequiredText(
        String(
          paymentVt?.proofRequiredText ||
            (paymentUi as any)?.proofRequiredText ||
            ""
        )
      );
      setPaymentInvalidFileTypeText(
        String(
          paymentVt?.invalidFileTypeText ||
            (paymentUi as any)?.invalidFileTypeText ||
            ""
        )
      );
      setPaymentFileTooLargeText(
        String(
          paymentVt?.fileTooLargeText ||
            (paymentUi as any)?.fileTooLargeText ||
            ""
        )
      );
      setPaymentSubmitFailedText(
        String(
          paymentVt?.submitFailedText ||
            (paymentUi as any)?.submitFailedText ||
            ""
        )
      );

      setTrustBlockText(String(doc?.services?.trustBlockText || ""));
      setGlobalFaq(normalizeFaq(doc?.services?.globalFaq));

      setQuickReplies(normalizeStringArray(doc?.orderSupport?.quickReplies));
      setGuidelinesText(
        String(
          doc?.orderSupport?.guidelinesText ||
            doc?.orderSupport?.supportGuidelines ||
            ""
        )
      );

      const chat = doc?.orders?.details?.chat || {};
      setOrderChatInputPlaceholder(String(chat?.inputPlaceholder || ""));
      setOrderChatSendButtonText(String(chat?.sendButtonText || ""));
      setOrderChatSendingButtonText(String(chat?.sendingButtonText || ""));
      setOrderChatHintText(String(chat?.hintText || ""));
      setOrderChatEmptyStateText(String(chat?.emptyStateText || ""));
      setOrderChatEmptyTitle(String(chat?.emptyTitle || ""));
      setOrderChatEmptySubtitle(String(chat?.emptySubtitle || ""));

      setApplyWorkFaq(normalizeFaq(doc?.applyWork?.faq));
      setApplyWorkFaqTitle(String(doc?.applyWork?.ui?.faqTitle || ""));

      setDisclaimer(String(doc?.footer?.disclaimer || ""));
      setDataSafetyNote(String(doc?.footer?.dataSafetyNote || ""));
    } catch (e: any) {
      setError(e?.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = useMemo(() => {
    const base = [
      { key: "global" as const, label: "Global" },
      { key: "marketplace" as const, label: "Marketplace pages" },
      { key: "landing" as const, label: "Legacy landing copy" },
      { key: "payment" as const, label: "Payment" },
      { key: "services" as const, label: "Services" },
      { key: "orderSupport" as const, label: "Order Support" },
      { key: "applyWork" as const, label: "Apply Work" },
      { key: "footer" as const, label: "Footer" },
    ];
    return isAdmin
      ? [...base, { key: "advanced" as const, label: "Advanced" }]
      : base;
  }, [isAdmin]);

  const parseJsonWithLocation = (
    input: string
  ):
    | { ok: true; value: any }
    | { ok: false; message: string; line?: number; col?: number } => {
    try {
      const value = JSON.parse(input);
      return { ok: true, value };
    } catch (e: any) {
      const msg = String(e?.message || "Invalid JSON");

      // Try to extract position (V8: "... at position 123")
      const m = msg.match(/position\s+(\d+)/i);
      if (m) {
        const pos = Number(m[1]);
        if (!Number.isNaN(pos) && pos >= 0) {
          const before = input.slice(0, pos);
          const line = before.split("\n").length;
          const lastNl = before.lastIndexOf("\n");
          const col = pos - (lastNl === -1 ? 0 : lastNl + 1) + 1;
          return { ok: false, message: msg, line, col };
        }
      }
      return { ok: false, message: msg };
    }
  };

  const loadRawFromServer = async () => {
    setRawBusy(true);
    try {
      const resp = await apiRequest<{ settings: unknown; revision: string }>(
        "/api/admin/settings/raw",
        "GET",
        null,
        true
      );
      setRawRevision(resp.revision);
      setConfirmReplace(false);
      setRawJsonText(JSON.stringify(resp?.settings ?? {}, null, 2));
      toast("Loaded settings JSON", "success");
    } catch (e: any) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[cms advanced] load raw failed", e);
      }
      toast("Failed to load settings JSON", "error");
    } finally {
      setRawBusy(false);
    }
  };

  const validateRawJson = () => {
    const result = parseJsonWithLocation(rawJsonText);
    if (result.ok) {
      toast("Valid JSON ✅", "success");
      return;
    }
    const loc =
      typeof result.line === "number" && typeof result.col === "number"
        ? ` (line ${result.line}, col ${result.col})`
        : "";
    toast(`Invalid JSON ❌${loc}`, "error");
  };

  const copyRawJson = async () => {
    try {
      await navigator.clipboard.writeText(rawJsonText || "");
      toast("Copied JSON", "success");
    } catch (e) {
      toast("Copy failed", "error");
    }
  };

  const downloadRawJson = () => {
    try {
      const blob = new Blob([rawJsonText || "{}"], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `site-settings-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Downloaded JSON", "success");
    } catch {
      toast("Download failed", "error");
    }
  };

  const saveRawJson = async (mode: "merge" | "replace") => {
    if (!revision) return;
    const result = parseJsonWithLocation(rawJsonText);
    if (!result.ok) {
      const loc =
        typeof result.line === "number" && typeof result.col === "number"
          ? ` (line ${result.line}, col ${result.col})`
          : "";
      toast(`Invalid JSON ❌${loc}`, "error");
      return;
    }

    if (mode === "replace" && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }

    setRawBusy(true);
    try {
      await apiRequest(
        "/api/admin/settings/raw",
        "PUT",
        { mode, settings: result.value, expectedRevision: rawRevision || revision },
        true
      );
      toast("Settings updated", "success");
      setConfirmReplace(false);
      setRawRevision(null);
      setRawJsonText("");

      // Force refresh settings in this browser/session.
      markSiteSettingsUpdated();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("site-settings-force-refresh"));
      }

      // Reload the normal editor fields too.
      await load();
    } catch (e: any) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[cms advanced] save raw failed", e);
      }
      toast(e?.message || "Save failed", "error");
    } finally {
      setRawBusy(false);
    }
  };

  const sanitizeFaqBeforeSave = (list: FaqItem[]): FaqItem[] => {
    return list
      .map((x) => ({
        q: String(x.q || "").trim(),
        a: String(x.a || "").trim(),
      }))
      .filter((x) => x.q && x.a)
      .slice(0, 25);
  };
  const sanitizeTitleDescBeforeSave = (list: TitleDesc[]): TitleDesc[] => {
    return list
      .map((x) => ({
        title: String(x.title || "").trim(),
        desc: String(x.desc || "").trim(),
      }))
      .filter((x) => x.title && x.desc)
      .slice(0, 12);
  };
  const sanitizeStringArrayBeforeSave = (list: string[]): string[] => {
    return list
      .map((x) => String(x || "").trim())
      .filter(Boolean)
      .slice(0, 10);
  };

  const save = async () => {
    if (!revision || saving) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        expectedRevision: revision,
        marketplace,
        site: {
          brandName: brandName.trim(),
          bannerText: bannerText.trim(),
        },
        support: {
          whatsappNumber: whatsappNumber.trim(),
          supportEmail: supportEmail.trim(),
        },
        footer: {
          disclaimer: disclaimer.trim(),
          dataSafetyNote: dataSafetyNote.trim(),
        },
        landing: {
          heroTitle: heroTitle.trim(),
          heroSubtitle: heroSubtitle.trim(),
          ctaPrimaryText: ctaPrimaryText.trim(),
          ctaSecondaryText: ctaSecondaryText.trim(),
          features: sanitizeTitleDescBeforeSave(features),
          popularTitle: popularTitle.trim(),
          popularSubtitle: popularSubtitle.trim(),
          finalCtaTitle: finalCtaTitle.trim(),
          finalCtaSubtitle: finalCtaSubtitle.trim(),
        },
        payment: {
          beginnerSteps: sanitizeTitleDescBeforeSave(beginnerSteps),
          acceptedProofText: acceptedProofText.trim(),
          successRedirectText: successRedirectText.trim(),
          faq: sanitizeFaqBeforeSave(paymentFaq),
          ui: {
            loadingText: paymentLoadingText.trim(),
            validationTexts: {
              copyFailedText: paymentCopyFailedText.trim(),
              paymentDetailsCopiedText: paymentDetailsCopiedText.trim(),
              selectMethodRequiredText: paymentSelectMethodRequiredText.trim(),
              proofRequiredText: paymentProofRequiredText.trim(),
              invalidFileTypeText: paymentInvalidFileTypeText.trim(),
              fileTooLargeText: paymentFileTooLargeText.trim(),
              submitFailedText: paymentSubmitFailedText.trim(),
            },
          },
        },
        orders: {
          details: {
            chat: {
              inputPlaceholder: orderChatInputPlaceholder.trim(),
              sendButtonText: orderChatSendButtonText.trim(),
              sendingButtonText: orderChatSendingButtonText.trim(),
              hintText: orderChatHintText.trim(),
              emptyStateText: orderChatEmptyStateText.trim(),
              emptyTitle: orderChatEmptyTitle.trim(),
              emptySubtitle: orderChatEmptySubtitle.trim(),
            },
          },
        },
        services: {
          trustBlockText: trustBlockText.trim(),
          globalFaq: sanitizeFaqBeforeSave(globalFaq),
        },
        orderSupport: {
          quickReplies: sanitizeStringArrayBeforeSave(quickReplies),
          guidelinesText: guidelinesText.trim(),
          supportGuidelines: guidelinesText.trim(),
        },
        applyWork: {
          faq: sanitizeFaqBeforeSave(applyWorkFaq),
          ui: {
            faqTitle: applyWorkFaqTitle.trim(),
          },
        },
      };

      await apiRequest("/api/admin/settings", "PUT", payload, true);
      markSiteSettingsUpdated();
      toast("CMS settings saved", "success");
      await load();
    } catch (e: any) {
      const msg = e?.message || "Save failed";
      setError(msg);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-slate-400">Loading...</div>;

  return (
    <div className="u-container max-w-6xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">CMS Settings</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Update site copy and FAQs without code changes.
          </p>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving || !revision || tab === "advanced"}
          className="btn-primary w-full sm:w-auto disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-200">
          {error} <button type="button" onClick={load} className="ml-2 underline">Reload settings</button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-xl border text-sm transition ${
                active
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white/5 border-white/10 text-[#9CA3AF] hover:text-white hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "global" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="font-semibold">Brand</h2>
            <label className="block text-xs text-[#9CA3AF] mt-3">
              Brand name
            </label>
            <input
              className="u-input mt-2"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="UREMO"
            />

            <label className="block text-xs text-[#9CA3AF] mt-4">
              Banner notice
            </label>
            <textarea
              className="u-input mt-2 min-h-[110px]"
              value={bannerText}
              onChange={(e) => setBannerText(e.target.value)}
              placeholder="Site notice banner text"
            />
          </div>

          <div className="card">
            <h2 className="font-semibold">Support</h2>
            <label className="block text-xs text-[#9CA3AF] mt-3">
              WhatsApp (optional)
            </label>
            <input
              className="u-input mt-2"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="e.g. +919749040727"
            />

            <label className="block text-xs text-[#9CA3AF] mt-4">
              Support email
            </label>
            <input
              className="u-input mt-2"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="Support inbox (optional)"
            />
          </div>
        </div>
      )}

      {tab === "marketplace" && <div className="space-y-4">
        {([
          ["roles", "Open roles", "/open-roles"],
          ["rent", "Rent projects", "/projects/rent"],
          ["buy", "Full Access projects", "/projects/full-access"],
        ] as const).map(([key, label, href]) => <section key={key} className="card space-y-3">
          <div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{label}</h2>
            <a className="text-sm underline" href={href} target="_blank" rel="noreferrer">View page</a></div>
          <label className="block text-sm">Page heading
            <input className="u-input mt-1" maxLength={100} value={marketplace[`${key}Title`]}
              onChange={event => setMarketplace(current => ({ ...current, [`${key}Title`]: event.target.value }))} />
          </label>
          <label className="block text-sm">Introduction
            <textarea className="u-input mt-1" maxLength={300} rows={3} value={marketplace[`${key}Intro`]}
              onChange={event => setMarketplace(current => ({ ...current, [`${key}Intro`]: event.target.value }))} />
          </label>
        </section>)}
      </div>}
      {tab === "landing" && (
        <div className="space-y-6">
          <p className="text-sm text-slate-300">These fields preserve the former service storefront. Edit the current homepage in Marketplace pages.</p>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="font-semibold">Hero</h2>
              <label className="block text-xs text-[#9CA3AF] mt-3">Title</label>
              <input
                className="u-input mt-2"
                value={heroTitle}
                onChange={(e) => setHeroTitle(e.target.value)}
                placeholder="Verified Digital Onboarding & Marketplace"
              />
              <label className="block text-xs text-[#9CA3AF] mt-4">
                Subtitle
              </label>
              <textarea
                className="u-input mt-2 min-h-[110px]"
                value={heroSubtitle}
                onChange={(e) => setHeroSubtitle(e.target.value)}
                placeholder="Short supporting copy"
              />
            </div>

            <div className="card">
              <h2 className="font-semibold">CTA Buttons</h2>
              <label className="block text-xs text-[#9CA3AF] mt-3">
                Primary CTA text
              </label>
              <input
                className="u-input mt-2"
                value={ctaPrimaryText}
                onChange={(e) => setCtaPrimaryText(e.target.value)}
                placeholder="Browse services"
              />
              <label className="block text-xs text-[#9CA3AF] mt-4">
                Secondary CTA text
              </label>
              <input
                className="u-input mt-2"
                value={ctaSecondaryText}
                onChange={(e) => setCtaSecondaryText(e.target.value)}
                placeholder="How it works"
              />
            </div>
          </div>

          <TitleDescEditor
            title="Feature cards"
            hint="Saved with the legacy storefront copy. Max 8 items."
            items={features}
            onChange={setFeatures}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="font-semibold">Popular section</h2>
              <label className="block text-xs text-[#9CA3AF] mt-3">Title</label>
              <input
                className="u-input mt-2"
                value={popularTitle}
                onChange={(e) => setPopularTitle(e.target.value)}
                placeholder="Popular services"
              />
              <label className="block text-xs text-[#9CA3AF] mt-4">
                Subtitle
              </label>
              <textarea
                className="u-input mt-2 min-h-[90px]"
                value={popularSubtitle}
                onChange={(e) => setPopularSubtitle(e.target.value)}
                placeholder="Start with our most-requested manual operations."
              />
            </div>

            <div className="card">
              <h2 className="font-semibold">Final CTA</h2>
              <label className="block text-xs text-[#9CA3AF] mt-3">Title</label>
              <input
                className="u-input mt-2"
                value={finalCtaTitle}
                onChange={(e) => setFinalCtaTitle(e.target.value)}
                placeholder="Ready to start?"
              />
              <label className="block text-xs text-[#9CA3AF] mt-4">
                Subtitle
              </label>
              <textarea
                className="u-input mt-2 min-h-[90px]"
                value={finalCtaSubtitle}
                onChange={(e) => setFinalCtaSubtitle(e.target.value)}
                placeholder="Create an account, reserve a service, and complete payment."
              />
            </div>
          </div>
        </div>
      )}

      {tab === "payment" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const d = DEFAULT_PUBLIC_SITE_SETTINGS.payment;
                setAcceptedProofText(d.acceptedProofText);
                setSuccessRedirectText(d.successRedirectText);
                setBeginnerSteps(d.beginnerSteps);
                setPaymentFaq(d.faq);
                setPaymentLoadingText(d.ui.loadingText);
                setPaymentCopyFailedText(d.ui.copyFailedText);
                setPaymentDetailsCopiedText(d.ui.paymentDetailsCopiedText);
                setPaymentSelectMethodRequiredText(
                  d.ui.selectMethodRequiredText
                );
                setPaymentProofRequiredText(d.ui.proofRequiredText);
                setPaymentInvalidFileTypeText(d.ui.invalidFileTypeText);
                setPaymentFileTooLargeText(d.ui.fileTooLargeText);
                setPaymentSubmitFailedText(d.ui.submitFailedText);
              }}
            >
              Reset payment defaults
            </button>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <h2 className="font-semibold">Payment copy</h2>
              <label className="block text-xs text-[#9CA3AF] mt-3">
                Accepted proof text
              </label>
              <textarea
                className="u-input mt-2 min-h-[90px]"
                value={acceptedProofText}
                onChange={(e) => setAcceptedProofText(e.target.value)}
                placeholder="Accepted proof: Screenshot/PDF with transaction ID…"
              />
              <label className="block text-xs text-[#9CA3AF] mt-4">
                Success redirect text
              </label>
              <textarea
                className="u-input mt-2 min-h-[90px]"
                value={successRedirectText}
                onChange={(e) => setSuccessRedirectText(e.target.value)}
                placeholder="Payment received…"
              />
            </div>

            <TitleDescEditor
              title="Beginner steps"
              hint="Optional helper content. Max 10 items."
              items={beginnerSteps}
              onChange={setBeginnerSteps}
            />
          </div>

          <FaqEditor
            title="Payment FAQ"
            items={paymentFaq}
            onChange={setPaymentFaq}
          />

          <div className="card">
            <h2 className="font-semibold">Payment UI strings</h2>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Used for loading + validation/toast messages on the payment page.
            </p>

            <label className="block text-xs text-[#9CA3AF] mt-4">
              Loading text
            </label>
            <input
              className="u-input mt-2"
              value={paymentLoadingText}
              onChange={(e) => setPaymentLoadingText(e.target.value)}
              placeholder="Loading…"
            />

            <div className="grid gap-4 lg:grid-cols-2 mt-4">
              <div>
                <label className="block text-xs text-[#9CA3AF]">
                  Copy failed
                </label>
                <input
                  className="u-input mt-2"
                  value={paymentCopyFailedText}
                  onChange={(e) => setPaymentCopyFailedText(e.target.value)}
                  placeholder="Copy failed"
                />
              </div>

              <div>
                <label className="block text-xs text-[#9CA3AF]">
                  Payment details copied
                </label>
                <input
                  className="u-input mt-2"
                  value={paymentDetailsCopiedText}
                  onChange={(e) => setPaymentDetailsCopiedText(e.target.value)}
                  placeholder="Payment details copied"
                />
              </div>

              <div>
                <label className="block text-xs text-[#9CA3AF]">
                  Select method required
                </label>
                <input
                  className="u-input mt-2"
                  value={paymentSelectMethodRequiredText}
                  onChange={(e) =>
                    setPaymentSelectMethodRequiredText(e.target.value)
                  }
                  placeholder="Please select a payment method"
                />
              </div>

              <div>
                <label className="block text-xs text-[#9CA3AF]">
                  Proof required
                </label>
                <input
                  className="u-input mt-2"
                  value={paymentProofRequiredText}
                  onChange={(e) => setPaymentProofRequiredText(e.target.value)}
                  placeholder="Please upload payment proof"
                />
              </div>

              <div>
                <label className="block text-xs text-[#9CA3AF]">
                  Invalid file type
                </label>
                <input
                  className="u-input mt-2"
                  value={paymentInvalidFileTypeText}
                  onChange={(e) =>
                    setPaymentInvalidFileTypeText(e.target.value)
                  }
                  placeholder="Only PNG/JPG/WEBP/PDF allowed"
                />
              </div>

              <div>
                <label className="block text-xs text-[#9CA3AF]">
                  File too large
                </label>
                <input
                  className="u-input mt-2"
                  value={paymentFileTooLargeText}
                  onChange={(e) => setPaymentFileTooLargeText(e.target.value)}
                  placeholder="File too large (max 10MB)"
                />
              </div>
            </div>

            <label className="block text-xs text-[#9CA3AF] mt-4">
              Submit failed
            </label>
            <input
              className="u-input mt-2"
              value={paymentSubmitFailedText}
              onChange={(e) => setPaymentSubmitFailedText(e.target.value)}
              placeholder="Failed to submit proof"
            />
          </div>
        </div>
      )}

      {tab === "services" && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold">Trust block text</h2>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Reused across service listings/details as general marketing copy.
            </p>
            <textarea
              className="u-input mt-3 min-h-[110px]"
              value={trustBlockText}
              onChange={(e) => setTrustBlockText(e.target.value)}
              placeholder="UREMO delivers manual operations…"
            />
          </div>

          <FaqEditor
            title="Global services FAQ"
            items={globalFaq}
            onChange={setGlobalFaq}
          />
        </div>
      )}

      {tab === "orderSupport" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const d = DEFAULT_PUBLIC_SITE_SETTINGS;
                setQuickReplies(d.orderSupport.quickReplies);
                setGuidelinesText(d.orderSupport.supportGuidelines);

                setOrderChatInputPlaceholder(
                  d.orders.details.chatInputPlaceholder
                );
                setOrderChatSendButtonText(d.orders.details.sendButtonText);
                setOrderChatSendingButtonText(
                  d.orders.details.sendingButtonText
                );
                setOrderChatHintText(d.orders.details.supportRepliesHint);
                setOrderChatEmptyTitle(d.orders.details.emptyChatTitle);
                setOrderChatEmptySubtitle(d.orders.details.emptyChatSubtitle);
                setOrderChatEmptyStateText("");
              }}
            >
              Reset order support defaults
            </button>
          </div>

          <StringListEditor
            title="Quick replies"
            hint="Shown as one-tap buttons in order chat. Max 10 items."
            items={quickReplies}
            onChange={setQuickReplies}
            placeholder="Type a quick reply and press Add"
          />

          <div className="card">
            <h2 className="font-semibold">Support guidelines</h2>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Short helper text shown near the chat box.
            </p>
            <textarea
              className="u-input mt-3 min-h-[110px]"
              value={guidelinesText}
              onChange={(e) => setGuidelinesText(e.target.value)}
              placeholder="Share your order issue and any relevant proof…"
            />
          </div>

          <div className="card">
            <h2 className="font-semibold">Order chat strings</h2>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Controls the text shown in the Order Details chat section.
            </p>

            <div className="grid gap-4 lg:grid-cols-2 mt-4">
              <div>
                <label className="block text-xs text-[#9CA3AF]">
                  Input placeholder
                </label>
                <input
                  className="u-input mt-2"
                  value={orderChatInputPlaceholder}
                  onChange={(e) => setOrderChatInputPlaceholder(e.target.value)}
                  placeholder="Type a message…"
                />
              </div>

              <div>
                <label className="block text-xs text-[#9CA3AF]">
                  Hint text
                </label>
                <input
                  className="u-input mt-2"
                  value={orderChatHintText}
                  onChange={(e) => setOrderChatHintText(e.target.value)}
                  placeholder="Support replies from admin will appear here."
                />
              </div>

              <div>
                <label className="block text-xs text-[#9CA3AF]">
                  Send button text
                </label>
                <input
                  className="u-input mt-2"
                  value={orderChatSendButtonText}
                  onChange={(e) => setOrderChatSendButtonText(e.target.value)}
                  placeholder="Send"
                />
              </div>

              <div>
                <label className="block text-xs text-[#9CA3AF]">
                  Sending button text
                </label>
                <input
                  className="u-input mt-2"
                  value={orderChatSendingButtonText}
                  onChange={(e) =>
                    setOrderChatSendingButtonText(e.target.value)
                  }
                  placeholder="Sending…"
                />
              </div>
            </div>

            <label className="block text-xs text-[#9CA3AF] mt-4">
              Empty state text (optional)
            </label>
            <input
              className="u-input mt-2"
              value={orderChatEmptyStateText}
              onChange={(e) => setOrderChatEmptyStateText(e.target.value)}
              placeholder="Use a quick reply to start the conversation."
            />

            <div className="grid gap-4 lg:grid-cols-2 mt-4">
              <div>
                <label className="block text-xs text-[#9CA3AF]">
                  Empty title
                </label>
                <input
                  className="u-input mt-2"
                  value={orderChatEmptyTitle}
                  onChange={(e) => setOrderChatEmptyTitle(e.target.value)}
                  placeholder="No messages yet. Support will reply here."
                />
              </div>
              <div>
                <label className="block text-xs text-[#9CA3AF]">
                  Empty subtitle
                </label>
                <input
                  className="u-input mt-2"
                  value={orderChatEmptySubtitle}
                  onChange={(e) => setOrderChatEmptySubtitle(e.target.value)}
                  placeholder="Use a quick reply to start the conversation."
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "applyWork" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const d = DEFAULT_PUBLIC_SITE_SETTINGS.applyWork;
                setApplyWorkFaq(d.faq);
                setApplyWorkFaqTitle(d.ui.faqTitle);
              }}
            >
              Reset apply-work defaults
            </button>
          </div>

          <div className="card">
            <h2 className="font-semibold">Apply-to-work UI</h2>
            <label className="block text-xs text-[#9CA3AF] mt-3">
              FAQ section title
            </label>
            <input
              className="u-input mt-2"
              value={applyWorkFaqTitle}
              onChange={(e) => setApplyWorkFaqTitle(e.target.value)}
              placeholder="Apply-to-work FAQ"
            />
          </div>

          <FaqEditor
            title="Apply-to-work FAQ"
            items={applyWorkFaq}
            onChange={setApplyWorkFaq}
          />
        </div>
      )}

      {tab === "footer" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="font-semibold">Disclaimer</h2>
            <p className="text-xs text-[#9CA3AF] mt-1">Shown in site footer.</p>
            <textarea
              className="u-input mt-3 min-h-[140px]"
              value={disclaimer}
              onChange={(e) => setDisclaimer(e.target.value)}
              placeholder="Independent provider disclaimer"
            />
          </div>

          <div className="card">
            <h2 className="font-semibold">Data safety note</h2>
            <p className="text-xs text-[#9CA3AF] mt-1">Shown in site footer.</p>
            <textarea
              className="u-input mt-3 min-h-[140px]"
              value={dataSafetyNote}
              onChange={(e) => setDataSafetyNote(e.target.value)}
              placeholder="Data safety / privacy note"
            />
          </div>
        </div>
      )}

      {tab === "advanced" && isAdmin && (
        <div className="space-y-6">
          <div className="card">
            <h2 className="font-semibold">Advanced JSON / Import</h2>
            <p className="text-xs text-[#9CA3AF] mt-1">
              Edit the full SiteSettings document as raw JSON. Use Merge for
              safe updates.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={loadRawFromServer}
                disabled={rawBusy}
              >
                {rawBusy ? "Loading…" : "Load from server"}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={copyRawJson}
                disabled={!rawJsonText}
              >
                Copy JSON
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={downloadRawJson}
                disabled={!rawJsonText}
              >
                Download JSON
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={validateRawJson}
                disabled={!rawJsonText}
              >
                Validate JSON
              </button>

              <label className="btn-secondary cursor-pointer">
                Import JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setRawJsonText(String(reader.result || ""));
                      toast("Imported JSON file", "success");
                    };
                    reader.onerror = () => toast("Import failed", "error");
                    reader.readAsText(file);

                    // allow importing the same file again
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            <textarea
              className="u-input mt-4 min-h-[420px] font-mono text-xs"
              value={rawJsonText}
              onChange={(e) => setRawJsonText(e.target.value)}
              placeholder={
                authReady && isAdmin
                  ? "Click 'Load from server'…"
                  : "Admin only"
              }
              disabled={!authReady || !isAdmin || rawBusy}
            />

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-primary"
                onClick={() => saveRawJson("merge")}
                disabled={!rawJsonText || rawBusy || !authReady || !isAdmin}
              >
                Save JSON (Merge)
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg border border-red-500/40 bg-red-500/10 text-red-200 text-sm hover:bg-red-500/15 disabled:opacity-60"
                onClick={() => saveRawJson("replace")}
                disabled={!rawJsonText || rawBusy || !authReady || !isAdmin}
              >
                Save JSON (Replace)
              </button>
            </div>

            {confirmReplace && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                <p className="text-sm text-red-100 font-medium">
                  Replace mode will overwrite the entire settings document.
                </p>
                <p className="text-xs text-red-200/80 mt-1">
                  This is dangerous and can break the site if your JSON is
                  incomplete.
                </p>
                <div className="mt-3 flex gap-2 flex-wrap">
                  <button
                    type="button"
                    className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm"
                    onClick={() => saveRawJson("replace")}
                    disabled={rawBusy}
                  >
                    Yes, replace settings
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setConfirmReplace(false)}
                    disabled={rawBusy}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="btn-primary w-full sm:w-auto disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

function FaqEditor(props: {
  title: string;
  items: FaqItem[];
  onChange: (next: FaqItem[]) => void;
}) {
  const items = Array.isArray(props.items) ? props.items : [];

  const add = () => {
    props.onChange(
      (items.length >= 25 ? items : [...items, { q: "", a: "" }]).slice(0, 25)
    );
  };

  const remove = (idx: number) => {
    props.onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold">{props.title}</h2>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Max 25 items. Empty Q/A rows are ignored on save.
          </p>
        </div>

        <button type="button" onClick={add} className="btn-secondary">
          + Add QA
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {items.length === 0 && (
          <div className="text-sm text-[#9CA3AF]">No items yet.</div>
        )}

        {items.map((item, idx) => (
          <div
            key={`${idx}`}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-[#9CA3AF]">Item {idx + 1}</p>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-xs text-red-200 hover:text-red-100"
              >
                Delete
              </button>
            </div>

            <label className="block text-xs text-[#9CA3AF] mt-3">
              Question
            </label>
            <input
              className="u-input mt-2"
              value={item.q}
              onChange={(e) =>
                props.onChange(setAt(items, idx, { q: e.target.value }))
              }
              placeholder="Question"
            />

            <label className="block text-xs text-[#9CA3AF] mt-3">Answer</label>
            <textarea
              className="u-input mt-2 min-h-[90px]"
              value={item.a}
              onChange={(e) =>
                props.onChange(setAt(items, idx, { a: e.target.value }))
              }
              placeholder="Answer"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function TitleDescEditor(props: {
  title: string;
  hint: string;
  items: TitleDesc[];
  onChange: (next: TitleDesc[]) => void;
}) {
  const items = Array.isArray(props.items) ? props.items : [];
  const add = () => {
    if (items.length >= 12) return;
    props.onChange([...items, { title: "", desc: "" }]);
  };
  const remove = (idx: number) =>
    props.onChange(items.filter((_, i) => i !== idx));

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold">{props.title}</h2>
          <p className="text-xs text-[#9CA3AF] mt-1">{props.hint}</p>
        </div>
        <button type="button" onClick={add} className="btn-secondary">
          + Add
        </button>
      </div>

      <div className="mt-4 space-y-4">
        {items.length === 0 && (
          <div className="text-sm text-[#9CA3AF]">No items yet.</div>
        )}

        {items.map((item, idx) => (
          <div
            key={`${idx}`}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-[#9CA3AF]">Item {idx + 1}</p>
              <button
                type="button"
                onClick={() => remove(idx)}
                className="text-xs text-red-200 hover:text-red-100"
              >
                Delete
              </button>
            </div>

            <label className="block text-xs text-[#9CA3AF] mt-3">Title</label>
            <input
              className="u-input mt-2"
              value={item.title}
              onChange={(e) =>
                props.onChange(setAt(items, idx, { title: e.target.value }))
              }
              placeholder="Title"
            />

            <label className="block text-xs text-[#9CA3AF] mt-3">
              Description
            </label>
            <textarea
              className="u-input mt-2 min-h-[90px]"
              value={item.desc}
              onChange={(e) =>
                props.onChange(setAt(items, idx, { desc: e.target.value }))
              }
              placeholder="Description"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function StringListEditor(props: {
  title: string;
  hint: string;
  items: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
}) {
  const items = Array.isArray(props.items) ? props.items : [];
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    const next = [...items, v].slice(0, 10);
    props.onChange(next);
    setDraft("");
  };

  const remove = (idx: number) => {
    props.onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-semibold">{props.title}</h2>
          <p className="text-xs text-[#9CA3AF] mt-1">{props.hint}</p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 flex-wrap">
        <input
          className="u-input flex-1 min-w-[220px]"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={props.placeholder}
        />
        <button type="button" onClick={add} className="btn-secondary">
          Add
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {items.length === 0 && (
          <div className="text-sm text-[#9CA3AF]">No items yet.</div>
        )}
        {items.map((t, idx) => (
          <div
            key={`${idx}-${t}`}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200"
          >
            <span>{t}</span>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="text-red-200 hover:text-red-100"
              aria-label="Remove"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
