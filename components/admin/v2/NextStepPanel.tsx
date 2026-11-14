"use client";

/**
 * PATCH_66: UX Safety Layer
 * Next Step Panel - Shows exactly one recommended action
 */

interface NextStepPanelProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  icon?: string;
  variant?: "info" | "warning" | "success";
  loading?: boolean;
  disabled?: boolean;
}

const variantStyles = {
  info: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: "bg-blue-500/20",
    button: "bg-blue-800 hover:bg-blue-900",
  },
  warning: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: "bg-amber-500/20",
    button: "bg-amber-800 hover:bg-amber-900",
  },
  success: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: "bg-emerald-500/20",
    button: "bg-emerald-800 hover:bg-emerald-900",
  },
};

export default function NextStepPanel({
  title,
  description,
  actionLabel,
  onAction,
  icon = "→",
  variant = "info",
  loading = false,
  disabled = false,
}: NextStepPanelProps) {
  const style = variantStyles[variant];

  return (
    <div className={`${style.bg} border ${style.border} rounded-xl p-4`}>
      <div className="flex items-start gap-4">
        <div
          className={`w-10 h-10 rounded-xl ${style.icon} flex items-center justify-center text-lg flex-shrink-0`}
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-white font-semibold text-sm">{title}</h4>
          <p className="text-slate-400 text-xs mt-1">{description}</p>
        </div>

        <button
          onClick={onAction}
          disabled={disabled || loading}
          className={`
            px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors flex-shrink-0
            ${style.button}
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            actionLabel
          )}
        </button>
      </div>
    </div>
  );
}

// Helper to determine next step based on worker status
export function getWorkerNextStep(workerStatus: string): {
  title: string;
  description: string;
  actionLabel: string;
  action: string;
  variant: "info" | "warning" | "success";
  icon: string;
} | null {
  const steps: Record<string, ReturnType<typeof getWorkerNextStep>> = {
    applied: {
      title: "Review Application",
      description:
        "This worker is waiting for their application to be reviewed.",
      actionLabel: "Approve Application",
      action: "approve",
      variant: "warning",
      icon: "OK",
    },
    approved: {
      title: "Send Screening Test",
      description: "Application approved. Send the screening test to proceed.",
      actionLabel: "Send Test",
      action: "send_test",
      variant: "info",
      icon: "Test",
    },
    screening_unlocked: {
      title: "Waiting for Test",
      description:
        "Worker has access to the screening test. Waiting for submission.",
      actionLabel: "View Test Status",
      action: "view_test",
      variant: "info",
      icon: "Wait",
    },
    test_submitted: {
      title: "Grade Test Submission",
      description: "Worker has submitted their test. Review and grade it.",
      actionLabel: "Grade Test",
      action: "grade_test",
      variant: "warning",
      icon: "Review",
    },
    ready_to_work: {
      title: "Assign Project",
      description: "Worker is ready and waiting for a project assignment.",
      actionLabel: "Assign Project",
      action: "assign_project",
      variant: "success",
      icon: "Assign",
    },
    assigned: {
      title: "Monitor Progress",
      description:
        "Worker is assigned to a project. Waiting for work submission.",
      actionLabel: "View Project",
      action: "view_project",
      variant: "info",
      icon: "View",
    },
    working: {
      title: "Review Proof",
      description: "Worker may have submitted proof. Check for pending proofs.",
      actionLabel: "Check Proofs",
      action: "check_proofs",
      variant: "warning",
      icon: "Proof",
    },
    suspended: {
      title: "Review Suspension",
      description: "Worker is suspended. Review and decide to reinstate.",
      actionLabel: "Reinstate Worker",
      action: "reinstate",
      variant: "warning",
      icon: "Unlock",
    },
  };

  return steps[workerStatus.toLowerCase()] || null;
}
