"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

/**
 * PATCH_61B: Admin Workers Management - Enhanced
 * View worker profiles, assign tasks, and manage worker applications
 * - Click worker name to view full profile
 * - Assign specialized tasks/gigs
 * - Allow workers to apply to other roles
 * VERSION: 2.0 - Force Vercel redeploy
 */

interface Worker {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  jobId: {
    _id: string;
    title: string;
  };
  status: string;
  trainingProgress: number;
  screeningUnlocked: boolean;
  screeningPassed: boolean;
  totalEarnings: number;
  createdAt: string;
  position?: {
    _id: string;
    title: string;
  };
  workerStatus?: string;
  successRate?: number;
  rating?: number;
  completedProjects?: number;
  attemptCount?: number;
  maxAttempts?: number;
}

interface SelectedWorker extends Worker {
  applications?: any[];
}

export default function AdminWorkersPage() {
  const { toast } = useToast();
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedWorker, setSelectedWorker] = useState<SelectedWorker | null>(
    null,
  );
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskDescription, setTaskDescription] = useState("");
  const [taskAssigning, setTaskAssigning] = useState(false);
  const limit = 20;

  useEffect(() => {
    loadWorkers();
  }, [page, filter]);

  const loadWorkers = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/workspace/workers?page=${page}&limit=${limit}`;
      if (filter !== "all") {
        url += `&status=${filter}`;
      }

      const res = await apiRequest<any>(url, "GET", null, true);
      setWorkers(res.workers || []);
      setTotal(res.total || 0);
    } catch (e: any) {
      setError(e.message || "Failed to load workers");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      approved:
        "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
      training: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
      screening: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
      active: "bg-green-500/20 text-green-400 border border-green-500/30",
      suspended: "bg-red-500/20 text-red-400 border border-red-500/30",
    };
    return styles[status] || "bg-slate-500/20 text-slate-400";
  };

  return (
    <>
      <div className="u-container max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/admin/workspace"
            className="text-sm text-slate-400 hover:text-white mb-2 inline-block"
          >
            ← Workspace Hub
          </Link>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">👷</span>
              <div>
                <h1 className="text-2xl font-bold">Workers</h1>
                <p className="text-slate-400 text-sm">
                  {total} workers across all job roles
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            "all",
            "approved",
            "training",
            "screening",
            "active",
            "suspended",
          ].map((f) => (
            <button
              key={f}
              onClick={() => {
                setFilter(f);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 mb-6 rounded-lg bg-red-500/10 border border-red-500/30 text-center">
            <p className="text-red-400 mb-3">{error}</p>
            <button
              onClick={() => loadWorkers()}
              className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition"
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12 text-slate-400">
            Loading workers...
          </div>
        )}

        {/* Workers List - Enhanced with Profile Click */}
        {!loading && workers.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            {workers.map((worker) => (
              <div
                key={worker._id}
                className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/60 to-slate-950/60 overflow-hidden hover:border-blue-500/30 transition-all group"
              >
                {/* Worker Card Content */}
                <div className="p-5">
                  <div className="flex flex-col gap-4">
                    {/* Header with Name, Status, and Quick Actions */}
                    <div className="flex items-start justify-between gap-4">
                      <div
                        onClick={() => {
                          setSelectedWorker(worker);
                          setShowProfileModal(true);
                        }}
                        className="cursor-pointer flex-1 min-w-0"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-white text-lg truncate hover:text-blue-400 transition">
                            {worker.userId?.firstName || "Unknown"}{" "}
                            {worker.userId?.lastName || ""}
                          </h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs whitespace-nowrap ${getStatusBadge(
                              worker.status,
                            )}`}
                          >
                            {worker.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-400 truncate">
                          📧 {worker.userId?.email}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          💼 {worker.jobId?.title || "N/A"}
                        </p>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex gap-2 flex-shrink-0">
                        <Link
                          href={`/admin/workforce/${worker._id}`}
                          className="px-3 py-2 bg-slate-500/20 text-slate-300 hover:bg-slate-500/30 rounded-lg text-sm font-medium transition"
                          title="View full Worker 360° profile"
                        >
                          📊 360°
                        </Link>
                        <button
                          onClick={() => {
                            setSelectedWorker(worker);
                            setShowProfileModal(true);
                          }}
                          className="px-3 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-sm font-medium transition"
                          title="Quick view profile"
                        >
                          👁️ View
                        </button>
                        {/* PATCH_73: Only show Task button for ready_to_work workers */}
                        {(worker.workerStatus === "ready_to_work" ||
                          worker.status === "ready_to_work") && (
                          <button
                            onClick={() => {
                              setSelectedWorker(worker);
                              setShowTaskModal(true);
                              setTaskDescription("");
                            }}
                            className="px-3 py-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-sm font-medium transition"
                            title="Assign a specialized task"
                          >
                            ✅ Task
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-4 gap-3 pt-3 border-t border-white/5">
                      <div className="text-center">
                        <p className="text-lg font-bold text-emerald-400">
                          ${worker.totalEarnings?.toFixed(2) || "0.00"}
                        </p>
                        <p className="text-xs text-slate-500">Earnings</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-blue-400">
                          {worker.trainingProgress || 0}%
                        </p>
                        <p className="text-xs text-slate-500">Training</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-amber-400">
                          {worker.successRate || 0}%
                        </p>
                        <p className="text-xs text-slate-500">Success</p>
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-bold text-purple-400">
                          {worker.completedProjects || 0}
                        </p>
                        <p className="text-xs text-slate-500">Projects</p>
                      </div>
                    </div>

                    {/* Screening Status */}
                    <div className="flex items-center gap-4 pt-2 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {worker.screeningPassed
                            ? "✅"
                            : worker.screeningUnlocked
                              ? "⏳"
                              : "🔒"}
                        </span>
                        <span className="text-xs text-slate-400">
                          {worker.screeningPassed
                            ? "Screening Passed"
                            : worker.screeningUnlocked
                              ? "Screening Pending"
                              : "Screening Locked"}
                        </span>
                      </div>
                      {worker.rating && (
                        <div className="flex items-center gap-1 ml-auto">
                          <span>⭐</span>
                          <span className="text-xs font-semibold text-amber-400">
                            {worker.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && workers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">👷</div>
            <h3 className="text-lg font-semibold text-white mb-2">
              No Workers Found
            </h3>
            <p className="text-slate-400 mb-4">
              {filter === "all"
                ? "No workers have applied yet. Workers will appear here after they apply to job roles."
                : `No workers with "${filter}" status found.`}
            </p>
            {filter !== "all" && (
              <button
                onClick={() => setFilter("all")}
                className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition"
              >
                View All Workers
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex justify-center gap-2 mt-6">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-slate-400">
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= Math.ceil(total / limit)}
              className="btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Worker Profile Modal */}
      {showProfileModal && selectedWorker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/95 backdrop-blur-sm">
              <h2 className="text-xl font-bold text-white">Worker Profile</h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  👤 Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-slate-800/40 p-4 rounded-xl border border-white/5">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                      Full Name
                    </p>
                    <p className="text-white font-medium">
                      {selectedWorker.userId?.firstName}{" "}
                      {selectedWorker.userId?.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                      Email
                    </p>
                    <p className="text-white font-medium">
                      {selectedWorker.userId?.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                      Member Since
                    </p>
                    <p className="text-white font-medium">
                      {new Date(selectedWorker.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                      Status
                    </p>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(
                        selectedWorker.status,
                      )}`}
                    >
                      {selectedWorker.status}
                    </span>
                  </div>
                </div>
              </section>

              {/* Work Statistics */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  📊 Work Statistics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-400">
                      ${selectedWorker.totalEarnings?.toFixed(2) || "0.00"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Total Earnings
                    </p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">
                      {selectedWorker.completedProjects || 0}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Projects Done</p>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-amber-400">
                      {selectedWorker.successRate || 0}%
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Success Rate</p>
                  </div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-purple-400">
                      ⭐ {selectedWorker.rating?.toFixed(1) || "N/A"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Rating</p>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-400">
                      {selectedWorker.trainingProgress || 0}%
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Training</p>
                  </div>
                  <div className="bg-slate-500/10 border border-slate-500/20 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-slate-400">
                      {selectedWorker.attemptCount || 0}/
                      {selectedWorker.maxAttempts || 2}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">Test Attempts</p>
                  </div>
                </div>
              </section>

              {/* Current Position */}
              <section>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  💼 Current Position
                </h3>
                <div className="bg-slate-800/40 p-4 rounded-xl border border-white/5">
                  <p className="text-white font-medium mb-1">
                    {selectedWorker.jobId?.title || "N/A"}
                  </p>
                  <p className="text-xs text-slate-400">
                    Worker Status:{" "}
                    {selectedWorker.workerStatus || selectedWorker.status}
                  </p>
                </div>
              </section>

              {/* Action Buttons */}
              <section className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setShowTaskModal(true);
                  }}
                  className="flex-1 px-4 py-3 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-xl font-semibold transition"
                >
                  ✅ Assign Task
                </button>
                <Link
                  href="/open-roles"
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 px-4 py-3 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl font-semibold transition text-center"
                >
                  View open roles
                </Link>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="flex-1 px-4 py-3 bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 rounded-xl font-semibold transition"
                >
                  Close
                </button>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Task Assignment Modal */}
      {showTaskModal && selectedWorker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h2 className="text-xl font-bold text-white">
                Assign Specialized Task
              </h2>
              <button
                onClick={() => setShowTaskModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Worker
                </label>
                <div className="p-3 bg-slate-800/40 rounded-lg border border-white/5">
                  <p className="text-white">
                    {selectedWorker.userId?.firstName}{" "}
                    {selectedWorker.userId?.lastName}
                  </p>
                  <p className="text-xs text-slate-400">
                    {selectedWorker.userId?.email}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Task Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  placeholder="e.g., Complete data entry for Q1 project, Test new UI design, Create training materials, etc."
                  className="w-full p-3 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none resize-none"
                  rows={4}
                />
              </div>

              {/* Info */}
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                <p className="text-xs text-blue-300">
                  ℹ️ Task will be sent to worker via email and displayed in
                  their workspace dashboard.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-white/10">
              <button
                onClick={() => setShowTaskModal(false)}
                className="flex-1 px-4 py-3 bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!taskDescription.trim()) {
                    toast("Please enter a task description", "error");
                    return;
                  }

                  setTaskAssigning(true);
                  try {
                    await apiRequest(
                      `/api/admin/workspace/workers/${selectedWorker._id}/assign-task`,
                      "POST",
                      {
                        taskDescription,
                        jobId: selectedWorker.jobId?._id,
                      },
                      true,
                    );
                    toast(
                      "Task assigned successfully! Worker will be notified.",
                      "success",
                    );
                    setShowTaskModal(false);
                    setTaskDescription("");
                    loadWorkers();
                  } catch (e: any) {
                    toast("Failed to assign task: " + e.message, "error");
                  } finally {
                    setTaskAssigning(false);
                  }
                }}
                disabled={taskAssigning || !taskDescription.trim()}
                className="flex-1 px-4 py-3 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50 rounded-lg font-semibold transition"
              >
                {taskAssigning ? "Assigning..." : "✅ Assign Task"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
