"use client";

import React from "react";

/**
 * PATCH-65: Worker Lifecycle Timeline
 *
 * READ-ONLY visual component showing the complete worker journey.
 * - All lifecycle steps visible
 * - Current state highlighted
 * - Timestamps for completed steps
 * - Admin actions shown (if available)
 *
 * States (LOCKED - matches backend):
 * fresh → screening_unlocked → test_submitted → ready_to_work → assigned → working
 * (suspended can branch from working, failed can branch from test_submitted)
 */

// The canonical lifecycle steps in order
const LIFECYCLE_STEPS = [
  {
    key: "applied",
    label: "Applied",
    icon: "App",
    description: "Application submitted",
  },
  {
    key: "approved",
    label: "Approved",
    icon: "OK",
    description: "Application approved by admin",
  },
  {
    key: "screening_unlocked",
    label: "Screening",
    icon: "Unlock",
    description: "Training & test unlocked",
  },
  {
    key: "test_submitted",
    label: "Test Done",
    icon: "Test",
    description: "Screening test submitted",
  },
  {
    key: "ready_to_work",
    label: "Ready",
    icon: "Ready",
    description: "Passed screening",
  },
  {
    key: "assigned",
    label: "Assigned",
    icon: "Proj",
    description: "Project assigned",
  },
  {
    key: "working",
    label: "Working",
    icon: "Work",
    description: "Actively working",
  },
  {
    key: "completed",
    label: "Complete",
    icon: "Done",
    description: "Project completed",
  },
];

// Status priority for determining progress
const STATUS_PRIORITY: Record<string, number> = {
  fresh: 0,
  applied: 1,
  approved: 1.5,
  screening_unlocked: 2,
  training_viewed: 2.5,
  test_submitted: 3,
  failed: 3, // Same level as test_submitted
  ready_to_work: 4,
  assigned: 5,
  working: 6,
  proof_submitted: 6.5,
  completed: 7,
  suspended: -1, // Special state
};

interface LifecycleEvent {
  stepKey: string;
  timestamp?: string;
  adminEmail?: string;
  adminName?: string;
  reason?: string;
  note?: string;
}

interface WorkerLifecycleTimelineProps {
  currentStatus: string;
  applicationStatus?: string;
  events?: LifecycleEvent[];
  createdAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  trainingViewedAt?: string;
  layout?: "horizontal" | "vertical";
  isFailed?: boolean;
  isSuspended?: boolean;
  suspendedReason?: string;
}

export function WorkerLifecycleTimeline({
  currentStatus,
  applicationStatus,
  events = [],
  createdAt,
  approvedAt,
  approvedBy,
  trainingViewedAt,
  layout = "horizontal",
  isFailed = false,
  isSuspended = false,
  suspendedReason,
}: WorkerLifecycleTimelineProps) {
  const currentPriority = STATUS_PRIORITY[currentStatus] ?? 0;

  // Build event map for quick lookup
  const eventMap = new Map<string, LifecycleEvent>();
  events.forEach((e) => eventMap.set(e.stepKey, e));

  // Add implicit events from props
  if (createdAt) {
    eventMap.set("applied", {
      stepKey: "applied",
      timestamp: createdAt,
    });
  }
  if (approvedAt || applicationStatus === "approved") {
    eventMap.set("approved", {
      stepKey: "approved",
      timestamp: approvedAt,
      adminEmail: approvedBy,
    });
  }
  if (trainingViewedAt) {
    eventMap.set("training_viewed", {
      stepKey: "training_viewed",
      timestamp: trainingViewedAt,
    });
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return null;
    }
  };

  const getStepState = (
    step: (typeof LIFECYCLE_STEPS)[0],
  ): "completed" | "current" | "failed" | "suspended" | "future" => {
    const stepPriority = STATUS_PRIORITY[step.key] ?? 99;

    // Special handling for approved status
    if (step.key === "approved") {
      if (applicationStatus === "approved" || currentPriority > 1.5) {
        return "completed";
      }
      if (applicationStatus === "pending" && currentStatus === "applied") {
        return "current";
      }
      return "future";
    }

    // Check if current step
    if (step.key === currentStatus) {
      if (isFailed && step.key === "test_submitted") return "failed";
      if (isSuspended && step.key === "working") return "suspended";
      return "current";
    }

    // Check if completed
    if (stepPriority < currentPriority) {
      return "completed";
    }

    return "future";
  };

  if (layout === "vertical") {
    return (
      <div className="space-y-0">
        {LIFECYCLE_STEPS.map((step, index) => {
          const state = getStepState(step);
          const event = eventMap.get(step.key);
          const dateStr = formatDate(event?.timestamp);

          return (
            <div key={step.key} className="flex gap-4">
              {/* Timeline line and circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                    state === "current"
                      ? "bg-cyan-500/30 border-cyan-500 text-cyan-300 ring-4 ring-cyan-500/20"
                      : state === "completed"
                        ? "bg-emerald-500/30 border-emerald-500 text-emerald-300"
                        : state === "failed"
                          ? "bg-red-500/30 border-red-500 text-red-300"
                          : state === "suspended"
                            ? "bg-amber-500/30 border-amber-500 text-amber-300"
                            : "bg-slate-700/30 border-slate-600 text-slate-500"
                  }`}
                >
                  {state === "completed"
                    ? "✓"
                    : state === "failed"
                      ? "✕"
                      : step.icon}
                </div>
                {index < LIFECYCLE_STEPS.length - 1 && (
                  <div
                    className={`w-0.5 h-12 ${
                      state === "completed" ? "bg-emerald-500" : "bg-slate-700"
                    }`}
                  />
                )}
              </div>

              {/* Step content */}
              <div className="pb-8 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`font-medium ${
                      state === "current"
                        ? "text-cyan-400"
                        : state === "completed"
                          ? "text-emerald-400"
                          : state === "failed"
                            ? "text-red-400"
                            : "text-slate-500"
                    }`}
                  >
                    {step.label}
                  </p>
                  {state === "current" && (
                    <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 text-xs rounded-full">
                      Current
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {step.description}
                </p>

                {/* Timestamp and admin info */}
                {(dateStr || event?.adminEmail) && (
                  <div className="mt-2 text-xs text-slate-400 space-y-0.5">
                    {dateStr && <p>Date: {dateStr}</p>}
                    {event?.adminEmail && <p>By: {event.adminEmail}</p>}
                    {event?.note && (
                      <p className="text-slate-500 italic">"{event.note}"</p>
                    )}
                  </div>
                )}

                {/* Failed/Suspended warning */}
                {state === "failed" && (
                  <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-xs text-red-400">
                      ! Screening failed — Can retry or be rejected
                    </p>
                  </div>
                )}
                {state === "suspended" && (
                  <div className="mt-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <p className="text-xs text-amber-400">
                      ! Account suspended
                      {suspendedReason && ` — ${suspendedReason}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Suspended/Failed special indicator at bottom */}
        {isSuspended && (
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 bg-red-500/30 border-red-500 text-red-300">
                X
              </div>
            </div>
            <div className="flex-1">
              <p className="font-medium text-red-400">Suspended</p>
              <p className="text-xs text-slate-500">
                Worker account is currently suspended
              </p>
              {suspendedReason && (
                <p className="text-xs text-red-400 mt-1">
                  Reason: {suspendedReason}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div role="region" aria-label="Worker lifecycle timeline" tabIndex={0}
      className="overflow-x-auto rounded focus-visible:outline-2 focus-visible:outline-cyan-400">
      <div className="flex items-center justify-between min-w-[800px] px-2">
        {LIFECYCLE_STEPS.map((step, index) => {
          const state = getStepState(step);
          const event = eventMap.get(step.key);
          const dateStr = formatDate(event?.timestamp);

          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center group relative">
                {/* Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border-2 transition-all ${
                    state === "current"
                      ? "bg-cyan-500/30 border-cyan-500 text-cyan-300 ring-4 ring-cyan-500/20"
                      : state === "completed"
                        ? "bg-emerald-500/30 border-emerald-500 text-emerald-300"
                        : state === "failed"
                          ? "bg-red-500/30 border-red-500 text-red-300"
                          : state === "suspended"
                            ? "bg-amber-500/30 border-amber-500 text-amber-300"
                            : "bg-slate-700/30 border-slate-600 text-slate-500"
                  }`}
                >
                  {state === "completed"
                    ? "✓"
                    : state === "failed"
                      ? "✕"
                      : step.icon}
                </div>

                {/* Label */}
                <p
                  className={`text-xs mt-1 whitespace-nowrap ${
                    state === "current"
                      ? "text-cyan-400 font-medium"
                      : state === "completed"
                        ? "text-emerald-400"
                        : state === "failed"
                          ? "text-red-400"
                          : "text-slate-500"
                  }`}
                >
                  {step.label}
                </p>

                {/* Timestamp below (if available) */}
                {dateStr && (
                  <p className="text-[10px] text-slate-500 mt-0.5">{dateStr}</p>
                )}

                {/* Hover tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 min-w-[150px]">
                  <p className="text-sm font-medium text-white">{step.label}</p>
                  <p className="text-xs text-slate-400">{step.description}</p>
                  {dateStr && (
                    <p className="text-xs text-slate-500 mt-1">Date: {dateStr}</p>
                  )}
                  {event?.adminEmail && (
                    <p className="text-xs text-slate-500">
                      By: {event.adminEmail}
                    </p>
                  )}
                  {event?.note && (
                    <p className="text-xs text-slate-500 italic mt-1">
                      "{event.note}"
                    </p>
                  )}
                  {state === "failed" && (
                    <p className="text-xs text-red-400 mt-1">
                      ! Failed - Can retry
                    </p>
                  )}
                </div>
              </div>

              {/* Connector line */}
              {index < LIFECYCLE_STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 ${
                    state === "completed" ? "bg-emerald-500" : "bg-slate-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Suspended/Failed banner below timeline */}
      {isSuspended && (
        <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
          <span className="text-2xl">X</span>
          <div>
            <p className="text-sm font-medium text-red-400">
              Account Suspended
            </p>
            <p className="text-xs text-red-400/70">
              {suspendedReason || "Worker access is temporarily blocked"}
            </p>
          </div>
        </div>
      )}
      {isFailed && !isSuspended && (
        <div className="mt-4 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="text-sm font-medium text-amber-400">
              Screening Failed
            </p>
            <p className="text-xs text-amber-400/70">
              Worker can retry or be permanently rejected
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerLifecycleTimeline;
