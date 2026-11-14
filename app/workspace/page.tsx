"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { hasActiveScreening, screeningOutcome, screeningProgress, type ScreeningAttempt } from "@/lib/workspaceScreening";
import EmptyState from "@/components/ui/EmptyState";
import { useToast } from "@/hooks/useToast";
import { EmojiWorkspace } from "@/components/ui/Emoji";

/**
 * PATCH_49: Experience Flow Polish + Admin UX Cleanup + Smart Workspace Routing
 *
 * Smart Workspace Landing - Conditional default tab based on worker status:
 * - If any job has workerStatus = "screening_unlocked" or "test_submitted" → SCREENINGS tab
 * - Else if any job has workerStatus = "assigned" or "working" → PROJECTS tab
 * - Else → APPLICATIONS tab
 */

type TrainingMaterial = {
  title: string;
  type: "link" | "pdf" | "video";
  url: string;
  description?: string;
};

type Position = {
  _id: string;
  title: string;
  category: string;
  description?: string;
  trainingMaterials?: TrainingMaterial[];
  hasScreening?: boolean;
};

type Screening = {
  _id: string;
  active?: boolean;
  title: string;
  description?: string;
  timeLimit: number;
  passingScore: number;
  trainingMaterials?: TrainingMaterial[];
};

type Project = {
  _id: string;
  title: string;
  description?: string;
  payRate: number;
  payType: string;
  deadline?: string;
  status: string;
};

type JobApplication = {
  _id: string;
  roleArchived?: boolean;
  position: Position;
  positionTitle: string;
  category: string;
  workerStatus:
    | "applied"
    | "screening_unlocked"
    | "training_viewed"
    | "test_submitted"
    | "failed"
    | "ready_to_work"
    | "assigned"
    | "working"
    | "suspended"
    | "fresh"
    | "screening_available"
    | "inactive";
  applicationStatus: "pending" | "approved" | "rejected";
  attemptCount: number;
  maxAttempts: number;
  totalEarnings: number;
  pendingEarnings: number;
  payRate: number;
  screening?: Screening;
  requiredScreenings?: Screening[];
  trainingMaterials: TrainingMaterial[];
  assignedProjects: Project[];
  completedProjects: { _id: string; title: string; earningsCredited?: number; earnings?: number }[];
  screeningsCompleted: ScreeningAttempt[];
  adminMessage?: string;
  createdAt: string;
};

type WorkspaceData = {
  hasProfile: boolean;
  applications?: JobApplication[];
  stats: {
    totalEarnings: number;
    workEarnings?: number; // PATCH_76: Work earnings from projects
    affiliateEarnings?: number; // PATCH_76: Affiliate earnings from referrals
    pendingEarnings: number;
    projectsCompleted: number;
    jobsApplied?: number;
    screeningsCompleted?: number;
  };
  message?: string;
};

type WorkspaceTab = "applications" | "screenings" | "projects";

// PATCH_49: Authoritative status configuration
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    humanMessage: string;
    color: string;
    icon: string;
    description: string;
  }
> = {
  applied: {
    label: "Applied",
    humanMessage: "Application Received",
    color: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    icon: "Note",
    description: "Your application is under review",
  },
  screening_unlocked: {
    label: "Training Available",
    humanMessage: "Training Available",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: "Learn",
    description: "Review training materials to proceed",
  },
  training_viewed: {
    label: "Ready for Test",
    humanMessage: "Training Completed",
    color: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    icon: "OK",
    description: "You can now take the screening test",
  },
  test_submitted: {
    label: "Test Submitted",
    humanMessage: "Test Submitted",
    color: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    icon: "Sent",
    description: "Awaiting result from admin",
  },
  failed: {
    label: "Test Failed",
    humanMessage: "Screening needs review",
    color: "bg-red-500/20 text-red-300 border-red-500/30",
    icon: "X",
    description: "An admin can unlock another attempt",
  },
  ready_to_work: {
    label: "Ready To Work",
    humanMessage: "Ready To Work",
    color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    icon: "OK",
    description: "Waiting for project assignment",
  },
  assigned: {
    label: "Assigned",
    humanMessage: "Project Assigned",
    color: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    icon: "Work",
    description: "You have an active project",
  },
  working: {
    label: "Working",
    humanMessage: "Working",
    color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    icon: "Run",
    description: "Project in progress",
  },
  completed: {
    label: "Completed",
    humanMessage: "Work Completed",
    color: "bg-green-500/20 text-green-300 border-green-500/30",
    icon: "Done",
    description: "Work successfully completed",
  },
  suspended: {
    label: "Suspended",
    humanMessage: "Account Suspended",
    color: "bg-red-500/20 text-red-300 border-red-500/30",
    icon: "Paused",
    description: "Contact support for assistance",
  },
  fresh: {
    label: "Applied",
    humanMessage: "Application Received",
    color: "bg-slate-500/20 text-slate-300 border-slate-500/30",
    icon: "Note",
    description: "Waiting for admin review",
  },
  screening_available: {
    label: "Training Available",
    humanMessage: "Training Available",
    color: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    icon: "Learn",
    description: "Complete training to proceed",
  },
  inactive: {
    label: "Suspended",
    humanMessage: "Account Suspended",
    color: "bg-red-500/20 text-red-300 border-red-500/30",
    icon: "Paused",
    description: "Account suspended",
  },
};

const JOURNEY_STEPS = [
  "applied",
  "screening_unlocked",
  "training_viewed",
  "ready_to_work",
  "assigned",
  "working",
];

// PATCH_102: RLHF workflow steps (visually distinct from Microjob)
const RLHF_JOURNEY_STEPS = [
  "applied",
  "screening_unlocked",
  "training_viewed",
  "ready_to_work",
  "assigned",
  "working",
];

// PATCH_102: Screening status mapping for clear indicator
const SCREENING_STATUS_MAP: Record<string, { label: string; phase: string }> = {
  applied: { label: "Pending Approval", phase: "required" },
  screening_unlocked: { label: "Training Available", phase: "required" },
  screening_available: { label: "Training Available", phase: "required" },
  training_viewed: { label: "Ready for Test", phase: "in_progress" },
  test_submitted: { label: "Submitted — Awaiting Result", phase: "submitted" },
  screening_passed: { label: "Approved", phase: "approved" },
  ready_to_work: { label: "Approved — Ready to Work", phase: "approved" },
  failed: { label: "Awaiting admin reset", phase: "failed" },
};

// PATCH_49: Tab configuration
const TABS: { key: WorkspaceTab; label: string; icon: string }[] = [
  { key: "applications", label: "Applications", icon: "Apps" },
  { key: "screenings", label: "Screenings", icon: "Tests" },
  { key: "projects", label: "Projects", icon: "Work" },
];

// PATCH_49: Smart default tab determination
function determineDefaultTab(applications: JobApplication[]): WorkspaceTab {
  // Priority 1: Any job in screening state
  const hasScreeningState = applications.some(hasActiveScreening);
  if (hasScreeningState) return "screenings";

  // Priority 2: Any job with active project
  const hasActiveProject = applications.some(
    (app) => app.assignedProjects?.length || app.workerStatus === "assigned" || app.workerStatus === "working",
  );
  if (hasActiveProject) return "projects";

  // Default: Applications tab
  return "applications";
}

// PATCH_49: CTA button logic
function getStatusCTA(app: JobApplication): {
  text: string;
  action: string | null;
  href?: string;
  disabled?: boolean;
} {
  const { required, passed, next } = screeningProgress(app);
  const totalRequired = required.length;
  const passedCount = required.filter(test => passed.has(test._id)).length;

  switch (app.workerStatus) {
    case "applied":
      return {
        text: "Waiting for Admin Approval",
        action: null,
        disabled: true,
      };
    case "screening_unlocked":
      return { text: "Start Training", action: "training", href: undefined };
    case "training_viewed":
      return {
        text:
          totalRequired > 1
            ? `Take Screening Test (${passedCount}/${totalRequired} passed)`
            : "Take Screening Test",
        action: "test",
        href: next ? `/workspace/screening/${next._id}?position=${app._id}` : undefined,
      };
    case "test_submitted":
      return { text: "Awaiting Result", action: null, disabled: true };
    case "failed":
      return {
        text: "Waiting for Admin Reset",
        action: null,
        disabled: true,
      };
    case "ready_to_work":
      return {
        text: "Waiting For Project Assignment",
        action: null,
        disabled: true,
      };
    case "assigned":
      return {
        text: "Open Project",
        action: "project",
        href: app.assignedProjects?.[0]
          ? `/workspace/project/${app.assignedProjects[0]._id}`
          : "/workspace/projects",
      };
    case "working":
      return {
        text: "Submit Work",
        action: "submit",
        href: app.assignedProjects?.[0]
          ? `/workspace/project/${app.assignedProjects[0]._id}`
          : "/workspace/projects",
      };
    case "suspended":
      return { text: "Account Suspended", action: null, disabled: true };
    case "fresh":
    case "screening_available":
      return {
        text: "Start Training",
        action: "training",
        href: "/workspace",
      };
    case "inactive":
      return { text: "Inactive", action: null, disabled: true };
    default:
      return {
        text: "View Details",
        action: "details",
        href: "/open-roles",
      };
  }
}

// PATCH_49: Enhanced JobCard component
function JobCard({
  app,
  onViewTrainingComplete,
}: {
  app: JobApplication;
  onViewTrainingComplete?: () => void;
}) {
  const status = STATUS_CONFIG[app.workerStatus] || STATUS_CONFIG.applied;
  const currentStepIdx = JOURNEY_STEPS.indexOf(app.workerStatus);
  const cta = getStatusCTA(app);
  const { next } = screeningProgress(app);
  const unlocked = app.workerStatus === "screening_unlocked" || app.workerStatus === "screening_available";
  const [trainingViewed, setTrainingViewed] = useState(false);
  const { toast } = useToast();
  const [markingViewed, setMarkingViewed] = useState(false);

  // PATCH_49: Mark training as viewed via API
  const handleViewTraining = async () => {
    setMarkingViewed(true);
    try {
      await apiRequest(
        `/api/workspace/application/${app._id}/mark-training-viewed`,
        "PUT",
        null,
        true,
      );
      setTrainingViewed(true);
      onViewTrainingComplete?.();
      toast("Training marked as completed", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Training could not be saved. Please try again.", "error");
    } finally {
      setMarkingViewed(false);
    }
  };

  return (
    <div className="card overflow-hidden">
      {/* Header with gradient accent */}
      <div
        className={`-mx-4 -mt-4 px-4 py-3 mb-4 ${status.color.replace("/20", "/10")}`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${status.color}`}
            >
              {status.icon}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{app.positionTitle}</h3>
              <p className="text-sm text-slate-400">{app.category}</p>
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border ${status.color}`}
          >
            {app.roleArchived ? "Archived role" : status.humanMessage}
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex flex-wrap gap-4 mb-4 text-center">
        <div className="flex-1 min-w-[80px]">
          <p className="text-xl font-bold text-emerald-400">
            ${app.totalEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400">Earned</p>
        </div>
        <div className="flex-1 min-w-[80px]">
          <p className="text-xl font-bold text-amber-400">
            ${app.pendingEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400">Pending</p>
        </div>
        {!app.roleArchived && (app.workerStatus === "failed" ||
          app.workerStatus === "screening_unlocked" ||
          app.workerStatus === "training_viewed") && (
          <div className="flex-1 min-w-[80px]">
            <p className="text-xl font-bold text-purple-400">
              {app.maxAttempts - app.attemptCount}/{app.maxAttempts}
            </p>
            <p className="text-xs text-slate-400">Attempts Left</p>
          </div>
        )}
      </div>

      {/* Progress Tracker */}
      {!app.roleArchived && <div className="mb-4 px-2">
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {JOURNEY_STEPS.map((step, idx) => {
            const stepConfig = STATUS_CONFIG[step];
            const isCompleted = idx < currentStepIdx;
            const isCurrent = step === app.workerStatus;
            const isFailed = app.workerStatus === "failed" && idx === 2;

            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      isCompleted
                        ? "bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500"
                        : isCurrent
                          ? `${stepConfig.color} border-2`
                          : isFailed
                            ? "bg-red-500/20 text-red-400 border-2 border-red-500"
                            : "bg-slate-800 text-slate-500 border border-slate-700"
                    }`}
                  >
                    {isCompleted ? "✓" : stepConfig?.icon || "•"}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 text-center max-w-[60px] truncate">
                    {stepConfig?.label || step}
                  </span>
                </div>
                {idx < JOURNEY_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      isCompleted ? "bg-emerald-500" : "bg-slate-700"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>}
      {/* Admin Message */}
      {app.adminMessage && (
        <div className="mb-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <p className="text-sm text-blue-300">
            <span className="font-medium">Admin Message:</span>{" "}
            {app.adminMessage}
          </p>
        </div>
      )}

      {/* Dynamic Action Area */}
      <div className="border-t border-white/10 pt-4">
        {app.roleArchived ? <p className="text-sm text-slate-400">This role has closed. Your application, assignments and earnings remain in your workspace.</p> : <>
        {/* Training Materials Section - Show when screening_unlocked */}
        {unlocked &&
          !trainingViewed &&
          app.trainingMaterials &&
          app.trainingMaterials.length > 0 && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 rounded-xl p-4 border border-amber-500/20">
                <h4 className="font-medium text-amber-300 mb-2 flex items-center gap-2">
                  Training Materials
                  <span className="text-xs bg-amber-500/30 px-2 py-0.5 rounded-full">
                    Required
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  Review all materials before taking the test
                </p>
                <div className="space-y-2">
                  {app.trainingMaterials.map((m, i) => (
                    <a
                      key={i}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-amber-200 hover:text-amber-100 p-2 rounded-lg hover:bg-amber-500/10 transition"
                    >
                      {m.type === "video" && "Video"}
                      {m.type === "pdf" && "PDF"}
                      {m.type === "link" && "Link"}
                      <span className="flex-1">{m.title}</span>
                      <span className="text-xs text-slate-500">→</span>
                    </a>
                  ))}
                </div>
              </div>
              <button
                onClick={handleViewTraining}
                disabled={markingViewed}
                className="w-full btn-primary disabled:opacity-50"
              >
                {markingViewed ? "Saving..." : "I've Completed Training"}
              </button>
            </div>
          )}

        {/* No Training Materials - Skip directly to test when screening_unlocked */}
        {unlocked &&
          !trainingViewed &&
          (!app.trainingMaterials || app.trainingMaterials.length === 0) && (
            <div className="space-y-4">
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20">
                <h4 className="font-medium text-emerald-300 mb-2 flex items-center gap-2">
                  No Training Required
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  You can proceed directly to the screening test
                </p>
              </div>
              <button
                onClick={handleViewTraining}
                disabled={markingViewed}
                className="w-full btn-primary disabled:opacity-50"
              >
                {markingViewed ? "Saving..." : "Proceed to Test"}
              </button>
            </div>
          )}

        {/* Failed - Show training again + retry */}
        {app.workerStatus === "failed" &&
          app.maxAttempts - app.attemptCount > 0 &&
          app.trainingMaterials &&
          app.trainingMaterials.length > 0 && (
            <div className="space-y-4">
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20">
                <h4 className="font-medium text-red-300 mb-2">
                  Test Failed - Review Materials
                </h4>
                <p className="text-xs text-slate-400 mb-3">
                  Review the training materials again before retrying
                </p>
                <div className="space-y-2">
                  {app.trainingMaterials.map((m, i) => (
                    <a
                      key={i}
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-red-200 hover:text-red-100 p-2 rounded-lg hover:bg-red-500/10 transition"
                    >
                      {m.type === "video" && "Video"}
                      {m.type === "pdf" && "PDF"}
                      {m.type === "link" && "Link"}
                      <span className="flex-1">{m.title}</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

        {/* Take Test Button - Show after training viewed */}
        {((unlocked && trainingViewed) ||
          app.workerStatus === "training_viewed") &&
          next && (
            <div className="text-center space-y-3">
              <p className="text-sm text-slate-400">
                You have {app.maxAttempts - app.attemptCount} attempt
                {app.maxAttempts - app.attemptCount !== 1 ? "s" : ""} remaining
              </p>
              <Link
                href={`/workspace/screening/${next._id}?position=${app._id}`}
                className="btn-primary inline-flex items-center gap-2"
              >
                Take Screening Test
              </Link>
              <p className="text-xs text-slate-500">
                Time: {next.timeLimit} min • Pass:{" "}
                {next.passingScore}%
              </p>
            </div>
          )}

        {app.workerStatus === "training_viewed" && !next && (
          <p className="text-sm text-slate-300">There is no screening available to start. Your admin can check this role’s assessments.</p>
        )}

        {/* Primary CTA Button for other statuses */}
        {!unlocked && app.workerStatus !== "training_viewed" && (
            <div className="text-center">
              {cta.href ? (
                <Link
                  href={cta.href}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition ${
                    cta.disabled
                      ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                      : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                  }`}
                >
                  {cta.text}
                </Link>
              ) : (
                <div
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium ${
                    cta.disabled
                      ? "bg-slate-700/50 text-slate-400"
                      : "bg-slate-700 text-slate-300"
                  }`}
                >
                  {cta.text}
                </div>
              )}

              {/* Additional context for waiting states */}
              {app.workerStatus === "applied" && (
                <p className="text-xs text-slate-500 mt-3">
                  An admin will review your application soon
                </p>
              )}
              {app.workerStatus === "test_submitted" && (
                <p className="text-xs text-slate-500 mt-3">
                  Your test is being reviewed by an admin
                </p>
              )}
              {app.workerStatus === "ready_to_work" && (
                <p className="text-xs text-slate-500 mt-3">
                  You&apos;re approved! Waiting for a project assignment
                </p>
              )}
            </div>
          )}

        {/* Failed - No attempts left */}
        {app.workerStatus === "failed" &&
          app.maxAttempts - app.attemptCount <= 0 && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-medium bg-slate-700/50 text-slate-400">
                Waiting for Admin Reset
              </div>
              <div className="mt-3">
                <p className="text-xs text-slate-500 mb-2">
                  Contact admin to reset your attempts
                </p>
                <Link
                  href="/support"
                  className="text-sm text-blue-400 hover:text-blue-300"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          )}

        </>}
        {/* Active Projects */}
        {app.assignedProjects.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10">
              <h4 className="font-medium mb-3 text-sm">Active Projects</h4>
              <div className="space-y-2">
                {app.assignedProjects.map((p) => (
                  <Link
                    key={p._id}
                    href={`/workspace/project/${p._id}`}
                    className="block p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{p.title}</p>
                        <p className="text-xs text-slate-400">
                          ${p.payRate} / {p.payType}
                        </p>
                      </div>
                      <span className="text-blue-400 text-sm">Open →</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        {/* Completed Projects Count */}
        {app.completedProjects.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Completed: {app.completedProjects.length} project
              {app.completedProjects.length !== 1 ? "s" : ""}
            </span>
            <span className="text-xs text-emerald-400">
              Earned: ${app.totalEarnings.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// PATCH_49: Applications Tab Content
function ApplicationsTab({
  applications,
  onRefresh,
}: {
  applications: JobApplication[];
  onRefresh: () => void;
}) {
  const archivedApps = applications.filter(app => app.roleArchived);
  const openApps = applications.filter(app => !app.roleArchived);
  const pendingApps = openApps.filter(
    (a) => a.applicationStatus === "pending",
  );
  const approvedApps = openApps.filter(
    (a) => a.applicationStatus === "approved",
  );
  const rejectedApps = openApps.filter(
    (a) => a.applicationStatus === "rejected",
  );

  return (
    <div className="space-y-6">
      {/* Pending Applications */}
      {pendingApps.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            Pending Review ({pendingApps.length})
          </h3>
          <div className="space-y-4">
            {pendingApps.map((app) => (
              <JobCard
                key={app._id}
                app={app}
                onViewTrainingComplete={onRefresh}
              />
            ))}
          </div>
        </div>
      )}

      {/* Approved Applications */}
      {approvedApps.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            Active Jobs ({approvedApps.length})
          </h3>
          <div className="space-y-4">
            {approvedApps.map((app) => (
              <JobCard
                key={app._id}
                app={app}
                onViewTrainingComplete={onRefresh}
              />
            ))}
          </div>
        </div>
      )}

      {/* Rejected Applications */}
      {rejectedApps.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            Rejected ({rejectedApps.length})
          </h3>
          <div className="space-y-4 opacity-60">
            {rejectedApps.map((app) => (
              <JobCard key={app._id} app={app} />
            ))}
          </div>
        </div>
      )}

      {archivedApps.length > 0 && <section>
        <h3 className="mb-3 text-lg font-semibold">Application history ({archivedApps.length})</h3>
        <div className="space-y-4">{archivedApps.map(app => <JobCard key={app._id} app={app} />)}</div>
      </section>}
      {applications.length === 0 && (
        <EmptyState
          icon="List"
          title="You haven't applied to any work yet"
          description="Browse available work positions to find opportunities that match your skills. Start earning today!"
          ctaText="Apply to Work"
          ctaHref="/open-roles"
          secondaryCtaText="Learn More"
          secondaryCtaHref="/how-it-works"
        />
      )}
    </div>
  );
}

// PATCH_49 + PATCH_89: Screenings Tab Content with multi-screening support
function ScreeningsTab({
  applications,
  onRefresh,
}: {
  applications: JobApplication[];
  onRefresh: () => void;
}) {
  // Filter applications that are in screening-related states
  const screeningApps = applications.filter(hasActiveScreening);

  const allCompletedScreenings = applications.flatMap(app => {
    const { required } = screeningProgress(app);
    return (app.screeningsCompleted || []).map(attempt => ({
      ...attempt,
      screeningTitle: required.find(test => test._id === attempt.screeningId)?.title || "Screening test",
      jobTitle: app.positionTitle,
      outcome: screeningOutcome(attempt),
    }));
  });

  // Sort by most recent first
  allCompletedScreenings.sort(
    (a, b) =>
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );

  return (
    <div className="space-y-6">
      {/* Active Screenings Section */}
      {screeningApps.length > 0 && (
        <>
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-xl p-4 border border-amber-500/20">
            <p className="text-sm text-amber-200">
              <strong>Complete your screenings</strong> to unlock work
              opportunities. Review training materials carefully before taking
              tests.
            </p>
          </div>
          <div className="space-y-4">
            {screeningApps.map((app) => {
              const { required: allScreenings, passed: passedIds, pending, canTake } = screeningProgress(app);
              const passedCount = allScreenings.filter(test => passedIds.has(test._id)).length;

              return (
                <div key={app._id} className="space-y-3">
                  <JobCard app={app} onViewTrainingComplete={onRefresh} />

                  {/* Multi-screening progress panel */}
                  {allScreenings.length > 1 && (
                    <div className="ml-4 p-4 rounded-xl border border-purple-500/20 bg-purple-500/5">
                      <h4 className="text-sm font-semibold text-purple-300 mb-3">
                        Required Screening Tests ({passedCount}/
                        {allScreenings.length} passed)
                      </h4>
                      <div className="space-y-2">
                        {allScreenings.map((s) => {
                          const passed = passedIds.has(s._id);
                          return (
                            <div
                              key={s._id}
                              className={`flex items-center justify-between p-3 rounded-lg border ${
                                passed
                                  ? "border-emerald-500/30 bg-emerald-500/10"
                                  : "border-white/10 bg-white/5"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-lg">
                                  {passed ? "OK" : "..."}
                                </span>
                                <div>
                                  <p className="text-sm font-medium">
                                    {s.title}
                                  </p>
                                  <p className="text-xs text-slate-400">
                                    Passing: {s.passingScore}% • Time:{" "}
                                    {s.timeLimit}min
                                  </p>
                                </div>
                              </div>
                              {passed ? (
                                <span className="text-xs text-emerald-400 font-semibold">
                                  PASSED
                                </span>
                              ) : canTake(s) ? (
                                <Link
                                  href={`/workspace/screening/${s._id}?position=${app._id}`}
                                  className="px-3 py-1 text-xs rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition font-medium"
                                >
                                  Take Test →
                                </Link>
                              ) : (
                                <span className="text-xs text-slate-300">
                                  {pending.has(s._id) ? "Awaiting review" : s.active === false ? "Unavailable" : "Locked"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Completed Screenings History Section */}
      {allCompletedScreenings.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-xl">History</span>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Screening History
              </h3>
              <p className="text-xs text-slate-400">
                {allCompletedScreenings.length} screening test
                {allCompletedScreenings.length !== 1 ? "s" : ""} completed
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {allCompletedScreenings.map((sc, idx) => (
              <div
                key={`${sc.screeningId}-${idx}`}
                className={`p-4 rounded-xl border ${
                  sc.outcome === "Passed"
                    ? "border-emerald-500/20 bg-emerald-500/5"
                    : sc.outcome === "Failed" ? "border-red-500/20 bg-red-500/5" : "border-slate-500/30"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-2xl">{sc.outcome === "Passed" ? "✓" : sc.outcome === "Failed" ? "×" : "…"}</span>
                    <div className="flex-1">
                      <p className="font-medium text-white">
                        {sc.screeningTitle}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Position: {sc.jobTitle}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {new Date(sc.completedAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-2xl font-bold ${
                        sc.outcome === "Passed" ? "text-emerald-400" : sc.outcome === "Failed" ? "text-red-400" : "text-slate-300"
                      }`}
                    >
                      {sc.outcome !== "Awaiting review" && sc.score != null ? `${sc.score}%` : ""}
                    </p>
                    <p
                      className={`text-xs font-semibold ${
                        sc.outcome === "Passed" ? "text-emerald-400" : sc.outcome === "Failed" ? "text-red-400" : "text-slate-300"
                      }`}
                    >
                      {sc.outcome}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State - only show if no active OR completed screenings */}
      {screeningApps.length === 0 && allCompletedScreenings.length === 0 && (
        <EmptyState
          icon="Info"
          title="No Screenings Yet"
          description="Apply to positions to unlock screening tests. Pass the screening to become an approved worker!"
          ctaText="Apply to New Position"
          ctaHref="/open-roles"
          secondaryCtaText="View Applications"
          secondaryCtaHref="/workspace"
        />
      )}
    </div>
  );
}

// PATCH_49: Projects Tab Content
function ProjectsTab({ applications }: { applications: JobApplication[] }) {
  const readyApps = applications.filter(
    (a) => !a.roleArchived && a.workerStatus === "ready_to_work",
  );

  // Collect all assigned projects
  const allProjects = applications.flatMap((a) => a.assignedProjects);
  const allCompleted = applications.flatMap((a) => a.completedProjects);

  return (
    <div className="space-y-6">
      {/* Active Projects */}
      {allProjects.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            Active Projects ({allProjects.length})
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            {allProjects.map((project) => (
              <Link
                key={project._id}
                href={`/workspace/project/${project._id}`}
                className="p-4 rounded-xl border border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition"
              >
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="font-medium">{project.title}</h4>
                  {/* PATCH_97: Project type badge */}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      (project as any).projectType === "rlhf_dataset"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-slate-500/20 text-slate-300"
                    }`}
                  >
                    {(project as any).projectType === "rlhf_dataset"
                      ? "AI Dataset"
                      : "Microjob"}
                  </span>
                </div>
                {project.description && (
                  <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                    {project.description}
                  </p>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-400">
                    ${project.payRate} / {project.payType}
                  </span>
                  <span className="text-sm text-blue-400">Open →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Ready to Work - Waiting for assignment */}
      {readyApps.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            Ready for Projects ({readyApps.length})
          </h3>
          <div className="space-y-3">
            {readyApps.map((app) => (
              <div
                key={app._id}
                className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{app.positionTitle}</h4>
                    <p className="text-sm text-slate-400">{app.category}</p>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full text-sm">
                    Waiting for Assignment
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Projects */}
      {allCompleted.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="text-green-400">Done</span> Completed (
            {allCompleted.length})
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {allCompleted.slice(0, 6).map((project, idx) => (
              <div
                key={project._id || idx}
                className="p-3 rounded-xl border border-green-500/20 bg-green-500/5"
              >
                <p className="font-medium text-sm">
                  {project.title || "Project"}
                </p>
                <p className="text-xs text-emerald-400">
                  Earned: ${(project.earningsCredited ?? project.earnings ?? 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
          {allCompleted.length > 6 && (
            <Link
              href="/workspace/projects"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View all {allCompleted.length} completed projects →
            </Link>
          )}
        </div>
      )}

      {allProjects.length === 0 && allCompleted.length === 0 && readyApps.length === 0 && (
        <EmptyState
          icon="Work"
          title="No Projects Yet"
          description="Complete your screenings to become eligible for project assignments."
          ctaText="View Screenings"
          ctaHref="/workspace"
        />
      )}
    </div>
  );
}

export default function WorkspacePage() {
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("applications");
  const [retrying, setRetrying] = useState(false);
  const { toast } = useToast();

  const loadData = async (showToast = true) => {
    setLoading(true);
    setError("");
    try {
      const response = await apiRequest<WorkspaceData>(
        "/api/workspace/profile",
        "GET",
        null,
        true,
      );
      setData(response);

      // PATCH_49: Smart default tab
      if (response.applications && response.applications.length > 0) {
        const defaultTab = determineDefaultTab(response.applications);
        setActiveTab(defaultTab);
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load workspace";
      setError(msg);
      if (showToast) toast(msg, "error");
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  };

  const handleRetry = () => {
    setRetrying(true);
    loadData(true);
  };

  useEffect(() => {
    loadData(false);
  }, []);

  // Normalize applications
  const applications = useMemo(() => {
    if (!data?.applications) return [];
    return data.applications;
  }, [data]);

  // Tab counts for badges
  const tabCounts = useMemo(() => {
    const screeningCount = applications.filter(hasActiveScreening).length;

    const projectCount = applications.reduce((total, a) => total + a.assignedProjects.length, 0);

    return {
      applications: applications.length,
      screenings: screeningCount,
      projects: projectCount,
    };
  }, [applications]);

  // PATCH_86: Check if worker can access projects tab
  // Worker needs at least one job with ready_to_work status or higher (assigned, working)
  const canAccessProjects = useMemo(() => {
    return applications.some(
      (a) =>
        a.assignedProjects.length > 0 || a.completedProjects.length > 0 ||
        (!a.roleArchived && ["ready_to_work", "assigned", "working"].includes(a.workerStatus)),
    );
  }, [applications]);

  if (loading) {
    return (
      <div className="u-container max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <EmojiWorkspace /> Workspace
          </h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">Work & Earn</p>
        </div>
        <div className="card animate-pulse">
          <div className="h-20 rounded-xl bg-white/10" />
        </div>
      </div>
    );
  }

  // PATCH_49: Error state with retry button (no silent failures)
  if (error) {
    return (
      <div className="u-container max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <EmojiWorkspace /> Workspace
          </h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">Work & Earn</p>
        </div>
        <div className="card text-center py-8">
          <div className="text-5xl mb-4">!</div>
          <h2 className="text-xl font-semibold text-red-300 mb-2">
            Something went wrong
          </h2>
          <p className="text-slate-400 mb-6">{error}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition disabled:opacity-50"
            >
              {retrying ? "Retrying..." : "Retry"}
            </button>
            <Link
              href="/dashboard"
              className="px-4 py-2 bg-slate-500/20 text-slate-300 rounded-lg hover:bg-slate-500/30 transition"
            >
              Go Home
            </Link>
            <Link
              href="/support"
              className="px-4 py-2 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // No workspace profile - prompt to apply
  if (!data?.hasProfile) {
    return (
      <div className="u-container max-w-6xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <EmojiWorkspace /> Workspace
          </h1>
          <p className="mt-2 text-sm text-[#9CA3AF]">Work & Earn</p>
        </div>
        <EmptyState
          icon="Work"
          title="No Workspace Profile"
          description="Apply to a work position to get started. Complete screenings, get assigned projects, and earn money."
          ctaText="Browse Work Positions"
          ctaHref="/open-roles"
        />
      </div>
    );
  }

  const stats = data.stats;

  return (
    <div className="u-container max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <EmojiWorkspace /> Workspace
        </h1>
        <p className="mt-2 text-sm text-[#9CA3AF]">Work & Earn</p>
      </div>

      {/* PATCH_76: Enhanced Stats Overview with earnings breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="card text-center">
          <p className="text-2xl font-bold text-emerald-400">
            ${stats.totalEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400">Total Earnings</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-blue-400">
            ${(stats.workEarnings || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-400">Work Earnings</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-purple-400">
            ${(stats.affiliateEarnings || 0).toFixed(2)}
          </p>
          <p className="text-xs text-slate-400">Affiliate Earnings</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-amber-400">
            ${stats.pendingEarnings.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400">Pending</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold text-cyan-400">
            {stats.projectsCompleted}
          </p>
          <p className="text-xs text-slate-400">Projects Done</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 flex gap-3 flex-wrap">
        <Link href="/open-roles" className="btn-primary">
          + Apply to New Position
        </Link>
        <Link href="/workspace/my-proofs" className="btn-secondary">
          My Proofs
        </Link>
        <Link href="/wallet" className="btn-secondary">
          Wallet
        </Link>
      </div>

      {/* PATCH_49: Tab Navigation */}
      {/* PATCH_86: Projects tab locked until screening passed */}
      <div className="mb-6">
        <div className="flex border-b border-white/10">
          {TABS.map((tab) => {
            const isProjectsLocked =
              tab.key === "projects" && !canAccessProjects;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  if (isProjectsLocked) {
                    // Show toast explaining why locked
                    toast(
                      applications.every(a => a.roleArchived) ? "Current and completed assignments appear here." : "Complete your screening test to access projects",
                      "info",
                    );
                    return;
                  }
                  setActiveTab(tab.key);
                }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                  isProjectsLocked
                    ? "text-slate-500 cursor-not-allowed"
                    : activeTab === tab.key
                      ? "text-white"
                      : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>{isProjectsLocked ? "Lock" : tab.icon}</span>
                <span>{tab.label}</span>
                {isProjectsLocked && (
                  <span className="ml-1 text-xs text-amber-400">(Locked)</span>
                )}
                {!isProjectsLocked && tabCounts[tab.key] > 0 && (
                  <span
                    className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.key
                        ? "bg-blue-500/30 text-blue-200"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {tabCounts[tab.key]}
                  </span>
                )}
                {activeTab === tab.key && !isProjectsLocked && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === "applications" && (
          <ApplicationsTab
            applications={applications}
            onRefresh={() => loadData(false)}
          />
        )}
        {activeTab === "screenings" && (
          <ScreeningsTab
            applications={applications}
            onRefresh={() => loadData(false)}
          />
        )}
        {activeTab === "projects" && (
          <ProjectsTab applications={applications} />
        )}
      </div>
    </div>
  );
}
