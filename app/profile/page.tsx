"use client";

/**
 * PATCH_58: Premium Profile Page Redesign
 * Professional account management with trust signals
 */

import { motion } from "framer-motion";
import { ProjectAccessRecords } from "@/components/opportunities/OpportunityAccess";
import market from "@/components/opportunities/market.module.css";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";
import { useOpportunityData } from "@/components/opportunities/useOpportunityData";
import { EmojiAccount } from "@/components/ui/Emoji";
import { useToast } from "@/hooks/useToast";
import { useState, useEffect } from "react";
import Link from "next/link";

// ==================== SVG ICONS ====================
const IconUser = () => (
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
      d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
    />
  </svg>
);

const IconMail = () => (
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
      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
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

const IconBell = () => (
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
      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
    />
  </svg>
);

const IconHeart = () => (
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
      d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
    />
  </svg>
);

const IconCopy = () => (
  <svg
    className="w-4 h-4"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"
    />
  </svg>
);

const IconCheck = () => (
  <svg
    className="w-5 h-5"
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

const IconCalendar = () => (
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
      d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
    />
  </svg>
);

const IconBadge = () => (
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
      d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z"
    />
  </svg>
);

const IconSparkle = () => (
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
      d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z"
    />
  </svg>
);

const INTEREST_OPTIONS = [
  { id: "microjobs", label: "Open roles", icon: "Work" },
  { id: "rentals", label: "Project rentals", icon: "Rent" },
  { id: "project_purchase", label: "Exclusive projects", icon: "Buy" },
];

type Account = { email?: string; role?: string; name?: string; createdAt?: string };
const defaultPreferences = {
  productUpdates: true,
  jobAlerts: true,
  dealAlerts: true,
  rentalAlerts: true,
  marketing: false,
};

type PreferencesResponse = {
  success: boolean;
  data: { emailPreferences: Partial<typeof defaultPreferences>; interestTags: string[] };
};

export default function ProfilePage() {
  const { user, token } = useAuth();
  return token ? <AccountProfile key={token} token={token} session={user} /> : <p role="status">Checking sign-in…</p>;
}

function AccountProfile({ token, session }: { token: string; session: Account | null }) {
  const [selectedGrant, setSelectedGrant] = useState<string>();
  useEffect(() => { setSelectedGrant(new URLSearchParams(window.location.search).get("grant") || undefined); }, []);
  const { toast } = useToast();
  const { state: identity, reload: reloadIdentity } = useOpportunityData<{ user: Account }>("/api/auth/me", token);
  const account = identity.phase === "loaded" && identity.data.user ? identity.data.user : session;
  const email = account?.email || "";
  const name = account?.name || email || "Your account";
  const role = account?.role || "Member";
  const createdAt = account?.createdAt && Number.isFinite(Date.parse(account.createdAt)) ? new Date(account.createdAt) : null;
  const [emailPreferences, setEmailPreferences] = useState(defaultPreferences);
  const [interestTags, setInterestTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [prefsPhase, setPrefsPhase] = useState<"loading" | "loaded" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let current = true;
    apiRequest<PreferencesResponse>("/api/users/preferences", "GET", null, true)
      .then(result => {
        if (!current) return;
        if (!result?.success || !result.data?.emailPreferences || !Array.isArray(result.data.interestTags)) {
          throw new Error("Preferences unavailable");
        }
        setEmailPreferences({ ...defaultPreferences, ...result.data.emailPreferences });
        setInterestTags(result.data.interestTags);
        setPrefsPhase("loaded");
      })
      .catch(() => { if (current) setPrefsPhase("error"); });
    return () => { current = false; };
  }, [attempt]);

  const copyEmail = async () => {
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      toast("Email copied to clipboard", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Failed to copy", "error");
    }
  };

  const toggleEmailPreference = (key: keyof typeof emailPreferences) => {
    setEmailPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const toggleInterest = (tag: string) => {
    setInterestTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const savePreferences = async () => {
    if (loading || prefsPhase !== "loaded") return;
    setLoading(true);
    try {
      const result = await apiRequest<PreferencesResponse>("/api/users/preferences", "PUT", { emailPreferences, interestTags }, true);
      if (!result?.success) throw new Error("Could not save preferences.");
      toast("Preferences saved.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not save preferences.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* ===== HEADER ===== */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <EmojiAccount /> Profile Settings
          </h1>
          <p className="text-slate-400 mt-1">
            Manage your account and preferences
          </p>
        </motion.div>

        {/* ===== PROFILE CARD ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-indigo-600 via-indigo-500 to-purple-600 rounded-2xl p-6 mb-6 relative overflow-hidden"
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg
              className="w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern
                  id="profile-grid"
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                >
                  <circle cx="5" cy="5" r="1" fill="white" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#profile-grid)" />
            </svg>
          </div>

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center text-3xl font-bold border-2 border-white/30">
              {name.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h2 className="break-all text-2xl font-bold">{name}</h2>
                <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-medium capitalize">
                  <IconBadge />
                  {role}
                </span>
              </div>
              <p className="break-all text-indigo-100">{email}</p>
              {createdAt && (
                <div className="flex items-center gap-2 mt-2 text-indigo-200 text-sm">
                  <IconCalendar />
                  <span>
                    Member since{" "}
                    {createdAt.toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>

          </div>
        </motion.div>

        {token && <section id="project-access" aria-labelledby="profile-project-title" className={`${market.library} scroll-mt-24`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 id="profile-project-title" className="text-2xl font-semibold">My project access</h2><Link href="/opportunities/access" className="text-teal-300 underline">Access history</Link>
          </div>
          <ProjectAccessRecords key={token + (selectedGrant || "")} token={token} selectedGrant={selectedGrant} />
        </section>}

        {/* ===== ACCOUNT INFO ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400">
              <IconUser />
            </div>
            <h3 className="text-lg font-semibold">Account Information</h3>
          </div>

          <div className="space-y-4">
            {/* Email */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-800/50 rounded-xl">
              <div className="flex min-w-0 items-center gap-3">
                <IconMail />
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    Email Address
                  </p>
                  <p className="break-all font-medium">{email}</p>
                </div>
              </div>
              <button
                onClick={copyEmail}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  copied
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                }`}
              >
                {copied ? <IconCheck /> : <IconCopy />}
                <span className="text-sm">{copied ? "Copied!" : "Copy"}</span>
              </button>
            </div>

            {/* Role */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <IconShield />
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">
                    Account Type
                  </p>
                  <p className="font-medium capitalize">{role}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {identity.phase === "error" && <p role="alert" className="mb-4 text-amber-200">
          Account details could not be refreshed. <button type="button" className="underline" onClick={reloadIdentity}>Retry account details</button>
        </p>}
        {prefsPhase !== "loaded" && <p role="status" className="mb-4 text-slate-200">
          {prefsPhase === "loading" ? "Loading your preferences…" : <>Your preferences could not be loaded. <button type="button" className="underline" onClick={() => { setPrefsPhase("loading"); setAttempt(value => value + 1); }}>Retry preferences</button></>}
        </p>}
        <fieldset disabled={loading || prefsPhase !== "loaded"} className="min-w-0">
          <legend className="sr-only">Account preferences</legend>
        {/* ===== EMAIL PREFERENCES ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
              <IconBell />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Email Preferences</h3>
              <p className="text-sm text-slate-400">
                Choose what notifications you receive
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              {
                key: "productUpdates" as const,
                label: "Product Updates",
                desc: "New features and improvements",
              },
              {
                key: "jobAlerts" as const,
                label: "Job Alerts",
                desc: "New work opportunities matching your skills",
              },
              {
                key: "dealAlerts" as const,
                label: "Deal Alerts",
                desc: "Special offers and discounts",
              },
              {
                key: "rentalAlerts" as const,
                label: "Rental Alerts",
                desc: "New rental listings and updates",
              },
              {
                key: "marketing" as const,
                label: "Marketing Emails",
                desc: "Promotional content and newsletters",
              },
            ].map(({ key, label, desc }) => (
              <label
                key={key}
                className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-800/50 rounded-xl cursor-pointer hover:bg-slate-800/70 transition-colors"
              >
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-slate-400">{desc}</p>
                </div>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={emailPreferences[key]}
                    onChange={() => toggleEmailPreference(key)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus-visible:ring-2 peer-focus-visible:ring-white rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </div>
              </label>
            ))}
          </div>
        </motion.div>

        {/* ===== INTERESTS ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-800 p-6 mb-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-pink-500/20 rounded-xl flex items-center justify-center text-pink-400">
              <IconHeart />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Your Interests</h3>
              <p className="text-sm text-slate-400">
                Choose the project opportunities you are interested in.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {INTEREST_OPTIONS.map((interest) => (
              <button
                key={interest.id}
                aria-pressed={interestTags.includes(interest.id)}
                onClick={() => toggleInterest(interest.id)}
                className={`flex items-center gap-3 p-4 rounded-xl transition-all ${
                  interestTags.includes(interest.id)
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                    : "bg-slate-800/50 text-slate-300 hover:bg-slate-800"
                }`}
              >
                <span className="text-xl">{interest.icon}</span>
                <span className="font-medium text-sm">{interest.label}</span>
                {interestTags.includes(interest.id) && <IconCheck />}
              </button>
            ))}
          </div>

          <p className="mt-4 text-xs text-slate-500 text-center">
            {interestTags.length} of {INTEREST_OPTIONS.length} interests selected
          </p>
        </motion.div>

        </fieldset>

        {/* ===== SAVE BUTTON ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap justify-end gap-4"
        >
          <Link
            href="/dashboard"
            className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-medium transition-colors"
          >
            Back to Dashboard
          </Link>
          <button
            onClick={savePreferences}
            disabled={loading || prefsPhase !== "loaded"}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 hover:shadow-xl hover:shadow-indigo-500/30 hover:-translate-y-0.5"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <IconSparkle />
                Save Changes
              </>
            )}
          </button>
        </motion.div>

      </div>
    </div>
  );
}
