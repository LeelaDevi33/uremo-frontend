"use client";

/**
 * PATCH_56: Apply to Work - Premium Job Discovery Experience
 * Two-column layout with job list on left, details on right
 * Modern, clean, conversion-focused design
 */

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { linkedApplicationPosition } from "@/lib/applicationLink";
import { useToast } from "@/hooks/useToast";
import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  useSiteSettings,
} from "@/hooks/useSiteSettings";
import FaqAccordion from "@/components/ui/FaqAccordion";

// PATCH_56: Premium Icons
function BriefcaseIcon({ className }: { className?: string }) {
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
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
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
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22,4 12,14.01 9,11.01" />
    </svg>
  );
}

function ClipboardIcon({ className }: { className?: string }) {
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
      <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
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
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46" />
    </svg>
  );
}

interface Application {
  _id: string;
  status: "pending" | "approved" | "rejected";
  positionTitle?: string;
  position?: string | { _id: string } | null;
  category?: string;
  createdAt?: string;
}

type WorkPosition = {
  _id: string;
  title: string;
  category: string;
  description?: string;
  requirements?: string;
  active?: boolean;
  serviceId?: string | { _id: string } | null;
  screeningRequired?: boolean;
};

export default function ApplyToWorkPage() {
  return <Suspense fallback={<p className="p-6">Loading positions…</p>}><ApplicationEntry /></Suspense>;
}

function ApplicationEntry() {
  const query = useSearchParams().toString();
  return <ApplicationForm key={query} query={query} />;
}

function ApplicationForm({ query }: { query: string }) {
  const params = useMemo(() => new URLSearchParams(query), [query]);
  const { toast } = useToast();
  const { data: settings } = useSiteSettings();

  const ui =
    settings?.applyWork?.ui || DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.ui;

  const [positions, setPositions] = useState<WorkPosition[]>([]);
  const [positionsLoading, setPositionsLoading] = useState(true);
  const [positionsFailed, setPositionsFailed] = useState(false);
  const [positionId, setPositionId] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState(params.get("category")?.trim() || "all");
  const linkedPosition = linkedApplicationPosition(positions, params);

  const [showForm, setShowForm] = useState(false);

  const [message, setMessage] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [resumeMode, setResumeMode] = useState<"file" | "link">("file");
  const [resume, setResume] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<Application | null>(null);
  const [checking, setChecking] = useState(true);

  const applyFaq =
    settings?.applyWork?.faq && settings.applyWork.faq.length
      ? settings.applyWork.faq
      : DEFAULT_PUBLIC_SITE_SETTINGS.applyWork.faq;

  const positionsById = useMemo(() => {
    const map = new Map<string, WorkPosition>();
    for (const p of positions) {
      if (p?._id) map.set(p._id, p);
    }
    return map;
  }, [positions]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const p of positions) {
      const c = String(p?.category || "").trim();
      if (c) set.add(c);
    }
    return ["all", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [positions]);

  const filteredPositions = useMemo(() => {
    if (linkedPosition !== undefined) return linkedPosition ? [linkedPosition] : [];
    return positions.filter((p) => {
      if (categoryFilter === "all") return true;
      return String(p.category || "") === categoryFilter;
    });
  }, [positions, categoryFilter, linkedPosition]);

  const hasPositions = positions.length > 0;

  const checkExisting = async () => {
    try {
      const requested = params.get("positionId") || params.get("jobId");
      const path = requested && /^[a-f0-9]{24}$/i.test(requested)
        ? "/api/apply-work/me?positionId=" + encodeURIComponent(requested)
        : "/api/apply-work/me";
      const app = await apiRequest<Application | null>(path, "GET", null, true);
      if (app) {
        setExisting(app);
      }
    } catch (err) {
      // No existing application
    } finally {
      setChecking(false);
    }
  };

  const loadPositions = async () => {
    setPositionsLoading(true);
    setPositionsFailed(false);
    try {
      const data = await apiRequest<WorkPosition[]>(
        "/api/work-positions",
        "GET",
      );
      const list = Array.isArray(data) ? data : [];
      const activeOnly = list.filter((p) => p && p.active !== false);
      setPositions(activeOnly);

      // If a category was requested via query param but doesn't exist, fall back.
      if (
        categoryFilter !== "all" &&
        !activeOnly.some((p) => String(p.category || "") === categoryFilter)
      ) {
        setCategoryFilter("all");
      }

    } catch {
      setPositions([]);
      setPositionsFailed(true);
    } finally {
      setPositionsLoading(false);
    }
  };

  const selectedPosition = linkedPosition === undefined ? positionsById.get(positionId) : linkedPosition;

  const submit = async () => {
    if (!selectedPosition) {
      toast(ui.selectPositionRequiredText, "error");
      return;
    }

    if (resumeMode === "file" && !resume) {
      toast(ui.resumeRequiredText, "error");
      return;
    }

    const formData = new FormData();
    formData.append("positionId", selectedPosition._id);
    formData.append("message", message);
    if (resumeMode === "link") {
      let url: URL;
      try { url = new URL(resumeUrl.trim()); }
      catch { toast("Enter a full HTTPS resume link.", "error"); return; }
      if (url.protocol !== "https:" || url.username || url.password) {
        toast("Use an HTTPS resume link without embedded credentials.", "error"); return;
      }
      formData.append("resumeUrl", url.href);
    } else if (resume) {
      formData.append("resume", resume);
    }

    try {
      setLoading(true);
      await apiRequest("/api/apply-work", "POST", formData, true, true);

      toast(ui.successToast, "success");
      window.location.href = "/dashboard";
    } catch (err: any) {
      toast(err.message || ui.submissionFailedText, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkExisting();
    loadPositions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return <div className="p-6">{ui.loadingPositionsText}</div>;
  }

  if (linkedPosition !== undefined && positionsLoading) {
    return <p className="p-6">{ui.loadingPositionsText}</p>;
  }

  if (linkedPosition === null) {
    return (
      <div className="u-container max-w-2xl py-12">
        <h1 className="text-2xl font-bold">{positionsFailed ? "Could not load the linked position" : "Linked position unavailable"}</h1>
        <p className="mt-3 text-slate-300">
          {positionsFailed ? "Try loading the positions again." : "This opportunity link could not be matched to a single open position."}
        </p>
        <div className="mt-6 flex gap-4">
          {positionsFailed && <button className="btn-primary" onClick={loadPositions}>Try again</button>}
          <Link className="btn-secondary" href="/apply-to-work">Browse all positions</Link>
        </div>
      </div>
    );
  }

  if (existing) {
    const existingPositionId = typeof existing.position === "string" ? existing.position : existing.position?._id;
    if (linkedPosition && existingPositionId !== linkedPosition._id) {
      return (
        <div className="u-container max-w-2xl py-12">
          <h1 className="text-2xl font-bold">You already have an application</h1>
          <p className="mt-3 text-slate-300">
            You opened the position for {linkedPosition.title}. View your existing application to check its position and status.
          </p>
          <Link className="btn-secondary mt-6 inline-block" href="/apply-to-work">View my application</Link>
        </div>
      );
    }
    const statusColor = {
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      approved: "bg-green-500/20 text-green-400 border-green-500/30",
      rejected: "bg-red-500/20 text-red-400 border-red-500/30",
    };

    const statusText = {
      pending: "Under Review",
      approved: "Approved",
      rejected: "Not Approved",
    };

    return (
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 mb-4">
              <ClipboardIcon className="w-8 h-8 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
              {ui.title}
            </h1>
            <p className="text-slate-400 mt-2">Application Status</p>
          </div>

          {/* Existing Application Card */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-sm overflow-hidden">
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {ui.existingTitle}
                </h2>
                <span
                  className={`px-4 py-1.5 rounded-full text-sm font-medium border ${statusColor[existing.status as keyof typeof statusColor]}`}
                >
                  {statusText[existing.status as keyof typeof statusText]}
                </span>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-300">{ui.existingBody}</p>

              {existing.positionTitle && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
                  <BriefcaseIcon className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                      Position Applied
                    </p>
                    <p className="font-medium text-white">
                      {existing.positionTitle}
                    </p>
                  </div>
                </div>
              )}

              {existing.status === "pending" && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <span className="text-xl">⏳</span>
                  <p className="text-sm text-yellow-200">
                    {ui.existingPendingText}
                  </p>
                </div>
              )}

              {existing.status === "approved" && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                  <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-green-200">
                      {ui.existingApprovedText}
                    </p>
                    <a
                      href="/dashboard"
                      className="inline-block mt-3 text-sm font-medium text-green-400 hover:text-green-300 transition"
                    >
                      Go to Dashboard →
                    </a>
                  </div>
                </div>
              )}

              {existing.status === "rejected" && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                  <span className="text-xl">❌</span>
                  <p className="text-sm text-red-200">
                    {ui.existingRejectedText}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30">
                  <BriefcaseIcon className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {positions.length} Open Position
                  {positions.length !== 1 ? "s" : ""}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                {ui.title}
              </h1>
              <p className="text-slate-400 mt-2 max-w-xl">{ui.subtitle}</p>
            </div>

            {/* Category Filter */}
            {!linkedPosition && categories.length > 1 && (
              <div className="flex items-center gap-2">
                <FilterIcon className="w-4 h-4 text-slate-500" />
                <select
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c} value={c} className="bg-slate-900">
                      {c === "all" ? ui.allCategoriesText : c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {linkedPosition && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Link className="text-emerald-400 hover:underline" href="/apply-to-work">Browse all positions</Link>
        </div>
      )}

      {/* Main Content - Two Column Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {positionsLoading ? (
          /* Skeleton Loading State */
          <div className="grid lg:grid-cols-5 gap-6">
            <div className="lg:col-span-2 space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-white/10 bg-white/5 p-4 animate-pulse"
                >
                  <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
                  <div className="h-3 bg-white/10 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-white/10 rounded w-full" />
                </div>
              ))}
            </div>
            <div className="lg:col-span-3 rounded-xl border border-white/10 bg-white/5 p-8 animate-pulse">
              <div className="h-6 bg-white/10 rounded w-1/2 mb-4" />
              <div className="h-4 bg-white/10 rounded w-3/4" />
            </div>
          </div>
        ) : !hasPositions ? (
          /* Empty State */
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-slate-800/50 border border-white/10 mb-6">
              <BriefcaseIcon className="w-10 h-10 text-slate-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No Open Positions
            </h3>
            <p className="text-slate-400 max-w-md mx-auto">
              {ui.noPositionsFoundText}
            </p>
            <a
              href="/explore-services"
              className="inline-block mt-6 text-emerald-400 hover:text-emerald-300 font-medium transition"
            >
              Explore opportunities →
            </a>
          </div>
        ) : (
          /* Two Column Layout */
          <div className="grid lg:grid-cols-5 gap-6">
            {/* Left Column - Position List */}
            <div className="lg:col-span-2 space-y-3">
              <p className="text-sm text-slate-500 mb-2 px-1">
                {filteredPositions.length} position
                {filteredPositions.length !== 1 ? "s" : ""} available
              </p>

              {filteredPositions.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
                  <p className="text-slate-400">{ui.noPositionsFoundText}</p>
                </div>
              ) : (
                filteredPositions.map((p) => {
                  const isSelected = selectedPosition?._id === p._id;
                  return (
                    <button
                      key={p._id}
                      type="button"
                      onClick={() => {
                        setPositionId(p._id);
                        setShowForm(false);
                      }}
                      className={`w-full text-left rounded-xl border p-4 transition-all duration-200 ${
                        isSelected
                          ? "border-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/10"
                          : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-white truncate">
                              {p.title}
                            </p>
                            {p.screeningRequired && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                Screening Required
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            {p.category}
                          </p>
                          {p.description && (
                            <p className="text-sm text-slate-400 mt-2 line-clamp-2">
                              {p.description}
                            </p>
                          )}
                        </div>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            isSelected
                              ? "border-emerald-400 bg-emerald-400"
                              : "border-slate-600"
                          }`}
                        >
                          {isSelected && (
                            <svg
                              className="w-3 h-3 text-slate-900"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth="3"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Right Column - Position Details & Application Form */}
            <div className="lg:col-span-3">
              {!selectedPosition ? (
                /* No Position Selected */
                <div className="rounded-2xl border border-dashed border-white/20 bg-gradient-to-br from-white/5 to-transparent p-8 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/50 border border-white/10 flex items-center justify-center mb-4">
                    <BriefcaseIcon className="w-8 h-8 text-slate-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Select a Position
                  </h3>
                  <p className="text-slate-400 max-w-sm">
                    Choose a position from the list to view details and submit
                    your application.
                  </p>
                </div>
              ) : (
                /* Position Details */
                <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent overflow-hidden">
                  {/* Position Header */}
                  <div className="p-6 border-b border-white/5 bg-gradient-to-r from-emerald-500/5 to-transparent">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          {selectedPosition.screeningRequired && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30">
                              Screening Required
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Open Position
                          </span>
                        </div>
                        <h2 className="text-2xl font-bold text-white">
                          {selectedPosition.title}
                        </h2>
                        <p className="text-slate-400 mt-1">
                          {selectedPosition.category}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Position Body */}
                  <div className="p-6 space-y-6">
                    {selectedPosition.description && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-2">
                          Description
                        </h3>
                        <p className="text-slate-200">
                          {selectedPosition.description}
                        </p>
                      </div>
                    )}

                    {selectedPosition.requirements && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">
                          Requirements
                        </h3>
                        <ul className="space-y-2">
                          {String(selectedPosition.requirements)
                            .split(/\r?\n/)
                            .map((line, i) => {
                              const trimmed = line.trim();
                              if (!trimmed) return null;
                              return (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-slate-300"
                                >
                                  <CheckCircleIcon className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                                  <span>{trimmed}</span>
                                </li>
                              );
                            })}
                        </ul>
                      </div>
                    )}

                    {/* Application Form */}
                    {!showForm ? (
                      <button
                        type="button"
                        onClick={() => setShowForm(true)}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-400 hover:to-teal-400 transition-all duration-200 shadow-lg shadow-emerald-500/20"
                      >
                        Apply for this Position
                      </button>
                    ) : (
                      <div className="space-y-4 pt-4 border-t border-white/10">
                        <h3 className="text-lg font-semibold text-white">
                          Submit Your Application
                        </h3>

                        {/* Message */}
                        <div>
                          <label className="text-sm text-slate-400 block mb-2">
                            {ui.messageLabel}
                          </label>
                          <textarea
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition resize-none"
                            rows={4}
                            placeholder={ui.messagePlaceholder}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                          />
                        </div>

                        {/* Resume Upload */}
                        <div>
                          <label className="text-sm text-slate-400 block mb-2">
                            {ui.resumeLabel}
                          </label>
                          <div className="mb-3 flex gap-3">
                            <button type="button" aria-pressed={resumeMode === "file"} className="rounded border px-3 py-1.5 aria-pressed:border-blue-400" onClick={() => setResumeMode("file")}>Upload a file</button>
                            <button type="button" aria-pressed={resumeMode === "link"} className="rounded border px-3 py-1.5 aria-pressed:border-blue-400" onClick={() => setResumeMode("link")}>Use a resume link</button>
                          </div>
                          {resumeMode === "link" ? <label className="block text-sm">Resume link (HTTPS)
                            <input type="url" className="mt-2 w-full rounded-lg border border-white/20 bg-slate-900 p-3" value={resumeUrl} onChange={e => setResumeUrl(e.target.value)} />
                          </label> : (
                            <label className="block rounded-xl border border-dashed border-white/25 bg-white/5 p-4 text-sm">
                              Resume file (PDF, JPG, PNG or WebP, up to 10 MB)
                              <input
                                type="file"
                                accept="application/pdf,image/jpeg,image/png,image/webp"
                                className="mt-3 block w-full text-slate-300"
                                onChange={event => {
                                  const file = event.currentTarget.files?.[0] ?? null;
                                  if (file && file.size > 10 * 1024 * 1024) {
                                    event.currentTarget.value = "";
                                    setResume(null);
                                    toast("Choose a file of 10 MB or less.", "error");
                                  } else {
                                    setResume(file);
                                  }
                                }}
                              />
                            </label>
                          )}
                        </div>

                        {/* Submit Button */}
                        <button
                          onClick={submit}
                          disabled={loading}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold hover:from-emerald-400 hover:to-teal-400 transition-all duration-200 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg
                                className="animate-spin w-5 h-5"
                                viewBox="0 0 24 24"
                                fill="none"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                />
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                />
                              </svg>
                              {ui.submittingText}
                            </span>
                          ) : (
                            ui.submitText
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Trust Note & FAQ */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 space-y-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
          <p className="text-sm text-slate-400">{ui.trustNoteText}</p>
        </div>

        <FaqAccordion title={ui.faqTitle} items={applyFaq} />
      </div>
    </div>
  );
}
