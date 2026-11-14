"use client";

import { workerIdentity } from "./[workerId]/workerIdentity";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/api";
import { approveWorkerProof } from "./reviewProof";
import { useToast } from "@/hooks/useToast";
import {
  WorkerPipelineBoard,
  PendingActionQueue,
  WorkerTimelineModal,
  WorkerActionPanel,
  WorkerData,
  PendingApplication,
  PendingProof,
  PendingCredit,
} from "@/components/workforce";

/**
 * PATCH_60: Workforce Control Center
 *
 * THE SINGLE SOURCE OF TRUTH for all worker lifecycle operations.
 *
 * Tabs:
 * 1. Pipeline - Kanban view of workers across all stages
 * 2. All Workers - Table view with filters
 * 3. Pending Actions - Admin inbox for quick task completion
 */

type TabType = "pipeline" | "workers" | "pending";

interface Stats {
  applied: number;
  screening: number;
  testSubmitted: number;
  readyToWork: number;
  assigned: number;
  working: number;
  suspended: number;
  total: number;
}

export default function WorkforceControlCenterPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>("pipeline");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Data states
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [pendingProofs, setPendingProofs] = useState<PendingProof[]>([]);
  const [completedWorkers, setCompletedWorkers] = useState<WorkerData[]>([]);
  const [pendingApplications, setPendingApplications] = useState<
    PendingApplication[]
  >([]);
  const [pendingCredits, setPendingCredits] = useState<PendingCredit[]>([]);
  const [stats, setStats] = useState<Stats>({
    applied: 0,
    screening: 0,
    testSubmitted: 0,
    readyToWork: 0,
    assigned: 0,
    working: 0,
    suspended: 0,
    total: 0,
  });

  // Modal states
  const [selectedWorker, setSelectedWorker] = useState<WorkerData | null>(null);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showRejectProofModal, setShowRejectProofModal] = useState(false);
  const [pendingProofId, setPendingProofId] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState(0);

  // Table filter
  const [workerFilter, setWorkerFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Load all data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch workers, proofs, applications, and projects in parallel
      const [workersRes, proofsRes, appsRes] = await Promise.all([
        apiRequest<any>(
          "/api/admin/workspace/workers?limit=500",
          "GET",
          null,
          true,
        ),
        apiRequest<any>("/api/admin/proofs?status=pending", "GET", null, true),
        apiRequest<any>(
          "/api/apply-work/admin?status=pending&limit=100",
          "GET",
          null,
          true,
        ),
      ]);

      // Process workers
      const allWorkers: WorkerData[] = (workersRes.workers || []).map(
        (w: any) => ({
          _id: w._id,
          applicationId: w._id, // Use worker ID as application ID
          userId: w.userId,
          jobId: w.jobId,
          position: w.position,
          positionTitle: w.positionTitle || w.position?.title || w.jobId?.title,
          workerStatus: w.workerStatus || "applied",
          status: w.status || "pending",
          totalEarnings: w.totalEarnings || 0,
          pendingEarnings: w.pendingEarnings || 0,
          attemptCount: w.attemptCount || 0,
          maxAttempts: w.maxAttempts || 2,
          createdAt: w.createdAt,
          updatedAt: w.updatedAt,
          currentProject: w.currentProject,
        }),
      );

      setWorkers(allWorkers);

      // Calculate stats
      const statusCounts: Record<string, number> = {};
      allWorkers.forEach((w) => {
        const status = w.workerStatus || "applied";
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });

      setStats({
        applied: statusCounts.applied || 0,
        screening:
          (statusCounts.screening_unlocked || 0) +
          (statusCounts.training_viewed || 0),
        testSubmitted: statusCounts.test_submitted || 0,
        readyToWork: statusCounts.ready_to_work || 0,
        assigned: statusCounts.assigned || 0,
        working: statusCounts.working || 0,
        suspended: statusCounts.suspended || 0,
        total: allWorkers.length,
      });

      // Process proofs
      setPendingProofs(proofsRes.proofs || []);

      // Process applications
      const apps = Array.isArray(appsRes)
        ? appsRes
        : appsRes.applications || [];
      setPendingApplications(
        apps
          .filter((a: any) => a.status === "pending")
          .map((a: any) => ({
            _id: a._id,
            userId: workerIdentity(a.user, a.userId),
            positionTitle: a.positionTitle || a.position?.title,
            createdAt: a.createdAt,
          })),
      );

      // Process projects for credit queue
      const completedProjects = await apiRequest<any>(
        "/api/admin/workspace/projects?status=completed",
        "GET",
        null,
        true,
      );
      const uncreditedProjects = (completedProjects.projects || []).filter(
        (p: any) => !p.earningsCredited && p.assignedTo,
      );
      setPendingCredits(
        uncreditedProjects.map((p: any) => ({
          _id: p._id,
          title: p.title,
          earnings: p.earnings || p.payRate || 0,
          assignedTo: p.assignedTo,
          completedAt: p.completedAt,
        })),
      );

      // Completed workers (recently paid)
      const recentlyCompleted = allWorkers
        .filter(
          (w) =>
            (w.totalEarnings || 0) > 0 && w.workerStatus === "ready_to_work",
        )
        .slice(0, 10);
      setCompletedWorkers(recentlyCompleted);
    } catch (err: any) {
      console.error("Failed to load workforce data:", err);
      toast(err.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle worker actions
  const handleAction = async (action: string, workerId: string, data?: any) => {
    setActionLoading(workerId);

    try {
      switch (action) {
        case "approve":
        case "approve_application":
          // Find the worker to get position ID
          const workerToApprove = workers.find(
            (w) => w.applicationId === workerId || w._id === workerId,
          );
          const positionId =
            workerToApprove?.jobId?._id || workerToApprove?.position?._id;

          if (positionId) {
            await apiRequest(
              `/api/admin/workspace/job/${positionId}/approve`,
              "PUT",
              { applicantId: workerId },
              true,
            );
            toast(
              "Application approved. Worker can now access screening. Next: review their test submission.",
              "success",
            );
          } else {
            // Fallback to apply-work admin endpoint
            await apiRequest(
              `/api/apply-work/admin/${workerId}`,
              "PUT",
              { status: "approved" },
              true,
            );
            toast(
              "Admin override applied: approved via legacy applications endpoint because worker is not linked to a Work Position. Next: open Worker Profile and link a Work Position for lifecycle actions.",
              "success",
            );
          }
          break;

        case "reject":
        case "reject_application":
          const workerToReject = workers.find(
            (w) => w.applicationId === workerId || w._id === workerId,
          );
          const rejectPositionId =
            workerToReject?.jobId?._id || workerToReject?.position?._id;

          if (rejectPositionId) {
            await apiRequest(
              `/api/admin/workspace/job/${rejectPositionId}/reject`,
              "PUT",
              {
                applicantId: workerId,
                reason: data?.reason || "Rejected by admin",
              },
              true,
            );
            toast("Application rejected (workspace).", "success");
          } else {
            await apiRequest(
              `/api/apply-work/admin/${workerId}`,
              "PUT",
              { status: "rejected" },
              true,
            );
            toast(
              "Admin override applied: rejected via legacy applications endpoint because worker is not linked to a Work Position.",
              "success",
            );
          }
          break;

        case "mark_passed":
        case "pass_screening":
          // Set worker status to ready_to_work
          const passWorker = workers.find(
            (w) => w.applicationId === workerId || w._id === workerId,
          );
          const passPositionId =
            passWorker?.jobId?._id || passWorker?.position?._id;

          if (!passPositionId) {
            toast(
              "LOCKED: Cannot mark screening passed because worker is not linked to a Work Position. Required: link the worker to a job role/position in Workspace.",
              "error",
            );
            return;
          }
          await apiRequest(
            `/api/admin/workspace/job/${passPositionId}/set-status`,
            "PUT",
            { applicantId: workerId, workerStatus: "ready_to_work" },
            true,
          );
          toast(
            "Screening passed! Worker is now Ready to Work. Next: assign them a project.",
            "success",
          );
          break;

        case "mark_failed":
        case "fail_screening":
          const failWorker = workers.find(
            (w) => w.applicationId === workerId || w._id === workerId,
          );
          const failPositionId =
            failWorker?.jobId?._id || failWorker?.position?._id;

          if (!failPositionId) {
            toast(
              "LOCKED: Cannot mark failed because worker is not linked to a Work Position. Required: link the worker to a job role/position in Workspace.",
              "error",
            );
            return;
          }
          await apiRequest(
            `/api/admin/workspace/job/${failPositionId}/set-status`,
            "PUT",
            {
              applicantId: workerId,
              workerStatus: "failed",
              adminNotes: data?.reason,
            },
            true,
          );
          toast(
            "Marked as failed. Next: allow retry or reject permanently.",
            "success",
          );
          break;

        case "reset_attempts":
          const resetWorker = workers.find(
            (w) => w.applicationId === workerId || w._id === workerId,
          );
          const resetPositionId =
            resetWorker?.jobId?._id || resetWorker?.position?._id;

          if (!resetPositionId) {
            toast(
              "LOCKED: Cannot reset attempts because worker is not linked to a Work Position. Required: link the worker to a job role/position in Workspace.",
              "error",
            );
            return;
          }
          await apiRequest(
            `/api/admin/workspace/job/${resetPositionId}/set-status`,
            "PUT",
            {
              applicantId: workerId,
              workerStatus: "screening_unlocked",
              resetAttempts: true,
            },
            true,
          );
          toast("Attempts reset. Next: worker can retry screening.", "success");
          break;

        case "reset_to_ready":
          // PATCH-66: Reset orphaned worker to ready_to_work status
          const resetToReadyWorker = workers.find(
            (w) => w.applicationId === workerId || w._id === workerId,
          );
          const resetToReadyPositionId =
            resetToReadyWorker?.jobId?._id || resetToReadyWorker?.position?._id;

          if (!resetToReadyPositionId) {
            toast(
              "LOCKED: Cannot reset worker status because worker is not linked to a Work Position. Required: link the worker to a job role/position in Workspace.",
              "error",
            );
            return;
          }
          await apiRequest(
            `/api/admin/workspace/job/${resetToReadyPositionId}/set-status`,
            "PUT",
            {
              applicantId: workerId,
              workerStatus: "ready_to_work",
            },
            true,
          );
          toast("Reset to Ready to Work. Next: assign a project.", "success");
          break;

        case "assign_project":
          router.push(`/admin/workspace/projects?assignWorker=${encodeURIComponent(workerId)}`);
          setActionLoading(null);
          return;

        case "view_project":
        case "view_timeline":
          // Open timeline modal
          const viewWorker = workers.find(
            (w) => w.applicationId === workerId || w._id === workerId,
          );
          setSelectedWorker(viewWorker || null);
          setShowTimelineModal(true);
          setActionLoading(null);
          return;

        case "approve_proof":
        case "approve_and_credit":
          const proofId = data?.proofId || workerId;
          const proof = pendingProofs.find(item => item._id === proofId);
          const outcome = await approveWorkerProof(proofId, proof?.projectId?._id, data?.amount ?? proof?.projectId?.payRate);
          toast(outcome.message, outcome.type);
          break;

        case "reject_proof":
          setPendingProofId(data?.proofId || workerId);
          setShowRejectProofModal(true);
          setActionLoading(null);
          return;

        case "credit_earnings":
          // Credit earnings for a project
          if (!data?.amount || Number(data.amount) <= 0) {
            toast(
              "LOCKED: Credit amount must be greater than 0. Required: enter an earnings amount to credit.",
              "error",
            );
            return;
          }
          await apiRequest(
            `/api/admin/workspace/project/${workerId}/credit`,
            "PUT",
            { amount: data?.amount || 0 },
            true,
          );
          toast(`$${(data?.amount || 0).toFixed(2)} credited!`, "success");
          break;

        case "suspend":
          const suspendWorker = workers.find(
            (w) => w.applicationId === workerId || w._id === workerId,
          );
          const suspendPositionId =
            suspendWorker?.jobId?._id || suspendWorker?.position?._id;

          if (!suspendPositionId) {
            toast(
              "LOCKED: Cannot suspend because worker is not linked to a Work Position. Required: link the worker to a job role/position in Workspace.",
              "error",
            );
            return;
          }
          await apiRequest(
            `/api/admin/workspace/job/${suspendPositionId}/set-status`,
            "PUT",
            { applicantId: workerId, workerStatus: "suspended" },
            true,
          );
          toast(
            "Worker suspended. This flow is now paused. Reactivate when ready.",
            "success",
          );
          break;

        case "reactivate":
          const reactivateWorker = workers.find(
            (w) => w.applicationId === workerId || w._id === workerId,
          );
          const reactivatePositionId =
            reactivateWorker?.jobId?._id || reactivateWorker?.position?._id;

          if (!reactivatePositionId) {
            toast(
              "LOCKED: Cannot reactivate because worker is not linked to a Work Position. Required: link the worker to a job role/position in Workspace.",
              "error",
            );
            return;
          }
          await apiRequest(
            `/api/admin/workspace/job/${reactivatePositionId}/set-status`,
            "PUT",
            { applicantId: workerId, workerStatus: "ready_to_work" },
            true,
          );
          toast(
            "Worker reactivated and ready for work. Next: assign them a project.",
            "success",
          );
          break;

        case "set_ready":
          const readyWorker = workers.find(
            (w) => w.applicationId === workerId || w._id === workerId,
          );
          const readyPositionId =
            readyWorker?.jobId?._id || readyWorker?.position?._id;

          if (!readyPositionId) {
            toast(
              "LOCKED: Cannot mark Ready to Work because worker is not linked to a Work Position. Required: link the worker to a job role/position in Workspace.",
              "error",
            );
            return;
          }
          await apiRequest(
            `/api/admin/workspace/job/${readyPositionId}/set-status`,
            "PUT",
            { applicantId: workerId, workerStatus: "ready_to_work" },
            true,
          );
          toast(
            "Worker marked Ready to Work. Next: assign a project.",
            "success",
          );
          break;

        default:
          console.warn("Unknown action:", action);
      }

      // Reload data after action
      await loadData();
    } catch (err: any) {
      console.error("Action failed:", err);
      toast(err.message || "Action failed", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Handle proof rejection confirmation
  const handleRejectProofConfirm = async (data: { reason: string }) => {
    if (!pendingProofId) return;

    setActionLoading(pendingProofId);
    try {
      await apiRequest(
        `/api/admin/proofs/${pendingProofId}/reject`,
        "PUT",
        { rejectionReason: data.reason },
        true,
      );

      toast("Proof rejected", "success");
      setShowRejectProofModal(false);
      setPendingProofId(null);
      await loadData();
    } catch (err: any) {
      toast(err.message || "Failed to reject proof", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // Filter workers for table view
  const filteredWorkers = workers.filter((w) => {
    // Status filter
    if (workerFilter !== "all" && w.workerStatus !== workerFilter) {
      return false;
    }
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name =
        `${w.userId?.firstName || ""} ${w.userId?.lastName || ""}`.toLowerCase();
      const email = (w.userId?.email || "").toLowerCase();
      if (!name.includes(query) && !email.includes(query)) {
        return false;
      }
    }
    return true;
  });

  // Pending screenings (test_submitted workers)
  const pendingScreenings = workers
    .filter((w) => w.workerStatus === "test_submitted")
    .map((w) => ({
      _id: w.applicationId,
      workerId: w.userId,
      positionTitle: w.positionTitle,
      attemptCount: w.attemptCount,
    }));

  return (
    <div className="u-container max-w-7xl py-6">
      {/* Header - PATCH_79: Enhanced with flow explanation */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">👷</span>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Workforce Control Center
            </h1>
            <p className="text-slate-400 text-sm">
              The SINGLE source of truth for all worker lifecycle operations
            </p>
          </div>
        </div>
        
        {/* PATCH_79: Worker Flow Mental Model */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-slate-800/50 via-slate-800/80 to-slate-800/50 border border-slate-700/50">
          <p className="text-xs text-slate-400 mb-2">📊 Worker Progression (Step-Based — No Skipping):</p>
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="px-2 py-1 rounded bg-slate-500/20 text-slate-300">Applied</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300">Screening</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-1 rounded bg-purple-500/20 text-purple-300">Test Submitted</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">Ready to Work</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-1 rounded bg-cyan-500/20 text-cyan-300">Assigned</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-300">Working</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300">Proof</span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300">🔒 Completed</span>
          </div>
        </div>

        {/* PATCH_79: What to do next - Enhanced guidance */}
        {!loading && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-blue-500/10 via-slate-800/50 to-purple-500/10 border border-blue-500/20">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
              <span className="text-2xl">⚡</span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-white mb-1">
                  What needs your attention:
                </h3>
                <ul className="text-sm text-slate-300 space-y-1">
                  {stats.applied > 0 && (
                    <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center">1</span>
                      <span className="text-amber-400 font-medium">
                        {stats.applied} application{stats.applied > 1 ? "s" : ""}
                      </span>{" "}
                      waiting for review →{" "}
                      <span className="text-slate-400">Click "Review Application →" to approve</span>
                    </li>
                  )}
                  {stats.testSubmitted > 0 && (
                    <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs flex items-center justify-center">2</span>
                      <span className="text-purple-400 font-medium">
                        {stats.testSubmitted} test{stats.testSubmitted > 1 ? "s" : ""} submitted
                      </span>{" "}
                      →{" "}
                      <span className="text-slate-400">Click "Grade Screening →" to pass or fail</span>
                    </li>
                  )}
                  {stats.readyToWork > 0 && (
                    <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center">3</span>
                      <span className="text-emerald-400 font-medium">
                        {stats.readyToWork} worker{stats.readyToWork > 1 ? "s" : ""} ready
                      </span>{" "}
                      →{" "}
                      <span className="text-slate-400">Click "Assign Project →" to give them work</span>
                    </li>
                  )}
                  {pendingProofs.length > 0 && (
                    <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 text-xs flex items-center justify-center">4</span>
                      <span className="text-cyan-400 font-medium">
                        {pendingProofs.length} proof{pendingProofs.length > 1 ? "s" : ""} pending
                      </span>{" "}
                      →{" "}
                      <span className="text-slate-400">Click "Review Proof →" to approve & credit wallet</span>
                    </li>
                  )}
                  {stats.applied === 0 &&
                    stats.testSubmitted === 0 &&
                    stats.readyToWork === 0 &&
                    pendingProofs.length === 0 && (
                      <li className="text-emerald-400">
                        ✓ All caught up! No pending actions right now. Workers will appear when they apply.
                      </li>
                    )}
                </ul>
              </div>
              <Link
                href="/admin/work-positions"
                className="col-start-2 w-fit text-xs text-slate-400 hover:text-white lg:col-start-auto"
              >
                → Job Roles Setup
              </Link>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-6">
          {[
            { label: "Applied", value: stats.applied, color: "text-slate-300" },
            {
              label: "Screening",
              value: stats.screening,
              color: "text-amber-300",
            },
            {
              label: "Test Done",
              value: stats.testSubmitted,
              color: "text-purple-300",
            },
            {
              label: "Ready",
              value: stats.readyToWork,
              color: "text-emerald-300",
            },
            {
              label: "Assigned",
              value: stats.assigned,
              color: "text-blue-300",
            },
            {
              label: "Working",
              value: stats.working,
              color: "text-purple-300",
            },
            {
              label: "Suspended",
              value: stats.suspended,
              color: "text-red-300",
            },
            { label: "Total", value: stats.total, color: "text-white" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-3 rounded-xl bg-white/5 border border-white/5 text-center"
            >
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-slate-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-white/5 p-1">
        {[
          { id: "pipeline" as TabType, label: "Pipeline", icon: "📊" },
          { id: "workers" as TabType, label: "All Workers", icon: "👥" },
          {
            id: "pending" as TabType,
            label: "Pending Actions",
            icon: "⚡",
            badge:
              pendingApplications.length +
              pendingScreenings.length +
              pendingProofs.length +
              pendingCredits.length,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            aria-pressed={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-blue-800 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge ? (
              <span className="ml-1 px-2 py-0.5 bg-red-800 text-white text-xs rounded-full">
                {tab.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === "pipeline" && (
          <WorkerPipelineBoard
            workers={workers}
            pendingProofs={pendingProofs}
            completedWorkers={completedWorkers}
            onAction={handleAction}
            actionLoading={actionLoading}
            loading={loading}
          />
        )}

        {activeTab === "workers" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px] max-w-md">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                aria-label="Filter workers by status"
                value={workerFilter}
                onChange={(e) => setWorkerFilter(e.target.value)}
                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Statuses</option>
                <option value="applied">Applied</option>
                <option value="screening_unlocked">Screening Unlocked</option>
                <option value="training_viewed">Training Viewed</option>
                <option value="test_submitted">Test Submitted</option>
                <option value="ready_to_work">Ready to Work</option>
                <option value="assigned">Assigned</option>
                <option value="working">Working</option>
                <option value="suspended">Suspended</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {/* Table */}
            {loading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-slate-400">Loading workers...</p>
              </div>
            ) : filteredWorkers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Name
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Email
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Job Role
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Earnings
                      </th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredWorkers.map((worker) => (
                      <tr
                        key={worker.applicationId}
                        className="hover:bg-white/5"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/admin/workforce/${worker.applicationId}`}
                            className="text-white hover:text-cyan-400 transition-colors"
                          >
                            {worker.userId?.firstName} {worker.userId?.lastName}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {worker.userId?.email}
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {worker.positionTitle || "—"}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 text-xs rounded-full bg-white/10 text-white">
                            {worker.workerStatus?.replace(/_/g, " ") ||
                              "applied"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-emerald-400">
                          ${(worker.totalEarnings || 0).toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          {/* PATCH_77: Contextual primary action based on worker status */}
                          {worker.workerStatus === "applied" && worker.status === "pending" ? (
                            <Link
                              href={`/admin/workforce/${worker.applicationId}`}
                              className="px-3 py-1 text-xs bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 rounded-lg transition-colors inline-block font-medium"
                            >
                              Review Application →
                            </Link>
                          ) : worker.workerStatus === "test_submitted" ? (
                            <Link
                              href={`/admin/workforce/${worker.applicationId}`}
                              className="px-3 py-1 text-xs bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 rounded-lg transition-colors inline-block font-medium"
                            >
                              Grade Screening →
                            </Link>
                          ) : worker.workerStatus === "ready_to_work" ? (
                            <Link
                              href={`/admin/workspace/projects?assignWorker=${encodeURIComponent(worker.applicationId)}`}
                              className="px-3 py-1 text-xs bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 rounded-lg transition-colors inline-block font-medium"
                            >
                              Assign Project →
                            </Link>
                          ) : worker.workerStatus === "proof_submitted" ? (
                            <Link
                              href={`/admin/workforce/${worker.applicationId}`}
                              className="px-3 py-1 text-xs bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 rounded-lg transition-colors inline-block font-medium"
                            >
                              Review Proof →
                            </Link>
                          ) : (
                            <Link
                              href={`/admin/workforce/${worker.applicationId}`}
                              className="px-3 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded-lg transition-colors inline-block"
                            >
                              View Details
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                No workers found matching your criteria.
              </div>
            )}
          </div>
        )}

        {activeTab === "pending" && (
          <PendingActionQueue
            applications={pendingApplications}
            screenings={pendingScreenings}
            proofs={pendingProofs}
            credits={pendingCredits}
            onAction={handleAction}
            actionLoading={actionLoading}
            loading={loading}
          />
        )}
      </motion.div>

      {/* Quick Links */}
      <div className="mt-8 pt-6 border-t border-white/10">
        <p className="text-xs text-slate-400 mb-3">Related Pages:</p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/workspace/projects"
            className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors"
          >
            📋 Projects
          </Link>
          <Link
            href="/admin/workspace/screenings"
            className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors"
          >
            📝 Screenings
          </Link>
          <Link
            href="/admin/work-positions"
            className="px-3 py-1.5 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg transition-colors"
          >
            💼 Job Positions
          </Link>
        </div>
      </div>

      {/* Modals */}
      <WorkerTimelineModal
        isOpen={showTimelineModal}
        onClose={() => {
          setShowTimelineModal(false);
          setSelectedWorker(null);
        }}
        worker={selectedWorker}
        onAction={handleAction}
        actionLoading={actionLoading}
      />

      <WorkerActionPanel
        type="reject_proof"
        isOpen={showRejectProofModal}
        onClose={() => {
          setShowRejectProofModal(false);
          setPendingProofId(null);
        }}
        onConfirm={handleRejectProofConfirm}
        proofId={pendingProofId || undefined}
        loading={!!actionLoading}
      />
    </div>
  );
}
