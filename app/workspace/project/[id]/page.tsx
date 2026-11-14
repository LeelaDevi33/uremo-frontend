"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { useToast } from "@/hooks/useToast";

/**
 * PATCH_47: Project Detail Page
 * PATCH_48: Added Proof of Work submission
 * Worker views project details and can submit proof
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
  deliverables?: { title: string; description: string; required: boolean }[];
  projectType?: "standard" | "rlhf_dataset";
  datasetId?: any;
  rewardPerTask?: number;
};

type Proof = {
  _id: string;
  status: "pending" | "approved" | "rejected";
  submissionText: string;
  attachments: { url: string; filename?: string }[];
  rejectionReason?: string;
  createdAt: string;
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const projectId = params?.id as string;

  const [project, setProject] = useState<Project | null>(null);
  const [acquired, setAcquired] = useState<{ title: string; description: string; handoff: string; accessType: "rent" | "buy"; endsAt: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // PATCH_48: Proof of work state
  const [proof, setProof] = useState<Proof | null>(null);
  const [proofText, setProofText] = useState("");
  const [proofFiles, setProofFiles] = useState<File[]>([]);
  const [proofSubmitting, setProofSubmitting] = useState(false);

  // PATCH_95: RLHF task execution state
  const [rlhfTasks, setRlhfTasks] = useState<any[]>([]);
  const [rlhfDataset, setRlhfDataset] = useState<any>(null);
  const [rlhfCurrentIdx, setRlhfCurrentIdx] = useState(0);
  const [rlhfAnswer, setRlhfAnswer] = useState<any>({});
  const [rlhfSubmitting, setRlhfSubmitting] = useState(false);
  const [rlhfSubmitted, setRlhfSubmitted] = useState(0);
  const [rlhfTotal, setRlhfTotal] = useState(0);

  useEffect(() => {
    let current = true;
    const loadProject = async () => {
      if (!projectId) return;
      setLoading(true);
      setAcquired(null);
      setProject(null);
      setError(null);
      try {
        const res = await apiRequest(
          `/api/workspace/project/${projectId}`,
          "GET",
          null,
          true,
        );
        if (!current) return;
        if (res.acquiredProject) { setAcquired(res.acquiredProject); return; }
        setProject(res.project);

        // PATCH_95: If RLHF project, load tasks
        if (res.project?.projectType === "rlhf_dataset") {
          try {
            const rlhfRes = await apiRequest(
              `/api/workspace/project/${projectId}/rlhf-tasks`,
              "GET",
              null,
              true,
            );
            if (!current) return;
            setRlhfDataset(rlhfRes.dataset);
            setRlhfTasks(rlhfRes.tasks || []);
            setRlhfSubmitted(rlhfRes.submissionCount || 0);
            setRlhfTotal(rlhfRes.totalTasks || 0);
            // Jump to first unsubmitted task
            const firstUnsub = (rlhfRes.tasks || []).findIndex(
              (t: any) => !t.submitted,
            );
            if (firstUnsub >= 0) setRlhfCurrentIdx(firstUnsub);
          } catch (rlhfErr: any) {
            console.warn("RLHF tasks load failed:", rlhfErr?.message);
          }
        } else {
          // Load existing proof (standard projects only)
          const proofRes = await apiRequest(
            `/api/workspace/project/${projectId}/proof`,
            "GET",
            null,
            true,
          );
          if (current && proofRes.proof) {
            setProof(proofRes.proof);
          }
        }
      } catch (e: any) {
        if (current) setError(e?.message || "Failed to load project");
      } finally {
        if (current) setLoading(false);
      }
    };
    loadProject();
    return () => { current = false; };
  }, [projectId]);

  useEffect(() => {
    if (acquired?.accessType !== "rent") return;
    const expiry = Date.parse(acquired.endsAt || "");
    let timer: number;
    function checkExpiry() {
      window.clearTimeout(timer);
      const remaining = expiry - Date.now();
      if (!Number.isFinite(remaining) || remaining <= 0) {
        setAcquired(null);
        setError("This project's rental term has ended.");
        return;
      }
      timer = window.setTimeout(checkExpiry, Math.min(remaining, 2_147_483_647));
    }
    checkExpiry();
    window.addEventListener("focus", checkExpiry);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", checkExpiry);
    };
  }, [acquired]);

  const startProject = async () => {
    try {
      await apiRequest(
        `/api/workspace/project/${projectId}/start`,
        "POST",
        null,
        true,
      );
      toast("Project started!", "success");
      // Reload
      const res = await apiRequest(
        `/api/workspace/project/${projectId}`,
        "GET",
        null,
        true,
      );
      setProject(res.project);
    } catch (e: any) {
      toast(e?.message || "Failed to start", "error");
    }
  };

  const submitProject = async () => {
    if (!completionNotes.trim()) {
      toast("Please add completion notes", "error");
      return;
    }
    setSubmitting(true);
    try {
      await apiRequest(
        `/api/workspace/project/${projectId}/submit`,
        "POST",
        { completionNotes },
        true,
      );
      toast("Project submitted for review!", "success");
      router.push("/workspace/projects");
    } catch (e: any) {
      toast(e?.message || "Failed to submit", "error");
    } finally {
      setSubmitting(false);
    }
  };

  // PATCH_48: Submit proof of work
  const submitProof = async () => {
    if (!proofText.trim()) {
      toast("Please describe your work", "error");
      return;
    }
    setProofSubmitting(true);
    try {
      // Upload files first if any
      const attachments: { url: string; filename: string }[] = [];
      for (const file of proofFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await apiRequest(
          "/api/upload/chat",
          "POST",
          formData,
          true,
          true,
        );
        attachments.push({
          url: uploadRes.url,
          filename: file.name,
        });
      }

      await apiRequest(
        `/api/workspace/project/${projectId}/proof`,
        "POST",
        {
          submissionText: proofText,
          attachments,
        },
        true,
      );
      toast("Proof submitted successfully!", "success");

      // Reload proof
      const proofRes = await apiRequest(
        `/api/workspace/project/${projectId}/proof`,
        "GET",
        null,
        true,
      );
      setProof(proofRes.proof);
      setProofText("");
      setProofFiles([]);
    } catch (e: any) {
      toast(e?.message || "Failed to submit proof", "error");
    } finally {
      setProofSubmitting(false);
    }
  };

  // PATCH_95: Submit RLHF task answer
  const submitRlhfTask = async () => {
    const task = rlhfTasks[rlhfCurrentIdx];
    if (!task) return;
    setRlhfSubmitting(true);
    try {
      await apiRequest(
        `/api/workspace/project/${projectId}/rlhf-submit`,
        "POST",
        { taskId: task._id, answerPayload: rlhfAnswer },
        true,
      );
      toast("Task submitted!", "success");
      // Mark as submitted locally
      const updated = [...rlhfTasks];
      updated[rlhfCurrentIdx] = { ...updated[rlhfCurrentIdx], submitted: true };
      setRlhfTasks(updated);
      setRlhfSubmitted((prev) => prev + 1);
      setRlhfAnswer({});
      // Move to next unsubmitted
      const nextUnsub = updated.findIndex(
        (t, i) => i > rlhfCurrentIdx && !t.submitted,
      );
      if (nextUnsub >= 0) setRlhfCurrentIdx(nextUnsub);
    } catch (e: any) {
      toast(e?.message || "Failed to submit task", "error");
    } finally {
      setRlhfSubmitting(false);
    }
  };

  const isRlhf = project?.projectType === "rlhf_dataset";

  if (loading) {
    return (
      <div className="u-container max-w-3xl">
        <div className="card animate-pulse">
          <div className="h-8 w-1/2 rounded bg-white/10 mb-4" />
          <div className="h-4 w-3/4 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  if (!error && acquired) return <main className="u-container max-w-3xl space-y-5">
    <Link href="/workspace/projects" className="text-cyan-300 underline">My projects</Link>
    <p className="text-sm text-cyan-300">{acquired.accessType === "buy" ? "Exclusive full access" : "Rented project"}{acquired.endsAt ? " · Expires " + new Date(acquired.endsAt).toLocaleString() : ""}</p>
    <h1 className="text-3xl font-semibold">{acquired.title}</h1>
    {acquired.description && <p className="whitespace-pre-wrap break-words">{acquired.description}</p>}
    <section className="card space-y-2"><h2 className="font-semibold">Project handoff</h2><p className="whitespace-pre-wrap break-words">{acquired.handoff}</p></section>
    <Link href="/opportunities/access" className="underline">View access history</Link>
  </main>;
  if (error || !project) {
    return (
      <div className="u-container max-w-3xl">
        <div className="card text-center py-12">
          <div className="text-4xl mb-4">X</div>
          <h2 className="text-xl font-semibold text-red-300 mb-2">
            Something went wrong
          </h2>
          <p className="text-slate-400 mb-6">{error || "Project not found"}</p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition"
            >
              Retry
            </button>
            <Link
              href="/workspace/projects"
              className="px-4 py-2 bg-slate-500/20 text-slate-300 rounded-lg hover:bg-slate-500/30 transition"
            >
              ← Back to Projects
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

  const statusColors: Record<string, string> = {
    assigned: "bg-blue-500/20 text-blue-300",
    in_progress: "bg-amber-500/20 text-amber-300",
    completed: "bg-emerald-500/20 text-emerald-300",
    cancelled: "bg-red-500/20 text-red-300",
  };

  return (
    <div className="u-container max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/workspace/projects"
            className="text-sm text-slate-400 hover:text-white mb-2 inline-block"
          >
            ← Back to Projects
          </Link>
          <h1 className="text-2xl font-bold">{project.title}</h1>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-sm ${statusColors[project.status] || statusColors.assigned}`}
        >
          {project.status.replace("_", " ").toUpperCase()}
        </span>
      </div>

      {/* Project Info */}
      <div className="card">
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center p-3 rounded-xl bg-white/5">
            <p className="text-xl font-bold text-emerald-400">
              ${project.payRate}
            </p>
            <p className="text-xs text-slate-400">
              {project.payType.replace("_", " ")}
            </p>
          </div>
          {project.deadline && (
            <div className="text-center p-3 rounded-xl bg-white/5">
              <p className="text-xl font-bold text-amber-400">
                {new Date(project.deadline).toLocaleDateString()}
              </p>
              <p className="text-xs text-slate-400">Deadline</p>
            </div>
          )}
          <div className="text-center p-3 rounded-xl bg-white/5">
            <p className="text-xl font-bold text-blue-400">
              {project.assignedAt
                ? new Date(project.assignedAt).toLocaleDateString()
                : "N/A"}
            </p>
            <p className="text-xs text-slate-400">Assigned</p>
          </div>
        </div>

        {project.description && (
          <div className="mb-6">
            <h3 className="font-medium mb-2">Description</h3>
            <p className="text-slate-300">{project.description}</p>
          </div>
        )}

        {project.instructions && (
          <div className="mb-6">
            <h3 className="font-medium mb-2">Instructions</h3>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 whitespace-pre-wrap">
              {project.instructions}
            </div>
          </div>
        )}

        {project.deliverables && project.deliverables.length > 0 && (
          <div className="mb-6">
            <h3 className="font-medium mb-2">Deliverables</h3>
            <div className="space-y-2">
              {project.deliverables.map((d, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={d.required ? "text-red-400" : "text-slate-400"}
                    >
                      {d.required ? "●" : "○"}
                    </span>
                    <span className="font-medium">{d.title}</span>
                    {d.required && (
                      <span className="text-xs text-red-400">(Required)</span>
                    )}
                  </div>
                  {d.description && (
                    <p className="text-sm text-slate-400 mt-1 ml-5">
                      {d.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {project.status === "assigned" && (
        <div className="card">
          <h3 className="font-medium mb-4">Ready to Start?</h3>
          <p className="text-slate-400 text-sm mb-4">
            Click the button below to mark this project as in progress.
          </p>
          <button onClick={startProject} className="btn-primary">
            Start Working on This Project
          </button>
        </div>
      )}

      {/* PATCH_95: RLHF Task Execution UI */}
      {project.status === "in_progress" && isRlhf && rlhfTasks.length > 0 && (
        <div className="card">
          {/* Progress Bar */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">RLHF Task Execution</h3>
            <span className="text-sm text-slate-400">
              {rlhfSubmitted}/{rlhfTotal} completed
              {project.rewardPerTask ? ` · $${project.rewardPerTask}/task` : ""}
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2 mb-6">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{
                width: `${rlhfTotal > 0 ? (rlhfSubmitted / rlhfTotal) * 100 : 0}%`,
              }}
            />
          </div>

          {/* Dataset Info */}
          {rlhfDataset && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-4 text-sm">
              <span className="text-blue-300 font-medium">
                {rlhfDataset.name}
              </span>
              <span className="text-slate-400 mx-2">·</span>
              <span className="text-slate-400">
                {rlhfDataset.datasetType?.replace("_", " ")}
              </span>
              <span className="text-slate-400 mx-2">·</span>
              <span className="text-slate-400">
                {rlhfDataset.difficultyLevel}
              </span>
            </div>
          )}

          {/* Task Navigation */}
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => setRlhfCurrentIdx(Math.max(0, rlhfCurrentIdx - 1))}
              disabled={rlhfCurrentIdx === 0}
              className="px-3 py-1 bg-white/10 rounded text-sm disabled:opacity-30"
            >
              ← Prev
            </button>
            <span className="text-sm text-slate-400">
              Task {rlhfCurrentIdx + 1} of {rlhfTasks.length}
            </span>
            <button
              onClick={() =>
                setRlhfCurrentIdx(
                  Math.min(rlhfTasks.length - 1, rlhfCurrentIdx + 1),
                )
              }
              disabled={rlhfCurrentIdx >= rlhfTasks.length - 1}
              className="px-3 py-1 bg-white/10 rounded text-sm disabled:opacity-30"
            >
              Next →
            </button>
          </div>

          {/* Current Task */}
          {(() => {
            const task = rlhfTasks[rlhfCurrentIdx];
            if (!task) return null;
            const dt = rlhfDataset?.datasetType || "ranking";

            if (task.submitted) {
              return (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <div className="text-2xl mb-2">OK</div>
                  <p className="text-emerald-300 font-medium">
                    Task already submitted
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Navigate to an unsubmitted task
                  </p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {/* Prompt */}
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <h4 className="text-xs text-slate-400 mb-2 uppercase tracking-wider">
                    Prompt
                  </h4>
                  <p className="text-white whitespace-pre-wrap">
                    {task.prompt}
                  </p>
                </div>

                {/* Image (multimodal) */}
                {task.imageUrl && (
                  <div className="rounded-xl overflow-hidden border border-white/10">
                    <img
                      src={task.imageUrl}
                      alt="Task image"
                      className="max-h-64 object-contain mx-auto"
                    />
                  </div>
                )}

                {/* RANKING: Response comparison + choice + justification */}
                {dt === "ranking" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        onClick={() =>
                          setRlhfAnswer({ ...rlhfAnswer, choice: "A" })
                        }
                        className={`p-4 rounded-xl border cursor-pointer transition ${
                          rlhfAnswer.choice === "A"
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/30"
                        }`}
                      >
                        <div className="text-xs text-slate-400 mb-2 font-medium">
                          Response A
                        </div>
                        <div className="text-sm text-slate-300 whitespace-pre-wrap">
                          {task.responseA || "N/A"}
                        </div>
                      </div>
                      <div
                        onClick={() =>
                          setRlhfAnswer({ ...rlhfAnswer, choice: "B" })
                        }
                        className={`p-4 rounded-xl border cursor-pointer transition ${
                          rlhfAnswer.choice === "B"
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/30"
                        }`}
                      >
                        <div className="text-xs text-slate-400 mb-2 font-medium">
                          Response B
                        </div>
                        <div className="text-sm text-slate-300 whitespace-pre-wrap">
                          {task.responseB || "N/A"}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 block mb-1">
                        Justification (min{" "}
                        {rlhfDataset?.minJustificationWords || 30} words)
                      </label>
                      <textarea
                        value={rlhfAnswer.justification || ""}
                        onChange={(e) =>
                          setRlhfAnswer({
                            ...rlhfAnswer,
                            justification: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full bg-[#1f2937] border border-white/10 rounded-lg px-3 py-2 text-sm"
                        placeholder="Explain why this response is better..."
                      />
                      <div className="text-xs text-slate-500 mt-1">
                        {
                          (rlhfAnswer.justification || "")
                            .trim()
                            .split(/\s+/)
                            .filter(Boolean).length
                        }{" "}
                        words
                      </div>
                    </div>
                  </div>
                )}

                {/* GENERATION: Free-form text */}
                {dt === "generation" && (
                  <div>
                    <label className="text-sm text-slate-400 block mb-1">
                      Your Response (min {rlhfDataset?.minWordCount || 20}{" "}
                      words)
                    </label>
                    <textarea
                      value={rlhfAnswer.response || ""}
                      onChange={(e) =>
                        setRlhfAnswer({
                          ...rlhfAnswer,
                          response: e.target.value,
                        })
                      }
                      rows={6}
                      className="w-full bg-[#1f2937] border border-white/10 rounded-lg px-3 py-2 text-sm"
                      placeholder="Write your response..."
                    />
                    <div className="text-xs text-slate-500 mt-1">
                      {
                        (rlhfAnswer.response || "")
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean).length
                      }{" "}
                      words
                    </div>
                  </div>
                )}

                {/* RED_TEAM: Attack prompt + explanation */}
                {dt === "red_team" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-slate-400 block mb-1">
                        Attack Prompt
                      </label>
                      <textarea
                        value={rlhfAnswer.prompt || ""}
                        onChange={(e) =>
                          setRlhfAnswer({
                            ...rlhfAnswer,
                            prompt: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full bg-[#1f2937] border border-white/10 rounded-lg px-3 py-2 text-sm"
                        placeholder="Write an adversarial prompt..."
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 block mb-1">
                        Explanation
                      </label>
                      <textarea
                        value={rlhfAnswer.explanation || ""}
                        onChange={(e) =>
                          setRlhfAnswer({
                            ...rlhfAnswer,
                            explanation: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full bg-[#1f2937] border border-white/10 rounded-lg px-3 py-2 text-sm"
                        placeholder="Why does this exploit a vulnerability?"
                      />
                    </div>
                  </div>
                )}

                {/* FACT_CHECK: Verdict + sources + justification */}
                {dt === "fact_check" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-slate-400 block mb-2">
                        Verdict
                      </label>
                      <div className="flex gap-2 flex-wrap">
                        {["true", "false", "misleading", "unverifiable"].map(
                          (v) => (
                            <button
                              key={v}
                              onClick={() =>
                                setRlhfAnswer({ ...rlhfAnswer, verdict: v })
                              }
                              className={`px-4 py-2 rounded-lg text-sm transition ${
                                rlhfAnswer.verdict === v
                                  ? "bg-blue-500 text-white"
                                  : "bg-white/10 text-slate-300 hover:bg-white/20"
                              }`}
                            >
                              {v.charAt(0).toUpperCase() + v.slice(1)}
                            </button>
                          ),
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 block mb-1">
                        Sources
                      </label>
                      <input
                        value={rlhfAnswer.sources || ""}
                        onChange={(e) =>
                          setRlhfAnswer({
                            ...rlhfAnswer,
                            sources: e.target.value,
                          })
                        }
                        className="w-full bg-[#1f2937] border border-white/10 rounded-lg px-3 py-2 text-sm"
                        placeholder="Links to supporting sources (comma separated)"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 block mb-1">
                        Explanation
                      </label>
                      <textarea
                        value={rlhfAnswer.explanation || ""}
                        onChange={(e) =>
                          setRlhfAnswer({
                            ...rlhfAnswer,
                            explanation: e.target.value,
                          })
                        }
                        rows={3}
                        className="w-full bg-[#1f2937] border border-white/10 rounded-lg px-3 py-2 text-sm"
                        placeholder="Explain your fact-check reasoning..."
                      />
                    </div>
                  </div>
                )}

                {/* CODING: Code editor */}
                {dt === "coding" && (
                  <div>
                    <label className="text-sm text-slate-400 block mb-1">
                      Your Code
                    </label>
                    <textarea
                      value={rlhfAnswer.code || ""}
                      onChange={(e) =>
                        setRlhfAnswer({ ...rlhfAnswer, code: e.target.value })
                      }
                      rows={10}
                      className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-sm font-mono"
                      placeholder="// Write your code here..."
                    />
                  </div>
                )}

                {/* MULTIMODAL: Description + rating */}
                {dt === "multimodal" && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-slate-400 block mb-1">
                        Description
                      </label>
                      <textarea
                        value={rlhfAnswer.description || ""}
                        onChange={(e) =>
                          setRlhfAnswer({
                            ...rlhfAnswer,
                            description: e.target.value,
                          })
                        }
                        rows={4}
                        className="w-full bg-[#1f2937] border border-white/10 rounded-lg px-3 py-2 text-sm"
                        placeholder="Describe the image/content..."
                      />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400 block mb-2">
                        Rating (1-5)
                      </label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((r) => (
                          <button
                            key={r}
                            onClick={() =>
                              setRlhfAnswer({ ...rlhfAnswer, rating: r })
                            }
                            className={`w-10 h-10 rounded-lg text-sm font-bold transition ${
                              rlhfAnswer.rating === r
                                ? "bg-blue-500 text-white"
                                : "bg-white/10 text-slate-300 hover:bg-white/20"
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  onClick={submitRlhfTask}
                  disabled={rlhfSubmitting}
                  className="btn-primary disabled:opacity-50 w-full"
                >
                  {rlhfSubmitting ? "Submitting..." : "Submit Answer"}
                </button>
              </div>
            );
          })()}

          {/* PATCH_96: RLHF All Tasks Complete Summary */}
          {rlhfTotal > 0 && rlhfSubmitted >= rlhfTotal && (
            <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
              <div className="text-3xl mb-2">Done</div>
              <h3 className="text-lg font-semibold text-green-300 mb-1">
                All Tasks Completed!
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                You&apos;ve submitted {rlhfSubmitted}/{rlhfTotal} tasks. Your
                submissions are now under review.
                {project.rewardPerTask
                  ? ` Estimated earnings: $${(rlhfSubmitted * project.rewardPerTask).toFixed(2)}`
                  : ""}
              </p>
              <a
                href="/workspace"
                className="inline-block px-6 py-2 bg-green-500/20 text-green-300 rounded-lg hover:bg-green-500/30 transition text-sm"
              >
                ← Back to Workspace
              </a>
            </div>
          )}
        </div>
      )}

      {/* Standard project: Proof of Work */}
      {project.status === "in_progress" && !isRlhf && (
        <div className="card">
          <h3 className="font-medium mb-4">Submit Proof of Work</h3>

          {/* Existing proof status */}
          {proof && (
            <div
              className={`p-4 rounded-xl mb-4 border ${
                proof.status === "pending"
                  ? "bg-amber-500/10 border-amber-500/30"
                  : proof.status === "approved"
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Proof Status:</span>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    proof.status === "pending"
                      ? "bg-amber-500/20 text-amber-300"
                      : proof.status === "approved"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {proof.status.toUpperCase()}
                </span>
              </div>
              {proof.status === "rejected" && proof.rejectionReason && (
                <div className="mt-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-300">
                    <span className="font-medium">Rejection Reason:</span>{" "}
                    {proof.rejectionReason}
                  </p>
                  <p className="text-xs text-slate-400 mt-2">
                    You can resubmit your proof below.
                  </p>
                </div>
              )}
              {proof.status === "pending" && (
                <p className="text-sm text-slate-400">
                  Your proof is being reviewed by our team.
                </p>
              )}
            </div>
          )}

          {/* Submit form (show if no proof or rejected) */}
          {(!proof || proof.status === "rejected") && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm mb-4">
                Submit proof of your completed work including screenshots,
                links, or descriptions.
              </p>
              <div>
                <label className="text-sm text-slate-400 block mb-1">
                  Describe Your Work *
                </label>
                <textarea
                  value={proofText}
                  onChange={(e) => setProofText(e.target.value)}
                  placeholder="Describe what you completed, include links, explain the deliverables..."
                  rows={5}
                  className="w-full bg-[#1f2937] border border-white/10 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">
                  Attachments (Screenshots, PDFs, etc.)
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) =>
                    setProofFiles(Array.from(e.target.files || []))
                  }
                  className="w-full bg-[#1f2937] border border-white/10 rounded-lg px-3 py-2 text-sm"
                />
                {proofFiles.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    {proofFiles.length} file(s) selected
                  </p>
                )}
              </div>
              <button
                onClick={submitProof}
                disabled={proofSubmitting || !proofText.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {proofSubmitting ? "Submitting..." : "Submit Proof of Work"}
              </button>
            </div>
          )}

          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="font-medium mb-2">Submit Project for Review</h3>
            <p className="text-slate-400 text-sm mb-4">
              When you're done, submit completion notes. Admin will review and
              credit your earnings.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-slate-400 block mb-1">
                  Completion Notes <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Completion notes (what you did, links, deliverables, any notes for the reviewer...)"
                  rows={4}
                  className="w-full bg-[#1f2937] border border-white/10 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <button
                onClick={submitProject}
                disabled={submitting || !completionNotes.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Project for Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {project.status === "completed" && (
        <div className="card text-center py-8">
          <div className="text-4xl mb-4">Done</div>
          <p className="text-emerald-400 font-medium">
            This project has been completed!
          </p>
          <p className="text-slate-400 text-sm mt-2">
            Earnings will be credited to your account.
          </p>
        </div>
      )}
    </div>
  );
}
