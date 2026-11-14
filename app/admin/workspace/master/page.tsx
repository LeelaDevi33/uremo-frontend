"use client";

import Link from "next/link";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

/**
 * PATCH_64 + PATCH_62: Master Workspace - Orchestration Layer
 * BUILD_TRIGGER: 2026-02-05T00:10:00Z
 *
 * CONTEXT: This page acts as a unified control center for Screenings and Projects.
 * It provides context switching, linkage traceability, and action controls.
 *
 * PATCH_62 FIXES:
 * - P0-1: Real worker qualification check via /api/admin/workspace/workers/qualified-count
 * - P0-2: Empty screenings (0 questions) marked as INVALID and blocked from promotion
 * - P0-3: Lock/Unlock UI disabled with clear tooltip (backend not implemented)
 * - P1-4: URL state persistence for mode switching (?mode=screening|project)
 * - P1-5: Hide empty categories (0 screenings AND 0 projects)
 *
 * BACKEND ENDPOINTS:
 * - /api/admin/workspace/screenings - List all screenings
 * - /api/admin/workspace/projects - List all projects
 * - /api/admin/workspace/workers/qualified-count - PATCH_62: Qualified workers per category
 *
 * PERMISSION MODEL:
 * - All actions are admin-gated (backend enforces via JWT)
 * - UI disables actions when execution is locked or validation fails
 */

// Types
interface Screening {
  _id: string;
  title: string;
  description: string;
  category: string;
  questions: any[];
  passingScore: number;
  timeLimit: number;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

interface Project {
  _id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  assignedTo?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  payRate?: number;
  earnings?: number;
  earningsCredited?: number;
  deadline?: string;
  createdAt: string;
  updatedAt?: string;
}

interface WorkspaceStats {
  totalScreenings: number;
  activeScreenings: number;
  totalProjects: number;
  draftProjects: number;
  openProjects: number;
  assignedProjects: number;
  completedProjects: number;
}

// Execution State Types
type ExecutionState = "draft" | "running" | "paused" | "locked" | "completed";

// Category mapping for linkage
const CATEGORIES = [
  { key: "microjobs", label: "Microjobs", icon: "MJ" },
  { key: "writing", label: "Writing", icon: "WR" },
  { key: "teaching", label: "Teaching", icon: "TC" },
  { key: "coding_math", label: "Coding & Math", icon: "CM" },
  { key: "outlier", label: "Outlier", icon: "OT" },
  { key: "other", label: "Other", icon: "--" },
];

export default function MasterWorkspacePage() {
  // PATCH_62: URL state for mode persistence
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlMode = searchParams.get("mode") as "screening" | "project" | null;
  const [mode, setModeInternal] = useState<"screening" | "project">(
    urlMode || "screening",
  );

  // PATCH_62: Update URL when mode changes
  const setMode = useCallback(
    (newMode: "screening" | "project") => {
      setModeInternal(newMode);
      const params = new URLSearchParams(searchParams.toString());
      params.set("mode", newMode);
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  // Sync mode with URL on navigation
  useEffect(() => {
    if (urlMode && urlMode !== mode) {
      setModeInternal(urlMode);
    }
  }, [urlMode]);

  // Data
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [qualifiedWorkerCounts, setQualifiedWorkerCounts] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Selected Entity for Deep Operations
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Activity Log (client-side simulation - would be backend in production)
  const [activityLog, setActivityLog] = useState<
    { action: string; time: Date; status: "success" | "warning" | "error" }[]
  >([]);

  // Load Data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [screeningsRes, projectsRes, qualifiedRes] = await Promise.all([
        apiRequest<any>("/api/admin/workspace/screenings", "GET", null, true),
        apiRequest<any>("/api/admin/workspace/projects", "GET", null, true),
        apiRequest<any>(
          "/api/admin/workspace/workers/qualified-count",
          "GET",
          null,
          true,
        ).catch(() => ({ qualifiedCounts: {} })),
      ]);
      setScreenings(screeningsRes.screenings || []);
      setProjects(projectsRes.projects || []);
      setQualifiedWorkerCounts(qualifiedRes.qualifiedCounts || {});

      addActivity("Workspace data loaded", "success");
    } catch (e: any) {
      setError(e.message || "Failed to load workspace data");
      addActivity("Failed to load workspace data", "error");
    } finally {
      setLoading(false);
    }
  };

  const addActivity = (
    action: string,
    status: "success" | "warning" | "error",
  ) => {
    setActivityLog((prev) => [
      { action, time: new Date(), status },
      ...prev.slice(0, 9),
    ]);
  };

  // Computed Stats
  const stats: WorkspaceStats = useMemo(
    () => ({
      totalScreenings: screenings.length,
      activeScreenings: screenings.filter((s) => s.active).length,
      totalProjects: projects.length,
      draftProjects: projects.filter((p) => p.status === "draft").length,
      openProjects: projects.filter(
        (p) => p.status === "open" || p.status === "pending",
      ).length,
      assignedProjects: projects.filter(
        (p) =>
          p.status === "assigned" ||
          p.status === "in_progress" ||
          p.status === "in-progress",
      ).length,
      completedProjects: projects.filter((p) => p.status === "completed")
        .length,
    }),
    [screenings, projects],
  );

  // Linkage Map: Category → Screenings + Projects
  const linkageMap = useMemo(() => {
    const map: Record<
      string,
      { screenings: Screening[]; projects: Project[] }
    > = {};

    CATEGORIES.forEach((cat) => {
      map[cat.key] = {
        screenings: screenings.filter((s) => s.category === cat.key),
        projects: projects.filter((p) => p.category === cat.key),
      };
    });

    return map;
  }, [screenings, projects]);

  // Execution State Derivation (per category)
  const getExecutionState = (category: string): ExecutionState => {
    const data = linkageMap[category];
    if (!data) return "draft";

    const hasActiveScreening = data.screenings.some((s) => s.active);
    const hasOpenProjects = data.projects.some((p) =>
      ["open", "pending", "assigned", "in_progress", "in-progress"].includes(
        p.status,
      ),
    );
    const hasCompletedProjects = data.projects.some(
      (p) => p.status === "completed",
    );

    if (!hasActiveScreening && data.projects.length === 0) return "draft";
    if (hasOpenProjects) return "running";
    if (hasCompletedProjects && !hasOpenProjects) return "completed";
    if (hasActiveScreening && !hasOpenProjects) return "paused";

    return "draft";
  };

  const getStatusBadge = (state: ExecutionState) => {
    switch (state) {
      case "draft":
        return { label: "Draft", color: "bg-slate-500/20 text-slate-400" };
      case "running":
        return {
          label: "Running",
          color: "bg-emerald-500/20 text-emerald-400",
        };
      case "paused":
        return { label: "Paused", color: "bg-amber-500/20 text-amber-400" };
      case "locked":
        return { label: "Locked", color: "bg-red-500/20 text-red-400" };
      case "completed":
        return { label: "Completed", color: "bg-blue-500/20 text-blue-400" };
      default:
        return { label: "Unknown", color: "bg-slate-500/20 text-slate-400" };
    }
  };

  // PATCH_62: Check if screening is valid (has questions)
  const isScreeningValid = (screening: Screening): boolean => {
    return screening.questions && screening.questions.length > 0;
  };

  // PATCH_62: Validation with REAL qualified worker check and empty screening detection
  const canPromoteCategory = (
    category: string,
  ): { valid: boolean; reason: string; details?: string } => {
    const data = linkageMap[category];
    if (!data) return { valid: false, reason: "Category not found" };

    const activeScreenings = data.screenings.filter((s) => s.active);
    if (activeScreenings.length === 0) {
      return {
        valid: false,
        reason: "No active screening",
        details: "Create a screening first",
      };
    }

    // PATCH_62 P0-2: Check if all active screenings have questions
    const invalidScreenings = activeScreenings.filter(
      (s) => !isScreeningValid(s),
    );
    if (invalidScreenings.length > 0) {
      return {
        valid: false,
        reason: "Invalid screenings",
        details: `${invalidScreenings.length} screening(s) have 0 questions`,
      };
    }

    // PATCH_62 P0-1: REAL qualified worker check (not stubbed)
    const qualifiedCount = qualifiedWorkerCounts[category] || 0;
    if (qualifiedCount === 0) {
      return {
        valid: false,
        reason: "No qualified workers",
        details: "0 workers have passed screening for this category",
      };
    }

    return {
      valid: true,
      reason: "Ready to create projects",
      details: `${qualifiedCount} qualified worker(s) available`,
    };
  };

  // Action: Navigate to create project for category
  const handlePromoteToProject = (category: string) => {
    const validation = canPromoteCategory(category);
    if (!validation.valid) {
      setError(validation.reason);
      return;
    }

    addActivity(`Navigating to create project for ${category}`, "success");
    window.location.href = `/admin/workspace/projects?action=create&category=${category}`;
  };

  // Clear messages
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  return (
    <div className="u-container max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">WS</span>
            <div>
              <h1 className="text-2xl font-bold">Master Workspace</h1>
              <p className="text-slate-400 text-sm">
                Orchestration & Control Center for Screenings and Projects
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="btn-secondary text-sm"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400"
          >
            Error: {error}
          </motion.div>
        )}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-4 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
          >
            Success: {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context Controller */}
      <div className="card mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-slate-400 text-sm font-medium">
              Context Mode:
            </span>
            <div className="flex bg-slate-800 rounded-lg p-1">
              <button
                onClick={() => setMode("screening")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === "screening"
                    ? "bg-cyan-700 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Screening Mode
              </button>
              <button
                onClick={() => setMode("project")}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  mode === "project"
                    ? "bg-purple-700 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Project Mode
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">
                {stats.activeScreenings}
              </span>
              <span className="text-slate-400">Active Screenings</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-amber-400 font-bold">
                {stats.openProjects}
              </span>
              <span className="text-slate-400">Open Projects</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400 font-bold">
                {stats.assignedProjects}
              </span>
              <span className="text-slate-400">Assigned</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">
                {stats.completedProjects}
              </span>
              <span className="text-slate-400">Completed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card text-center">
          <div className="text-3xl mb-2">Scr</div>
          <div className="text-2xl font-bold text-white">
            {stats.totalScreenings}
          </div>
          <div className="text-sm text-slate-400">Total Screenings</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-2">Prj</div>
          <div className="text-2xl font-bold text-white">
            {stats.totalProjects}
          </div>
          <div className="text-sm text-slate-400">Total Projects</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-2">...</div>
          <div className="text-2xl font-bold text-amber-400">
            {stats.draftProjects}
          </div>
          <div className="text-sm text-slate-400">Draft Projects</div>
        </div>
        <div className="card text-center">
          <div className="text-3xl mb-2">OK</div>
          <div className="text-2xl font-bold text-emerald-400">
            {stats.completedProjects}
          </div>
          <div className="text-sm text-slate-400">Completed</div>
        </div>
      </div>

      {/* Linkage & Traceability Panel */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          Linkage & Traceability
          <span className="text-xs text-slate-400 font-normal ml-2">
            (Implicit linking via Category)
          </span>
        </h2>

        {loading ? (
          <div className="text-center py-8 text-slate-400">
            Loading linkage data...
          </div>
        ) : (
          <div className="space-y-3">
            {/* PATCH_62 P1-5: Filter out empty categories */}
            {CATEGORIES.filter((cat) => {
              const data = linkageMap[cat.key];
              // Show category if it has any screenings OR projects
              return (
                data && (data.screenings.length > 0 || data.projects.length > 0)
              );
            }).map((cat) => {
              const data = linkageMap[cat.key];
              const executionState = getExecutionState(cat.key);
              const statusBadge = getStatusBadge(executionState);
              const promotion = canPromoteCategory(cat.key);
              const isSelected = selectedCategory === cat.key;
              // PATCH_62: Count invalid screenings (no questions)
              const invalidScreeningCount = data.screenings.filter(
                (s) => !isScreeningValid(s),
              ).length;
              const qualifiedCount = qualifiedWorkerCounts[cat.key] || 0;

              return (
                <motion.div
                  key={cat.key}
                  initial={false}
                  animate={{
                    backgroundColor: isSelected
                      ? "rgba(6, 182, 212, 0.1)"
                      : "transparent",
                  }}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-cyan-500/50"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                  onClick={() =>
                    setSelectedCategory(isSelected ? null : cat.key)
                  }
                >
                  <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <h3 className="font-medium text-white">{cat.label}</h3>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                          <span>
                            <span className="text-cyan-400 font-medium">
                              {data.screenings.length}
                            </span>{" "}
                            Screenings
                            {/* PATCH_62: Show invalid screening warning */}
                            {invalidScreeningCount > 0 && (
                              <span
                                className="ml-1 text-amber-400"
                                title={`${invalidScreeningCount} screening(s) have 0 questions`}
                              >
                                !
                              </span>
                            )}
                          </span>
                          <span>
                            <span className="text-purple-400 font-medium">
                              {data.projects.length}
                            </span>{" "}
                            Projects
                          </span>
                          {/* PATCH_62: Show qualified worker count */}
                          <span>
                            <span
                              className={`font-medium ${qualifiedCount > 0 ? "text-emerald-400" : "text-red-400"}`}
                            >
                              {qualifiedCount}
                            </span>{" "}
                            Qualified
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Execution State Badge */}
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${statusBadge.color}`}
                      >
                        {statusBadge.label}
                      </span>

                      {/* Action Button - Context Aware */}
                      {mode === "screening" ? (
                        <Link
                          href={`/admin/workspace/screenings?category=${cat.key}`}
                          className="btn-secondary text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View Screenings
                        </Link>
                      ) : (
                        <div className="relative group">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePromoteToProject(cat.key);
                            }}
                            disabled={!promotion.valid}
                            className={`text-sm px-3 py-1.5 rounded-lg transition-all ${
                              promotion.valid
                                ? "bg-purple-500 hover:bg-purple-600 text-white"
                                : "bg-slate-700 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            {promotion.valid
                              ? "➕ Create Project"
                              : "Not Ready"}
                          </button>
                          {/* PATCH_62: Detailed tooltip for disabled state */}
                          {!promotion.valid && (
                            <div className="absolute right-0 top-full mt-2 w-48 p-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
                              <div className="font-medium text-amber-400 mb-1">
                                {promotion.reason}
                              </div>
                              {promotion.details && (
                                <div className="text-slate-400">
                                  {promotion.details}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <AnimatePresence>
                    {isSelected && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-slate-700 grid md:grid-cols-2 gap-4">
                          {/* Screenings List */}
                          <div>
                            <h4 className="text-sm font-medium text-cyan-400 mb-2">
                              Screenings
                            </h4>
                            {data.screenings.length === 0 ? (
                              <p className="text-sm text-slate-400">
                                No screenings in this category
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {data.screenings.map((s) => {
                                  const isValid = isScreeningValid(s);
                                  return (
                                    <li
                                      key={s._id}
                                      className={`flex items-center justify-between rounded-lg p-2 ${
                                        isValid
                                          ? "bg-slate-800/50"
                                          : "bg-red-900/20 border border-red-500/30"
                                      }`}
                                    >
                                      <Link
                                        href={`/admin/workspace/screenings/${s._id}`}
                                        className="text-sm text-white hover:text-cyan-400 truncate flex items-center gap-2"
                                      >
                                        {s.title}
                                        {/* PATCH_62: Show warning for invalid screenings */}
                                        {!isValid && (
                                          <span
                                            className="text-red-400 text-xs"
                                            title="0 questions - invalid"
                                          >
                                            Invalid
                                          </span>
                                        )}
                                      </Link>
                                      <div className="flex items-center gap-2">
                                        {/* PATCH_62: Show question count */}
                                        <span className="text-xs text-slate-400">
                                          {s.questions?.length || 0} Q
                                        </span>
                                        <span
                                          className={`text-xs px-2 py-0.5 rounded ${
                                            !isValid
                                              ? "bg-red-500/20 text-red-400"
                                              : s.active
                                                ? "bg-emerald-500/20 text-emerald-400"
                                                : "bg-slate-600/20 text-slate-400"
                                          }`}
                                        >
                                          {!isValid
                                            ? "Invalid"
                                            : s.active
                                              ? "Active"
                                              : "Inactive"}
                                        </span>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                          </div>

                          {/* Projects List */}
                          <div>
                            <h4 className="text-sm font-medium text-purple-400 mb-2">
                              Projects
                            </h4>
                            {data.projects.length === 0 ? (
                              <p className="text-sm text-slate-400">
                                No projects in this category
                              </p>
                            ) : (
                              <ul className="space-y-2">
                                {data.projects.slice(0, 5).map((p) => (
                                  <li
                                    key={p._id}
                                    className="flex items-center justify-between bg-slate-800/50 rounded-lg p-2"
                                  >
                                    <Link
                                      href={`/admin/workspace/projects?action=view&id=${p._id}`}
                                      className="text-sm text-white hover:text-purple-400 truncate"
                                    >
                                      {p.title}
                                    </Link>
                                    <span
                                      className={`text-xs px-2 py-0.5 rounded ${
                                        p.status === "completed"
                                          ? "bg-emerald-500/20 text-emerald-400"
                                          : p.status === "assigned" ||
                                              p.status === "in_progress"
                                            ? "bg-purple-500/20 text-purple-400"
                                            : "bg-amber-500/20 text-amber-400"
                                      }`}
                                    >
                                      {p.status}
                                    </span>
                                  </li>
                                ))}
                                {data.projects.length > 5 && (
                                  <li className="text-xs text-slate-400 text-center">
                                    +{data.projects.length - 5} more
                                  </li>
                                )}
                              </ul>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Control Panel */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          Quick Actions
          <span className="text-xs text-slate-400 font-normal ml-2">
            (Permission-gated)
          </span>
        </h2>

        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/admin/workspace/screenings?action=create"
            className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10 border border-cyan-500/30 hover:border-cyan-500/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">New</span>
              <div>
                <h3 className="font-medium text-white">Create Screening</h3>
                <p className="text-xs text-slate-400">
                  Add new qualification test
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/workspace/projects?action=create"
            className="p-4 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-600/10 border border-purple-500/30 hover:border-purple-500/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">New</span>
              <div>
                <h3 className="font-medium text-white">Create Project</h3>
                <p className="text-xs text-slate-400">
                  Assign work to qualified workers
                </p>
              </div>
            </div>
          </Link>

          <Link
            href="/admin/workforce"
            className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 hover:border-emerald-500/50 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">WF</span>
              <div>
                <h3 className="font-medium text-white">Worker Pipeline</h3>
                <p className="text-xs text-slate-400">
                  Manage worker lifecycle
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Activity & State View */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          Recent Activity
          <span className="text-xs text-slate-400 font-normal ml-2">
            (Session log)
          </span>
        </h2>

        {activityLog.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">
            No activity yet this session
          </p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {activityLog.map((log, i) => (
              <div
                key={i}
                className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                  log.status === "success"
                    ? "bg-emerald-500/10"
                    : log.status === "warning"
                      ? "bg-amber-500/10"
                      : "bg-red-500/10"
                }`}
              >
                <span className="text-slate-300">{log.action}</span>
                <span className="text-xs text-slate-400">
                  {log.time.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documentation Notice - PATCH_62 Updated */}
      <div className="mt-6 p-4 rounded-xl bg-slate-800/50 border border-slate-700">
        <h3 className="text-sm font-medium text-slate-400 mb-2">
          PATCH_62: System Status
        </h3>
        <ul className="text-xs text-slate-400 space-y-1">
          <li>
            • Screenings and Projects are linked via{" "}
            <span className="text-cyan-400">category</span> field (implicit
            linkage)
          </li>
          <li>
            • Qualified workers are fetched from{" "}
            <span className="text-cyan-400">
              /api/admin/workspace/workers/qualified-count
            </span>
          </li>
          <li>
            • Screenings with 0 questions are marked{" "}
            <span className="text-amber-400">invalid</span> and blocked from
            promotion
          </li>
          <li>
            • "Create Project" is disabled if no qualified workers exist for the
            category
          </li>
          <li>
            • <span className="text-red-400">Lock/Unlock</span> functionality is{" "}
            <span className="text-red-400">NOT implemented</span> (backend
            endpoint not available)
          </li>
        </ul>
      </div>
    </div>
  );
}
