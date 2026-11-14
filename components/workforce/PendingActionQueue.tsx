"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/**
 * PATCH_60/61: Pending Action Queue
 * Admin inbox showing all pending tasks in one view
 * PATCH_61: Links to Worker 360° Control Page
 */

export interface PendingApplication {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  positionTitle?: string;
  createdAt: string;
}

export interface PendingScreening {
  _id: string;
  workerId: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  positionTitle?: string;
  attemptCount?: number;
}

export interface PendingProof {
  _id: string;
  workerId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  projectId: {
    _id: string;
    title: string;
    payRate?: number;
  };
  submissionText?: string;
  createdAt: string;
}

export interface PendingCredit {
  _id: string;
  title: string;
  earnings: number;
  assignedTo: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  completedAt?: string;
}

interface PendingActionQueueProps {
  applications: PendingApplication[];
  screenings: PendingScreening[];
  proofs: PendingProof[];
  credits: PendingCredit[];
  onAction: (action: string, id: string, data?: any) => void;
  actionLoading?: string | null;
  loading?: boolean;
}

export default function PendingActionQueue({
  applications,
  screenings,
  proofs,
  credits,
  onAction,
  actionLoading,
  loading,
}: PendingActionQueueProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading pending actions...</p>
        </div>
      </div>
    );
  }

  const totalPending =
    applications.length + screenings.length + proofs.length + credits.length;

  if (totalPending === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
          <span className="text-4xl">OK</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">All Caught Up!</h3>
        <p className="text-slate-400">No pending actions right now.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section: Applications to Approve */}
      {applications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 rounded-xl border border-amber-500/20 overflow-hidden"
        >
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                App
              </span>
              <div>
                <h3 className="font-semibold text-white">
                  Applications to Approve
                </h3>
                <p className="text-xs text-slate-400">
                  {applications.length} pending review
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {applications.map((app) => (
              <div
                key={app._id}
                className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/workforce/${app._id}`}
                    className="font-medium text-white truncate hover:text-cyan-400 transition-colors block"
                  >
                    {[app.userId?.firstName, app.userId?.lastName].filter(Boolean).join(" ") || app.userId?.email || "View applicant"}
                  </Link>
                  <p className="text-xs text-slate-400 truncate">
                    Applied for: {app.positionTitle || "Position"}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <Link
                    href={`/admin/workforce/${app._id}`}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-600/50 hover:bg-slate-600 text-white rounded-lg"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => onAction("approve_application", app._id)}
                    disabled={actionLoading === app._id}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg disabled:opacity-50"
                  >
                    {actionLoading === app._id ? "..." : "✓ Approve"}
                  </button>
                  <button
                    onClick={() => onAction("reject_application", app._id)}
                    disabled={actionLoading === app._id}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-lg disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Section: Screenings to Review */}
      {screenings.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/50 rounded-xl border border-purple-500/20 overflow-hidden"
        >
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                Scr
              </span>
              <div>
                <h3 className="font-semibold text-white">
                  Screenings to Review
                </h3>
                <p className="text-xs text-slate-400">
                  {screenings.length} tests submitted
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {screenings.map((s) => (
              <div
                key={s._id}
                className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/admin/workforce/${s._id}`}
                    className="font-medium text-white truncate hover:text-cyan-400 transition-colors block"
                  >
                    {[s.workerId?.firstName, s.workerId?.lastName].filter(Boolean).join(" ") || "View worker"}
                  </Link>
                  <p className="text-xs text-slate-400 truncate">
                    {s.positionTitle || "Position"} • Attempt{" "}
                    {s.attemptCount || 1}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <Link
                    href={`/admin/workforce/${s._id}`}
                    className="px-3 py-1.5 text-xs font-medium bg-slate-600/50 hover:bg-slate-600 text-white rounded-lg"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => onAction("pass_screening", s._id)}
                    disabled={actionLoading === s._id}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg disabled:opacity-50"
                  >
                    {actionLoading === s._id ? "..." : "✓ Pass"}
                  </button>
                  <button
                    onClick={() => onAction("fail_screening", s._id)}
                    disabled={actionLoading === s._id}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-lg disabled:opacity-50"
                  >
                    Fail
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Section: Proofs to Approve */}
      {proofs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/50 rounded-xl border border-blue-500/20 overflow-hidden"
        >
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                Proof
              </span>
              <div>
                <h3 className="font-semibold text-white">Proofs to Approve</h3>
                <p className="text-xs text-slate-400">
                  {proofs.length} work submissions
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {proofs.map((proof) => (
              <div
                key={proof._id}
                className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {proof.workerId?.firstName || "Unknown"}{" "}
                    {proof.workerId?.lastName || "Worker"}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {proof.projectId?.title || "Project"} • $
                    {(proof.projectId?.payRate || 0).toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0 ml-4">
                  <button
                    onClick={() =>
                      onAction("approve_and_credit", proof._id, {
                        amount: proof.projectId?.payRate || 0,
                      })
                    }
                    disabled={actionLoading === proof._id}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg disabled:opacity-50"
                  >
                    {actionLoading === proof._id ? "..." : "✓ Approve & Credit"}
                  </button>
                  <button
                    onClick={() => onAction("reject_proof", proof._id)}
                    disabled={actionLoading === proof._id}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded-lg disabled:opacity-50"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Section: Earnings to Credit */}
      {credits.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/50 rounded-xl border border-emerald-500/20 overflow-hidden"
        >
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                $
              </span>
              <div>
                <h3 className="font-semibold text-white">Earnings to Credit</h3>
                <p className="text-xs text-slate-400">
                  {credits.length} payments pending
                </p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {credits.map((credit) => (
              <div
                key={credit._id}
                className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">
                    {credit.title}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {credit.assignedTo?.firstName} {credit.assignedTo?.lastName}{" "}
                    •{" "}
                    <span className="text-emerald-400">
                      ${credit.earnings.toFixed(2)}
                    </span>
                  </p>
                </div>
                <button
                  onClick={() =>
                    onAction("credit_earnings", credit._id, {
                      amount: credit.earnings,
                    })
                  }
                  disabled={actionLoading === credit._id}
                  className="px-4 py-1.5 text-xs font-medium bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg disabled:opacity-50 shrink-0 ml-4"
                >
                  {actionLoading === credit._id ? "..." : "Credit Now"}
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
