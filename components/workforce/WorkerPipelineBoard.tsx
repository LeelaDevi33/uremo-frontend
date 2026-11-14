"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import WorkerPipelineCard, { WorkerData } from "./WorkerPipelineCard";

/**
 * PATCH_60: Worker Pipeline Board
 * Kanban-style board showing workers across all stages
 */

interface PipelineColumn {
  id: string;
  label: string;
  statuses: string[]; // Backend workerStatus values that map to this column
  icon: string;
  color: string;
}

// Pipeline columns mapped to backend workerStatus values
const PIPELINE_COLUMNS: PipelineColumn[] = [
  {
    id: "applied",
    label: "Applied",
    statuses: ["applied"],
    icon: "App",
    color: "border-slate-500/30",
  },
  {
    id: "screening",
    label: "Screening",
    statuses: ["screening_unlocked", "training_viewed"],
    icon: "Screen",
    color: "border-amber-500/30",
  },
  {
    id: "test_submitted",
    label: "Test Submitted",
    statuses: ["test_submitted"],
    icon: "✍️",
    color: "border-purple-500/30",
  },
  {
    id: "ready",
    label: "Ready to Work",
    statuses: ["ready_to_work"],
    icon: "✅",
    color: "border-emerald-500/30",
  },
  {
    id: "assigned",
    label: "Assigned",
    statuses: ["assigned"],
    icon: "Assign",
    color: "border-blue-500/30",
  },
  {
    id: "working",
    label: "Working",
    statuses: ["working"],
    icon: "⚙️",
    color: "border-purple-500/30",
  },
  {
    id: "proof_pending",
    label: "Proof Pending",
    statuses: [], // Special column - filtered by pendingProof
    icon: "Proof",
    color: "border-orange-500/30",
  },
  {
    id: "completed",
    label: "Completed",
    statuses: [], // Special column - workers who completed recent work
    icon: "Done",
    color: "border-green-500/30",
  },
];

interface WorkerPipelineBoardProps {
  workers: WorkerData[];
  pendingProofs: any[];
  completedWorkers: WorkerData[];
  onAction: (action: string, workerId: string, data?: any) => void;
  actionLoading?: string | null;
  loading?: boolean;
}

export default function WorkerPipelineBoard({
  workers,
  pendingProofs,
  completedWorkers,
  onAction,
  actionLoading,
  loading,
}: WorkerPipelineBoardProps) {
  // Group workers by pipeline column
  const groupedWorkers = useMemo(() => {
    const groups: Record<string, WorkerData[]> = {};

    // Initialize all columns
    PIPELINE_COLUMNS.forEach((col) => {
      groups[col.id] = [];
    });

    // Workers with pending proofs go to "proof_pending" column
    const workersWithProofs = new Set(
      pendingProofs.map((p) => p.workerId?._id || p.workerId),
    );

    workers.forEach((worker) => {
      const userId = worker.userId?._id;

      // Check if worker has pending proof
      if (workersWithProofs.has(userId)) {
        // Find and attach the pending proof
        const proof = pendingProofs.find(
          (p) => (p.workerId?._id || p.workerId) === userId,
        );
        if (proof) {
          groups.proof_pending.push({
            ...worker,
            pendingProof: proof,
          });
          return;
        }
      }

      // Find the correct column based on workerStatus
      const status = worker.workerStatus || "applied";
      const column = PIPELINE_COLUMNS.find((col) =>
        col.statuses.includes(status),
      );

      if (column) {
        groups[column.id].push(worker);
      }
    });

    // Add completed workers
    groups.completed = completedWorkers;

    return groups;
  }, [workers, pendingProofs, completedWorkers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {PIPELINE_COLUMNS.map((column) => {
          const columnWorkers = groupedWorkers[column.id] || [];
          const count = columnWorkers.length;

          // Skip empty completed/proof columns
          if (
            (column.id === "completed" || column.id === "proof_pending") &&
            count === 0
          ) {
            return null;
          }

          return (
            <div
              key={column.id}
              className={`w-72 shrink-0 bg-slate-900/50 rounded-xl border ${column.color}`}
            >
              {/* Column Header */}
              <div className="p-3 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{column.icon}</span>
                    <span className="font-medium text-white text-sm">
                      {column.label}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-slate-300">
                    {count}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div className="p-2 max-h-[calc(100vh-300px)] overflow-y-auto space-y-2">
                <AnimatePresence mode="popLayout">
                  {columnWorkers.length > 0 ? (
                    columnWorkers.map((worker) => (
                      <WorkerPipelineCard
                        key={worker.applicationId || worker._id}
                        worker={worker}
                        onAction={onAction}
                        actionLoading={actionLoading}
                      />
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="py-8 text-center text-xs text-slate-400"
                    >
                      No workers in this stage
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
