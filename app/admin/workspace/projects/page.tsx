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
  priority?: string;
  projectType?: string;
  datasetId?: string | { _id: string; name: string } | null;
  rewardPerTask?: number;
  deliverables?: Deliverable[];
  estimatedTasks?: number;
  assignedTo?: {
    _id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
  };
  payRate: number;
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
    name?: string;
    firstName?: string;
    lastName?: string;
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

type Deliverable = { title: string; description: string; required: boolean };
type DeliveryFields = { projectType: string; datasetId: string; rewardPerTask: number; estimatedTasks: number; deliverables: Deliverable[] };

function ProjectDeliveryFields({ fields, datasets, onChange }: {
  fields: DeliveryFields; datasets: { _id: string; name: string }[]; onChange: (change: Partial<DeliveryFields>) => void;
}) {
  return <fieldset className="space-y-3">
    <legend className="font-medium">Work specification</legend>
    <p className="text-sm text-slate-400">Deliverables the worker will see</p>
    {fields.deliverables.map((item, i) => {
      const changeItem = (patch: Partial<Deliverable>) => onChange({ deliverables: fields.deliverables.map((row, ix) => ix === i ? { ...row, ...patch } : row) });
      return <fieldset key={i} className="border border-white/15 rounded p-3 space-y-2">
        <legend>Deliverable {i + 1}</legend>
        <label className="block">Title<input required className="input w-full" value={item.title} onChange={e => changeItem({ title: e.target.value })} /></label>
        <label className="block">Description<textarea className="input w-full" value={item.description} onChange={e => changeItem({ description: e.target.value })} /></label>
        <label className="block"><input type="checkbox" checked={item.required} onChange={e => changeItem({ required: e.target.checked })} /> Required</label>
        <button type="button" className="btn-secondary" onClick={() => onChange({ deliverables: fields.deliverables.filter((_, ix) => ix !== i) })}>Remove deliverable {i + 1}</button>
      </fieldset>;
    })}
    <button type="button" className="btn-secondary" onClick={() => onChange({ deliverables: [...fields.deliverables, { title: "", description: "", required: true }] })}>Add deliverable</button>
    <label className="block">Estimated tasks
      <input type="number" min="1" step="1" required className="input w-full" value={fields.estimatedTasks} onChange={e => onChange({ estimatedTasks: Number(e.target.value) })} />
    </label>
    <label className="block">Project type
      <select className="input w-full" value={fields.projectType} onChange={e => onChange({ projectType: e.target.value, datasetId: "", rewardPerTask: 0 })}>
        <option value="standard">Standard project</option><option value="rlhf_dataset">Dataset annotation</option>
      </select>
    </label>
    {fields.projectType === "rlhf_dataset" && <>
      <label className="block">Dataset
        <select required className="input w-full" value={fields.datasetId} onChange={e => onChange({ datasetId: e.target.value })}>
          <option value="">Choose a dataset</option>
          {fields.datasetId && !datasets.some(row => row._id === fields.datasetId) && <option value={fields.datasetId}>Previously linked dataset</option>}
          {datasets.map(row => <option key={row._id} value={row._id}>{row.name}</option>)}
        </select>
      </label>
      <label className="block">Reward per task (USD)
        <input type="number" min="0" step="0.01" required className="input w-full" value={fields.rewardPerTask} onChange={e => onChange({rewardPerTask: Number(e.target.value)})} />
      </label>
    </>}
  </fieldset>;
}

function ProjectsContent() {
  const searchParams = useSearchParams();
  const showCreate = searchParams.get("action") === "create";
  const linkedProject = searchParams.get("action") === "view" ? searchParams.get("id") : null;
  const categoryParam = searchParams.get("category");

  const [projects, setProjects] = useState<Project[]>([]);
  const [screenings, setScreenings] = useState<Screening[]>([]); // PATCH_64: For linkage
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]); // PATCH_86: Job roles
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(showCreate);
  const [filter, setFilter] = useState<string>("all");
  const [showLinkedScreenings, setShowLinkedScreenings] = useState(false); // PATCH_64

  // Create form state - PATCH_86: Added workPositionId
  const [form, setForm] = useState({
    payType: "per_task", deliverables: [] as Deliverable[], screeningIds: [] as string[], instructions: "",
    title: "",
    description: "",
    category: categoryParam || "microjobs",
    priority: "medium",
    estimatedTasks: 1,
    payRate: 0,
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
    deliverables: [] as Deliverable[],
    title: "",
    description: "",
    category: "microjobs",
    priority: "medium", projectType: "standard", datasetId: "", rewardPerTask: 0, estimatedTasks: 1,
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
    if (!linkedProject) return;
    if (!/^[a-f\d]{24}$/i.test(linkedProject)) {
      setError("This project link contains an invalid ID.");
      return;
    }
    let current = true;
    apiRequest<{ project: Project }>(`/api/admin/workspace/project/${linkedProject}`, "GET", null, true)
      .then((result) => {
        if (!current) return;
        setViewData(result);
        setViewModal(result.project);
      })
      .catch((err) => { if (current) setError(err.message || "This project could not be opened."); });
    return () => { current = false; };
  }, [linkedProject]);

  useEffect(() => {
    loadProjects();
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
        setJobRoles(normalized.filter((job: JobRole) => job.active !== false));
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

  const [eligibilityError, setEligibilityError] = useState(false);
  const [eligibilityVersion, setEligibilityVersion] = useState(0);
  useEffect(() => {
    let current = true;
    setSelectedWorker("");
    setAssignableWorkers([]);
    setEligibilityInfo(null);
    setEligibilityError(false);
    if (!assignModal) return;
    setLoadingEligible(true);
    apiRequest<{ workers: Worker[]; eligibilityInfo: typeof eligibilityInfo }>(
      `/api/admin/workspace/project/${assignModal._id}/eligible-workers`, "GET", null, true,
    ).then(result => {
      if (!current) return;
      if (!Array.isArray(result.workers)) throw new Error("Invalid eligibility response");
      setAssignableWorkers(result.workers);
      setEligibilityInfo(result.eligibilityInfo);
    }).catch(() => {
      if (current) setEligibilityError(true);
    }).finally(() => { if (current) setLoadingEligible(false); });
    return () => { current = false; };
  }, [assignModal, eligibilityVersion]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      await apiRequest("/api/admin/workspace/projects", "POST", form, true);
      setSuccess("Project created successfully!");
      setShowModal(false);
      setForm({
        payType: "per_task", deliverables: [], screeningIds: [], instructions: "",
        title: "",
        description: "",
        category: "microjobs",
        priority: "medium",
        estimatedTasks: 1,
        payRate: 0,
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
    if (!assignModal || !assignableWorkers.some(worker => worker._id === selectedWorker)) return;
    setAssignConfirmOpen(true);
  };

  const executeAssign = async () => {
    if (!assignModal || !assignableWorkers.some(worker => worker._id === selectedWorker)) return;
    setAssigning(true);

    try {
      await apiRequest(
        `/api/admin/workspace/project/${assignModal._id}/assign`,
        "PUT",
        { workerId: selectedWorker },
        true,
      );
      setSuccess(
        "Project assigned successfully.",
      );
      setAssignModal(null);
      setSelectedWorker("");
      setAssignConfirmOpen(false);
      loadProjects();

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
      deliverables: (project.deliverables || []).map(d => ({ ...d, title: d.title || "", description: d.description || "", required: d.required !== false })),
      title: project.title || "",
      description: project.description || "",
      category: project.category || "microjobs",
      priority: project.priority || "medium", projectType: project.projectType || "standard",
      datasetId: typeof project.datasetId === "string" ? project.datasetId : project.datasetId?._id || "",
      rewardPerTask: project.rewardPerTask ?? 0, estimatedTasks: project.estimatedTasks ?? 1,
      instructions: (project as any).instructions || "",
      payRate: project.payRate || 0,
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
                      className={`text-xs ${getPriorityBadge(project.priority || "medium")}`}
                    >
                      ● {project.priority || "medium"}
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
                      Assigned to: {project.assignedTo.name || [project.assignedTo.firstName, project.assignedTo.lastName].filter(Boolean).join(" ") || "Archived worker"}
                    </p>
                  )}
                </div>

                <div className="flex max-w-full flex-wrap items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-emerald-400">
                      ${project.payRate?.toFixed(2) || "0.00"}
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

                  {project.status === "open" && !project.assignedTo && (
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
                    project.assignedTo && (
                      <button
                        onClick={() => {
                          setCreditModal(project);
                          setCreditAmount(project.payRate || 0);
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
                    disabled={Boolean(form.workPositionId)}
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value })
                    }
                    className="input w-full"
                  >
                    {Array.from(new Set([form.category, ...jobRoles.map(role => role.category), "microjobs", "writing", "teaching", "coding_math", "data_entry", "research", "other"])).filter(Boolean).map(category => (
                      <option key={category} value={category}>{getJobRoleCategoryLabel(category)}</option>
                    ))}
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
                      screeningId: "", screeningIds: [],
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
                {screenings.filter(s => s.active !== false).map(s => <label className="block" key={s._id}>
                  <input type="checkbox" checked={form.screeningIds.includes(s._id)} onChange={e => setForm({ ...form, screeningIds: e.target.checked ? [...form.screeningIds, s._id] : form.screeningIds.filter(id => id !== s._id) })} /> {s.title} ({s.category})
                </label>)}
                <p className="text-xs text-slate-500 mt-1">
                  Add project screenings here. The selected role’s requirements also apply.
                </p>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Instructions
                </label>
                <textarea
                  value={form.instructions}
                  onChange={(e) =>
                    setForm({ ...form, instructions: e.target.value })
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
                    value={form.payRate}
                    onChange={(e) =>
                      setForm({ ...form, payRate: Number(e.target.value) })
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

              <label className="block">Pay type
                <select className="input w-full" value={form.payType} onChange={e => setForm({ ...form, payType: e.target.value })}>
                  <option value="per_task">Per task</option><option value="hourly">Hourly</option><option value="fixed">Fixed</option>
                </select>
              </label>
              <ProjectDeliveryFields fields={form} datasets={datasetOptions} onChange={change => setForm({ ...form, ...change })} />

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
              ) : eligibilityError ? (
                <p role="alert">Eligibility could not be verified. <button type="button" className="underline" onClick={() => setEligibilityVersion(v => v + 1)}>Try again</button></p>
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
                      {w.position?.title || w.category ||
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
                ${assignModal?.payRate || 0}
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
                Default payout: ${creditModal.payRate?.toFixed(2) || "0.00"}
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

                {viewData.project?.assignedTo && (
                  <div className="p-3 bg-cyan-900/20 border border-cyan-500/20 rounded-lg">
                    <p className="text-xs text-slate-400 mb-1">
                      Assigned Worker
                    </p>
                    <p className="text-sm text-white">
                      {viewData.workerProfile?.user?.name || viewData.project.assignedTo.name || "Assigned worker"}
                    </p>
                    <p className="text-xs text-slate-400">
                      {viewData.workerProfile?.user?.email || viewData.project.assignedTo.email || "No email"}
                    </p>
                    <p className="text-xs text-cyan-400 mt-1">
                      Status: {viewData.workerProfile?.workerStatus || viewData.project.assignedTo.workerStatus || "N/A"}
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
                          {proof.submissionText && (
                            <p className="text-xs text-slate-300 mt-1">
                              {proof.submissionText}
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
                    disabled={Boolean(editModal.workPositionId)}
                    value={editForm.category}
                    onChange={(e) =>
                      setEditForm({ ...editForm, category: e.target.value })
                    }
                    className="input w-full"
                  >
                    {Array.from(new Set([editForm.category, ...jobRoles.map(role => role.category), "microjobs", "writing", "teaching", "coding_math", "data_entry", "research", "other"])).filter(Boolean).map(category => (
                      <option key={category} value={category}>{getJobRoleCategoryLabel(category)}</option>
                    ))}
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
                    {(["draft", "open"].includes(editModal.status) ? ["draft", "open", "cancelled"] :
                      ["assigned", "in_progress"].includes(editModal.status) ? [editModal.status, "cancelled"] : [editModal.status])
                      .map(status => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}
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
                        (s) => s.active !== false || editForm.screeningIds.includes(s._id),
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

              <label className="block text-sm text-slate-400">Priority
                <select className="input w-full" value={editForm.priority} onChange={e => setEditForm({ ...editForm, priority: e.target.value })}>
                  {["low", "medium", "high", "urgent"].map(priority => <option key={priority}>{priority}</option>)}
                </select>
              </label>
              <ProjectDeliveryFields fields={editForm} datasets={datasetOptions} onChange={change => setEditForm({ ...editForm, ...change })} />

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
