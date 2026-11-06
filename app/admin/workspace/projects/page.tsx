"use client";

import Link from "next/link";
import { useEffect, useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { apiRequest } from "@/lib/api";
import { getJobRoleCategoryLabel } from "@/lib/categoryLabels"; // PATCH_72
import ConfirmModal from "@/components/admin/v2/ConfirmModal";
import {
  ActionBar,
  AuditTrail,
  StatusTooltip,
  UndoToast,
  useUndoToast,
} from "@/components/admin/v2";

/**
 * PATCH_44: Admin Projects Management Page
 * PATCH_64: Enhanced with linked screenings, execution state, and controls
 * PATCH_66: Added confirmation modals for all actions
 * Create, view, assign, and manage work projects
 */

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
  earnings: number;
  earningsCredited?: number; // PATCH_48: Track if earnings were credited
  completionNotes?: string; // PATCH_48: Worker's completion notes
  proofApproved?: boolean; // PATCH_73: Track if proof was approved
  deadline?: string;
  createdAt: string;
  // PATCH_86: Job role linkage
  workPositionId?: {
    _id: string;
    title: string;
    category: string;
  } | null;
}

interface Worker {
  _id: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  jobId: {
    title: string;
  };
  status: string;
}

// PATCH_64: Screening interface for linkage
interface Screening {
  _id: string;
  title: string;
  category: string;
  active: boolean;
}

// PATCH_86: Job Role interface
interface JobRole {
  _id: string;
  title: string;
  category: string;
  hasScreening?: boolean;
  screeningId?: string;
  active: boolean;
}

function ProjectsContent() {
  const searchParams = useSearchParams();
  const showCreate = searchParams.get("action") === "create";
  const categoryParam = searchParams.get("category");
  const undoToast = useUndoToast();

  const [projects, setProjects] = useState<Project[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]); // PATCH_64: For linkage
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]); // PATCH_86: Job roles
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(showCreate);
  const [lastAssignedData, setLastAssignedData] = useState<{
    projectId: string;
    previousAssignee: string | null;
  } | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [showLinkedScreenings, setShowLinkedScreenings] = useState(false); // PATCH_64

  // Create form state - PATCH_86: Added workPositionId
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: categoryParam || "microjobs",
    priority: "medium",
    earnings: 0,
    deadline: "",
    screeningId: "", // PATCH_65.1: Link to screening test
    workPositionId: "", // PATCH_86: Job Role ID
    projectType: "standard", // PATCH_95: standard | rlhf_dataset
    datasetId: "", // PATCH_95: linked dataset
    rewardPerTask: 0, // PATCH_95: per-task reward
  });
  const [creating, setCreating] = useState(false);
  const [datasetOptions, setDatasetOptions] = useState<
    { _id: string; name: string; datasetType: string }[]
  >([]); // PATCH_95

  // Assign modal state
  const [assignModal, setAssignModal] = useState<Project | null>(null);
  const [selectedWorker, setSelectedWorker] = useState<string>("");
  const [assignConfirmOpen, setAssignConfirmOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // PATCH_57: Filter workers by category when assigning
  const [assignableWorkers, setAssignableWorkers] = useState<Worker[]>([]);

  // PATCH_48: Credit earnings modal state
  const [creditModal, setCreditModal] = useState<Project | null>(null);
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [creditRating, setCreditRating] = useState<number>(5);
  const [crediting, setCrediting] = useState(false);

  // PATCH_65.1: View/Edit project state
  const [viewModal, setViewModal] = useState<Project | null>(null);
  const [editModal, setEditModal] = useState<Project | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "microjobs",
    instructions: "",
    payRate: 0,
    payType: "per_task",
    deadline: "",
    status: "open",
    screeningId: "",
    screeningIds: [] as string[], // PATCH_88: Multiple screenings
  });
  const [updating, setUpdating] = useState(false);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewData, setViewData] = useState<any>(null);

  useEffect(() => {
    loadProjects();
    loadWorkers();
    loadScreenings(); // PATCH_64
    loadJobRoles(); // PATCH_86
    loadDatasets(); // PATCH_95
  }, [filter]);

  const loadProjects = async () => {
    setLoading(true);
    try {
      let url = `/api/admin/workspace/projects`;
      if (filter !== "all") {
        url += `?status=${filter}`;
      }
      const res = await apiRequest<any>(url, "GET", null, true);
      setProjects(res.projects || []);
    } catch (e: any) {
      setError(e.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const loadWorkers = async () => {
    try {
      // PATCH_57: Load workers who are ready to work (ready_to_work or assigned status)
      const res = await apiRequest<any>(
        "/api/admin/workspace/workers?limit=200",
        "GET",
        null,
        true,
      );
      // Filter to only workers who can receive tasks
      const allWorkers = res.workers || [];
      const readyWorkers = allWorkers.filter(
        (w: any) =>
          w.workerStatus === "ready_to_work" || w.workerStatus === "assigned",
      );
      setWorkers(readyWorkers);
    } catch (e) {
      console.error("Failed to load workers:", e);
    }
  };

  // PATCH_64: Load screenings for category linkage
  const loadScreenings = async () => {
    try {
      const res = await apiRequest<any>(
        "/api/admin/workspace/screenings",
        "GET",
        null,
        true,
      );
      setScreenings(res.screenings || []);
    } catch (e) {
      console.error("Failed to load screenings for linkage:", e);
    }
  };

  // PATCH_95: Load datasets for RLHF project linking
  const loadDatasets = async () => {
    try {
      const res = await apiRequest<any>(
        "/api/admin/datasets",
        "GET",
        null,
        true,
      );
      setDatasetOptions((res.datasets || []).filter((d: any) => d.isActive));
    } catch (e) {
      console.error("Failed to load datasets:", e);
    }
  };

  // PATCH_86: Load job roles for project assignment
  const loadJobRoles = async () => {
    try {
      const res = await apiRequest<any>(
        "/api/admin/work-positions",
        "GET",
        null,
        true,
      );
      const normalized = Array.isArray(res)
        ? res
        : res.positions || res.data || [];

      if (normalized.length > 0) {
        setJobRoles(normalized);
        return;
      }

      const publicRes = await apiRequest<any>(
        "/api/work-positions?active=true",
        "GET",
        null,
        true,
      );
      const publicList = Array.isArray(publicRes)
        ? publicRes
        : publicRes.positions || publicRes.data || [];
      setJobRoles(publicList);
    } catch (e) {
      console.error("Failed to load job roles:", e);
    }
  };

  // PATCH_64: Get linked screenings for a category
  const getLinkedScreenings = (category: string): Screening[] => {
    return screenings.filter((s) => s.category === category);
  };

  // PATCH_64: Get execution state for a project
  const getExecutionState = (
    project: Project,
  ): { state: string; color: string } => {
    switch (project.status) {
      case "draft":
        return { state: "Draft", color: "bg-slate-500/20 text-slate-400" };
      case "open":
      case "pending":
        return { state: "Open", color: "bg-amber-500/20 text-amber-400" };
      case "assigned":
        return { state: "Assigned", color: "bg-blue-500/20 text-blue-400" };
      case "in_progress":
      case "in-progress":
        return {
          state: "In Progress",
          color: "bg-purple-500/20 text-purple-400",
        };
      case "completed":
        return {
          state: "Completed",
          color: "bg-emerald-500/20 text-emerald-400",
        };
      case "cancelled":
        return { state: "Cancelled", color: "bg-red-500/20 text-red-400" };
      default:
        return {
          state: project.status,
          color: "bg-slate-500/20 text-slate-400",
        };
    }
  };

  // PATCH_64: Check if project is locked (completed or cancelled)
  const isProjectLocked = (project: Project): boolean => {
    return ["completed", "cancelled"].includes(project.status);
  };

  // PATCH_86: When assign modal opens, fetch eligible workers from backend
  // This ensures only workers who passed the required screening are shown
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [eligibilityInfo, setEligibilityInfo] = useState<{
    jobRole: string | null;
    requiresScreening: boolean;
  } | null>(null);

  useEffect(() => {
    if (assignModal) {
      // PATCH_86: Use backend endpoint to get eligible workers
      const loadEligibleWorkers = async () => {
        setLoadingEligible(true);
        try {
          const res = await apiRequest<any>(
            `/api/admin/workspace/project/${assignModal._id}/eligible-workers`,
            "GET",
            null,
            true,
          );
          if (res?.workers) {
            // Transform to match Worker interface
            // PATCH_92: Preserve both 'user' and 'userId' for dropdown display compatibility
            const eligible = res.workers.map((w: any) => ({
              _id: w._id,
              user: w.userId,
              userId: w.userId,
              jobId: w.position,
              category: w.position?.category || w.position?.title,
              status: w.workerStatus,
            }));
            setAssignableWorkers(eligible);
            setEligibilityInfo(res.eligibilityInfo || null);
          } else {
            // Fallback to category-based filtering
            const projectCategory = assignModal.category
              ?.toLowerCase()
              .replace(/[_-]/g, " ");
            const filtered = workers.filter((w: any) => {
              const workerCategory = (w.category || w.jobId?.category || "")
                .toLowerCase()
                .replace(/[_-]/g, " ");
              return (
                workerCategory.includes(projectCategory) ||
                projectCategory.includes(workerCategory) ||
                projectCategory === "microjobs" ||
                projectCategory === "other"
              );
            });
            setAssignableWorkers(filtered.length > 0 ? filtered : workers);
            setEligibilityInfo(null);
          }
        } catch (e) {
          console.error("Failed to load eligible workers:", e);
          // Fallback to all ready workers
          setAssignableWorkers(workers);
          setEligibilityInfo(null);
        } finally {
          setLoadingEligible(false);
        }
      };
      loadEligibleWorkers();
    } else {
      setAssignableWorkers([]);
      setEligibilityInfo(null);
    }
  }, [assignModal, workers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      await apiRequest("/api/admin/workspace/projects", "POST", form, true);
      setSuccess("Project created successfully!");
      setShowModal(false);
      setForm({
        title: "",
        description: "",
        category: "microjobs",
        priority: "medium",
        earnings: 0,
        deadline: "",
        screeningId: "",
        workPositionId: "", // PATCH_86
        projectType: "standard", // PATCH_95
        datasetId: "", // PATCH_95
        rewardPerTask: 0, // PATCH_95
      });
      loadProjects();
    } catch (e: any) {
      setError(e.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const handleAssign = async () => {
    if (!assignModal || !selectedWorker) return;
    setAssignConfirmOpen(true);
  };

  const executeAssign = async () => {
    if (!assignModal || !selectedWorker) return;
    setAssigning(true);

    const previousAssignee = assignModal.assignedTo?._id || null;
    const projectId = assignModal._id;

    try {
      await apiRequest(
        `/api/admin/workspace/project/${assignModal._id}/assign`,
        "PUT",
        { workerId: selectedWorker },
        true,
      );
      setSuccess(
        "Project assigned! Worker has been notified. Next: wait for proof submission.",
      );
      setLastAssignedData({ projectId, previousAssignee });
      setAssignModal(null);
      setSelectedWorker("");
      setAssignConfirmOpen(false);
      loadProjects();

      // PATCH_67: Show undo toast for assignment
      undoToast.showUndo("Project assigned", async () => {
        // Unassign by setting status back to pending
        await apiRequest(
          `/api/admin/workspace/project/${projectId}`,
          "PUT",
          { status: "pending", assignedTo: null },
          true,
        );
        setSuccess("Assignment undone");
        loadProjects();
      });
    } catch (e: any) {
      setError(e.message || "Failed to assign project");
    } finally {
      setAssigning(false);
    }
  };

  // PATCH_48: Handle credit earnings
  const handleCreditEarnings = async () => {
    if (!creditModal || creditAmount <= 0) return;

    setCrediting(true);
    try {
      await apiRequest(
        `/api/admin/workspace/project/${creditModal._id}/credit`,
        "PUT",
        { amount: creditAmount, rating: creditRating },
        true,
      );
      setSuccess(
        `$${creditAmount.toFixed(2)} credited! Project is now complete. Worker is available for new assignments.`,
      );
      setCreditModal(null);
      setCreditAmount(0);
      setCreditRating(5);
      loadProjects();
    } catch (e: any) {
      setError(e.message || "Failed to credit earnings");
    } finally {
      setCrediting(false);
    }
  };

  // PATCH_65.1: View project details
  const handleViewProject = async (project: Project) => {
    setViewModal(project);
    setViewLoading(true);
    try {
      const res = await apiRequest<any>(
        `/api/admin/workspace/project/${project._id}`,
        "GET",
        null,
        true,
      );
      setViewData(res);
    } catch (e: any) {
      setError(e.message || "Failed to load project details");
      setViewModal(null);
    } finally {
      setViewLoading(false);
    }
  };

  // PATCH_65.1: Open edit modal with project data
  const handleOpenEdit = (project: Project) => {
    setEditForm({
      title: project.title || "",
      description: project.description || "",
      category: project.category || "microjobs",
      instructions: (project as any).instructions || "",
      payRate: project.earnings || 0,
      payType: (project as any).payType || "per_task",
      deadline: project.deadline ? project.deadline.split("T")[0] : "",
      status: project.status || "open",
      screeningId:
        (project as any).screeningId?._id || (project as any).screeningId || "",
      screeningIds: ((project as any).screeningIds || [])
        .map((s: any) => (typeof s === "string" ? s : s._id))
        .filter(Boolean),
    });
    setEditModal(project);
  };

  // PATCH_65.1: Handle update project
  const handleUpdateProject = async () => {
    if (!editModal) return;

    setUpdating(true);
    setError(null);
    try {
      await apiRequest(
        `/api/admin/workspace/project/${editModal._id}`,
        "PUT",
        {
          ...editForm,
          screeningId: editForm.screeningIds[0] || editForm.screeningId || null,
        },
        true,
      );
      setSuccess("Project updated successfully!");
      setEditModal(null);
      loadProjects();
    } catch (e: any) {
      setError(e.message || "Failed to update project");
    } finally {
      setUpdating(false);
    }
  };

  // PATCH_65.1: Handle delete project
  const handleDeleteProject = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.title}"?`)) return;

    try {
      await apiRequest(
        `/api/admin/workspace/project/${project._id}`,
        "DELETE",
        null,
        true,
      );
      setSuccess("Project deleted successfully!");
      loadProjects();
    } catch (e: any) {
      setError(e.message || "Failed to delete project");
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-500/20 text-amber-400",
      assigned: "bg-blue-500/20 text-blue-400",
      "in-progress": "bg-purple-500/20 text-purple-400",
      completed: "bg-emerald-500/20 text-emerald-400",
      cancelled: "bg-red-500/20 text-red-400",
    };
    return styles[status] || "bg-slate-500/20 text-slate-400";
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: "text-slate-400",
      medium: "text-blue-400",
      high: "text-amber-400",
      urgent: "text-red-400",
    };
    return styles[priority] || "text-slate-400";
  };

  return (
    <div className="u-container max-w-6xl">
      {/* PATCH_79: Header with Clear Purpose */}
      <div className="mb-6">
        <Link
          href="/admin/workspace/master"
          className="text-sm text-slate-400 hover:text-white mb-2 inline-block"
        >
          ← Master Workspace
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📋</span>
            <div>
              <h1 className="text-2xl font-bold">Projects</h1>
              <p className="text-slate-400 text-sm">
                Manage actual paid work assigned to workers
                {categoryParam && (
                  <span className="ml-2 text-purple-400">
                    (Category: {getJobRoleCategoryLabel(categoryParam)})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowModal(true)} className="btn-primary">
              + Create Project
            </button>
          </div>
        </div>
      </div>

      {/* PATCH_79: Flow Rules Banner */}
      <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 via-slate-800/50 to-purple-500/10 border border-cyan-500/20">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔒</span>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white mb-1">
              Project Flow Rules (Cannot Be Skipped):
            </h3>
            <ul className="text-sm text-slate-300 space-y-1">
              <li>
                • <span className="text-emerald-400">Assign Worker:</span> Only
                workers with{" "}
                <span className="font-medium">"Ready to Work"</span> status can
                be assigned
              </li>
              <li>
                • <span className="text-amber-400">Proof Required:</span> Worker
                must submit proof of work before project can be marked complete
              </li>
              <li>
                • <span className="text-cyan-400">Credit Wallet:</span> Only
                visible after proof is approved → Credits worker's wallet
              </li>
              <li>
                • <span className="text-slate-400">🔒 Completed:</span> Once
                credited, project is locked (cannot be undone)
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* PATCH_64: Linked Screenings Panel */}
      {showLinkedScreenings && (
        <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            🔗 Screenings Linked by Category
            <span className="text-xs text-slate-400 font-normal">
              (Implicit linkage via category)
            </span>
          </h3>
          {screenings.length === 0 ? (
            <p className="text-sm text-slate-400">
              No screenings found.{" "}
              <Link
                href="/admin/workspace/screenings?action=create"
                className="text-cyan-400 hover:underline"
              >
                Create one →
              </Link>
            </p>
          ) : (
            <div className="grid md:grid-cols-3 gap-3">
              {screenings.map((s) => (
                <Link
                  key={s._id}
                  href={`/admin/workspace/screenings?id=${s._id}`}
                  className="p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white truncate">
                      {s.title}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${s.active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-600/20 text-slate-400"}`}
                    >
                      {s.active ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Category:{" "}
                    <span className="text-purple-400">
                      {getJobRoleCategoryLabel(s.category)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PATCH_63: Contextual Guidance Banner for Projects */}
      {!loading && (
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 via-slate-800/50 to-blue-500/10 border border-cyan-500/20">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📦</span>
            <div className="flex-1">
              <h3 className="break-words text-sm font-semibold text-white mb-1">
                Project Workflow:
              </h3>
              <ul className="text-sm text-slate-300 space-y-1">
                {projects.filter((p) => p.status === "pending" && !p.assignedTo)
                  .length > 0 && (
                  <li>
                    •{" "}
                    <span className="text-amber-400 font-medium">
                      {
                        projects.filter(
                          (p) => p.status === "pending" && !p.assignedTo,
                        ).length
                      }{" "}
                      unassigned project
                      {projects.filter(
                        (p) => p.status === "pending" && !p.assignedTo,
                      ).length > 1
                        ? "s"
                        : ""}
                    </span>{" "}
                    → Click "Assign" to give to a ready worker
                  </li>
                )}
                {projects.filter(
                  (p) => p.status === "in-progress" || p.status === "assigned",
                ).length > 0 && (
                  <li>
                    •{" "}
                    <span className="text-purple-400 font-medium">
                      {
                        projects.filter(
                          (p) =>
                            p.status === "in-progress" ||
                            p.status === "assigned",
                        ).length
                      }{" "}
                      project
                      {projects.filter(
                        (p) =>
                          p.status === "in-progress" || p.status === "assigned",
                      ).length > 1
                        ? "s"
                        : ""}{" "}
                      in progress
                    </span>{" "}
                    → Workers are completing the work
                  </li>
                )}
                {projects.filter(
                  (p) => p.status === "completed" && !p.earningsCredited,
                ).length > 0 && (
                  <li>
                    •{" "}
                    <span className="text-emerald-400 font-medium">
                      {
                        projects.filter(
                          (p) =>
                            p.status === "completed" && !p.earningsCredited,
                        ).length
                      }{" "}
                      completed
                    </span>{" "}
                    → Click "Credit Earnings" to pay the worker
                  </li>
                )}
                {projects.length === 0 && (
                  <li className="text-slate-400">
                    No projects yet. Click "+ Create Project" to get started.
                  </li>
                )}
              </ul>
              <p className="text-xs text-slate-500 mt-2">
                💡 Tip: Workers must be in "Ready to Work" status before they
                can be assigned projects.
                <Link
                  href="/admin/workforce"
                  className="text-cyan-400 hover:underline ml-1"
                >
                  Check Worker Pipeline →
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      {success && (
        <div className="p-4 mb-6 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
          {success}
        </div>
      )}
      {error && (
        <div className="p-4 mb-6 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {["all", "pending", "assigned", "in-progress", "completed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-blue-600 text-white"
                : "bg-white/5 text-slate-400 hover:bg-white/10"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1).replace("-", " ")}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12 text-slate-400">
          Loading projects...
        </div>
      )}

      {/* Projects List */}
      {!loading && projects.length > 0 && (
        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project._id}
              className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="flex flex-col items-start justify-between gap-4 xl:flex-row">
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-white">
                      {project.title}
                    </h3>
                    <StatusTooltip status={project.status}>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(
                          project.status,
                        )}`}
                      >
                        {project.status}
                      </span>
                    </StatusTooltip>
                    <span
                      className={`text-xs ${getPriorityBadge(project.priority)}`}
                    >
                      ● {project.priority}
                    </span>
                    {/* PATCH_97: Project type badge — clear labeling */}
                    {(project as any).projectType === "rlhf_dataset" ? (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400 border border-purple-500/30 font-medium">
                        AI Dataset
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-500/20 text-slate-400 border border-slate-500/30 font-medium">
                        Microjob
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 line-clamp-2">
                    {project.description}
                  </p>
                  {/* PATCH_86: Show job role if linked */}
                  {project.workPositionId && (
                    <p className="text-xs text-cyan-400 mt-1">
                      🎯 Job Role: {project.workPositionId?.title || "Linked"}
                    </p>
                  )}
                  {project.assignedTo && (
                    <p className="text-xs text-slate-500 mt-2">
                      Assigned to: {project.assignedTo.firstName}{" "}
                      {project.assignedTo.lastName}
                    </p>
                  )}
                </div>

                <div className="flex max-w-full flex-wrap items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-400">
                      ${project.earnings?.toFixed(2) || "0.00"}
                    </p>
                    <p className="text-xs text-slate-500">Payout</p>
                  </div>

                  {/* PATCH_65.1: View/Edit/Delete buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleViewProject(project)}
                      className="px-3 py-1.5 text-xs bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition"
                      title="View project details"
                    >
                      👁️ View
                    </button>
                    {!["completed", "cancelled"].includes(project.status) && (
                      <button
                        onClick={() => handleOpenEdit(project)}
                        className="px-3 py-1.5 text-xs bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-lg transition"
                        title="Edit project"
                      >
                        ✏️ Edit
                      </button>
                    )}
                    {["draft", "open", "pending"].includes(project.status) && (
                      <button
                        onClick={() => handleDeleteProject(project)}
                        className="px-3 py-1.5 text-xs bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition"
                        title="Delete project"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  {(project.status === "pending" ||
                    project.status === "open") && (
                    <button
                      onClick={() => setAssignModal(project)}
                      className="btn-secondary text-sm"
                    >
                      Assign
                    </button>
                  )}
                  {/* PATCH_48: Credit button for completed projects */}
                  {/* PATCH_73: Only show credit if proof was approved */}
                  {project.status === "completed" &&
                    !project.earningsCredited &&
                    (project as any).proofApproved && (
                      <button
                        onClick={() => {
                          setCreditModal(project);
                          setCreditAmount(project.earnings || 0);
                        }}
                        className="btn-primary text-sm"
                      >
                        💰 Credit
                      </button>
                    )}
                  {project.status === "completed" &&
                    project.earningsCredited && (
                      <span className="text-xs text-emerald-400">
                        ✅ Credited
                      </span>
                    )}
                  {/* PATCH_74: Terminal state finality indicators */}
                  {project.status === "completed" &&
                    project.earningsCredited && (
                      <span className="text-xs text-slate-500 ml-2">
                        🔒 Final
                      </span>
                    )}
                  {project.status === "cancelled" && (
                    <span className="text-xs text-slate-500 ml-2">
                      🔒 Cancelled
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State - PATCH_63: Enhanced with helpful guidance */}
      {!loading && projects.length === 0 && (
        <div className="text-center py-12 card">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-semibold text-white mb-2">
            No Projects Yet
          </h3>
          <p className="text-slate-400 mb-4 max-w-md mx-auto">
            Projects are paid work tasks assigned to qualified workers. Create a
            project, then assign it to a worker who has passed their screening
            test.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary mb-4"
          >
            + Create Your First Project
          </button>
          <div className="text-sm text-slate-500 space-y-1">
            <p>Before assigning projects, make sure you have:</p>
            <p>
              1.{" "}
              <Link
                href="/admin/work-positions"
                className="text-cyan-400 hover:underline"
              >
                Job Roles
              </Link>{" "}
              set up with screening
            </p>
            <p>
              2. Workers who passed screening in{" "}
              <Link
                href="/admin/workforce"
                className="text-cyan-400 hover:underline"
              >
                "Ready to Work"
              </Link>{" "}
              status
            </p>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <h2 className="text-xl font-bold mb-4">Create Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  className="input w-full h-24 resize-none"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="input w-full"
                  >
                    <option value="microjobs">Microjobs</option>
                    <option value="data-entry">Data Entry</option>
                    <option value="content">Content</option>
                    <option value="research">Research</option>
                    <option value="writing">Writing</option>
                    <option value="teaching">Teaching</option>
                    <option value="coding_math">Coding & Math</option>
                    <option value="outlier">Outlier</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Priority
                  </label>
                  <select
                    value={form.priority}
                    onChange={(e) =>
                      setForm({ ...form, priority: e.target.value })
                    }
                    className="input w-full"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* PATCH_86: Job Role Selection - PRIMARY LINK */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Job Role <span className="text-amber-400">*</span>
                </label>
                <select
                  value={form.workPositionId}
                  onChange={(e) => {
                    const selectedRole = jobRoles.find(
                      (j) => j._id === e.target.value,
                    );
                    setForm({
                      ...form,
                      workPositionId: e.target.value,
                      // Auto-set category from job role
                      category: selectedRole?.category || form.category,
                      // Auto-link screening if job role has one
                      screeningId: selectedRole?.screeningId || "",
                    });
                  }}
                  className="input w-full"
                  required
                  disabled={jobRoles.length === 0}
                >
                  <option value="">-- Select Job Role --</option>
                  {jobRoles.map((j) => (
                    <option key={j._id} value={j._id}>
                      {j.title} ({j.category})
                      {j.hasScreening ? " [Requires Screening]" : ""}
                    </option>
                  ))}
                </select>
                {jobRoles.length === 0 ? (
                  <p className="text-xs text-amber-300 mt-1">
                    No job roles available. Create one in the{" "}
                    <Link
                      href="/admin/work-positions"
                      className="text-cyan-400 hover:underline"
                    >
                      Job Roles
                    </Link>{" "}
                    page.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
                    Projects are assigned to workers in this job role. Workers
                    must pass the job role&apos;s screening test to be eligible.
                  </p>
                )}
              </div>

              {/* PATCH_65.1: Linked Screening Selection */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Required Screening Test
                </label>
                <select
                  value={(form as any).screeningId || ""}
                  onChange={(e) =>
                    setForm({ ...form, screeningId: e.target.value } as any)
                  }
                  className="input w-full"
                >
                  <option value="">No screening required</option>
                  {screenings
                    .filter((s) => s.category === form.category || !s.category)
                    .map((s) => (
                      <option key={s._id} value={s._id}>
                        {s.title} ({s.category})
                      </option>
                    ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">
                  Only workers who passed this screening can be assigned
                </p>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Instructions
                </label>
                <textarea
                  value={(form as any).instructions || ""}
                  onChange={(e) =>
                    setForm({ ...form, instructions: e.target.value } as any)
                  }
                  className="input w-full h-20 resize-none"
                  placeholder="Detailed instructions for the worker..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Payout ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.earnings}
                    onChange={(e) =>
                      setForm({ ...form, earnings: parseFloat(e.target.value) })
                    }
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Deadline
                  </label>
                  <input
                    type="date"
                    value={form.deadline}
                    onChange={(e) =>
                      setForm({ ...form, deadline: e.target.value })
                    }
                    className="input w-full"
                  />
                </div>
              </div>

              {/* PATCH_95: Project Type & Dataset Linking */}
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Project Type
                </label>
                <select
                  value={form.projectType}
                  onChange={(e) =>
                    setForm({ ...form, projectType: e.target.value })
                  }
                  className="input w-full"
                >
                  <option value="standard">Microjob (Proof-based)</option>
                  <option value="rlhf_dataset">AI Dataset (Task-based)</option>
                </select>
              </div>
              {form.projectType === "rlhf_dataset" && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Linked Dataset <span className="text-amber-400">*</span>
                    </label>
                    <select
                      value={form.datasetId}
                      onChange={(e) =>
                        setForm({ ...form, datasetId: e.target.value })
                      }
                      className="input w-full"
                      required
                    >
                      <option value="">-- Select Dataset --</option>
                      {datasetOptions.map((ds) => (
                        <option key={ds._id} value={ds._id}>
                          {ds.name} ({ds.datasetType})
                        </option>
                      ))}
                    </select>
                    {datasetOptions.length === 0 && (
                      <p className="text-xs text-amber-300 mt-1">
                        No active datasets. Create one in RLHF Datasets page
                        first.
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">
                      Reward Per Task ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.rewardPerTask}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          rewardPerTask: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="input w-full"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Credited to worker per approved task
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-primary flex-1"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Modal - PATCH_86: Eligibility-aware worker selection */}
      {assignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <h2 className="text-xl font-bold mb-2">Assign Project</h2>
            <p className="text-sm text-slate-400 mb-2">
              Assign &quot;{assignModal.title}&quot; to a worker
            </p>

            {/* PATCH_86: Show eligibility requirements */}
            <div className="mb-4 p-3 bg-slate-800 rounded-lg border border-slate-700">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">
                Eligibility Requirements
              </div>
              <div className="space-y-1 text-sm">
                {eligibilityInfo?.jobRole ? (
                  <p className="text-emerald-400">
                    ✓ Job Role: {eligibilityInfo.jobRole}
                  </p>
                ) : (
                  <p className="text-slate-400">
                    📁 Category: {getJobRoleCategoryLabel(assignModal.category)}
                  </p>
                )}
                {eligibilityInfo?.requiresScreening ? (
                  <p className="text-amber-400">
                    🔒 Requires: Passed screening test
                  </p>
                ) : (
                  <p className="text-slate-500">• No screening required</p>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">
                Select Eligible Worker (
                {loadingEligible ? "..." : assignableWorkers.length} available)
              </label>
              {loadingEligible ? (
                <div className="p-4 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-sm flex items-center gap-2">
                  <span className="animate-spin">⏳</span> Loading eligible
                  workers...
                </div>
              ) : assignableWorkers.length === 0 ? (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-sm">
                  ⚠️ No eligible workers found.
                  {eligibilityInfo?.requiresScreening ? (
                    <span>
                      {" "}
                      Workers must pass the required screening for this job
                      role.
                    </span>
                  ) : (
                    <span>
                      {" "}
                      Workers need &quot;ready_to_work&quot; status to be
                      assigned.
                    </span>
                  )}
                </div>
              ) : (
                <select
                  value={selectedWorker}
                  onChange={(e) => setSelectedWorker(e.target.value)}
                  className="input w-full"
                >
                  <option value="">Choose a worker...</option>
                  {assignableWorkers.map((w: any) => (
                    <option key={w._id} value={w._id}>
                      {w.user?.name ||
                        w.userId?.name ||
                        `${w.userId?.firstName || ""} ${w.userId?.lastName || ""}`.trim() ||
                        w.userId?.email ||
                        "Worker"}{" "}
                      -{" "}
                      {w.category ||
                        w.jobId?.title ||
                        w.jobId?.category ||
                        "Worker"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* PATCH_66: Preview of what will happen */}
            {selectedWorker && (
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="text-xs text-blue-400 uppercase tracking-wider mb-2">
                  What will happen:
                </div>
                <ul className="text-sm text-blue-200 space-y-1">
                  <li>✓ Project status will change to "Assigned"</li>
                  <li>✓ Worker will be notified of new assignment</li>
                  <li>✓ Worker status will update to "Working"</li>
                </ul>
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setAssignModal(null);
                  setSelectedWorker("");
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={
                  !selectedWorker ||
                  assignableWorkers.length === 0 ||
                  loadingEligible
                }
                className="btn-primary flex-1 disabled:opacity-50"
              >
                Assign Worker
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PATCH_66: Confirm Assignment Modal */}
      <ConfirmModal
        open={assignConfirmOpen}
        onClose={() => setAssignConfirmOpen(false)}
        onConfirm={executeAssign}
        title="Confirm Worker Assignment"
        description={`You are about to assign "${assignModal?.title || "this project"}" to the selected worker. The worker will be notified immediately.`}
        variant="info"
        loading={assigning}
        confirmLabel="Confirm Assignment"
        preview={
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Project:</span>
              <span className="text-white">{assignModal?.title}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Earnings:</span>
              <span className="text-emerald-400">
                ${assignModal?.earnings || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">New Status:</span>
              <span className="text-blue-400">Assigned → Working</span>
            </div>
          </div>
        }
      />

      {/* PATCH_48: Credit Earnings Modal */}
      {creditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
            <h2 className="text-xl font-bold mb-2">💰 Credit Earnings</h2>
            <p className="text-sm text-slate-400 mb-4">
              Credit earnings for &quot;{creditModal.title}&quot;
            </p>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={creditAmount}
                onChange={(e) =>
                  setCreditAmount(parseFloat(e.target.value) || 0)
                }
                className="input w-full"
              />
              <p className="text-xs text-slate-500 mt-1">
                Default payout: ${creditModal.earnings?.toFixed(2) || "0.00"}
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">
                Rating (1-5 stars)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setCreditRating(star)}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      star <= creditRating
                        ? "grayscale-0"
                        : "grayscale opacity-30"
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setCreditModal(null);
                  setCreditAmount(0);
                  setCreditRating(5);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreditEarnings}
                disabled={crediting || creditAmount <= 0}
                className="btn-primary flex-1 disabled:opacity-50"
              >
                {crediting
                  ? "Crediting..."
                  : `Credit $${creditAmount.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PATCH_65.1: View Project Modal */}
      {viewModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                Project Details
              </h2>
              <button
                onClick={() => {
                  setViewModal(null);
                  setViewData(null);
                }}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {viewLoading ? (
              <div className="text-center py-8 text-slate-400">
                Loading project details...
              </div>
            ) : viewData ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">
                    {viewData.project?.title}
                  </h3>
                  <div className="flex gap-2 mt-2">
                    <StatusTooltip
                      status={viewData.project?.status || "unknown"}
                    >
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs ${getStatusBadge(viewData.project?.status)}`}
                      >
                        {viewData.project?.status}
                      </span>
                    </StatusTooltip>
                    <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700 text-slate-300">
                      {getJobRoleCategoryLabel(viewData.project?.category)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-400">Pay Rate</p>
                    <p className="text-lg font-semibold text-emerald-400">
                      ${viewData.project?.payRate?.toFixed(2) || "0.00"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {viewData.project?.payType || "per_task"}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <p className="text-xs text-slate-400">Earnings Credited</p>
                    <p className="text-lg font-semibold text-cyan-400">
                      $
                      {viewData.project?.earningsCredited?.toFixed(2) || "0.00"}
                    </p>
                    {viewData.project?.creditedAt && (
                      <p className="text-xs text-slate-500">
                        {new Date(
                          viewData.project.creditedAt,
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {viewData.project?.description && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Description</p>
                    <p className="text-sm text-slate-300">
                      {viewData.project.description}
                    </p>
                  </div>
                )}

                {viewData.project?.instructions && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Instructions</p>
                    <p className="text-sm text-slate-300 whitespace-pre-wrap">
                      {viewData.project.instructions}
                    </p>
                  </div>
                )}

                {viewData.workerProfile && (
                  <div className="p-3 bg-cyan-900/20 border border-cyan-500/20 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">
                      Assigned Worker
                    </p>
                    <p className="text-sm text-white">
                      {viewData.workerProfile.user?.firstName || "Unknown"}{" "}
                      {viewData.workerProfile.user?.lastName || "Worker"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {viewData.workerProfile.user?.email || "No email"}
                    </p>
                    <p className="text-xs text-cyan-400 mt-1">
                      Status: {viewData.workerProfile.workerStatus || "N/A"}
                    </p>
                  </div>
                )}

                {viewData.proofs && viewData.proofs.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 mb-2">
                      Proofs of Work ({viewData.proofs.length})
                    </p>
                    <div className="space-y-2">
                      {viewData.proofs.map((proof: any) => (
                        <div
                          key={proof._id}
                          className="p-2 bg-slate-700/50 rounded-lg"
                        >
                          <div className="flex items-center justify-between">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs ${
                                proof.status === "approved"
                                  ? "bg-emerald-500/20 text-emerald-400"
                                  : proof.status === "rejected"
                                    ? "bg-red-500/20 text-red-400"
                                    : "bg-amber-500/20 text-amber-400"
                              }`}
                            >
                              {proof.status}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(proof.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {proof.notes && (
                            <p className="text-xs text-slate-300 mt-1">
                              {proof.notes}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4 border-t border-slate-700">
                  <button
                    onClick={() => {
                      setViewModal(null);
                      setViewData(null);
                    }}
                    className="btn-secondary flex-1"
                  >
                    Close
                  </button>
                  {!["completed", "cancelled"].includes(
                    viewData.project?.status,
                  ) && (
                    <button
                      onClick={() => {
                        setViewModal(null);
                        setViewData(null);
                        handleOpenEdit(viewData.project);
                      }}
                      className="btn-primary flex-1"
                    >
                      ✏️ Edit Project
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-red-400">
                Failed to load project details
              </div>
            )}
          </div>
        </div>
      )}

      {/* PATCH_65.1: Edit Project Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Edit Project</h2>
              <button
                onClick={() => setEditModal(null)}
                className="text-slate-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleUpdateProject();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) =>
                    setEditForm({ ...editForm, title: e.target.value })
                  }
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Description
                </label>
                <textarea
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm({ ...editForm, description: e.target.value })
                  }
                  className="input w-full"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, category: e.target.value })
                    }
                    className="input w-full"
                  >
                    <option value="microjobs">Microjobs</option>
                    <option value="writing">Writing</option>
                    <option value="teaching">Teaching</option>
                    <option value="coding_math">Coding & Math</option>
                    <option value="outlier">Outlier</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Status
                  </label>
                  {/* PATCH_73: Removed 'completed' - completion must occur via proof approval */}
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm({ ...editForm, status: e.target.value })
                    }
                    className="input w-full"
                  >
                    <option value="draft">Draft</option>
                    <option value="open">Open</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Pay Rate ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.payRate}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        payRate: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1">
                    Pay Type
                  </label>
                  <select
                    value={editForm.payType}
                    onChange={(e) =>
                      setEditForm({ ...editForm, payType: e.target.value })
                    }
                    className="input w-full"
                  >
                    <option value="per_task">Per Task</option>
                    <option value="hourly">Hourly</option>
                    <option value="fixed">Fixed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Required Screening Tests
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto p-2 rounded-lg bg-black/20 border border-white/10">
                  {screenings.length === 0 ? (
                    <p className="text-xs text-slate-500 p-2">
                      No screening tests available
                    </p>
                  ) : (
                    screenings
                      .filter(
                        (s) => s.category === editForm.category || !s.category,
                      )
                      .map((s) => (
                        <label
                          key={s._id}
                          className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
                            editForm.screeningIds.includes(s._id)
                              ? "bg-purple-500/20 border border-purple-500/30"
                              : "hover:bg-white/5"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={editForm.screeningIds.includes(s._id)}
                            onChange={() => {
                              const ids = editForm.screeningIds.includes(s._id)
                                ? editForm.screeningIds.filter(
                                    (id) => id !== s._id,
                                  )
                                : [...editForm.screeningIds, s._id];
                              setEditForm({
                                ...editForm,
                                screeningIds: ids,
                                screeningId: ids[0] || "",
                              });
                            }}
                            className="rounded border-white/20"
                          />
                          <span className="text-sm">
                            {s.title}{" "}
                            <span className="text-slate-500">
                              ({s.category})
                            </span>
                          </span>
                        </label>
                      ))
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Workers must pass ALL selected tests to be eligible for this
                  project
                </p>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Instructions
                </label>
                <textarea
                  value={editForm.instructions}
                  onChange={(e) =>
                    setEditForm({ ...editForm, instructions: e.target.value })
                  }
                  className="input w-full"
                  rows={4}
                  placeholder="Detailed instructions for the worker..."
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Deadline
                </label>
                <input
                  type="date"
                  value={editForm.deadline}
                  onChange={(e) =>
                    setEditForm({ ...editForm, deadline: e.target.value })
                  }
                  className="input w-full"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditModal(null)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !editForm.title}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PATCH_67: UndoToast for assignment actions */}
      <UndoToast
        show={undoToast.show}
        message={undoToast.message}
        onUndo={undoToast.handleUndo}
        onExpire={undoToast.handleExpire}
      />
    </div>
  );
}

export default function AdminProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="u-container max-w-6xl text-center py-12">
          Loading...
        </div>
      }
    >
      <ProjectsContent />
    </Suspense>
  );
}
