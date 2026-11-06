"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

/**
 * PATCH_47: Worker Projects Page
 * Shows all assigned projects and their status
 */

type Project = {
  _id: string;
  title: string;
  description?: string;
  instructions?: string;
  payRate: number;
  payType: "per_task" | "hourly" | "fixed";
  status: "assigned" | "in_progress" | "completed" | "cancelled";
  deadline?: string;
  assignedAt?: string;
  completedAt?: string;
  earningsCredited?: number;
  projectType?: "standard" | "rlhf_dataset"; // PATCH_97
};
type AcquiredProject = { _id: string; title: string; accessType: "rent" | "buy"; endsAt?: string };

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  assigned: {
    label: "Assigned",
    color: "bg-blue-500/20 text-blue-300",
    icon: "Assigned",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-amber-500/20 text-amber-300",
    icon: "...",
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-500/20 text-emerald-300",
    icon: "OK",
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-500/20 text-red-300",
    icon: "X",
  },
};

export default function WorkerProjectsPage() {
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [acquired, setAcquired] = useState<AcquiredProject[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProjects = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await apiRequest(
        "/api/workspace/projects",
        "GET",
        null,
        true,
      );
      setProjects(res.projects || []);
      setAcquired(res.acquiredProjects || []);
    } catch (e: any) {
      setLoadError(true);
      toast(e?.message || "Failed to load projects", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const [startingId, setStartingId] = useState<string | null>(null);

  const startProject = async (projectId: string) => {
    if (startingId) return; // PATCH_96: Double-click guard
    setStartingId(projectId);
    try {
      await apiRequest(
        `/api/workspace/project/${projectId}/start`,
        "POST",
        null,
        true,
      );
      toast("Project started!", "success");
      loadProjects();
    } catch (e: any) {
      toast(e?.message || "Failed to start project", "error");
    } finally {
      setStartingId(null);
    }
  };

  const activeProjects = projects.filter((p) =>
    ["assigned", "in_progress"].includes(p.status),
  );
  const completedProjects = projects.filter((p) => p.status === "completed");

  if (loading) {
    return (
      <div className="u-container max-w-4xl">
        <div className="card animate-pulse">
          <div className="h-8 w-1/3 rounded bg-white/10 mb-4" />
          <div className="h-4 w-2/3 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="u-container max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Projects</h1>
          <p className="text-slate-400">Your project access and work assignments.</p>
        </div>
        <Link href="/workspace" className="btn-secondary">
          ← Back to Workspace
        </Link>
      </div>

      {loadError ? <div className="card" role="alert">Projects could not be loaded. <button type="button" className="underline" onClick={loadProjects}>Retry</button></div> :
      <section className="card space-y-3">
        <h2 className="font-semibold">Projects in your profile</h2>
        {acquired.map(p => <Link className="block rounded-xl border border-white/10 p-4" href={`/workspace/project/${p._id}`} key={p._id}>
          <strong>{p.title}</strong><span className="block text-sm text-slate-400">{p.accessType === "buy" ? "Exclusive full access" : "Rental" + (p.endsAt ? " · Expires " + new Date(p.endsAt).toLocaleDateString() : "")}</span>
        </Link>)}
        {!acquired.length && <p className="text-slate-400">Projects you rent or buy appear here after checkout.</p>}
        <div className="flex flex-wrap gap-4 text-sm underline"><Link href="/projects/rent">Browse rental projects</Link><Link href="/projects/full-access">Browse full access</Link><Link href="/opportunities/access">Access history</Link></div>
      </section>}

      {/* Active Projects */}
      <div className="card">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          Active Projects ({activeProjects.length})
        </h2>

        {activeProjects.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <div className="text-4xl mb-3">Work</div>
            <p>No active projects assigned yet</p>
            <p className="text-sm mt-2">
              Projects will appear here when admin assigns them to you
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeProjects.map((project) => {
              const config =
                STATUS_CONFIG[project.status] || STATUS_CONFIG.assigned;
              return (
                <div
                  key={project._id}
                  className="p-4 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{config.icon}</span>
                        <h3 className="font-medium">{project.title}</h3>
                        {/* PATCH_97: Project type badge */}
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            project.projectType === "rlhf_dataset"
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                          }`}
                        >
                          {project.projectType === "rlhf_dataset"
                            ? "AI Dataset"
                            : "Microjob"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${config.color}`}
                        >
                          {config.label}
                        </span>
                      </div>
                      {project.description && (
                        <p className="text-sm text-slate-400 mb-3">
                          {project.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm">
                        <span className="text-emerald-400">
                          Pay: ${project.payRate}{" "}
                          {project.payType.replace("_", " ")}
                        </span>
                        {project.deadline && (
                          <span className="text-amber-400">
                            Due:{" "}
                            {new Date(project.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {project.status === "assigned" && (
                        <button
                          onClick={() => startProject(project._id)}
                          disabled={startingId === project._id}
                          className="px-4 py-2 rounded-lg bg-blue-500/20 text-blue-300 text-sm hover:bg-blue-500/30 disabled:opacity-50"
                        >
                          {startingId === project._id
                            ? "Starting..."
                            : "Start Working"}
                        </button>
                      )}
                      <Link
                        href={`/workspace/project/${project._id}`}
                        className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm hover:bg-white/20 text-center"
                      >
                        View Details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Projects */}
      {completedProjects.length > 0 && (
        <div className="card">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            Completed Projects ({completedProjects.length})
          </h2>
          <div className="space-y-3">
            {completedProjects.map((project) => (
              <div
                key={project._id}
                className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{project.title}</h3>
                    <p className="text-sm text-slate-400">
                      Completed:{" "}
                      {project.completedAt
                        ? new Date(project.completedAt).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-emerald-400 font-medium">
                      ${project.earningsCredited || project.payRate}
                    </p>
                    <p className="text-xs text-slate-500">Earned</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
