"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest } from "@/lib/api";

export type FaqItem = { q: string; a: string };
export type TitleDesc = { title: string; desc: string };
export type IconTitleDesc = { icon: string; title: string; desc: string };

export const marketplaceDefaults = {
  rolesTitle: "Open roles",
  rolesIntro: "Find a specialization that fits your skills. Apply for free to qualify for matching projects.",
  rentTitle: "Rent projects",
  rentIntro: "Rent a specific project for a fixed term after qualifying for its specialization.",
  buyTitle: "Full Access projects",
  buyIntro: "Get permanent, exclusive access to a specific project with one payment. Anyone can purchase.",
};

export type PublicSiteSettings = {
  marketplace: typeof marketplaceDefaults;
  nav: {
    guestPrimaryCtaText: string;
    guestSecondaryCtaText: string;
    guestSignupText: string;
    guestLoginText: string;
    supportLinkText: string;

    authedDashboardText: string;
    authedServicesText: string;
    authedOrdersText: string;
    authedApplyToWorkText: string;
  };
  site: {
    brandName: string;
    bannerText: string;
  };
  support: { whatsappNumber: string; supportEmail: string };
  footer: {
    disclaimer: string;
    dataSafetyNote: string;
    copyrightText: string;
    linksTitle: string;
    supportTitle: string;
    whatsappLabel: string;
    supportPrompt: string;
    servicesLinkText: string;
    workLinkText: string;
    contactLinkText: string;
  };
  landing: {
    heroTitle: string;
    heroSubtitle: string;
    ctaPrimaryText: string;
    ctaSecondaryText: string;
    features: TitleDesc[];

    supportedServicesTitle: string;
    supportedServicesTags: string[];

    howItWorksTitle: string;
    howItWorksSteps: IconTitleDesc[];

    popularTitle: string;
    popularSubtitle: string;
    popularBrowseAllText: string;
    popularEmptyTitle: string;
    popularEmptySubtitle: string;
    popularEmptyCtaText: string;
    finalCtaTitle: string;
    finalCtaSubtitle: string;
    finalCtaPrimaryText: string;
    finalCtaSecondaryText: string;

    whyChooseTitle: string;
    whyChooseFeatures: IconTitleDesc[];

    trustDisclaimerText: string;
  };
  payment: {
    beginnerSteps: TitleDesc[];
    acceptedProofText: string;
    successRedirectText: string;
    faq: FaqItem[];
    ui: {
      title: string;
      loadingText: string;
      viewOrdersText: string;
      wizardStep1Title: string;
      wizardStep1Subtitle: string;
      wizardStep2Title: string;
      wizardStep2Subtitle: string;
      wizardStep3Title: string;
      wizardStep3Subtitle: string;

      orderIdLabel: string;
      copyButtonText: string;
      copyFailedText: string;
      paymentSummaryLabel: string;
      paymentSummaryHint: string;

      expiredTitle: string;
      expiredBody: string;
      goToServicesText: string;

      paymentSubmittedTitle: string;
      paymentSubmittedBody: string;
      paymentRejectedTitle: string;
      paymentRejectedBody: string;

      paymentMethodTitle: string;
      lockedText: string;
      paymentMethodHelp: string;
      noPaymentMethodsText: string;

      paymentDetailsCopiedText: string;
      referenceLabel: string;
      referencePlaceholder: string;
      selectMethodRequiredText: string;
      proofRequiredText: string;
      invalidFileTypeText: string;
      fileTooLargeText: string;
      submitFailedText: string;

      uploadProofTitle: string;
      allowedTypesText: string;
      selectedFileLabel: string;
      noFileSelectedText: string;
      removeFileText: string;
      chooseFileText: string;
      tipText: string;
      safetyTitle: string;
      safetyBullets: string[];

      submitButtonSubmitted: string;
      submitButtonResubmit: string;
      submitButtonSubmit: string;
      statusLinePrefix: string;
      statusLineMethodSelected: string;
      statusLineSelectMethod: string;
      statusLineProofAttached: string;
      statusLineAttachProof: string;

      needHelpText: string;

      faqTitle: string;
      faqSubtitle: string;
    };
  };
  services: {
    globalFaq: FaqItem[];
    trustBlockText: string;
    list: {
      title: string;
      highlightPills: string[];
      searchPlaceholder: string;
      allCategoriesText: string;
      activeOnlyText: string;
      showAllText: string;
      emptyTitle: string;
      emptySubtitle: string;
      resetFiltersText: string;
      getStartedText: string;
      manualBadgeText: string;
      inactiveBadgeText: string;
      fromLabel: string;
      viewDetailsText: string;
    };
    details: {
      notAvailableTitle: string;
      notAvailableSubtitle: string;
      backToServicesText: string;
      retryText: string;

      premiumPlaceholderTitle: string;
      premiumPlaceholderSubtitle: string;

      overviewLabel: string;
      whatYouGetTitle: string;
      whatYouGetBullets: string[];
      requirementsTitle: string;
      requirementsEmptyText: string;
      deliveryTimeTitle: string;
      deliveryTimeBody: string;
      safetyNote: string;

      priceLabel: string;
      priceSubtext: string;
      typeLabel: string;
      reserveButtonText: string;
      unavailableButtonText: string;
      reserveHelpText: string;
    };
  };
  orders: {
    list: {
      title: string;
      subtitle: string;
      loadingText: string;
      retryText: string;
      latestUpdateLabel: string;
      noUpdatesText: string;
      completePaymentText: string;
      resubmitProofText: string;
      viewDetailsText: string;
      openChatText: string;
      expiresPrefix: string;
      pendingPaymentTitle: string;
      pendingPaymentEmptyText: string;
      pendingOrWaitingTitle: string;
      pendingOrWaitingEmptyText: string;
      inProgressTitle: string;
      inProgressEmptyText: string;
      noOrdersYetText: string;
      loadFailedText: string;
    };
    details: {
      loadingText: string;
      notFoundTitle: string;
      notFoundBody: string;
      backToOrdersText: string;
      loadErrorTitle: string;
      loadErrorRetryText: string;
      unavailableTitle: string;
      title: string;

      supportBannerTitle: string;
      supportBannerBody: string;
      supportActivePill: string;
      supportActiveHint: string;
      chatNowText: string;

      orderIdLabel: string;
      serviceLabel: string;
      amountLabel: string;
      statusLabel: string;
      paymentVerifiedText: string;
      completePaymentText: string;

      timelineTitle: string;
      noTimelineText: string;

      supportGuideTitle: string;
      supportGuideSubtitle: string;
      openChatText: string;
      supportGuidelinesTitle: string;

      chatTitle: string;
      chatSubtitle: string;
      refreshText: string;
      chatInputPlaceholder: string;
      sendButtonText: string;
      sendingButtonText: string;
      emptyChatTitle: string;
      emptyChatSubtitle: string;
      youLabel: string;
      supportLabel: string;
      supportRepliesHint: string;
      messageSentToast: string;
      sendFailedText: string;
      loadMessagesFailedText: string;
      loadOrderFailedText: string;
    };
  };
  orderSupport: {
    quickReplies: string[];
    supportGuidelines: string;
  };
  applyWork: {
    faq: FaqItem[];
    ui: {
      title: string;
      subtitle: string;
      formTitle: string;
      positionsLabel: string;
      loadingPositionsText: string;
      filterByCategoryLabel: string;
      allCategoriesText: string;
      selectPositionLabel: string;
      noPositionsFoundText: string;
      messageLabel: string;
      messagePlaceholder: string;
      resumeLabel: string;
      resumeHelperText: string;
      submitText: string;
      submittingText: string;
      successToast: string;
      submissionFailedText: string;
      resumeRequiredText: string;
      selectPositionRequiredText: string;

      existingTitle: string;
      existingBody: string;
      existingPendingText: string;
      existingApprovedText: string;
      existingRejectedText: string;

      trustNoteText: string;

      faqTitle: string;
    };
  };
  updatedAt?: string | null;

  // Backward-compat convenience fields for older UI code.
  bannerText: string;
  faq: {
    global: FaqItem[];
    payment: FaqItem[];
    applyWork: FaqItem[];
    orderSupport: FaqItem[];
  };
};

export const DEFAULT_PUBLIC_SITE_SETTINGS: PublicSiteSettings = {
  marketplace: marketplaceDefaults,
  nav: {
    guestPrimaryCtaText: "Get Started",
    guestSecondaryCtaText: "Browse Services",
    guestSignupText: "Sign up",
    guestLoginText: "Login",
    supportLinkText: "Support",
    authedDashboardText: "Dashboard",
    authedServicesText: "Services",
    authedOrdersText: "My Orders",
    authedApplyToWorkText: "Apply to Work",
  },
  site: {
    brandName: "UREMO",
    bannerText:
      "Important: All services are processed manually. Verification & approval may take time.",
  },
  support: {
    whatsappNumber: "",
    supportEmail: "",
  },
  footer: {
    disclaimer:
      "UREMO is an independent service provider. We are not affiliated with, endorsed by, or sponsored by any third-party platforms.",
    dataSafetyNote:
      "Verification outcomes depend on platform rules and policies. UREMO does not store sensitive login credentials or personal data openly.",
    copyrightText: "© 2026 UREMO. Manual operations for platforms that matter.",
    linksTitle: "Links",
    supportTitle: "Support",
    whatsappLabel: "WhatsApp",
    supportPrompt: "Need support? Email us at",
    servicesLinkText: "Services",
    workLinkText: "Work With Us",
    contactLinkText: "Contact",
  },
  landing: {
    heroTitle: "Verified Digital Onboarding & Marketplace",
    heroSubtitle:
      "Buy trusted onboarding, KYC, and verification assistance services. Track orders with human verification and admin support.",
    ctaPrimaryText: "Browse services",
    ctaSecondaryText: "How it works",
    features: [
      {
        title: "Manual verification",
        desc: "Real human checks — not bots — to reduce risk and delays.",
      },
      {
        title: "Order tracking",
        desc: "Pay, submit proof, and track status in your dashboard.",
      },
      {
        title: "Support chat",
        desc: "Message support directly from your order page anytime.",
      },
    ],

    supportedServicesTitle: "SUPPORTED SERVICES",
    supportedServicesTags: [
      "Outlier onboarding",
      "Handshake",
      "Airtm",
      "Binance",
      "Crypto accounts",
      "KYC assistance",
    ],

    howItWorksTitle: "How UREMO Works",
    howItWorksSteps: [
      {
        icon: "Step 1",
        title: "Pick a service",
        desc: "Choose the exact manual operation you need.",
      },
      {
        icon: "Step 2",
        title: "Submit requirements",
        desc: "We collect what’s needed to deliver accurately.",
      },
      {
        icon: "Step 3",
        title: "Manual review",
        desc: "A real operator processes your request carefully.",
      },
      {
        icon: "Step 4",
        title: "Delivery + support",
        desc: "Track status and chat with the team in your order.",
      },
    ],

    popularTitle: "Popular services",
    popularSubtitle: "Start with our most-requested manual operations.",
    popularBrowseAllText: "Browse all",
    popularEmptyTitle: "No services available yet.",
    popularEmptySubtitle: "Check back soon or browse the catalog.",
    popularEmptyCtaText: "Browse services",
    finalCtaTitle: "Ready to start?",
    finalCtaSubtitle:
      "Create an account, reserve a service, and complete payment to begin manual verification.",
    finalCtaPrimaryText: "Sign up",
    finalCtaSecondaryText: "Browse services",

    whyChooseTitle: "Why Choose UREMO",
    whyChooseFeatures: [
      {
        icon: "Security",
        title: "Manual Verification",
        desc: "Every request is reviewed by real humans, not bots.",
      },
      {
        icon: "Payments",
        title: "Flexible Payments",
        desc: "PayPal, Crypto (USDT), or Binance—your choice.",
      },
      {
        icon: "Work",
        title: "Work Opportunities",
        desc: "Join our team as a manual operations specialist.",
      },
    ],

    trustDisclaimerText:
      "Important: All services are processed manually. Verification, approval, and delivery times may vary. UREMO is not responsible for delays outside our control. By using our services, you acknowledge that manual processing takes time.",
  },
  payment: {
    beginnerSteps: [
      { title: "Reserve your service", desc: "Choose a service and place an order." },
      { title: "Pay securely", desc: "Submit your payment reference and proof." },
      { title: "Get verified", desc: "We verify manually and start delivery." },
    ],
    acceptedProofText:
      "Accepted proof: Screenshot/PDF with transaction ID, amount, and receiver details.",
    successRedirectText:
      "Payment received. We’ll verify and update your order shortly.",
    faq: [
      {
        q: "How long does verification take?",
        a: "Usually 5–60 minutes. During peak time it may take longer.",
      },
      {
        q: "What proof is accepted?",
        a: "Screenshot/PDF with transaction ID, amount, and receiver details.",
      },
      {
        q: "What if I uploaded wrong proof?",
        a: "Message Support using Order Chat and re-upload if needed.",
      },
    ],
    ui: {
      title: "Payment",
      loadingText: "Loading…",
      viewOrdersText: "View orders",
      wizardStep1Title: "Select method",
      wizardStep1Subtitle: "Choose where you paid",
      wizardStep2Title: "Upload proof",
      wizardStep2Subtitle: "Attach receipt/screenshot",
      wizardStep3Title: "Await verification",
      wizardStep3Subtitle: "We verify payments manually",
      orderIdLabel: "Order ID",
      copyButtonText: "Copy",
      copyFailedText: "Copy failed",
      paymentSummaryLabel: "Payment summary",
      paymentSummaryHint: "Make sure the amount matches your receipt.",
      expiredTitle: "Reservation expired",
      expiredBody:
        "This order was reserved for 24 hours and has expired. Please buy the service again.",
      goToServicesText: "Go to services",
      paymentSubmittedTitle: "Payment submitted",
      paymentSubmittedBody:
        "Your proof is in our queue. We'll verify it and update your order status.",
      paymentRejectedTitle: "Payment rejected",
      paymentRejectedBody:
        "Your previous proof was rejected. Select a method and submit a new proof.",
      paymentMethodTitle: "Payment method",
      lockedText: "Locked",
      paymentMethodHelp: "Select the exact method you used for this payment.",
      noPaymentMethodsText: "No payment methods yet.",
      paymentDetailsCopiedText: "Payment details copied",
      referenceLabel: "Reference (optional)",
      referencePlaceholder: "Transaction ID / note you used",
      selectMethodRequiredText: "Please select a payment method",
      proofRequiredText: "Please upload payment proof",
      invalidFileTypeText: "Only PNG/JPG/WEBP/PDF allowed",
      fileTooLargeText: "File too large (max 10MB)",
      submitFailedText: "Failed to submit proof",
      uploadProofTitle: "Upload proof",
      allowedTypesText: "PNG/JPG/PDF",
      selectedFileLabel: "Selected file",
      noFileSelectedText: "No file selected",
      removeFileText: "Remove",
      chooseFileText: "Choose file",
      tipText: "Tip: include both amount + receiver details in the screenshot.",
      safetyTitle: "Safety & trust",
      safetyBullets: [
        "We never ask for your password or login codes.",
        "Payments are verified manually to prevent fraud.",
        "Fake or reused proofs will be rejected.",
      ],
      submitButtonSubmitted: "Submitted",
      submitButtonResubmit: "Resubmit proof",
      submitButtonSubmit: "Submit proof",
      statusLinePrefix: "Status:",
      statusLineMethodSelected: "method selected",
      statusLineSelectMethod: "select a method",
      statusLineProofAttached: "proof attached",
      statusLineAttachProof: "attach proof",
      needHelpText: "Need help? Open your My Orders page and use the order chat.",
      faqTitle: "Payment FAQ",
      faqSubtitle: "New here? These are the most common questions.",
    },
  },
  services: {
    globalFaq: [],
    trustBlockText:
      "UREMO delivers manual operations with human verification and transparent order tracking.",
    list: {
      title: "Find Work & Services",
      highlightPills: ["Manual processing", "Order chat", "Status tracking"],
      searchPlaceholder: "Search services (title, category, description)…",
      allCategoriesText: "All categories",
      activeOnlyText: "Active only",
      showAllText: "Show all",
      emptyTitle: "No services found",
      emptySubtitle:
        "Try a different search, switch category, or show all services.",
      resetFiltersText: "Reset filters",
      getStartedText: "Get Started",
      manualBadgeText: "Manual",
      inactiveBadgeText: "Inactive",
      fromLabel: "from",
      viewDetailsText: "View details",
    },
    details: {
      notAvailableTitle: "Service not available",
      notAvailableSubtitle:
        "This service may have been removed or is temporarily unavailable.",
      backToServicesText: "Back to services",
      retryText: "Retry",
      premiumPlaceholderTitle: "Premium manual service",
      premiumPlaceholderSubtitle: "Verified by human specialists",
      overviewLabel: "Overview",
      whatYouGetTitle: "What you get",
      whatYouGetBullets: [
        "Manual processing by a human operations specialist.",
        "Order tracking with clear status updates.",
        "Secure payment verification workflow.",
        "Communication via your order chat when needed.",
      ],
      requirementsTitle: "Requirements",
      requirementsEmptyText:
        "No requirements listed. If we need anything else, we'll message you inside the order.",
      deliveryTimeTitle: "Delivery time",
      deliveryTimeBody:
        "This is a manual service. Delivery is handled in a queue and verified manually; you'll see progress updates in your order.",
      safetyNote:
        "Safety note: UREMO will never ask for your password or sensitive login credentials.",
      priceLabel: "Price",
      priceSubtext: "Manual verification included",
      typeLabel: "Type",
      reserveButtonText: "Reserve & pay",
      unavailableButtonText: "Unavailable",
      reserveHelpText:
        "Reserving creates an order and redirects you to payment.",
    },
  },
  orders: {
    list: {
      title: "My Orders",
      subtitle:
        "Track payment, verification, and delivery status in one place.",
      loadingText: "Loading orders…",
      retryText: "Retry",
      latestUpdateLabel: "Latest update",
      noUpdatesText: "No updates yet.",
      completePaymentText: "Complete payment",
      resubmitProofText: "Resubmit proof",
      viewDetailsText: "View details",
      openChatText: "Open Support Chat →",
      expiresPrefix: "Expires:",
      pendingPaymentTitle: "Pending Payment",
      pendingPaymentEmptyText: "No pending payments.",
      pendingOrWaitingTitle: "Pending / Awaiting Action",
      pendingOrWaitingEmptyText: "No pending orders.",
      inProgressTitle: "Orders in progress / completed",
      inProgressEmptyText: "No orders yet.",
      noOrdersYetText: "You haven't placed any orders yet.",
      loadFailedText: "Failed to load orders",
    },
    details: {
      loadingText: "Loading order…",
      notFoundTitle: "Order not found",
      notFoundBody: "This order doesn’t exist, or you don’t have access.",
      backToOrdersText: "Back to Orders",
      loadErrorTitle: "Couldn’t load order",
      loadErrorRetryText: "Retry",
      unavailableTitle: "Order unavailable",
      title: "Order Details",
      supportBannerTitle: "Need faster delivery?",
      supportBannerBody:
        "Chat with UREMO support for verification & delivery updates.",
      supportActivePill: "Support active",
      supportActiveHint: "Replies usually within 5–10 minutes",
      chatNowText: "Chat Now",
      orderIdLabel: "Order ID",
      serviceLabel: "Service",
      amountLabel: "Amount",
      statusLabel: "Status",
      paymentVerifiedText: "Payment verified",
      completePaymentText: "Complete payment",
      timelineTitle: "Timeline",
      noTimelineText: "No timeline events yet.",
      supportGuideTitle: "Support Guide",
      supportGuideSubtitle: "Quick tips to get faster help.",
      openChatText: "Open chat",
      supportGuidelinesTitle: "Support guidelines",
      chatTitle: "Order Support Chat",
      chatSubtitle:
        "Message support for payment verification and delivery updates.",
      refreshText: "Refresh",
      chatInputPlaceholder: "Type a message…",
      sendButtonText: "Send",
      sendingButtonText: "Sending…",
      emptyChatTitle: "No messages yet. Support will reply here.",
      emptyChatSubtitle: "Use a quick reply to start the conversation.",
      youLabel: "You",
      supportLabel: "Support",
      supportRepliesHint: "Support replies from admin will appear here.",
      messageSentToast: "Message sent",
      sendFailedText: "Failed to send message",
      loadMessagesFailedText: "Failed to load messages",
      loadOrderFailedText: "Failed to load order",
    },
  },
  orderSupport: {
    quickReplies: [
      "I have paid, please verify.",
      "When will my service be delivered?",
      "I need urgent delivery.",
    ],
    supportGuidelines:
      "Share your order issue and any relevant proof/reference. Support replies within working hours.",
  },
  applyWork: {
    faq: [
      { q: "How long does approval take?", a: "24–72 hours depending on openings." },
      { q: "What resume format is accepted?", a: "PDF is preferred." },
    ],
    ui: {
      title: "Apply to Work",
      subtitle: "Apply for internal roles. All applications are manually reviewed.",
      formTitle: "Application Details",
      positionsLabel: "Positions",
      loadingPositionsText: "Loading positions…",
      filterByCategoryLabel: "Filter by category",
      allCategoriesText: "All categories",
      selectPositionLabel: "Select a position",
      noPositionsFoundText: "No positions found.",
      messageLabel: "Message (optional)",
      messagePlaceholder: "Briefly explain why you're suitable",
      resumeLabel: "Resume (PDF preferred)",
      resumeHelperText:
        "Upload your resume to help us evaluate your application faster.",
      submitText: "Submit Application",
      submittingText: "Submitting...",
      successToast: "Application submitted successfully",
      submissionFailedText: "Submission failed",
      resumeRequiredText: "Resume upload is required",
      selectPositionRequiredText: "Please select a position",
      existingTitle: "Your Application Status",
      existingBody: "You have already submitted an application.",
      existingPendingText:
        "Your application is under review. We'll notify you once a decision is made.",
      existingApprovedText:
        "Congratulations! Your application has been approved. Please check your email for next steps.",
      existingRejectedText:
        "Your application was not accepted at this time. Feel free to reapply in the future.",
      trustNoteText:
        "Important: Submitting an application does not guarantee approval. UREMO reviews applications manually based on current operational needs.",

      faqTitle: "Apply-to-work FAQ",
    },
  },
  updatedAt: null,

  // legacy convenience
  bannerText:
    "Important: All services are processed manually. Verification & approval may take time.",
  faq: {
    global: [],
    payment: [
      {
        q: "How long does verification take?",
        a: "Usually 5–60 minutes. During peak time it may take longer.",
      },
      {
        q: "What proof is accepted?",
        a: "Screenshot/PDF with transaction ID, amount, and receiver details.",
      },
      {
        q: "What if I uploaded wrong proof?",
        a: "Message Support using Order Chat and re-upload if needed.",
      },
    ],
    applyWork: [
      { q: "How long does approval take?", a: "24–72 hours depending on openings." },
      { q: "What resume format is accepted?", a: "PDF is preferred." },
    ],
    orderSupport: [],
  },
};

let cached: PublicSiteSettings | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

const SITE_SETTINGS_REFRESH_EVENT = "site-settings-force-refresh";
const SITE_SETTINGS_LAST_UPDATE_KEY = "site-settings:lastAdminUpdateTs";
let lastAdminUpdateSeen = 0;

export function markSiteSettingsUpdated() {
  try {
    if (typeof window === "undefined") return;
    localStorage.setItem(SITE_SETTINGS_LAST_UPDATE_KEY, String(Date.now()));
    window.dispatchEvent(new Event(SITE_SETTINGS_REFRESH_EVENT));
  } catch {
    // ignore
  }
}

const normalizeFaq = (value: unknown): FaqItem[] => {
  if (!Array.isArray(value)) return [];
  const out: FaqItem[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const q = String((item as any).q || "").trim();
    const a = String((item as any).a || "").trim();
    if (!q || !a) continue;
    out.push({ q, a });
    if (out.length >= 25) break;
  }
  return out;
};

const normalizeTitleDesc = (value: unknown): TitleDesc[] => {
  if (!Array.isArray(value)) return [];
  const out: TitleDesc[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const title = String((item as any).title || "").trim();
    const desc = String((item as any).desc || "").trim();
    if (!title || !desc) continue;
    out.push({ title, desc });
    if (out.length >= 12) break;
  }
  return out;
};

const normalizeIconTitleDesc = (value: unknown): IconTitleDesc[] => {
  if (!Array.isArray(value)) return [];
  const out: IconTitleDesc[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const icon = String((item as any).icon || "").trim();
    const title = String((item as any).title || "").trim();
    const desc = String((item as any).desc || "").trim();
    if (!title || !desc) continue;
    out.push({ icon: icon || "•", title, desc });
    if (out.length >= 12) break;
  }
  return out;
};

const normalizeStringArray = (value: unknown, maxItems = 10): string[] => {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    const s = String(v || "").trim();
    if (!s) continue;
    out.push(s);
    if (out.length >= maxItems) break;
  }
  return out;
};

const mergeWithDefaults = (input: any): PublicSiteSettings => {
  const marketplace = { ...marketplaceDefaults };
  for (const key of Object.keys(marketplace) as (keyof typeof marketplace)[]) {
    const value = input?.marketplace?.[key];
    if (typeof value === "string" && value.trim()) marketplace[key] = value.trim();
  }
  // v2 structure
  const navGuestPrimary = String(input?.nav?.guestPrimaryCtaText || "").trim();
  const navGuestSecondary = String(input?.nav?.guestSecondaryCtaText || "").trim();
  const navGuestSignup = String(input?.nav?.guestSignupText || "").trim();
  const navGuestLogin = String(input?.nav?.guestLoginText || "").trim();
  const navSupport = String(input?.nav?.supportLinkText || "").trim();
  const navAuthedDashboard = String(input?.nav?.authedDashboardText || "").trim();
  const navAuthedServices = String(input?.nav?.authedServicesText || "").trim();
  const navAuthedOrders = String(input?.nav?.authedOrdersText || "").trim();
  const navAuthedApply = String(input?.nav?.authedApplyToWorkText || "").trim();

  const brandName = String(input?.site?.brandName || "").trim();
  const bannerText = String(input?.site?.bannerText || input?.bannerText || "").trim();

  const supportEmail = String(input?.support?.supportEmail || "").trim();
  const whatsappNumber = String(input?.support?.whatsappNumber || "").trim();
  const disclaimer = String(input?.footer?.disclaimer || "").trim();
  const dataSafetyNote = String(input?.footer?.dataSafetyNote || "").trim();
  const copyrightText = String(input?.footer?.copyrightText || "").trim();
  const linksTitle = String(input?.footer?.linksTitle || "").trim();
  const supportTitle = String(input?.footer?.supportTitle || "").trim();
  const whatsappLabel = String(input?.footer?.whatsappLabel || "").trim();
  const supportPrompt = String(input?.footer?.supportPrompt || "").trim();
  const footerServicesLinkText = String(input?.footer?.servicesLinkText || "").trim();
  const footerWorkLinkText = String(input?.footer?.workLinkText || "").trim();
  const footerContactLinkText = String(input?.footer?.contactLinkText || "").trim();

  const landingHeroTitle = String(input?.landing?.heroTitle || "").trim();
  const landingHeroSubtitle = String(input?.landing?.heroSubtitle || "").trim();
  const landingCtaPrimaryText = String(input?.landing?.ctaPrimaryText || "").trim();
  const landingCtaSecondaryText = String(input?.landing?.ctaSecondaryText || "").trim();
  const landingPopularTitle = String(input?.landing?.popularTitle || "").trim();
  const landingPopularSubtitle = String(input?.landing?.popularSubtitle || "").trim();
  const landingFinalCtaTitle = String(input?.landing?.finalCtaTitle || "").trim();
  const landingFinalCtaSubtitle = String(input?.landing?.finalCtaSubtitle || "").trim();

  const supportedServicesTitle = String(
    input?.landing?.supportedServicesTitle || ""
  ).trim();
  const supportedServicesTags = normalizeStringArray(
    input?.landing?.supportedServicesTags,
    24
  );

  const howItWorksTitle = String(input?.landing?.howItWorksTitle || "").trim();
  const howItWorksSteps = normalizeIconTitleDesc(input?.landing?.howItWorksSteps);

  const popularBrowseAllText = String(
    input?.landing?.popularBrowseAllText || ""
  ).trim();
  const popularEmptyTitle = String(
    input?.landing?.popularEmptyTitle || ""
  ).trim();
  const popularEmptySubtitle = String(
    input?.landing?.popularEmptySubtitle || ""
  ).trim();
  const popularEmptyCtaText = String(
    input?.landing?.popularEmptyCtaText || ""
  ).trim();

  const finalCtaPrimaryText = String(
    input?.landing?.finalCtaPrimaryText || ""
  ).trim();
  const finalCtaSecondaryText = String(
    input?.landing?.finalCtaSecondaryText || ""
  ).trim();

  const whyChooseTitle = String(input?.landing?.whyChooseTitle || "").trim();
  const whyChooseFeatures = normalizeIconTitleDesc(
    input?.landing?.whyChooseFeatures
  );

  const trustDisclaimerText = String(
    input?.landing?.trustDisclaimerText || ""
  ).trim();

  const features = normalizeTitleDesc(input?.landing?.features);

  const beginnerSteps = normalizeTitleDesc(input?.payment?.beginnerSteps);
  const acceptedProofText = String(input?.payment?.acceptedProofText || "").trim();
  const successRedirectText = String(input?.payment?.successRedirectText || "").trim();
  const paymentFaq = normalizeFaq(input?.payment?.faq || input?.faq?.payment);

  const paymentUi = input?.payment?.ui || {};
  const paymentValidation = paymentUi?.validationTexts || {};
  const paymentUiMerged = {
    title: String(paymentUi.title || "").trim(),
    loadingText: String(paymentUi.loadingText || "").trim(),
    viewOrdersText: String(paymentUi.viewOrdersText || "").trim(),
    wizardStep1Title: String(paymentUi.wizardStep1Title || "").trim(),
    wizardStep1Subtitle: String(paymentUi.wizardStep1Subtitle || "").trim(),
    wizardStep2Title: String(paymentUi.wizardStep2Title || "").trim(),
    wizardStep2Subtitle: String(paymentUi.wizardStep2Subtitle || "").trim(),
    wizardStep3Title: String(paymentUi.wizardStep3Title || "").trim(),
    wizardStep3Subtitle: String(paymentUi.wizardStep3Subtitle || "").trim(),
    orderIdLabel: String(paymentUi.orderIdLabel || "").trim(),
    copyButtonText: String(paymentUi.copyButtonText || "").trim(),
    copyFailedText: String(
      paymentUi.copyFailedText || paymentValidation.copyFailedText || ""
    ).trim(),
    paymentSummaryLabel: String(paymentUi.paymentSummaryLabel || "").trim(),
    paymentSummaryHint: String(paymentUi.paymentSummaryHint || "").trim(),
    expiredTitle: String(paymentUi.expiredTitle || "").trim(),
    expiredBody: String(paymentUi.expiredBody || "").trim(),
    goToServicesText: String(paymentUi.goToServicesText || "").trim(),
    paymentSubmittedTitle: String(paymentUi.paymentSubmittedTitle || "").trim(),
    paymentSubmittedBody: String(paymentUi.paymentSubmittedBody || "").trim(),
    paymentRejectedTitle: String(paymentUi.paymentRejectedTitle || "").trim(),
    paymentRejectedBody: String(paymentUi.paymentRejectedBody || "").trim(),
    paymentMethodTitle: String(paymentUi.paymentMethodTitle || "").trim(),
    lockedText: String(paymentUi.lockedText || "").trim(),
    paymentMethodHelp: String(paymentUi.paymentMethodHelp || "").trim(),
    noPaymentMethodsText: String(paymentUi.noPaymentMethodsText || "").trim(),
    paymentDetailsCopiedText: String(
      paymentUi.paymentDetailsCopiedText ||
        paymentValidation.paymentDetailsCopiedText ||
        ""
    ).trim(),
    referenceLabel: String(paymentUi.referenceLabel || "").trim(),
    referencePlaceholder: String(paymentUi.referencePlaceholder || "").trim(),
    selectMethodRequiredText: String(
      paymentUi.selectMethodRequiredText ||
        paymentValidation.selectMethodRequiredText ||
        ""
    ).trim(),
    proofRequiredText: String(
      paymentUi.proofRequiredText || paymentValidation.proofRequiredText || ""
    ).trim(),
    invalidFileTypeText: String(
      paymentUi.invalidFileTypeText ||
        paymentValidation.invalidFileTypeText ||
        ""
    ).trim(),
    fileTooLargeText: String(
      paymentUi.fileTooLargeText || paymentValidation.fileTooLargeText || ""
    ).trim(),
    submitFailedText: String(
      paymentUi.submitFailedText || paymentValidation.submitFailedText || ""
    ).trim(),
    uploadProofTitle: String(paymentUi.uploadProofTitle || "").trim(),
    allowedTypesText: String(paymentUi.allowedTypesText || "").trim(),
    selectedFileLabel: String(paymentUi.selectedFileLabel || "").trim(),
    noFileSelectedText: String(paymentUi.noFileSelectedText || "").trim(),
    removeFileText: String(paymentUi.removeFileText || "").trim(),
    chooseFileText: String(paymentUi.chooseFileText || "").trim(),
    tipText: String(paymentUi.tipText || "").trim(),
    safetyTitle: String(paymentUi.safetyTitle || "").trim(),
    safetyBullets: normalizeStringArray(paymentUi.safetyBullets, 12),
    submitButtonSubmitted: String(paymentUi.submitButtonSubmitted || "").trim(),
    submitButtonResubmit: String(paymentUi.submitButtonResubmit || "").trim(),
    submitButtonSubmit: String(paymentUi.submitButtonSubmit || "").trim(),
    statusLinePrefix: String(paymentUi.statusLinePrefix || "").trim(),
    statusLineMethodSelected: String(
      paymentUi.statusLineMethodSelected || ""
    ).trim(),
    statusLineSelectMethod: String(
      paymentUi.statusLineSelectMethod || ""
    ).trim(),
    statusLineProofAttached: String(
      paymentUi.statusLineProofAttached || ""
    ).trim(),
    statusLineAttachProof: String(paymentUi.statusLineAttachProof || "").trim(),
    needHelpText: String(paymentUi.needHelpText || "").trim(),
    faqTitle: String(paymentUi.faqTitle || "").trim(),
    faqSubtitle: String(paymentUi.faqSubtitle || "").trim(),
  };

  const globalFaq = normalizeFaq(input?.services?.globalFaq || input?.faq?.global);
  const trustBlockText = String(input?.services?.trustBlockText || "").trim();

  const servicesList = input?.services?.list || {};
  const servicesDetails = input?.services?.details || {};

  const servicesListMerged = {
    title: String(servicesList.title || "").trim(),
    highlightPills: normalizeStringArray(servicesList.highlightPills, 10),
    searchPlaceholder: String(servicesList.searchPlaceholder || "").trim(),
    allCategoriesText: String(servicesList.allCategoriesText || "").trim(),
    activeOnlyText: String(servicesList.activeOnlyText || "").trim(),
    showAllText: String(servicesList.showAllText || "").trim(),
    emptyTitle: String(servicesList.emptyTitle || "").trim(),
    emptySubtitle: String(servicesList.emptySubtitle || "").trim(),
    resetFiltersText: String(servicesList.resetFiltersText || "").trim(),
    getStartedText: String(servicesList.getStartedText || "").trim(),
    manualBadgeText: String(servicesList.manualBadgeText || "").trim(),
    inactiveBadgeText: String(servicesList.inactiveBadgeText || "").trim(),
    fromLabel: String(servicesList.fromLabel || "").trim(),
    viewDetailsText: String(servicesList.viewDetailsText || "").trim(),
  };

  const servicesDetailsMerged = {
    notAvailableTitle: String(servicesDetails.notAvailableTitle || "").trim(),
    notAvailableSubtitle: String(servicesDetails.notAvailableSubtitle || "").trim(),
    backToServicesText: String(servicesDetails.backToServicesText || "").trim(),
    retryText: String(servicesDetails.retryText || "").trim(),
    premiumPlaceholderTitle: String(
      servicesDetails.premiumPlaceholderTitle || ""
    ).trim(),
    premiumPlaceholderSubtitle: String(
      servicesDetails.premiumPlaceholderSubtitle || ""
    ).trim(),
    overviewLabel: String(servicesDetails.overviewLabel || "").trim(),
    whatYouGetTitle: String(servicesDetails.whatYouGetTitle || "").trim(),
    whatYouGetBullets: normalizeStringArray(servicesDetails.whatYouGetBullets, 12),
    requirementsTitle: String(servicesDetails.requirementsTitle || "").trim(),
    requirementsEmptyText: String(
      servicesDetails.requirementsEmptyText || ""
    ).trim(),
    deliveryTimeTitle: String(servicesDetails.deliveryTimeTitle || "").trim(),
    deliveryTimeBody: String(servicesDetails.deliveryTimeBody || "").trim(),
    safetyNote: String(servicesDetails.safetyNote || "").trim(),
    priceLabel: String(servicesDetails.priceLabel || "").trim(),
    priceSubtext: String(servicesDetails.priceSubtext || "").trim(),
    typeLabel: String(servicesDetails.typeLabel || "").trim(),
    reserveButtonText: String(servicesDetails.reserveButtonText || "").trim(),
    unavailableButtonText: String(
      servicesDetails.unavailableButtonText || ""
    ).trim(),
    reserveHelpText: String(servicesDetails.reserveHelpText || "").trim(),
  };

  const ordersList = input?.orders?.list || {};
  const ordersDetails = input?.orders?.details || {};

  const ordersListMerged = {
    title: String(ordersList.title || "").trim(),
    subtitle: String(ordersList.subtitle || "").trim(),
    loadingText: String(ordersList.loadingText || "").trim(),
    retryText: String(ordersList.retryText || "").trim(),
    latestUpdateLabel: String(ordersList.latestUpdateLabel || "").trim(),
    noUpdatesText: String(ordersList.noUpdatesText || "").trim(),
    completePaymentText: String(ordersList.completePaymentText || "").trim(),
    resubmitProofText: String(ordersList.resubmitProofText || "").trim(),
    viewDetailsText: String(ordersList.viewDetailsText || "").trim(),
    openChatText: String(ordersList.openChatText || "").trim(),
    expiresPrefix: String(ordersList.expiresPrefix || "").trim(),
    pendingPaymentTitle: String(ordersList.pendingPaymentTitle || "").trim(),
    pendingPaymentEmptyText: String(
      ordersList.pendingPaymentEmptyText || ""
    ).trim(),
    pendingOrWaitingTitle: String(
      ordersList.pendingOrWaitingTitle || ""
    ).trim(),
    pendingOrWaitingEmptyText: String(
      ordersList.pendingOrWaitingEmptyText || ""
    ).trim(),
    inProgressTitle: String(ordersList.inProgressTitle || "").trim(),
    inProgressEmptyText: String(ordersList.inProgressEmptyText || "").trim(),
    noOrdersYetText: String(ordersList.noOrdersYetText || "").trim(),
    loadFailedText: String(ordersList.loadFailedText || "").trim(),
  };

  const ordersChat = ordersDetails?.chat || {};
  const ordersDetailsMerged = {
    loadingText: String(ordersDetails.loadingText || "").trim(),
    notFoundTitle: String(ordersDetails.notFoundTitle || "").trim(),
    notFoundBody: String(ordersDetails.notFoundBody || "").trim(),
    backToOrdersText: String(ordersDetails.backToOrdersText || "").trim(),
    loadErrorTitle: String(ordersDetails.loadErrorTitle || "").trim(),
    loadErrorRetryText: String(ordersDetails.loadErrorRetryText || "").trim(),
    unavailableTitle: String(ordersDetails.unavailableTitle || "").trim(),
    title: String(ordersDetails.title || "").trim(),
    supportBannerTitle: String(ordersDetails.supportBannerTitle || "").trim(),
    supportBannerBody: String(ordersDetails.supportBannerBody || "").trim(),
    supportActivePill: String(ordersDetails.supportActivePill || "").trim(),
    supportActiveHint: String(ordersDetails.supportActiveHint || "").trim(),
    chatNowText: String(ordersDetails.chatNowText || "").trim(),
    orderIdLabel: String(ordersDetails.orderIdLabel || "").trim(),
    serviceLabel: String(ordersDetails.serviceLabel || "").trim(),
    amountLabel: String(ordersDetails.amountLabel || "").trim(),
    statusLabel: String(ordersDetails.statusLabel || "").trim(),
    paymentVerifiedText: String(ordersDetails.paymentVerifiedText || "").trim(),
    completePaymentText: String(ordersDetails.completePaymentText || "").trim(),
    timelineTitle: String(ordersDetails.timelineTitle || "").trim(),
    noTimelineText: String(ordersDetails.noTimelineText || "").trim(),
    supportGuideTitle: String(ordersDetails.supportGuideTitle || "").trim(),
    supportGuideSubtitle: String(ordersDetails.supportGuideSubtitle || "").trim(),
    openChatText: String(ordersDetails.openChatText || "").trim(),
    supportGuidelinesTitle: String(
      ordersDetails.supportGuidelinesTitle || ""
    ).trim(),
    chatTitle: String(ordersDetails.chatTitle || "").trim(),
    chatSubtitle: String(ordersDetails.chatSubtitle || "").trim(),
    refreshText: String(ordersDetails.refreshText || "").trim(),
    chatInputPlaceholder: String(
      ordersDetails.chatInputPlaceholder || ordersChat.inputPlaceholder || ""
    ).trim(),
    sendButtonText: String(
      ordersDetails.sendButtonText || ordersChat.sendButtonText || ""
    ).trim(),
    sendingButtonText: String(
      ordersDetails.sendingButtonText || ordersChat.sendingButtonText || ""
    ).trim(),
    emptyChatTitle: String(ordersDetails.emptyChatTitle || "").trim(),
    emptyChatSubtitle: String(
      ordersDetails.emptyChatSubtitle ||
        ordersChat.emptyStateText ||
        ordersChat.emptySubtitle ||
        ""
    ).trim(),
    youLabel: String(ordersDetails.youLabel || "").trim(),
    supportLabel: String(ordersDetails.supportLabel || "").trim(),
    supportRepliesHint: String(
      ordersDetails.supportRepliesHint || ordersChat.hintText || ""
    ).trim(),
    messageSentToast: String(ordersDetails.messageSentToast || "").trim(),
    sendFailedText: String(ordersDetails.sendFailedText || "").trim(),
    loadMessagesFailedText: String(
      ordersDetails.loadMessagesFailedText || ""
    ).trim(),
    loadOrderFailedText: String(ordersDetails.loadOrderFailedText || "").trim(),
  };

  const quickReplies = normalizeStringArray(input?.orderSupport?.quickReplies);
  const supportGuidelines = String(
    input?.orderSupport?.supportGuidelines || input?.orderSupport?.guidelinesText || ""
  ).trim();

  const applyWorkFaq = normalizeFaq(input?.applyWork?.faq || input?.faq?.applyWork);

  const applyWorkUi = input?.applyWork?.ui || {};
  const applyWorkUiMerged = {
    title: String(applyWorkUi.title || "").trim(),
    subtitle: String(applyWorkUi.subtitle || "").trim(),
    formTitle: String(applyWorkUi.formTitle || "").trim(),
    positionsLabel: String(applyWorkUi.positionsLabel || "").trim(),
    loadingPositionsText: String(applyWorkUi.loadingPositionsText || "").trim(),
    filterByCategoryLabel: String(applyWorkUi.filterByCategoryLabel || "").trim(),
    allCategoriesText: String(applyWorkUi.allCategoriesText || "").trim(),
    selectPositionLabel: String(applyWorkUi.selectPositionLabel || "").trim(),
    noPositionsFoundText: String(applyWorkUi.noPositionsFoundText || "").trim(),
    messageLabel: String(applyWorkUi.messageLabel || "").trim(),
    messagePlaceholder: String(applyWorkUi.messagePlaceholder || "").trim(),
    resumeLabel: String(applyWorkUi.resumeLabel || "").trim(),
    resumeHelperText: String(applyWorkUi.resumeHelperText || "").trim(),
    submitText: String(applyWorkUi.submitText || "").trim(),
    submittingText: String(applyWorkUi.submittingText || "").trim(),
    successToast: String(applyWorkUi.successToast || "").trim(),
    submissionFailedText: String(applyWorkUi.submissionFailedText || "").trim(),
    resumeRequiredText: String(applyWorkUi.resumeRequiredText || "").trim(),
    selectPositionRequiredText: String(
      applyWorkUi.selectPositionRequiredText || ""
    ).trim(),
    existingTitle: String(applyWorkUi.existingTitle || "").trim(),
    existingBody: String(applyWorkUi.existingBody || "").trim(),
    existingPendingText: String(applyWorkUi.existingPendingText || "").trim(),
    existingApprovedText: String(applyWorkUi.existingApprovedText || "").trim(),
    existingRejectedText: String(applyWorkUi.existingRejectedText || "").trim(),
    trustNoteText: String(applyWorkUi.trustNoteText || "").trim(),
    faqTitle: String(applyWorkUi.faqTitle || "").trim(),
  };

  const merged: PublicSiteSettings = {
    marketplace,
    nav: {
      guestPrimaryCtaText:
        navGuestPrimary || DEFAULT_PUBLIC_SITE_SETTINGS.nav.guestPrimaryCtaText,
      guestSecondaryCtaText:
        navGuestSecondary ||
        DEFAULT_PUBLIC_SITE_SETTINGS.nav.guestSecondaryCtaText,
      guestSignupText:
        navGuestSignup || DEFAULT_PUBLIC_SITE_SETTINGS.nav.guestSignupText,
      guestLoginText:
        navGuestLogin || DEFAULT_PUBLIC_SITE_SETTINGS.nav.guestLoginText,
      supportLinkText: navSupport || DEFAULT_PUBLIC_SITE_SETTINGS.nav.supportLinkText,
      authedDashboardText:
        navAuthedDashboard || DEFAULT_PUBLIC_SITE_SETTINGS.nav.authedDashboardText,
      authedServicesText:
        navAuthedServices || DEFAULT_PUBLIC_SITE_SETTINGS.nav.authedServicesText,
      authedOrdersText:
        navAuthedOrders || DEFAULT_PUBLIC_SITE_SETTINGS.nav.authedOrdersText,
      authedApplyToWorkText:
        navAuthedApply || DEFAULT_PUBLIC_SITE_SETTINGS.nav.authedApplyToWorkText,
    },
    site: {
      brandName: brandName || DEFAULT_PUBLIC_SITE_SETTINGS.site.brandName,
      bannerText: bannerText || DEFAULT_PUBLIC_SITE_SETTINGS.site.bannerText,
    },
    support: {
      whatsappNumber:
        whatsappNumber || DEFAULT_PUBLIC_SITE_SETTINGS.support.whatsappNumber,
      supportEmail:
        supportEmail || DEFAULT_PUBLIC_SITE_SETTINGS.support.supportEmail,
    },
    footer: {
      disclaimer: disclaimer || DEFAULT_PUBLIC_SITE_SETTINGS.footer.disclaimer,
      dataSafetyNote:
        dataSafetyNote || DEFAULT_PUBLIC_SITE_SETTINGS.footer.dataSafetyNote,
      copyrightText:
        copyrightText || DEFAULT_PUBLIC_SITE_SETTINGS.footer.copyrightText,
      linksTitle: linksTitle || DEFAULT_PUBLIC_SITE_SETTINGS.footer.linksTitle,
      supportTitle: supportTitle || DEFAULT_PUBLIC_SITE_SETTINGS.footer.supportTitle,
      whatsappLabel: whatsappLabel || DEFAULT_PUBLIC_SITE_SETTINGS.footer.whatsappLabel,
      supportPrompt: supportPrompt || DEFAULT_PUBLIC_SITE_SETTINGS.footer.supportPrompt,
      servicesLinkText:
        footerServicesLinkText ||
        DEFAULT_PUBLIC_SITE_SETTINGS.footer.servicesLinkText,
      workLinkText:
        footerWorkLinkText || DEFAULT_PUBLIC_SITE_SETTINGS.footer.workLinkText,
      contactLinkText:
        footerContactLinkText || DEFAULT_PUBLIC_SITE_SETTINGS.footer.contactLinkText,
    },
    landing: {
      heroTitle: landingHeroTitle || DEFAULT_PUBLIC_SITE_SETTINGS.landing.heroTitle,
      heroSubtitle:
        landingHeroSubtitle || DEFAULT_PUBLIC_SITE_SETTINGS.landing.heroSubtitle,
      ctaPrimaryText:
        landingCtaPrimaryText || DEFAULT_PUBLIC_SITE_SETTINGS.landing.ctaPrimaryText,
      ctaSecondaryText:
        landingCtaSecondaryText || DEFAULT_PUBLIC_SITE_SETTINGS.landing.ctaSecondaryText,
      features: features.length ? features : DEFAULT_PUBLIC_SITE_SETTINGS.landing.features,

      supportedServicesTitle:
        supportedServicesTitle || DEFAULT_PUBLIC_SITE_SETTINGS.landing.supportedServicesTitle,
      supportedServicesTags:
        supportedServicesTags.length
          ? supportedServicesTags
          : DEFAULT_PUBLIC_SITE_SETTINGS.landing.supportedServicesTags,

      howItWorksTitle:
        howItWorksTitle || DEFAULT_PUBLIC_SITE_SETTINGS.landing.howItWorksTitle,
      howItWorksSteps:
        howItWorksSteps.length
          ? howItWorksSteps
          : DEFAULT_PUBLIC_SITE_SETTINGS.landing.howItWorksSteps,

      popularTitle:
        landingPopularTitle || DEFAULT_PUBLIC_SITE_SETTINGS.landing.popularTitle,
      popularSubtitle:
        landingPopularSubtitle || DEFAULT_PUBLIC_SITE_SETTINGS.landing.popularSubtitle,

      popularBrowseAllText:
        popularBrowseAllText || DEFAULT_PUBLIC_SITE_SETTINGS.landing.popularBrowseAllText,
      popularEmptyTitle:
        popularEmptyTitle || DEFAULT_PUBLIC_SITE_SETTINGS.landing.popularEmptyTitle,
      popularEmptySubtitle:
        popularEmptySubtitle || DEFAULT_PUBLIC_SITE_SETTINGS.landing.popularEmptySubtitle,
      popularEmptyCtaText:
        popularEmptyCtaText || DEFAULT_PUBLIC_SITE_SETTINGS.landing.popularEmptyCtaText,

      finalCtaTitle:
        landingFinalCtaTitle || DEFAULT_PUBLIC_SITE_SETTINGS.landing.finalCtaTitle,
      finalCtaSubtitle:
        landingFinalCtaSubtitle || DEFAULT_PUBLIC_SITE_SETTINGS.landing.finalCtaSubtitle,

      finalCtaPrimaryText:
        finalCtaPrimaryText || DEFAULT_PUBLIC_SITE_SETTINGS.landing.finalCtaPrimaryText,
      finalCtaSecondaryText:
        finalCtaSecondaryText || DEFAULT_PUBLIC_SITE_SETTINGS.landing.finalCtaSecondaryText,

      whyChooseTitle:
        whyChooseTitle || DEFAULT_PUBLIC_SITE_SETTINGS.landing.whyChooseTitle,
      whyChooseFeatures:
        whyChooseFeatures.length
          ? whyChooseFeatures
          : DEFAULT_PUBLIC_SITE_SETTINGS.landing.whyChooseFeatures,

      trustDisclaimerText:
        trustDisclaimerText || DEFAULT_PUBLIC_SITE_SETTINGS.landing.trustDisclaimerText,
    },
    payment: {
      beginnerSteps:
        beginnerSteps.length ? beginnerSteps : DEFAULT_PUBLIC_SITE_SETTINGS.payment.beginnerSteps,
      acceptedProofText:
        acceptedProofText || DEFAULT_PUBLIC_SITE_SETTINGS.payment.acceptedProofText,
      successRedirectText:
        successRedirectText || DEFAULT_PUBLIC_SITE_SETTINGS.payment.successRedirectText,
      faq: paymentFaq.length ? paymentFaq : DEFAULT_PUBLIC_SITE_SETTINGS.payment.faq,
      ui: {
        title:
          paymentUiMerged.title || DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.title,
        loadingText:
          paymentUiMerged.loadingText || DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.loadingText,
        viewOrdersText:
          paymentUiMerged.viewOrdersText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.viewOrdersText,
        wizardStep1Title:
          paymentUiMerged.wizardStep1Title ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.wizardStep1Title,
        wizardStep1Subtitle:
          paymentUiMerged.wizardStep1Subtitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.wizardStep1Subtitle,
        wizardStep2Title:
          paymentUiMerged.wizardStep2Title ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.wizardStep2Title,
        wizardStep2Subtitle:
          paymentUiMerged.wizardStep2Subtitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.wizardStep2Subtitle,
        wizardStep3Title:
          paymentUiMerged.wizardStep3Title ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.wizardStep3Title,
        wizardStep3Subtitle:
          paymentUiMerged.wizardStep3Subtitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.wizardStep3Subtitle,
        orderIdLabel:
          paymentUiMerged.orderIdLabel || DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.orderIdLabel,
        copyButtonText:
          paymentUiMerged.copyButtonText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.copyButtonText,
        copyFailedText:
          paymentUiMerged.copyFailedText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.copyFailedText,
        paymentSummaryLabel:
          paymentUiMerged.paymentSummaryLabel ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.paymentSummaryLabel,
        paymentSummaryHint:
          paymentUiMerged.paymentSummaryHint ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.paymentSummaryHint,
        expiredTitle:
          paymentUiMerged.expiredTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.expiredTitle,
        expiredBody:
          paymentUiMerged.expiredBody ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.expiredBody,
        goToServicesText:
          paymentUiMerged.goToServicesText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.goToServicesText,
        paymentSubmittedTitle:
          paymentUiMerged.paymentSubmittedTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.paymentSubmittedTitle,
        paymentSubmittedBody:
          paymentUiMerged.paymentSubmittedBody ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.paymentSubmittedBody,
        paymentRejectedTitle:
          paymentUiMerged.paymentRejectedTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.paymentRejectedTitle,
        paymentRejectedBody:
          paymentUiMerged.paymentRejectedBody ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.paymentRejectedBody,
        paymentMethodTitle:
          paymentUiMerged.paymentMethodTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.paymentMethodTitle,
        lockedText:
          paymentUiMerged.lockedText || DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.lockedText,
        paymentMethodHelp:
          paymentUiMerged.paymentMethodHelp ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.paymentMethodHelp,
        noPaymentMethodsText:
          paymentUiMerged.noPaymentMethodsText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.noPaymentMethodsText,
        paymentDetailsCopiedText:
          paymentUiMerged.paymentDetailsCopiedText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.paymentDetailsCopiedText,
        referenceLabel:
          paymentUiMerged.referenceLabel ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.referenceLabel,
        referencePlaceholder:
          paymentUiMerged.referencePlaceholder ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.referencePlaceholder,
        selectMethodRequiredText:
          paymentUiMerged.selectMethodRequiredText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.selectMethodRequiredText,
        proofRequiredText:
          paymentUiMerged.proofRequiredText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.proofRequiredText,
        invalidFileTypeText:
          paymentUiMerged.invalidFileTypeText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.invalidFileTypeText,
        fileTooLargeText:
          paymentUiMerged.fileTooLargeText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.fileTooLargeText,
        submitFailedText:
          paymentUiMerged.submitFailedText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.submitFailedText,
        uploadProofTitle:
          paymentUiMerged.uploadProofTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.uploadProofTitle,
        allowedTypesText:
          paymentUiMerged.allowedTypesText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.allowedTypesText,
        selectedFileLabel:
          paymentUiMerged.selectedFileLabel ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.selectedFileLabel,
        noFileSelectedText:
          paymentUiMerged.noFileSelectedText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.noFileSelectedText,
        removeFileText:
          paymentUiMerged.removeFileText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.removeFileText,
        chooseFileText:
          paymentUiMerged.chooseFileText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.chooseFileText,
        tipText:
          paymentUiMerged.tipText || DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.tipText,
        safetyTitle:
          paymentUiMerged.safetyTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.safetyTitle,
        safetyBullets:
          paymentUiMerged.safetyBullets.length
            ? paymentUiMerged.safetyBullets
            : DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.safetyBullets,
        submitButtonSubmitted:
          paymentUiMerged.submitButtonSubmitted ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.submitButtonSubmitted,
        submitButtonResubmit:
          paymentUiMerged.submitButtonResubmit ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.submitButtonResubmit,
        submitButtonSubmit:
          paymentUiMerged.submitButtonSubmit ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.submitButtonSubmit,
        statusLinePrefix:
          paymentUiMerged.statusLinePrefix ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.statusLinePrefix,
        statusLineMethodSelected:
          paymentUiMerged.statusLineMethodSelected ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.statusLineMethodSelected,
        statusLineSelectMethod:
          paymentUiMerged.statusLineSelectMethod ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.statusLineSelectMethod,
        statusLineProofAttached:
          paymentUiMerged.statusLineProofAttached ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.statusLineProofAttached,
        statusLineAttachProof:
          paymentUiMerged.statusLineAttachProof ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.statusLineAttachProof,
        needHelpText:
          paymentUiMerged.needHelpText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.needHelpText,
        faqTitle:
          paymentUiMerged.faqTitle || DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.faqTitle,
        faqSubtitle:
          paymentUiMerged.faqSubtitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.payment.ui.faqSubtitle,
      },
    },
    services: {
      globalFaq: globalFaq.length ? globalFaq : DEFAULT_PUBLIC_SITE_SETTINGS.services.globalFaq,
      trustBlockText:
        trustBlockText || DEFAULT_PUBLIC_SITE_SETTINGS.services.trustBlockText,
      list: {
        title: servicesListMerged.title || DEFAULT_PUBLIC_SITE_SETTINGS.services.list.title,
        highlightPills:
          servicesListMerged.highlightPills.length
            ? servicesListMerged.highlightPills
            : DEFAULT_PUBLIC_SITE_SETTINGS.services.list.highlightPills,
        searchPlaceholder:
          servicesListMerged.searchPlaceholder ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.list.searchPlaceholder,
        allCategoriesText:
          servicesListMerged.allCategoriesText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.list.allCategoriesText,
        activeOnlyText:
          servicesListMerged.activeOnlyText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.list.activeOnlyText,
        showAllText:
          servicesListMerged.showAllText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.list.showAllText,
        emptyTitle:
          servicesListMerged.emptyTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.list.emptyTitle,
        emptySubtitle:
          servicesListMerged.emptySubtitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.list.emptySubtitle,
        resetFiltersText:
          servicesListMerged.resetFiltersText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.list.resetFiltersText,
        getStartedText:
          servicesListMerged.getStartedText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.list.getStartedText,
        manualBadgeText:
          servicesListMerged.manualBadgeText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.list.manualBadgeText,
        inactiveBadgeText:
          servicesListMerged.inactiveBadgeText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.list.inactiveBadgeText,
        fromLabel:
          servicesListMerged.fromLabel ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.list.fromLabel,
        viewDetailsText:
          servicesListMerged.viewDetailsText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.list.viewDetailsText,
      },
      details: {
        notAvailableTitle:
          servicesDetailsMerged.notAvailableTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.notAvailableTitle,
        notAvailableSubtitle:
          servicesDetailsMerged.notAvailableSubtitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.notAvailableSubtitle,
        backToServicesText:
          servicesDetailsMerged.backToServicesText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.backToServicesText,
        retryText:
          servicesDetailsMerged.retryText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.retryText,
        premiumPlaceholderTitle:
          servicesDetailsMerged.premiumPlaceholderTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.premiumPlaceholderTitle,
        premiumPlaceholderSubtitle:
          servicesDetailsMerged.premiumPlaceholderSubtitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.premiumPlaceholderSubtitle,
        overviewLabel:
          servicesDetailsMerged.overviewLabel ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.overviewLabel,
        whatYouGetTitle:
          servicesDetailsMerged.whatYouGetTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.whatYouGetTitle,
        whatYouGetBullets:
          servicesDetailsMerged.whatYouGetBullets.length
            ? servicesDetailsMerged.whatYouGetBullets
            : DEFAULT_PUBLIC_SITE_SETTINGS.services.details.whatYouGetBullets,
        requirementsTitle:
          servicesDetailsMerged.requirementsTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.requirementsTitle,
        requirementsEmptyText:
          servicesDetailsMerged.requirementsEmptyText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.requirementsEmptyText,
        deliveryTimeTitle:
          servicesDetailsMerged.deliveryTimeTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.deliveryTimeTitle,
        deliveryTimeBody:
          servicesDetailsMerged.deliveryTimeBody ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.deliveryTimeBody,
        safetyNote:
          servicesDetailsMerged.safetyNote ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.safetyNote,
        priceLabel:
          servicesDetailsMerged.priceLabel ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.priceLabel,
        priceSubtext:
          servicesDetailsMerged.priceSubtext ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.priceSubtext,
        typeLabel:
          servicesDetailsMerged.typeLabel ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.typeLabel,
        reserveButtonText:
          servicesDetailsMerged.reserveButtonText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.reserveButtonText,
        unavailableButtonText:
          servicesDetailsMerged.unavailableButtonText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.unavailableButtonText,
        reserveHelpText:
          servicesDetailsMerged.reserveHelpText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.services.details.reserveHelpText,
      },
    },
    orders: {
      list: {
        title: ordersListMerged.title || DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.title,
        subtitle: ordersListMerged.subtitle || DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.subtitle,
        loadingText:
          ordersListMerged.loadingText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.loadingText,
        retryText:
          ordersListMerged.retryText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.retryText,
        latestUpdateLabel:
          ordersListMerged.latestUpdateLabel ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.latestUpdateLabel,
        noUpdatesText:
          ordersListMerged.noUpdatesText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.noUpdatesText,
        completePaymentText:
          ordersListMerged.completePaymentText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.completePaymentText,
        resubmitProofText:
          ordersListMerged.resubmitProofText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.resubmitProofText,
        viewDetailsText:
          ordersListMerged.viewDetailsText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.viewDetailsText,
        openChatText:
          ordersListMerged.openChatText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.openChatText,
        expiresPrefix:
          ordersListMerged.expiresPrefix ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.expiresPrefix,
        pendingPaymentTitle:
          ordersListMerged.pendingPaymentTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.pendingPaymentTitle,
        pendingPaymentEmptyText:
          ordersListMerged.pendingPaymentEmptyText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.pendingPaymentEmptyText,
        pendingOrWaitingTitle:
          ordersListMerged.pendingOrWaitingTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.pendingOrWaitingTitle,
        pendingOrWaitingEmptyText:
          ordersListMerged.pendingOrWaitingEmptyText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.pendingOrWaitingEmptyText,
        inProgressTitle:
          ordersListMerged.inProgressTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.inProgressTitle,
        inProgressEmptyText:
          ordersListMerged.inProgressEmptyText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.inProgressEmptyText,
        noOrdersYetText:
          ordersListMerged.noOrdersYetText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.noOrdersYetText,
        loadFailedText:
          ordersListMerged.loadFailedText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.list.loadFailedText,
      },
      details: {
        loadingText:
          ordersDetailsMerged.loadingText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.loadingText,
        notFoundTitle:
          ordersDetailsMerged.notFoundTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.notFoundTitle,
        notFoundBody:
          ordersDetailsMerged.notFoundBody ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.notFoundBody,
        backToOrdersText:
          ordersDetailsMerged.backToOrdersText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.backToOrdersText,
        loadErrorTitle:
          ordersDetailsMerged.loadErrorTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.loadErrorTitle,
        loadErrorRetryText:
          ordersDetailsMerged.loadErrorRetryText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.loadErrorRetryText,
        unavailableTitle:
          ordersDetailsMerged.unavailableTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.unavailableTitle,
        title:
          ordersDetailsMerged.title ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.title,
        supportBannerTitle:
          ordersDetailsMerged.supportBannerTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.supportBannerTitle,
        supportBannerBody:
          ordersDetailsMerged.supportBannerBody ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.supportBannerBody,
        supportActivePill:
          ordersDetailsMerged.supportActivePill ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.supportActivePill,
        supportActiveHint:
          ordersDetailsMerged.supportActiveHint ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.supportActiveHint,
        chatNowText:
          ordersDetailsMerged.chatNowText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.chatNowText,
        orderIdLabel:
          ordersDetailsMerged.orderIdLabel ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.orderIdLabel,
        serviceLabel:
          ordersDetailsMerged.serviceLabel ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.serviceLabel,
        amountLabel:
          ordersDetailsMerged.amountLabel ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.amountLabel,
        statusLabel:
          ordersDetailsMerged.statusLabel ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.statusLabel,
        paymentVerifiedText:
          ordersDetailsMerged.paymentVerifiedText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.paymentVerifiedText,
        completePaymentText:
          ordersDetailsMerged.completePaymentText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.completePaymentText,
        timelineTitle:
          ordersDetailsMerged.timelineTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.timelineTitle,
        noTimelineText:
          ordersDetailsMerged.noTimelineText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.noTimelineText,
        supportGuideTitle:
          ordersDetailsMerged.supportGuideTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.supportGuideTitle,
        supportGuideSubtitle:
          ordersDetailsMerged.supportGuideSubtitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.supportGuideSubtitle,
        openChatText:
          ordersDetailsMerged.openChatText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.openChatText,
        supportGuidelinesTitle:
          ordersDetailsMerged.supportGuidelinesTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.supportGuidelinesTitle,
        chatTitle:
          ordersDetailsMerged.chatTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.chatTitle,
        chatSubtitle:
          ordersDetailsMerged.chatSubtitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.chatSubtitle,
        refreshText:
          ordersDetailsMerged.refreshText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.refreshText,
        chatInputPlaceholder:
          ordersDetailsMerged.chatInputPlaceholder ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.chatInputPlaceholder,
        sendButtonText:
          ordersDetailsMerged.sendButtonText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.sendButtonText,
        sendingButtonText:
          ordersDetailsMerged.sendingButtonText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.sendingButtonText,
        emptyChatTitle:
          ordersDetailsMerged.emptyChatTitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.emptyChatTitle,
        emptyChatSubtitle:
          ordersDetailsMerged.emptyChatSubtitle ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.emptyChatSubtitle,
        youLabel:
          ordersDetailsMerged.youLabel ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.youLabel,
        supportLabel:
          ordersDetailsMerged.supportLabel ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.supportLabel,
        supportRepliesHint:
          ordersDetailsMerged.supportRepliesHint ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.supportRepliesHint,
        messageSentToast:
          ordersDetailsMerged.messageSentToast ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.messageSentToast,
        sendFailedText:
          ordersDetailsMerged.sendFailedText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.sendFailedText,
        loadMessagesFailedText:
          ordersDetailsMerged.loadMessagesFailedText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.loadMessagesFailedText,
        loadOrderFailedText:
          ordersDetailsMerged.loadOrderFailedText ||
          DEFAULT_PUBLIC_SITE_SETTINGS.orders.details.loadOrderFailedText,
      },
    },
    orderSupport: {
      quickReplies: quickReplies.length ? quickReplies : DEFAULT_PUBLIC_SITE_SETTINGS.orderSupport.quickReplies,
      supportGuidelines:
        supportGuidelines || DEFAULT_PUBLIC_SITE_SETTINGS.orderSupport.supportGuidelines,
    },
    applyWork: {
      faq: applyWorkFaq.length ? applyWorkFaq : DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.faq,
      ui: {
        title: applyWorkUiMerged.title || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.title,
        subtitle: applyWorkUiMerged.subtitle || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.subtitle,
        formTitle: applyWorkUiMerged.formTitle || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.formTitle,
        positionsLabel: applyWorkUiMerged.positionsLabel || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.positionsLabel,
        loadingPositionsText: applyWorkUiMerged.loadingPositionsText || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.loadingPositionsText,
        filterByCategoryLabel: applyWorkUiMerged.filterByCategoryLabel || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.filterByCategoryLabel,
        allCategoriesText: applyWorkUiMerged.allCategoriesText || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.allCategoriesText,
        selectPositionLabel: applyWorkUiMerged.selectPositionLabel || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.selectPositionLabel,
        noPositionsFoundText: applyWorkUiMerged.noPositionsFoundText || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.noPositionsFoundText,
        messageLabel: applyWorkUiMerged.messageLabel || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.messageLabel,
        messagePlaceholder: applyWorkUiMerged.messagePlaceholder || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.messagePlaceholder,
        resumeLabel: applyWorkUiMerged.resumeLabel || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.resumeLabel,
        resumeHelperText: applyWorkUiMerged.resumeHelperText || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.resumeHelperText,
        submitText: applyWorkUiMerged.submitText || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.submitText,
        submittingText: applyWorkUiMerged.submittingText || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.submittingText,
        successToast: applyWorkUiMerged.successToast || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.successToast,
        submissionFailedText: applyWorkUiMerged.submissionFailedText || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.submissionFailedText,
        resumeRequiredText: applyWorkUiMerged.resumeRequiredText || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.resumeRequiredText,
        selectPositionRequiredText: applyWorkUiMerged.selectPositionRequiredText || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.selectPositionRequiredText,
        existingTitle: applyWorkUiMerged.existingTitle || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.existingTitle,
        existingBody: applyWorkUiMerged.existingBody || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.existingBody,
        existingPendingText: applyWorkUiMerged.existingPendingText || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.existingPendingText,
        existingApprovedText: applyWorkUiMerged.existingApprovedText || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.existingApprovedText,
        existingRejectedText: applyWorkUiMerged.existingRejectedText || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.existingRejectedText,
        trustNoteText: applyWorkUiMerged.trustNoteText || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.trustNoteText,
        faqTitle: applyWorkUiMerged.faqTitle || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui.faqTitle,
      },
    },
    updatedAt: input?.updatedAt || null,

    // legacy convenience
    bannerText: bannerText || DEFAULT_PUBLIC_SITE_SETTINGS.site.bannerText,
    faq: {
      global: globalFaq.length ? globalFaq : DEFAULT_PUBLIC_SITE_SETTINGS.services.globalFaq,
      payment: paymentFaq.length ? paymentFaq : DEFAULT_PUBLIC_SITE_SETTINGS.payment.faq,
      applyWork: applyWorkFaq.length ? applyWorkFaq : DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.faq,
      orderSupport: normalizeFaq(input?.faq?.orderSupport),
    },
  };

  return merged;
};

export function useSiteSettings() {
  const [data, setData] = useState<PublicSiteSettings>(
    cached || DEFAULT_PUBLIC_SITE_SETTINGS
  );
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  const refreshInFlight = useRef<Promise<void> | null>(null);
  const refresh = async (opts?: { force?: boolean }) => {
    const force = !!opts?.force;
    try {
      setError(null);
      if (refreshInFlight.current) {
        await refreshInFlight.current;
        return;
      }

      refreshInFlight.current = (async () => {
        let lastAdminUpdateTs = 0;
        try {
          lastAdminUpdateTs = Number(
            localStorage.getItem(SITE_SETTINGS_LAST_UPDATE_KEY) || 0
          );
        } catch {
          // ignore
        }

        const shouldBust =
          force ||
          (lastAdminUpdateTs > 0 &&
            (!lastAdminUpdateSeen || lastAdminUpdateTs > lastAdminUpdateSeen));
        const url = shouldBust
          ? `/api/settings/public?ts=${Date.now()}`
          : "/api/settings/public";

        const raw = await apiRequest(url, "GET");
        const merged = mergeWithDefaults(raw);
        cached = merged;
        cachedAt = Date.now();
        if (lastAdminUpdateTs > 0) {
          lastAdminUpdateSeen = Math.max(lastAdminUpdateSeen, lastAdminUpdateTs);
        }
        setData(merged);
      })();

      await refreshInFlight.current;
    } catch (e: any) {
      setError(e?.message || "Failed to load settings");
      // Keep UI stable
      setData(cached || DEFAULT_PUBLIC_SITE_SETTINGS);
    } finally {
      refreshInFlight.current = null;
      setLoading(false);
    }
  };

  useEffect(() => {
    const fresh = cached && Date.now() - cachedAt < CACHE_TTL_MS;
    if (fresh) {
      setLoading(false);
      setData(cached || DEFAULT_PUBLIC_SITE_SETTINGS);
      return;
    }

    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep settings reasonably fresh: refresh every 60s and on tab focus.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refresh();
    }, CACHE_TTL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    const onFocus = () => {
      refresh();
    };

    const onForceRefresh = () => {
      refresh({ force: true });
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === SITE_SETTINGS_LAST_UPDATE_KEY) {
        refresh({ force: true });
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener(SITE_SETTINGS_REFRESH_EVENT, onForceRefresh);
    window.addEventListener("storage", onStorage);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(SITE_SETTINGS_REFRESH_EVENT, onForceRefresh);
      window.removeEventListener("storage", onStorage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(
    () => ({ data, loading, error, refresh }),
    [data, loading, error]
  );
}
