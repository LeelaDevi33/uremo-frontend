"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";

/**
 * PATCH_60/61: Worker Pipeline Card
 * Shows worker information with inline actions based on current status
 * PATCH_61: Links to Worker 360° Control Page
 */

export interface WorkerData {
  _id: string;
  applicationId: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    name?: string;
  };
  jobId?: {
    _id: string;
    title: string;
    hasScreening?: boolean;
    screeningId?: string;
  };
  position?: {
    _id: string;
    title: string;
  };
  positionTitle?: string;
  workerStatus: string;
  status: string; // application status: pending, approved, rejected
  totalEarnings?: number;
  pendingEarnings?: number;
  attemptCount?: number;
  maxAttempts?: number;
  createdAt: string;
  updatedAt?: string;
  currentProject?: {
    _id: string;
    title: string;
    status: string;
  };
  pendingProof?: {
    _id: string;
    status: string;
    submissionText?: string;
  };
}

interface WorkerPipelineCardProps {
  worker: WorkerData;
  onAction: (action: string, workerId: string, data?: any) => void;
  actionLoading?: string | null;
}

// Human-readable status labels
const STATUS_LABELS: Record<string, string> = {
  applied: "Applied",
  screening_unlocked: "Screening Unlocked",
  training_viewed: "Training Viewed",
  test_submitted: "Test Submitted",
  failed: "Failed Screening",
  ready_to_work: "Ready to Work",
  assigned: "Assigned",
  working: "Working",
  suspended: "Suspended",
  inactive: "Inactive",
};

// Status-specific colors
const STATUS_COLORS: Record<string, string> = {
  applied: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  screening_unlocked: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  training_viewed: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  test_submitted: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  failed: "bg-red-500/20 text-red-300 border-red-500/30",
  ready_to_work: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  assigned: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  working: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  suspended: "bg-red-500/20 text-red-300 border-red-500/30",
  inactive: "bg-slate-500/20 text-slate-300 border-slate-500/30",
};

export default function WorkerPipelineCard({
  worker,
  onAction,
  actionLoading,
}: WorkerPipelineCardProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  // More robust name extraction with multiple fallbacks
  const workerName = (() => {
    if (!worker.userId) return "Unknown Worker";

    const { firstName, lastName, email, name } = worker.userId;

    // Try first + last name
    const fullName = `${firstName || ""} ${lastName || ""}`.trim();
    if (fullName) return fullName;

    // Try name field
    if (name && name.trim()) return name.trim();

    // Try email username
    if (email) return email.split("@")[0];

    return "Unknown Worker";
  })();

  const workerEmail = worker.userId?.email || "No email";
  const jobTitle =
    worker.positionTitle ||
    worker.position?.title ||
    worker.jobId?.title ||
    "No Position";
  const jobId = worker.position?._id || worker.jobId?._id || null;
  const workerStatus = worker.workerStatus || "applied";

  const getLastActionTime = () => {
    const date = worker.updatedAt || worker.createdAt;
    if (!date) return "N/A";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const isLoading = actionLoading === worker.applicationId;

  // Render action buttons based on worker status
  const renderActions = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-2">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    switch (workerStatus) {
      case "applied":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => onAction("approve", worker.applicationId)}
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg transition-colors"
            >
              ✓ Approve
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-lg transition-colors"
            >
              ✗ Reject
            </button>
          </div>
        );

      case "screening_unlocked":
      case "training_viewed":
        return (
          <div className="text-xs text-slate-400 text-center py-1">
            Waiting for screening completion
          </div>
        );

      case "test_submitted":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => onAction("mark_passed", worker.applicationId)}
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg transition-colors"
            >
              ✓ Pass
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-lg transition-colors"
            >
              ✗ Fail
            </button>
          </div>
        );

      case "ready_to_work":
        return (
          <button
            onClick={() => onAction("assign_project", worker.applicationId)}
            className="w-full px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Assign Project
          </button>
        );

      case "assigned":
        // PATCH-66: If assigned but no project, show fix options
        if (!worker.currentProject) {
          return (
            <div className="flex gap-2">
              <button
                onClick={() => onAction("assign_project", worker.applicationId)}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Assign
              </button>
              <button
                onClick={() => onAction("reset_to_ready", worker.applicationId)}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-amber-600/50 hover:bg-amber-600 text-white rounded-lg transition-colors"
                title="Reset worker to Ready to Work status"
              >
                Reset
              </button>
            </div>
          );
        }
        return (
          <button
            onClick={() => onAction("view_project", worker.applicationId)}
            className="w-full px-3 py-1.5 text-xs font-medium bg-slate-600/50 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            View Project
          </button>
        );

      case "working":
        return worker.pendingProof ? (
          <div className="flex gap-2">
            <button
              onClick={() =>
                onAction("approve_proof", worker.applicationId, {
                  proofId: worker.pendingProof?._id,
                })
              }
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg transition-colors"
            >
              ✓ Approve & Credit
            </button>
            <button
              onClick={() =>
                onAction("reject_proof", worker.applicationId, {
                  proofId: worker.pendingProof?._id,
                })
              }
              className="flex-1 px-3 py-1.5 text-xs font-medium bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-lg transition-colors"
            >
              ✗ Reject
            </button>
          </div>
        ) : (
          <div className="text-xs text-slate-400 text-center py-1">
            In progress - awaiting proof
          </div>
        );

      case "failed":
        return (
          <button
            onClick={() => onAction("reset_attempts", worker.applicationId)}
            className="w-full px-3 py-1.5 text-xs font-medium bg-amber-600/50 hover:bg-amber-600 text-white rounded-lg transition-colors"
          >
            Reset & Allow Retry
          </button>
        );

      case "suspended":
        return (
          <button
            onClick={() => onAction("reactivate", worker.applicationId)}
            className="w-full px-3 py-1.5 text-xs font-medium bg-blue-600/50 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            ✓ Reactivate
          </button>
        );

      default:
        return null;
    }
  };

  // Render status indicators
  const renderIndicators = () => {
    const indicators = [];

    // PATCH-65.1: Show project binding warning if assigned but no project visible
    if (
      (workerStatus === "assigned" || workerStatus === "working") &&
      !worker.currentProject
    ) {
      indicators.push(
        <span
          key="no-project-warning"
          className="px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-300 rounded flex items-center gap-1"
          title="Worker is assigned but no project is visible - data inconsistency"
        >
          ⚠️ No Project
        </span>,
      );
    }

    // PATCH-65.1: Show current project if exists
    if (worker.currentProject) {
      indicators.push(
        <span
          key="project"
          className="px-1.5 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-300 rounded truncate max-w-[120px]"
          title={worker.currentProject.title}
        >
          Proj: {worker.currentProject.title}
        </span>,
      );
    }

    if (workerStatus === "test_submitted") {
      indicators.push(
        <span
          key="screening"
          className="px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 rounded"
        >
          Review Test
        </span>,
      );
    }

    if (worker.pendingProof) {
      indicators.push(
        <span
          key="proof"
          className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 rounded"
        >
          Proof Pending
        </span>,
      );
    }

    if ((worker.totalEarnings || 0) > 0 && (worker.pendingEarnings || 0) > 0) {
      indicators.push(
        <span
          key="payment"
          className="px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-300 rounded"
        >
          Payment Due
        </span>,
      );
    }

    return indicators.length > 0 ? (
      <div className="flex flex-wrap gap-1 mt-2">{indicators}</div>
    ) : null;
  };

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="p-3 bg-slate-800/50 rounded-xl border border-white/5 hover:border-white/10 transition-all"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <Link
              href={`/admin/workforce/${worker.applicationId}`}
              className="font-medium text-sm text-white truncate hover:text-cyan-400 transition-colors block"
            >
              {workerName}
            </Link>
            <p className="text-xs text-slate-400 truncate">{workerEmail}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span
              className={`shrink-0 px-2 py-0.5 text-[10px] font-medium rounded-full border ${
                STATUS_COLORS[workerStatus] || STATUS_COLORS.applied
              }`}
            >
              {STATUS_LABELS[workerStatus] || workerStatus}
            </span>
            <Link
              href={`/admin/workforce/${worker.applicationId}`}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View Details →
            </Link>
          </div>
        </div>

        {/* Job & Time - PATCH_61: Link to Job Role */}
        <div className="flex items-center justify-between text-xs mb-2">
          {jobId ? (
            <Link
              href={`/admin/work-positions/${jobId}`}
              className="text-slate-300 truncate max-w-[60%] hover:text-cyan-400 transition-colors"
            >
              {jobTitle} →
            </Link>
          ) : (
            <span className="text-slate-300 truncate max-w-[60%]">
              {jobTitle}
            </span>
          )}
          <span className="text-slate-400 shrink-0">{getLastActionTime()}</span>
        </div>

        {/* Indicators */}
        {renderIndicators()}

        {/* Actions */}
        <div className="mt-3 pt-2 border-t border-white/5">
          {renderActions()}
        </div>
      </motion.div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-xl p-5 w-full max-w-sm border border-white/10">
            <h3 className="font-semibold text-white mb-3">
              {workerStatus === "test_submitted"
                ? "Fail Screening"
                : "Reject Application"}
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (required)..."
              className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm resize-none h-24 focus:outline-none focus:border-blue-500"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="flex-1 px-4 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectReason.trim()) {
                    onAction(
                      workerStatus === "test_submitted"
                        ? "mark_failed"
                        : "reject",
                      worker.applicationId,
                      { reason: rejectReason },
                    );
                    setShowRejectModal(false);
                    setRejectReason("");
                  }
                }}
                disabled={!rejectReason.trim()}
                className="flex-1 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
